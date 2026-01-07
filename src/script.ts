type DifficultyKey = 1 | 2 | 3 | 4;

interface Settings {
  questionTime: string;
  answerTime: string;
  difficulty: string;
}

const display = document.getElementById("display") as HTMLElement;
const incrementBtn = document.getElementById("incrementBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const quizButton = document.getElementById("quizButton") as HTMLButtonElement;
const questionTimeInput = document.getElementById("questionTime") as HTMLInputElement;
const answerTimeInput = document.getElementById("answerTime") as HTMLInputElement;
const difficultyInput = document.getElementById("difficulty") as HTMLInputElement;
const difficultyValue = document.getElementById("difficultyValue") as HTMLElement;
const progressBar = document.getElementById("progressBar") as HTMLElement;
const autoUpdateCheckbox = document.getElementById("autoUpdate") as HTMLInputElement;
const modeStatus = document.getElementById("modeStatus") as HTMLElement;
const quizStatus = document.getElementById("quizStatus") as HTMLElement;

let count = 0;
let multiplier = 0;
let quizInterval: number | null = null;
let autoInterval: number | null = null;
let quizRunning = false;

const difficultyRanges: Record<DifficultyKey, [number, number]> = {
  1: [2, 5],
  2: [3, 8],
  3: [5, 12],
  4: [10, 20],
};

// -------- TEST MODE (deterministic) --------

declare global {
  interface Window {
    __TEST_MODE__?: boolean;
    __nextRand?: (min: number, max: number) => number;
  }
}

if (window.__TEST_MODE__) {
  let seed = 1;

  window.__nextRand = (min: number, max: number) => {
    seed = (seed * 7) % 23;
    return min + (seed % (max - min + 1));
  };
}

// -------- helpers --------

function randomMultiplier(): number {
  const diff = difficultyRanges[Number(difficultyInput.value) as DifficultyKey];
  const [min, max] = diff;

  if (window.__TEST_MODE__ && window.__nextRand) {
    return window.__nextRand(min, max);
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function render(): void {
  display.textContent = `${count} × ${multiplier} = ${count * multiplier}`;
}

function reset(): void {
  count = 0;
  multiplier = randomMultiplier();
  render();
}

incrementBtn.onclick = () => {
  count++;
  render();
};

resetBtn.onclick = reset;

// -------- settings persistence --------

function saveSettings(): void {
  const data: Settings = {
    questionTime: questionTimeInput.value,
    answerTime: answerTimeInput.value,
    difficulty: difficultyInput.value,
  };

  localStorage.setItem("settings", JSON.stringify(data));
}

function loadSettings(): void {
  const raw = localStorage.getItem("settings");
  if (!raw) return;

  const s: Settings = JSON.parse(raw);

  questionTimeInput.value = s.questionTime;
  answerTimeInput.value = s.answerTime;
  difficultyInput.value = s.difficulty;

  updateDifficultyLabel();
}

function updateDifficultyLabel(): void {
  const labels: Record<DifficultyKey, string> = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Expert",
  };

  difficultyValue.textContent =
    labels[Number(difficultyInput.value) as DifficultyKey];
}

let debounceTimer: number | null = null;

[difficultyInput, questionTimeInput, answerTimeInput].forEach((el) => {
  el.addEventListener("input", () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      updateDifficultyLabel();
      saveSettings();
      reset();
    }, 250);
  });
});

// -------- quiz mode --------

quizButton.onclick = () => (quizRunning ? stopQuiz() : startQuiz());

function startQuiz(): void {
  quizRunning = true;
  quizStatus.textContent = "Running";
  modeStatus.textContent = "Quiz";
  quizButton.textContent = "Stop Quiz";

  incrementBtn.disabled = true;
  resetBtn.disabled = true;

  const total =
    Number(questionTimeInput.value) + Number(answerTimeInput.value);

  reset();
  progressBar.style.width = "100%";

  quizInterval = window.setInterval(reset, total * 1000);
}

function stopQuiz(): void {
  quizRunning = false;
  quizStatus.textContent = "Stopped";
  modeStatus.textContent = "Manual";
  quizButton.textContent = "Start Quiz";

  incrementBtn.disabled = false;
  resetBtn.disabled = false;

  if (quizInterval) clearInterval(quizInterval);
}

// -------- auto-update --------

autoUpdateCheckbox.addEventListener("change", () => {
  if (autoUpdateCheckbox.checked) {
    autoInterval = window.setInterval(() => incrementBtn.click(), 3000);
  } else if (autoInterval) {
    clearInterval(autoInterval);
  }
});

// -------- init --------

loadSettings();
updateDifficultyLabel();
reset();

export {};
