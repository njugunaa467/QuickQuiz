// Core QuickQuiz behavior

const TOTAL_QUESTIONS_PER_GAME = 10;

const LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    minPercentToPass: 70,
    description: 'Gentle questions to build strong foundations.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    minPercentToPass: 70,
    description: 'Mix of core ideas and trickier details.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    minPercentToPass: 70,
    description: 'Deeper, more challenging questions.',
  },
];

const screens = {
  category: document.getElementById('screen-category'),
  quiz: document.getElementById('screen-quiz'),
  results: document.getElementById('screen-results'),
  dashboard: document.getElementById('screen-dashboard'),
};

const categoryGrid = document.getElementById('category-grid');
const appSubtitle = document.getElementById('app-subtitle');
const userGreetingEl = document.getElementById('user-greeting');
const openDashboardBtn = document.getElementById('open-dashboard');
const closeDashboardBtn = document.getElementById('close-dashboard');
const soundToggleBtn = document.getElementById('sound-toggle');

const userSetupEl = document.getElementById('user-setup');
const userSetupForm = document.getElementById('user-setup-form');
const userNameInput = document.getElementById('user-name-input');

const levelSelector = document.getElementById('level-selector');

const backToCategoryBtn = document.getElementById('back-to-category');
const nextQuestionBtn = document.getElementById('next-question');

const quizCategoryLabel = document.getElementById('quiz-category-label');
const quizProgressLabel = document.getElementById('quiz-progress-label');
const quizMeterFill = document.getElementById('quiz-meter-fill');
const quizScoreMini = document.getElementById('quiz-score-mini');
const quizLevelLabel = document.getElementById('quiz-level-label');
const questionDifficulty = document.getElementById('question-difficulty');
const questionText = document.getElementById('question-text');
const answersList = document.getElementById('answers-list');
const answerFeedback = document.getElementById('answer-feedback');

const resultsCategoryLabel = document.getElementById('results-category-label');
const resultsScore = document.getElementById('results-score');
const resultsPercent = document.getElementById('results-percent');
const resultsMessage = document.getElementById('results-message');
const resultsCorrectCount = document.getElementById('results-correct-count');
const resultsTime = document.getElementById('results-time');
const resultsBreakdown = document.getElementById('results-breakdown');
const playAgainSameBtn = document.getElementById('play-again-same');
const playAgainNewBtn = document.getElementById('play-again-new');

const dashboardSubtitle = document.getElementById('dashboard-subtitle');
const dashboardSummary = document.getElementById('dashboard-summary');
const dashboardHistoryList = document.getElementById('dashboard-history-list');
const dashboardHistoryEmpty = document.getElementById('dashboard-history-empty');

let currentCategoryId = null;
let currentQuizQuestions = [];
let currentIndex = 0;
let score = 0;
let startTime = null;
let lastQuestionIdsByCategory = {};

let userProfile = null;
let isSoundEnabled = true;
let audioContext = null;

let currentLevelIndex = 0;
let currentLevelId = LEVELS[0].id;

const STORAGE_KEY_PROFILE = 'quickquiz_profile_v1';

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function showScreen(target) {
  Object.values(screens).forEach((el) => el.classList.remove('screen--active'));
  screens[target].classList.add('screen--active');
}

function updateGreeting() {
  if (!userGreetingEl) return;
  const name = userProfile?.name;
  if (!name) {
    userGreetingEl.innerHTML =
      '<span class="user-greeting-label">Welcome, explorer</span>';
  } else {
    userGreetingEl.innerHTML = `<span class="user-greeting-label">Welcome back, ${name}</span>`;
  }
}

function loadUserProfile() {
  const raw = safeLocalStorageGet(STORAGE_KEY_PROFILE);
  if (!raw) {
    userProfile = {
      name: '',
      createdAt: Date.now(),
      stats: {
        gamesPlayed: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        bestPercent: 0,
        bestCategory: null,
        history: [],
      },
      levels: {
        unlockedLevelIndex: 0,
        selectedLevelIndex: 0,
      },
    };
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      userProfile = parsed;
    }
  } catch {
    userProfile = null;
  }

  if (!userProfile) {
    userProfile = {
      name: '',
      createdAt: Date.now(),
      stats: {
        gamesPlayed: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        bestPercent: 0,
        bestCategory: null,
        history: [],
      },
      levels: {
        unlockedLevelIndex: 0,
        selectedLevelIndex: 0,
      },
    };
  }

  if (!userProfile.levels) {
    userProfile.levels = {
      unlockedLevelIndex: 0,
      selectedLevelIndex: 0,
    };
  }

  const maxIndex = LEVELS.length - 1;
  userProfile.levels.unlockedLevelIndex = Math.min(
    userProfile.levels.unlockedLevelIndex ?? 0,
    maxIndex,
  );
  userProfile.levels.selectedLevelIndex = Math.min(
    userProfile.levels.selectedLevelIndex ?? 0,
    userProfile.levels.unlockedLevelIndex,
  );
}

