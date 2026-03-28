const SHEET_ID = "1hNhgYyZx6OUlc-Bw5roZgowLppbqDS4n94_ywS-SQx8";

// ===== STATE =====
let vocab = [];
let lessonVocab = [];

let current = 0;
let lessonIndex = 0;

const lessonSize = 10;
let isQuizMode = false;
let correctCount = 0;

// ===== DOM =====
const wordEl = document.getElementById("word");
const pinyinEl = document.getElementById("pinyin");
const meaningEl = document.getElementById("meaning");
const speakBtn = document.getElementById("btnSpeak");
const btnSlow = document.getElementById("btnSlow");
const progressEl = document.getElementById("progress");
const levelEl = document.getElementById("level");
const quizEl = document.getElementById("quiz");

const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

// ===== EVENTS =====
document.getElementById("btnMeaning").onclick = showMeaning;
document.getElementById("btnSpeak").onclick = speak;
document.getElementById("btnSlow").onclick = speakSlow;
btnPrev.onclick = prevWord;
btnNext.onclick = nextWord;

levelEl.onchange = () => loadData(levelEl.value);

// ===== API =====
function getUrl(gid) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
}

// ===== LOAD DATA =====
async function loadData(gid) {
    wordEl.innerText = "Loading...";
    quizEl.innerHTML = "";

    const res = await fetch(getUrl(gid));
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    const cols = json.table.cols.map(c => (c.label || "").toLowerCase());

    vocab = json.table.rows.map(r => {
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

    if (!vocab.length) {
        wordEl.innerText = "Không có dữ liệu";
        return;
    }

    lessonIndex = 0;
    loadLesson();
}

// ===== LESSON =====
function loadLesson() {
    progressEl.style.width = "0%";
    const start = lessonIndex * lessonSize;
    const end = start + lessonSize;
    

    lessonVocab = vocab.slice(start, end);

    resetQuizState();
    isQuizMode = false;

    btnPrev.style.display = "inline-block";
    btnNext.style.display = "inline-block";
    btnMeaning.style.display = "inline-block";
    speakBtn.style.display = "inline-block";
    btnSlow.style.display = "inline-block";


    render();
}

function resetQuizState() {
    current = 0;
    correctCount = 0;
    quizEl.innerHTML = "";
    quizEl.style.pointerEvents = "auto";
}

// ===== RENDER =====
function render() {
    quizEl.innerHTML = "";

    const item = lessonVocab[current];
    if (!item) return;

    wordEl.innerText = item.word;
    pinyinEl.innerText = item.pinyin;
    meaningEl.style.display = "none";

    updateButtons();
}

function updateProgress() {
    const percent = (current / lessonVocab.length) * 100;
    progressEl.style.width = percent + "%";
}

function updateButtons() {
    btnPrev.disabled = current === 0;
    if (current === lessonVocab.length - 1) {
        btnNext.innerText = "Quiz";
    } else {
        btnNext.innerText = "→";
    }
}

// ===== ACTIONS =====
function showMeaning() {
    meaningEl.innerText = lessonVocab[current].meaning;
    meaningEl.style.display = "block";
}

function prevWord() {
    if (current > 0) {
        current--;
        render();
    }
}

function nextWord() {
    if (current < lessonVocab.length - 1) {
        current++;           // 👈 đánh dấu đã học xong 1 từ
        updateProgress();    // 👈 cập nhật tại đây
        render();
    } else {
        current++;           // 👈 hoàn thành câu cuối
        updateProgress();    // 👈 lên 100%
        startQuiz();
    }
}

// ===== QUIZ =====
function startQuiz() {
    isQuizMode = true;
    resetQuizState();

    progressEl.style.width = "0%";

    btnNext.style.display = "none";
    btnPrev.style.display = "none";
    btnMeaning.style.display = "none";
    btnMeaning.style.disabled = "none";

    renderQuiz();
}

function renderQuiz() {
    const item = lessonVocab[current];

    wordEl.innerText = item.word;
    pinyinEl.innerText = item.pinyin;
    meaningEl.style.display = "none";

    quizEl.innerHTML = "";

    const correct = item.meaning;

    let pool = vocab
        .map(v => v.meaning)
        .filter(m => m !== correct);

    pool.sort(() => Math.random() - 0.5);

    let options = [correct, ...pool.slice(0, 3)];

    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const div = document.createElement("div");
        div.className = "option";
        div.innerText = opt;

        div.onclick = () => {
            if (quizEl.style.pointerEvents === "none") return;

            const isCorrect = opt === correct;

            if (isCorrect) {
                div.classList.add("correct");
                correctCount++;
            } else {
                div.classList.add("wrong");

                [...quizEl.children].forEach(el => {
                    if (el.innerText === correct) {
                        el.classList.add("correct");
                    }
                });
            }

            quizEl.style.pointerEvents = "none";

            // 👇 cập nhật progress SAU khi trả lời
            current++;
            updateProgress();

            setTimeout(() => {
                quizEl.style.pointerEvents = "auto";
                nextQuiz();
            }, 800);
        };

        quizEl.appendChild(div);
    });
}

// ===== show results =====
function showResult() {
    const total = lessonVocab.length;

    wordEl.innerText = `🎯 ${correctCount} / ${total}`;
    pinyinEl.innerText = "Kết quả của bạn";
    meaningEl.innerText = correctCount >= total * 0.8 ? "🔥 Tốt lắm!" : "💪 Cố gắng thêm!";
    meaningEl.style.display = "block";
    speakBtn.style.display = "none";
    btnSlow.style.display = "none";

    quizEl.innerHTML = `
        <button onclick="retryLesson()">Học lại</button>
        <button onclick="nextLesson()">Bài tiếp</button>
    `;
}

// ===== RETRY LESSON =====
function retryLesson() {
    current = 0;
    isQuizMode = false;

    btnPrev.style.display = "inline-block";
    btnNext.style.display = "inline-block";
    btnMeaning.style.display = "inline-block";
    speakBtn.style.display = "inline-block";
    btnSlow.style.display = "inline-block";

    render();
}

function nextQuiz() {
    if (current < lessonVocab.length) {
        renderQuiz();
    } else {
        showResult();
    }
}

// ===== NEXT LESSON =====
function nextLesson() {
    lessonIndex++;

    if (lessonIndex * lessonSize >= vocab.length) {
        finish();
        return;
    }

    loadLesson();
}

function finish() {
    wordEl.innerText = "🎉 Hoàn thành!";
    pinyinEl.innerText = "";
    meaningEl.innerText = "";
    quizEl.innerHTML = "";
}

// ===== SPEAK =====
function speak() {
    playAudio(lessonVocab[current]?.word, 1);
}

function speakSlow() {
    playAudio(lessonVocab[current]?.word, 0.6);
}

function playAudio(text, rate = 1) {
    if (!text) return;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`;

    const audio = new Audio(url);
    audio.playbackRate = rate;

    audio.play().catch(() => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = rate;

        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    });
}

// ===== INIT =====
loadData("930478043");