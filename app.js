const SHEET_ID = "1hNhgYyZx6OUlc-Bw5roZgowLppbqDS4n94_ywS-SQx8";
let STORAGE_KEY = "";

// ===== CONFIG =====
const lessonSize = 10;

// ===== STATE =====
const state = {
    vocab: [],
    lesson: [],
    quiz: [],
    current: 0,
    chunk: 0,
    totalChunks: 0,
    correct: 0,
    mode: "learn", // learn | quiz | result
    progressMap: {}
};

// ===== DOM =====
const $ = id => document.getElementById(id);

const UI = {
    word: $("word"),
    pinyin: $("pinyin"),
    meaning: $("meaning"),
    progress: $("progress"),
    quiz: $("quiz"),

    btnPrev: $("btnPrev"),
    btnNext: $("btnNext"),
    btnSpeak: $("btnSpeak"),
    btnSlow: $("btnSlow"),

    chunkText: $("chunkText"),
    btnPrevChunk: $("btnPrevChunk"),
    btnNextChunk: $("btnNextChunk"),
    level: $("level")
};

// ===== INIT =====
UI.level.onchange = () => loadData(UI.level.value);
UI.btnPrev.onclick = prevWord;
UI.btnNext.onclick = nextWord;
UI.btnSpeak.onclick = () => speak(1);
UI.btnSlow.onclick = () => speak(0.5);

UI.btnPrevChunk.onclick = () => changeChunk(-1);
UI.btnNextChunk.onclick = () => changeChunk(1);

// ===== API =====
const getUrl = gid =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;


// ===== LOAD DATA =====
async function loadData(gid) {
    STORAGE_KEY = `hsk_progress_${gid}`;

    state.progressMap = {};
    state.chunk = 0;

    UI.word.innerText = "Loading...";
    UI.quiz.innerHTML = "";

    const res = await fetch(getUrl(gid));
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    const cols = json.table.cols.map(c => (c.label || "").toLowerCase());

    state.vocab = json.table.rows.map(r => {
        let obj = {};
        let pinyinSet = false;

        cols.forEach((col, i) => {
            const value = r.c[i]?.v || "";
            if (col === "phiên âm" && !pinyinSet) {
                obj.pinyin = value;
                pinyinSet = true;
            } else {
                obj[col] = value;
            }
        });

        return {
            word: obj["từ mới"] || "",
            pinyin: obj.pinyin || "",
            meaning: obj["giải thích"] || ""
        };
    }).filter(v => v.word);

    // 👉 tính chunk đúng
    state.totalChunks = Math.ceil(state.vocab.length / lessonSize);

    loadProgress();
    if (state.chunk >= state.totalChunks) state.chunk = 0;

    loadLesson();
}

function updateUIByMode() {
    if (state.mode === "learn") {
        UI.btnPrev.style.display = "inline-block";
        UI.btnNext.style.display = "inline-block";
        UI.btnSpeak.style.display = "inline-block";
        UI.btnSlow.style.display = "inline-block";
    }

    if (state.mode === "quiz") {
        UI.btnPrev.style.display = "none";
        UI.btnNext.style.display = "none";
        UI.btnSpeak.style.display = "inline-block"; // vẫn cho nghe
        UI.btnSlow.style.display = "inline-block";
    }

    if (state.mode === "result") {
        UI.btnPrev.style.display = "none";
        UI.btnNext.style.display = "none";
        UI.btnSpeak.style.display = "none";
        UI.btnSlow.style.display = "none";
    }
}

// ===== LESSON =====
function loadLesson() {
    UI.quiz.style.pointerEvents = "auto";
    const start = state.chunk * lessonSize;
    state.lesson = state.vocab.slice(start, start + lessonSize);

    state.current = 0;
    state.correct = 0;
    state.mode = "learn";



    updateChunkUI();
    updateUIByMode();
    render();
}

// ===== RENDER =====
function render() {
    UI.quiz.innerHTML = "";

    if (state.mode === "learn") renderLearn();
    if (state.mode === "quiz") renderQuiz();
}

// ===== LEARN =====
function renderLearn() {
    const item = state.lesson[state.current];
    if (!item) return;

    UI.word.innerText = item.word;
    UI.pinyin.innerText = item.pinyin;
    UI.meaning.innerText = item.meaning;

    updateProgress();
}

// ===== QUIZ =====
function startQuiz() {
    state.mode = "quiz";
    state.current = 0;
    state.correct = 0;

    state.quiz = shuffle([...state.lesson]);

    UI.btnPrev.style.display = "none";
    UI.btnNext.style.display = "none";

    render();
}