function saveUserProfile() {
  if (!userProfile) return;
  safeLocalStorageSet(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
}

function setUserName(name) {
  if (!userProfile) return;
  userProfile.name = name.trim();
  saveUserProfile();
  updateGreeting();

  if (userSetupEl) {
    userSetupEl.style.display = 'none';
  }

  if (appSubtitle && userProfile.name) {
    appSubtitle.textContent = `Hi ${userProfile.name}, choose a topic and start your QuickQuiz.`;
  }
}

function ensureUserNameUI() {
  if (!userSetupEl) return;
  if (userProfile?.name) {
    userSetupEl.style.display = 'none';
  } else {
    userSetupEl.style.display = 'block';
  }
}

function getCategoryMeta(categoryId) {
  return QUESTION_CATEGORIES.find((c) => c.id === categoryId) || {
    id: categoryId,
    name: categoryId,
  };
}

function sampleQuestionsForCategory(categoryId, levelId) {
  const allForCategory = QUESTION_BANK.filter((q) => q.category === categoryId);
  const lastIds = lastQuestionIdsByCategory[categoryId] || [];

  let primary = allForCategory;
  let secondary = [];

  if (levelId === 'beginner') {
    primary = allForCategory.filter((q) => q.difficulty === 'easy');
    secondary = allForCategory.filter((q) => q.difficulty !== 'easy');
  } else if (levelId === 'intermediate') {
    primary = allForCategory.filter((q) => q.difficulty === 'medium');
    secondary = allForCategory.filter((q) => q.difficulty !== 'medium');
  } else if (levelId === 'advanced') {
    primary = allForCategory.filter((q) => q.difficulty === 'hard');
    secondary = allForCategory.filter((q) => q.difficulty !== 'hard');
  }

  const orderedByLevel = [
    ...primary,
    ...secondary.filter((q) => !primary.includes(q)),
  ];

  const basePool = orderedByLevel.length ? orderedByLevel : allForCategory;

  const availableExcludingLast = basePool.filter(
    (q) => !lastIds.includes(q.id),
  );

  const pool =
    availableExcludingLast.length >= TOTAL_QUESTIONS_PER_GAME
      ? availableExcludingLast
      : basePool;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  const selected = shuffled.slice(0, TOTAL_QUESTIONS_PER_GAME);
  lastQuestionIdsByCategory[categoryId] = selected.map((q) => q.id);

  return selected;
}

function formatDifficultyLabel(level) {
  if (!level) return '';
  if (level === 'easy') return 'Level · Easy';
  if (level === 'medium') return 'Level · Medium';
  if (level === 'hard') return 'Level · Hard';
  return level;
}

function difficultyColorClass(level) {
  if (level === 'easy') return 'tag-easy';
  if (level === 'medium') return 'tag-medium';
  if (level === 'hard') return 'tag-hard';
  return '';
}

function difficultyMessage(percent) {
  if (percent >= 90) return 'Outstanding! You really know this topic.';
  if (percent >= 70) return 'Great job! A few more questions and you will master it.';
  if (percent >= 50)
    return 'Nice effort. Review the tricky questions and try again.';
  return 'Good start. Play again to strengthen your knowledge.';
}

function maybeUnlockNextLevel(percent) {
  if (!userProfile || !userProfile.levels) return null;

  const levelState = userProfile.levels;
  const currentIdx = levelState.selectedLevelIndex ?? 0;
  const unlockedIdx = levelState.unlockedLevelIndex ?? 0;
  const currentLevel = LEVELS[currentIdx];

  if (!currentLevel) return null;

  if (
    percent >= currentLevel.minPercentToPass &&
    currentIdx === unlockedIdx &&
    unlockedIdx < LEVELS.length - 1
  ) {
    const newIndex = unlockedIdx + 1;
    levelState.unlockedLevelIndex = newIndex;
    saveUserProfile();
    return LEVELS[newIndex].label;
  }

  return null;
}

function recordGameResult({
  categoryId,
  scoreValue,
  total,
  percent,
  elapsedSeconds,
  levelId,
  levelLabel,
}) {
  if (!userProfile) return;

  const categoryMeta = getCategoryMeta(categoryId);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    categoryId,
    categoryName: categoryMeta.name,
    score: scoreValue,
    total,
    percent,
    seconds: elapsedSeconds,
    levelId,
    levelLabel,
    playedAt: Date.now(),
  };

  const stats = userProfile.stats;
  stats.gamesPlayed += 1;
  stats.totalCorrect += scoreValue;
  stats.totalQuestions += total;

  if (percent > stats.bestPercent) {
    stats.bestPercent = percent;
    stats.bestCategory = categoryMeta.name;
  }

  stats.history.push(entry);
  if (stats.history.length > 100) {
    stats.history = stats.history.slice(-100);
  }

  saveUserProfile();
}

