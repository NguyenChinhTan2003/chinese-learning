const SHEET_ID = "1hNhgYyZx6OUlc-Bw5roZgowLppbqDS4n94_ywS-SQx8";

let vocab = [];
let current = 0;

const wordEl = document.getElementById("word");
const pinyinEl = document.getElementById("pinyin");
const meaningEl = document.getElementById("meaning");
const quizEl = document.getElementById("quiz");
const progressEl = document.getElementById("progress");
const levelEl = document.getElementById("level");

document.getElementById("btnMeaning").onclick = showMeaning;
document.getElementById("btnSpeak").onclick = speak;
document.getElementById("btnNext").onclick = nextWord;
levelEl.onchange = () => loadData(levelEl.value);

function getUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
}

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

      if (col === "phiên âm") {
        if (!pinyinSet) {
          obj.pinyin = value;
          pinyinSet = true;
        }
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

  current = 0;
  render();
}

function render() {
  const item = vocab[current];
  if (!item) return;

  wordEl.innerText = item.word;
  pinyinEl.innerText = item.pinyin;
  meaningEl.style.display = "none";

  updateProgress();
  generateQuiz();
}

function updateProgress() {
  const percent = ((current + 1) / vocab.length) * 100;
  progressEl.style.width = percent + "%";
}

function showMeaning() {
  meaningEl.innerText = vocab[current].meaning;
  meaningEl.style.display = "block";
}

function nextWord() {
  current = (current + 1) % vocab.length;
  render();
}

function speak() {
  const u = new SpeechSynthesisUtterance(vocab[current].word);
  u.lang = "zh-CN";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function generateQuiz() {
  quizEl.innerHTML = "";

  const correct = vocab[current].meaning;
  let options = [correct];

  while (options.length < 4 && vocab.length > 1) {
    const rand = vocab[Math.floor(Math.random() * vocab.length)].meaning;
    if (!options.includes(rand)) options.push(rand);
  }

  options.sort(() => Math.random() - 0.5);

  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerText = opt;

    div.onclick = () => {
      div.classList.add(opt === correct ? "correct" : "wrong");
    };

    quizEl.appendChild(div);
  });
}

// load mặc định
loadData("930478043");