function renderQuiz() {
    const item = state.quiz[state.current];
    if (!item) return;

    UI.word.innerText = item.word;
    UI.pinyin.innerText = item.pinyin;
    UI.meaning.style.display = "none";

    UI.quiz.innerHTML = "";

    const options = generateOptions(item);

    options.forEach(opt => {
        const div = document.createElement("div");
        div.className = "option";
        div.innerText = opt;

        div.onclick = () => handleAnswer(opt, item.meaning);

        UI.quiz.appendChild(div);
    });

    updateProgress();
}

// ===== QUIZ LOGIC =====
function generateOptions(item) {
    let pool = state.vocab
        .map(v => v.meaning)
        .filter(m => m !== item.meaning);

    pool = shuffle(pool);

    return shuffle([item.meaning, ...pool.slice(0, 3)]);
}

function handleAnswer(selected, correct) {
    if (UI.quiz.style.pointerEvents === "none") return;

    const isCorrect = selected === correct;

    [...UI.quiz.children].forEach(el => {
        if (el.innerText === correct) el.classList.add("correct");
        else if (el.innerText === selected) el.classList.add("wrong");
    });

    if (isCorrect) state.correct++;

    UI.quiz.style.pointerEvents = "none";

    state.current++;
    updateProgress();

    setTimeout(() => {
        UI.quiz.style.pointerEvents = "auto";
        nextQuiz();
    }, 700);
}

function nextQuiz() {
    if (state.current < state.quiz.length) {
        renderQuiz();
    } else {
        showResult();
    }
}

// ===== RESULT =====
function showResult() {
    state.mode = "result";

    const total = state.lesson.length;
    const percent = Math.round((state.correct / total) * 100);

    // lưu tiến độ chunk
    if (percent >= 80) {
        state.progressMap[state.chunk] = true;
    }

    saveProgress();

    UI.word.innerText = `🎯 ${state.correct}/${state.lesson.length}`;
    UI.pinyin.innerText = "Kết quả";
    UI.meaning.innerText =
        state.correct >= state.lesson.length * 0.8
            ? "🔥 Tốt lắm!"
            : "💪 Cố gắng thêm!";
    UI.meaning.style.display = "block";
    btnSlow.style.display = "none";
    btnSpeak.style.display = "none";

    UI.quiz.innerHTML = `
        <button onclick="retry()">Học lại</button>
        <button onclick="nextChunk()">Bài tiếp</button>
    `;

    updateChunkUI();
}

// ===== NAV =====
function nextWord() {
    state.current++;
    updateProgress();

    if (state.current < state.lesson.length) {
        render();
    } else {
        startQuiz();
    }
}

function prevWord() {
    if (state.current > 0) {
        state.current--;
        render();
    }
}

function nextChunk() {
    state.chunk++;
    if (state.chunk >= state.totalChunks) return finish();

    saveProgress();
    loadLesson();
}

function changeChunk(step) {
    state.chunk += step;

    if (state.chunk < 0) state.chunk = 0;
    if (state.chunk >= state.totalChunks)
        state.chunk = state.totalChunks - 1;

    saveProgress();
    loadLesson();
}

function retry() {
    loadLesson();
}

// ===== UI =====
function getTotalProgress() {
    let done = 0;

    for (let i = 0; i < state.totalChunks; i++) {
        if (state.progressMap[i]) done++;
    }

    return Math.round((done / state.totalChunks) * 100);
}

function updateProgress() {
    const total =
        state.mode === "quiz" ? state.quiz.length : state.lesson.length;

    const percent = (state.current / total) * 100;
    UI.progress.style.width = percent + "%";
}

function updateChunkUI() {
    const total = getTotalProgress();
    const isDone = state.progressMap[state.chunk];

    UI.chunkText.innerText =
        `Phần ${state.chunk + 1}/${state.totalChunks} ${isDone ? "✅" : ""} | Tổng: ${total}%`;

    UI.btnPrevChunk.disabled = state.chunk === 0;
    UI.btnNextChunk.disabled = state.chunk === state.totalChunks - 1;
}

function saveChunk() {
    localStorage.setItem("chunk", state.chunk);
}

function saveProgress() {
    const data = {
        chunk: state.chunk,
        progressMap: state.progressMap
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadProgress() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!data) return;

    state.chunk = data.chunk || 0;
    state.progressMap = data.progressMap || {};
}

// ===== SPEAK =====
function speak(rate = 1) {
    const list =
        state.mode === "quiz" ? state.quiz : state.lesson;

    const text = list[state.current]?.word;
    if (!text) return;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`;

    const audio = new Audio(url);

    audio.playbackRate = rate; // 🔥 KEY
    audio.play().catch(() => {
        // fallback (hiếm khi cần)
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = rate;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    });
}

// ===== UTIL =====
function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// ===== START =====
loadData("930478043");