function renderDashboard() {
  if (!userProfile || !dashboardSummary || !dashboardHistoryList) return;

  const stats = userProfile.stats;
  const avgPercent =
    stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : 0;

  dashboardSummary.innerHTML = '';

  const tiles = [
    {
      label: 'Games played',
      value: stats.gamesPlayed,
    },
    {
      label: 'Average score',
      value: `${avgPercent}%`,
    },
    {
      label: 'Best score',
      value: stats.bestPercent ? `${stats.bestPercent}%` : '—',
    },
    {
      label: 'Best category',
      value: stats.bestCategory || '—',
    },
  ];

  tiles.forEach((tile) => {
    const div = document.createElement('div');
    div.className = 'dashboard-tile';
    div.innerHTML = `
      <span class="dashboard-tile-label">${tile.label}</span>
      <span class="dashboard-tile-value">${tile.value}</span>
    `;
    dashboardSummary.appendChild(div);
  });

  const history = [...(stats.history || [])].sort(
    (a, b) => b.playedAt - a.playedAt,
  );

  dashboardHistoryList.innerHTML = '';

  if (!history.length) {
    if (dashboardHistoryEmpty) {
      dashboardHistoryEmpty.style.display = 'block';
    }
    return;
  }

  if (dashboardHistoryEmpty) {
    dashboardHistoryEmpty.style.display = 'none';
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  history.slice(0, 30).forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'dashboard-history-item';
    const when = formatter.format(entry.playedAt);

    item.innerHTML = `
      <div class="dashboard-history-main">
        <span class="dashboard-history-category">${entry.categoryName}</span>
        <span class="dashboard-history-score">${entry.score}/${entry.total} (${entry.percent}%)</span>
      </div>
      <div class="dashboard-history-meta">
        <span>${when}</span>
        <span>· ${entry.seconds}s</span>
      </div>
    `;

    dashboardHistoryList.appendChild(item);
  });

  const name = userProfile.name;
  if (dashboardSubtitle && name) {
    dashboardSubtitle.textContent = `${name}, here’s how you’ve been doing on this device.`;
  }
}

function renderLevelSelector() {
  if (!levelSelector || !userProfile || !userProfile.levels) return;

  const state = userProfile.levels;
  const unlockedIndex = state.unlockedLevelIndex ?? 0;
  const selectedIndex = state.selectedLevelIndex ?? 0;

  levelSelector.innerHTML = '';

  LEVELS.forEach((level, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-button';
    btn.dataset.index = index;

    if (index === selectedIndex) {
      btn.classList.add('level-button--active');
    }

    if (index > unlockedIndex) {
      btn.classList.add('level-button--locked');
    }

    const lockText = index > unlockedIndex ? ' · Locked' : '';
    btn.innerHTML = `
      <span>${level.label}</span>
      <span>${lockText}</span>
    `;

    levelSelector.appendChild(btn);
  });
}

function initAudio() {
  if (audioContext || typeof window === 'undefined') return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audioContext = null;
  }
}

function playTone(freq, durationMs, type = 'sine', gainValue = 0.06) {
  if (!isSoundEnabled) return;
  if (!audioContext) {
    initAudio();
  }
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

function playSoundCorrect() {
  playTone(880, 140, 'triangle', 0.06);
}

function playSoundIncorrect() {
  playTone(220, 180, 'sine', 0.065);
}

function playSoundNavigate() {
  playTone(520, 90, 'square', 0.04);
}

function playSoundFinish() {
  playTone(660, 130, 'triangle', 0.06);
}

function renderCategoryCards() {
  categoryGrid.innerHTML = '';

  QUESTION_CATEGORIES.forEach((cat) => {
    const total = QUESTION_BANK.filter((q) => q.category === cat.id).length;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'category-card';
    card.dataset.categoryId = cat.id;

    card.innerHTML = `
      <div class="category-name">${cat.name}</div>
      <p class="category-desc">${cat.description}</p>
      <div class="category-meta">
        <span class="badge-count">${total} questions</span>
        <span class="badge-level">10 questions · adaptive levels</span>
      </div>
    `;

    card.addEventListener('click', () => {
      startQuizForCategory(cat.id);
    });

    categoryGrid.appendChild(card);
  });
}

function resetQuizState() {
  currentIndex = 0;
  score = 0;
  startTime = Date.now();
  quizMeterFill.style.width = '0%';
  quizScoreMini.textContent = 'Score: 0 / 0';
}

function startQuizForCategory(categoryId) {
  currentCategoryId = categoryId;
  const categoryMeta = getCategoryMeta(categoryId);
  const levelState = userProfile?.levels || {
    unlockedLevelIndex: 0,
    selectedLevelIndex: 0,
  };
  currentLevelIndex = Math.min(
    levelState.selectedLevelIndex ?? 0,
    LEVELS.length - 1,
  );
  currentLevelId = LEVELS[currentLevelIndex].id;

  currentQuizQuestions = sampleQuestionsForCategory(categoryId, currentLevelId);

  resetQuizState();
  quizCategoryLabel.textContent = categoryMeta.name;
  if (quizLevelLabel) {
    quizLevelLabel.textContent = `${LEVELS[currentLevelIndex].label} level`;
  }
  showScreen('quiz');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const q = currentQuizQuestions[currentIndex];
  if (!q) return;

  quizProgressLabel.textContent = `Question ${
    currentIndex + 1
  } of ${TOTAL_QUESTIONS_PER_GAME}`;

  const progressPercent = ((currentIndex) / TOTAL_QUESTIONS_PER_GAME) * 100;
  quizMeterFill.style.width = `${Math.max(progressPercent, 6)}%`;

  const diffLabel = formatDifficultyLabel(q.difficulty);
  questionDifficulty.textContent = diffLabel;
  questionDifficulty.className = `tag-pill ${difficultyColorClass(q.difficulty)}`;

  questionText.textContent = q.text;

  answersList.innerHTML = '';
  answerFeedback.textContent = '';
  answerFeedback.className = 'answer-feedback';
  nextQuestionBtn.disabled = true;

  const labels = ['A', 'B', 'C', 'D'];
  q.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-button';
    btn.dataset.index = index;

    btn.innerHTML = `
      <span class="answer-button-label">${labels[index] ?? ''}</span>
      <span class="answer-button-text">${optionText}</span>
    `;

    btn.addEventListener('click', () => handleAnswerSelection(q, index));

    answersList.appendChild(btn);
  });
}

function handleAnswerSelection(question, selectedIndex) {
  const answered = answersList.querySelector('.answer-button--locked');
  if (answered) return;

  const buttons = Array.from(
    answersList.querySelectorAll('.answer-button'),
  );

  let isCorrect = selectedIndex === question.correctIndex;
  if (isCorrect) {
    score += 1;
  }

  buttons.forEach((btn) => {
    const idx = Number(btn.dataset.index);
    btn.classList.add('answer-button--locked');
    if (idx === question.correctIndex) {
      btn.classList.add('answer-button--correct');
    } else if (idx === selectedIndex) {
      btn.classList.add('answer-button--incorrect');
    }
  });

  currentQuizQuestions[currentIndex].userAnswerIndex = selectedIndex;
  currentQuizQuestions[currentIndex].wasCorrect = isCorrect;

  quizScoreMini.textContent = `Score: ${score} / ${currentIndex + 1}`;

  if (isCorrect) {
    answerFeedback.textContent = 'Correct! Nicely done.';
    answerFeedback.classList.add('answer-feedback--correct');
  } else {
    const correctText = question.options[question.correctIndex];
    answerFeedback.textContent = `Not quite. Correct answer: ${correctText}`;
    answerFeedback.classList.add('answer-feedback--incorrect');
  }

  nextQuestionBtn.disabled = false;

  if (isCorrect) {
    playSoundCorrect();
  } else {
    playSoundIncorrect();
  }
}

function goToNextQuestion() {
  const isLast = currentIndex === TOTAL_QUESTIONS_PER_GAME - 1;
  if (isLast) {
    finishQuiz();
  } else {
    currentIndex += 1;
    renderCurrentQuestion();
  }
}

function finishQuiz() {
  const categoryMeta = getCategoryMeta(currentCategoryId);
  const endTime = Date.now();
  const elapsedSeconds = Math.round((endTime - startTime) / 1000);

  const total = TOTAL_QUESTIONS_PER_GAME;
  const percent = Math.round((score / total) * 100);

  resultsCategoryLabel.textContent = `Category: ${categoryMeta.name}`;
  resultsScore.textContent = `${score} / ${total}`;
  resultsPercent.textContent = `(${percent}%)`;
  resultsMessage.textContent = difficultyMessage(percent);

  const unlockedLabel = maybeUnlockNextLevel(percent);
  if (unlockedLabel) {
    resultsMessage.textContent += ` You unlocked the ${unlockedLabel} level.`;
  }

  resultsCorrectCount.textContent = `You answered ${score} out of ${total} questions correctly.`;
  resultsTime.textContent = `Time taken: ${elapsedSeconds} seconds.`;

  recordGameResult({
    categoryId: currentCategoryId,
    scoreValue: score,
    total,
    percent,
    elapsedSeconds,
    levelId: currentLevelId,
    levelLabel: LEVELS[currentLevelIndex]?.label,
  });

  playSoundFinish();

  resultsBreakdown.innerHTML = '';
  currentQuizQuestions.forEach((q, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'results-breakdown-item';

    const statusCorrect = q.wasCorrect;
    const statusClass = statusCorrect
      ? 'results-breakdown-status--correct'
      : 'results-breakdown-status--incorrect';
    const statusText = statusCorrect ? 'Correct' : 'Incorrect';

    const userAnswerText =
      typeof q.userAnswerIndex === 'number'
        ? q.options[q.userAnswerIndex]
        : 'Not answered';

    const correctText = q.options[q.correctIndex];

    wrapper.innerHTML = `
      <div class="results-breakdown-item-header">
        <span class="results-breakdown-label">Q${index + 1}</span>
        <span class="results-breakdown-status ${statusClass}">${statusText}</span>
      </div>
      <div class="results-breakdown-question">${q.text}</div>
      <div class="results-breakdown-answer">
        Your answer: ${userAnswerText}<br/>
        Correct answer: ${correctText}
      </div>
    `;

    resultsBreakdown.appendChild(wrapper);
  });

  showScreen('results');
}

function playAgainSameCategory() {
  if (!currentCategoryId) return;
  startQuizForCategory(currentCategoryId);
}

function initEvents() {
  if (userSetupForm) {
    userSetupForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = userNameInput?.value?.trim();
      if (!value) return;
      setUserName(value);
      playSoundNavigate();
    });
  }

  backToCategoryBtn.addEventListener('click', () => {
    showScreen('category');
    playSoundNavigate();
  });

  nextQuestionBtn.addEventListener('click', () => {
    goToNextQuestion();
  });

  playAgainSameBtn.addEventListener('click', () => {
    playAgainSameCategory();
    playSoundNavigate();
  });

  playAgainNewBtn.addEventListener('click', () => {
    showScreen('category');
    playSoundNavigate();
  });

  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      renderDashboard();
      showScreen('dashboard');
      playSoundNavigate();
    });
  }

  if (closeDashboardBtn) {
    closeDashboardBtn.addEventListener('click', () => {
      showScreen('category');
      playSoundNavigate();
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      soundToggleBtn.textContent = isSoundEnabled ? '🔈 Sound on' : '🔇 Sound off';
      if (isSoundEnabled) {
        playSoundNavigate();
      }
    });
  }

  if (levelSelector && userProfile?.levels) {
    levelSelector.addEventListener('click', (event) => {
      const button = event.target.closest('.level-button');
      if (!button) return;
      const index = Number(button.dataset.index);
      if (Number.isNaN(index)) return;
      const levelsState = userProfile.levels;
      const maxUnlocked = levelsState.unlockedLevelIndex ?? 0;
      if (index > maxUnlocked) return;
      levelsState.selectedLevelIndex = index;
      saveUserProfile();
      renderLevelSelector();
      playSoundNavigate();
    });
  }
}

function bootstrap() {
  loadUserProfile();
  updateGreeting();
  ensureUserNameUI();
  renderLevelSelector();
  renderCategoryCards();
  initEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

