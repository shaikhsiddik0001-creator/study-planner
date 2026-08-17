/**
 * ============================================================================
 * STUDYFLOW — 100% Free Student Study Planner & Pomodoro Focus Station
 * Integrated with Real Firebase Authentication & Firestore Cloud Sync
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== USER'S FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyDLYKM648YCzhAy4tiYsYHkG-HRdyfycLc",
  authDomain: "studayplanner.firebaseapp.com",
  projectId: "studayplanner",
  storageBucket: "studayplanner.firebasestorage.app",
  messagingSenderId: "868166632976",
  appId: "1:868166632976:web:15adce44901bd5aaf6ec95",
  measurementId: "G-SJF9TW2RYQ"
};

// Initialize Firebase App, Auth & Firestore
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Local Storage Keys
const STORAGE_KEYS = {
  TASKS: 'studyflow_tasks_v1',
  SETTINGS: 'studyflow_settings_v1',
  POMO_STATS: 'studyflow_pomo_stats_v1',
  THEME: 'studyflow_theme_v1',
  STREAK: 'studyflow_streak_v1',
  EXAMS: 'studyflow_exams_v1',
  NOTES: 'studyflow_notes_v1'
};

const SUBJECT_COLORS = {
  'Mathematics': '#6366f1',
  'Physics': '#0ea5e9',
  'Computer Science': '#10b981',
  'Biology': '#84cc16',
  'Chemistry': '#f97316',
  'History': '#eab308',
  'Literature': '#ec4899',
  'Economics': '#14b8a6',
  'General': '#8b5cf6'
};

const STUDY_TIPS = [
  "Take a 5-minute movement break between study blocks to refresh cognitive focus and boost retention.",
  "Use the Feynman Technique: Try explaining a concept in simple words to find gaps in your understanding.",
  "Active recall + spaced repetition is 200% more effective than passive re-reading.",
  "Tackle your highest priority task first thing in the morning when mental energy is at its peak.",
  "Drink a glass of water before starting your next 25-minute Pomodoro session.",
  "Break large study goals into bite-sized tasks under 45 minutes for consistent momentum."
];

const state = {
  currentUser: null,
  tasks: [],
  exams: [],
  quickNotes: '',
  currentView: 'dashboard',
  selectedDailyDate: new Date(),
  selectedWeekStartDate: getStartOfWeek(new Date()),
  selectedMonthDate: new Date(),
  filters: {
    search: '',
    status: 'all',
    priority: 'all',
    subject: 'all',
    sort: 'date-asc'
  },
  pomodoro: {
    mode: 'pomodoro',
    timeLeft: 25 * 60,
    totalDuration: 25 * 60,
    isRunning: false,
    intervalId: null,
    activeTaskId: null,
    durations: { pomodoro: 25, shortBreak: 5, longBreak: 15 },
    autoStart: false,
    soundNotification: true,
    ambientType: 'none',
    todayCompleted: 0,
    todayMinutes: 0
  },
  streakDays: 1,
  theme: 'dark',
  authMode: 'signin' // 'signin' | 'signup'
};

// Web Audio Synthesizer
let audioCtx = null;
let ambientSourceNode = null;
let ambientGainNode = null;

const dom = {
  html: document.documentElement,
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  pageHeading: document.getElementById('pageHeading'),
  pageSubHeading: document.getElementById('pageSubHeading'),
  currentDateStr: document.getElementById('currentDateStr'),
  navItems: document.querySelectorAll('.nav-item, .mobile-nav-btn'),
  navAllCount: document.getElementById('navAllCount'),
  navTodayCount: document.getElementById('navTodayCount'),
  sidebarTimerBadge: document.getElementById('sidebarTimerBadge'),
  sidebarExamBadge: document.getElementById('sidebarExamBadge'),
  streakDays: document.getElementById('streakDays'),
  quickTimerPill: document.getElementById('quickTimerPill'),
  quickTimerText: document.getElementById('quickTimerText'),
  quickTimerDot: document.getElementById('quickTimerDot'),
  viewPanels: document.querySelectorAll('.view-panel'),
  statTotalTasks: document.getElementById('statTotalTasks'),
  statCompletedTasks: document.getElementById('statCompletedTasks'),
  statCompletionBar: document.getElementById('statCompletionBar'),
  statPomodoroCount: document.getElementById('statPomodoroCount'),
  statHighPriority: document.getElementById('statHighPriority'),
  statPendingHint: document.getElementById('statPendingHint'),
  statFocusTimeHint: document.getElementById('statFocusTimeHint'),
  taskSearchInput: document.getElementById('taskSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterStatus: document.getElementById('filterStatus'),
  filterPriority: document.getElementById('filterPriority'),
  filterSubject: document.getElementById('filterSubject'),
  sortBy: document.getElementById('sortBy'),
  activeFiltersRow: document.getElementById('activeFiltersRow'),
  filterChipsContainer: document.getElementById('filterChipsContainer'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  taskListContainer: document.getElementById('taskListContainer'),
  tasksEmptyState: document.getElementById('tasksEmptyState'),
  visibleTaskCountBadge: document.getElementById('visibleTaskCountBadge'),
  markAllCompleteBtn: document.getElementById('markAllCompleteBtn'),
  sidebarNewTaskBtn: document.getElementById('sidebarNewTaskBtn'),
  dashboardAddTaskBtn: document.getElementById('dashboardAddTaskBtn'),
  emptyStateCreateBtn: document.getElementById('emptyStateCreateBtn'),
  loadSampleDataBtn: document.getElementById('loadSampleDataBtn'),
  dailyPrevDayBtn: document.getElementById('dailyPrevDayBtn'),
  dailyNextDayBtn: document.getElementById('dailyNextDayBtn'),
  dailyJumpTodayBtn: document.getElementById('dailyJumpTodayBtn'),
  dailyDatePicker: document.getElementById('dailyDatePicker'),
  dailyAddTaskBtn: document.getElementById('dailyAddTaskBtn'),
  dailyViewDateTitle: document.getElementById('dailyViewDateTitle'),
  dailyViewDateSubtitle: document.getElementById('dailyViewDateSubtitle'),
  dailyScheduleCount: document.getElementById('dailyScheduleCount'),
  dailyTimelineList: document.getElementById('dailyTimelineList'),
  dailyChecklistCount: document.getElementById('dailyChecklistCount'),
  dailyChecklistItems: document.getElementById('dailyChecklistItems'),
  weeklyPrevBtn: document.getElementById('weeklyPrevBtn'),
  weeklyNextBtn: document.getElementById('weeklyNextBtn'),
  weeklyJumpTodayBtn: document.getElementById('weeklyJumpTodayBtn'),
  weeklyAddTaskBtn: document.getElementById('weeklyAddTaskBtn'),
  weeklyRangeTitle: document.getElementById('weeklyRangeTitle'),
  weeklyRangeSubtitle: document.getElementById('weeklyRangeSubtitle'),
  weeklyBoardGrid: document.getElementById('weeklyBoardGrid'),
  monthPrevBtn: document.getElementById('monthPrevBtn'),
  monthNextBtn: document.getElementById('monthNextBtn'),
  monthJumpTodayBtn: document.getElementById('monthJumpTodayBtn'),
  monthAddTaskBtn: document.getElementById('monthAddTaskBtn'),
  monthViewTitle: document.getElementById('monthViewTitle'),
  monthViewSubtitle: document.getElementById('monthViewSubtitle'),
  calendarDaysGrid: document.getElementById('calendarDaysGrid'),
  monthDayInspector: document.getElementById('monthDayInspector'),
  inspectorDateTitle: document.getElementById('inspectorDateTitle'),
  inspectorTaskList: document.getElementById('inspectorTaskList'),
  closeInspectorBtn: document.getElementById('closeInspectorBtn'),
  pomoModeButtons: document.querySelectorAll('.pomo-mode-btn'),
  timerProgressCircle: document.getElementById('timerProgressCircle'),
  timerDigits: document.getElementById('timerDigits'),
  timerStateLabel: document.getElementById('timerStateLabel'),
  currentFocusTaskName: document.getElementById('currentFocusTaskName'),
  activeFocusTaskPill: document.getElementById('activeFocusTaskPill'),
  timerToggleBtn: document.getElementById('timerToggleBtn'),
  timerToggleText: document.getElementById('timerToggleText'),
  timerPlayIcon: document.getElementById('timerPlayIcon'),
  timerPauseIcon: document.getElementById('timerPauseIcon'),
  timerResetBtn: document.getElementById('timerResetBtn'),
  timerSkipBtn: document.getElementById('timerSkipBtn'),
  timerTaskSelect: document.getElementById('timerTaskSelect'),
  soundButtons: document.querySelectorAll('.btn-sound'),
  customFocusMins: document.getElementById('customFocusMins'),
  customShortBreakMins: document.getElementById('customShortBreakMins'),
  customLongBreakMins: document.getElementById('customLongBreakMins'),
  autoStartBreaksCheckbox: document.getElementById('autoStartBreaksCheckbox'),
  soundNotificationCheckbox: document.getElementById('soundNotificationCheckbox'),
  pomoTodayCompleted: document.getElementById('pomoTodayCompleted'),
  pomoTotalMinsToday: document.getElementById('pomoTotalMinsToday'),
  dynamicStudyTip: document.getElementById('dynamicStudyTip'),
  
  // Exam Countdown & Notes
  addExamBtn: document.getElementById('addExamBtn'),
  examCardsGrid: document.getElementById('examCardsGrid'),
  examModal: document.getElementById('examModal'),
  examForm: document.getElementById('examForm'),
  closeExamModalBtn: document.getElementById('closeExamModalBtn'),
  cancelExamModalBtn: document.getElementById('cancelExamModalBtn'),
  examTitleInput: document.getElementById('examTitleInput'),
  examSubjectInput: document.getElementById('examSubjectInput'),
  examDateInput: document.getElementById('examDateInput'),
  studentQuickNotesArea: document.getElementById('studentQuickNotesArea'),
  clearNotesBtn: document.getElementById('clearNotesBtn'),

  // Auth Elements
  openAuthModalBtn: document.getElementById('openAuthModalBtn'),
  userProfileWidget: document.getElementById('userProfileWidget'),
  userAvatarPill: document.getElementById('userAvatarPill'),
  userAvatarImg: document.getElementById('userAvatarImg'),
  userAvatarInitials: document.getElementById('userAvatarInitials'),
  userDisplayName: document.getElementById('userDisplayName'),
  profileDropdown: document.getElementById('profileDropdown'),
  dropdownUserEmail: document.getElementById('dropdownUserEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
  authModal: document.getElementById('authModal'),
  authModalTitle: document.getElementById('authModalTitle'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  tabSignInBtn: document.getElementById('tabSignInBtn'),
  tabSignUpBtn: document.getElementById('tabSignUpBtn'),
  googleSignInBtn: document.getElementById('googleSignInBtn'),
  authForm: document.getElementById('authForm'),
  authAlertBox: document.getElementById('authAlertBox'),
  nameFieldGroup: document.getElementById('nameFieldGroup'),
  authNameInput: document.getElementById('authNameInput'),
  authEmailInput: document.getElementById('authEmailInput'),
  authPasswordInput: document.getElementById('authPasswordInput'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authSubmitBtnText: document.getElementById('authSubmitBtnText'),
  forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),

  // Analytics
  analyticsOverallPercentage: document.getElementById('analyticsOverallPercentage'),
  analyticsProgressBar: document.getElementById('analyticsProgressBar'),
  analyticsCompletedCount: document.getElementById('analyticsCompletedCount'),
  analyticsPendingCount: document.getElementById('analyticsPendingCount'),
  analyticsTotalCount: document.getElementById('analyticsTotalCount'),
  analyticsSubjectBreakdown: document.getElementById('analyticsSubjectBreakdown'),
  barHighPriority: document.getElementById('barHighPriority'),
  barMedPriority: document.getElementById('barMedPriority'),
  barLowPriority: document.getElementById('barLowPriority'),
  countHighPriority: document.getElementById('countHighPriority'),
  countMedPriority: document.getElementById('countMedPriority'),
  countLowPriority: document.getElementById('countLowPriority'),
  
  // Task Modal
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
  cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),
  saveTaskBtnText: document.getElementById('saveTaskBtnText'),
  editTaskId: document.getElementById('editTaskId'),
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskSubjectInput: document.getElementById('taskSubjectInput'),
  taskPriorityInput: document.getElementById('taskPriorityInput'),
  taskDateInput: document.getElementById('taskDateInput'),
  taskTimeInput: document.getElementById('taskTimeInput'),
  taskDurationInput: document.getElementById('taskDurationInput'),
  taskPomoEstimate: document.getElementById('taskPomoEstimate'),
  pomoDecBtn: document.getElementById('pomoDecBtn'),
  pomoIncBtn: document.getElementById('pomoIncBtn'),
  pomoCalcHint: document.getElementById('pomoCalcHint'),
  taskNotesInput: document.getElementById('taskNotesInput'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataInput: document.getElementById('importDataInput'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  toastContainer: document.getElementById('toastContainer'),
  confettiCanvas: document.getElementById('confettiCanvas')
};

// ==========================================
// INITIALIZATION & AUTH OBSERVER
// ==========================================
function init() {
  loadSettings();
  loadTasksLocal();
  loadExamsLocal();
  loadNotesLocal();
  loadPomodoroStats();
  calculateStreak();
  setupEventListeners();
  updateDateDisplay();
  renderAll();
  
  if (dom.dynamicStudyTip) {
    dom.dynamicStudyTip.textContent = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
  }

  // Setup Firebase Auth State Listener
  setupFirebaseAuthObserver();
}

function setupFirebaseAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.currentUser = user;
      updateAuthUI(user);
      await syncFromCloud(user.uid);
      showToast(`Welcome back, ${user.displayName || user.email.split('@')[0]}! ☁️`, 'success');
    } else {
      state.currentUser = null;
      updateAuthUI(null);
    }
  });
}

function updateAuthUI(user) {
  if (user) {
    if (dom.openAuthModalBtn) dom.openAuthModalBtn.classList.add('hidden');
    if (dom.userProfileWidget) dom.userProfileWidget.classList.remove('hidden');

    const displayName = user.displayName || user.email.split('@')[0] || 'Student';
    if (dom.userDisplayName) dom.userDisplayName.textContent = displayName;
    if (dom.dropdownUserEmail) dom.dropdownUserEmail.textContent = user.email || displayName;

    if (user.photoURL) {
      dom.userAvatarImg.src = user.photoURL;
      dom.userAvatarImg.classList.remove('hidden');
      dom.userAvatarInitials.classList.add('hidden');
    } else {
      dom.userAvatarInitials.textContent = displayName.charAt(0).toUpperCase();
      dom.userAvatarInitials.classList.remove('hidden');
      dom.userAvatarImg.classList.add('hidden');
    }
  } else {
    if (dom.openAuthModalBtn) dom.openAuthModalBtn.classList.remove('hidden');
    if (dom.userProfileWidget) dom.userProfileWidget.classList.add('hidden');
    if (dom.profileDropdown) dom.profileDropdown.classList.add('hidden');
  }
}

// ==========================================
// CLOUD FIRESTORE SYNC LOGIC
// ==========================================
async function syncToCloud() {
  if (!state.currentUser) return;
  try {
    const userDocRef = doc(db, "users", state.currentUser.uid);
    const dataToSave = {
      tasks: state.tasks,
      exams: state.exams,
      quickNotes: state.quickNotes,
      pomodoroStats: JSON.parse(localStorage.getItem(STORAGE_KEYS.POMO_STATS) || '{}'),
      streak: state.streakDays,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, dataToSave, { merge: true });
  } catch (error) {
    console.warn("Cloud sync error:", error);
  }
}

async function syncFromCloud(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      if (Array.isArray(cloudData.tasks)) {
        state.tasks = cloudData.tasks;
        saveTasksLocalOnly();
      }
      if (Array.isArray(cloudData.exams)) {
        state.exams = cloudData.exams;
        saveExamsLocalOnly();
      }
      if (typeof cloudData.quickNotes === 'string') {
        state.quickNotes = cloudData.quickNotes;
        saveNotesLocalOnly();
      }
      if (cloudData.pomodoroStats) {
        localStorage.setItem(STORAGE_KEYS.POMO_STATS, JSON.stringify(cloudData.pomodoroStats));
        loadPomodoroStats();
      }
      renderAll();
    } else {
      // First time login: Upload existing local tasks to the cloud
      await syncToCloud();
    }
  } catch (error) {
    console.warn("Cloud read error:", error);
  }
}

// ==========================================
// LOCAL STORAGE & DATA HANDLING
// ==========================================
function loadTasksLocal() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (data) {
      state.tasks = JSON.parse(data);
    } else {
      loadSampleTasks();
    }
  } catch (e) {
    state.tasks = [];
  }
}

function saveTasks() {
  saveTasksLocalOnly();
  syncToCloud();
}

function saveTasksLocalOnly() {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
    populateSubjectDropdowns();
    populateTimerTaskSelect();
  } catch (e) {}
}

function loadExamsLocal() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (data) {
      state.exams = JSON.parse(data);
    } else {
      const today = new Date();
      const exam1 = new Date(today); exam1.setDate(exam1.getDate() + 14);
      const exam2 = new Date(today); exam2.setDate(exam2.getDate() + 28);
      state.exams = [
        { id: 'ex_1', title: 'Mathematics Final Term Examination', subject: 'Mathematics', date: formatDateISO(exam1) },
        { id: 'ex_2', title: 'Physics & Lab Theory Practical Exam', subject: 'Physics', date: formatDateISO(exam2) }
      ];
      saveExamsLocalOnly();
    }
  } catch (e) {
    state.exams = [];
  }
}

function saveExams() {
  saveExamsLocalOnly();
  syncToCloud();
}

function saveExamsLocalOnly() {
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(state.exams));
  if (dom.sidebarExamBadge) dom.sidebarExamBadge.textContent = `${state.exams.length} Exams`;
}

function loadNotesLocal() {
  state.quickNotes = localStorage.getItem(STORAGE_KEYS.NOTES) || '📚 Quick Formulas & Notes:\n- Calculus: ∫(u·v\') = u·v - ∫(u\'·v)\n- Physics: F = m·a, Kinetic Energy = 1/2·m·v²\n- CS: Binary Search Complexity = O(log N)';
  if (dom.studentQuickNotesArea) dom.studentQuickNotesArea.value = state.quickNotes;
}

function saveNotes() {
  if (dom.studentQuickNotesArea) {
    state.quickNotes = dom.studentQuickNotesArea.value;
    saveNotesLocalOnly();
    syncToCloud();
  }
}

function saveNotesLocalOnly() {
  localStorage.setItem(STORAGE_KEYS.NOTES, state.quickNotes);
}

function loadSettings() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  setTheme(savedTheme);

  try {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      state.pomodoro.durations = parsed.durations || state.pomodoro.durations;
      state.pomodoro.autoStart = parsed.autoStart || false;
      state.pomodoro.soundNotification = parsed.soundNotification !== undefined ? parsed.soundNotification : true;

      if (dom.customFocusMins) dom.customFocusMins.value = state.pomodoro.durations.pomodoro;
      if (dom.customShortBreakMins) dom.customShortBreakMins.value = state.pomodoro.durations.shortBreak;
      if (dom.customLongBreakMins) dom.customLongBreakMins.value = state.pomodoro.durations.longBreak;
      if (dom.autoStartBreaksCheckbox) dom.autoStartBreaksCheckbox.checked = state.pomodoro.autoStart;
      if (dom.soundNotificationCheckbox) dom.soundNotificationCheckbox.checked = state.pomodoro.soundNotification;
    }
  } catch (e) {}
}

function saveSettings() {
  const settings = {
    durations: state.pomodoro.durations,
    autoStart: state.pomodoro.autoStart,
    soundNotification: state.pomodoro.soundNotification
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function loadPomodoroStats() {
  try {
    const todayKey = formatDateISO(new Date());
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.POMO_STATS) || '{}');
    const todayStats = stats[todayKey] || { completed: 0, minutes: 0 };
    state.pomodoro.todayCompleted = todayStats.completed;
    state.pomodoro.todayMinutes = todayStats.minutes;
  } catch (e) {
    state.pomodoro.todayCompleted = 0;
    state.pomodoro.todayMinutes = 0;
  }
}

function recordPomodoroSession(minutes) {
  const todayKey = formatDateISO(new Date());
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.POMO_STATS) || '{}');
  if (!stats[todayKey]) stats[todayKey] = { completed: 0, minutes: 0 };
  stats[todayKey].completed += 1;
  stats[todayKey].minutes += minutes;

  localStorage.setItem(STORAGE_KEYS.POMO_STATS, JSON.stringify(stats));
  state.pomodoro.todayCompleted = stats[todayKey].completed;
  state.pomodoro.todayMinutes = stats[todayKey].minutes;

  if (state.pomodoro.activeTaskId) {
    const task = state.tasks.find(t => t.id === state.pomodoro.activeTaskId);
    if (task) {
      task.pomodorosCompleted = (task.pomodorosCompleted || 0) + 1;
      saveTasks();
    }
  }
  syncToCloud();
  renderStats();
  renderPomodoroView();
}

function calculateStreak() {
  try {
    let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '3', 10);
    state.streakDays = streak;
    if (dom.streakDays) dom.streakDays.textContent = streak;
  } catch (e) {
    state.streakDays = 1;
  }
}

function loadSampleTasks() {
  const today = new Date();
  const isoToday = formatDateISO(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isoTomorrow = formatDateISO(tomorrow);

  state.tasks = [
    {
      id: 'task_' + Date.now() + '_1',
      title: 'Master Calculus: Integration by Parts & Formulas',
      subject: 'Mathematics',
      priority: 'high',
      date: isoToday,
      time: '09:00',
      duration: 60,
      completed: false,
      pomodorosEstimated: 3,
      pomodorosCompleted: 1,
      notes: 'Solve exercises #15 to #32 on page 248. Focus on substitution techniques.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_' + Date.now() + '_2',
      title: 'Implement Binary Search Tree & Graph Traversal in JS',
      subject: 'Computer Science',
      priority: 'high',
      date: isoToday,
      time: '14:00',
      duration: 90,
      completed: false,
      pomodorosEstimated: 4,
      pomodorosCompleted: 0,
      notes: 'Write DFS & BFS algorithms. Check edge cases with cyclic graphs.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_' + Date.now() + '_3',
      title: 'Review Classical Mechanics: Newton\'s Laws',
      subject: 'Physics',
      priority: 'medium',
      date: isoToday,
      time: '17:00',
      duration: 45,
      completed: true,
      pomodorosEstimated: 2,
      pomodorosCompleted: 2,
      notes: 'Review angular momentum lecture slides.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_' + Date.now() + '_4',
      title: 'Draft Essay Introduction: Shakespeare\'s Hamlet Themes',
      subject: 'Literature',
      priority: 'medium',
      date: isoTomorrow,
      time: '11:00',
      duration: 45,
      completed: false,
      pomodorosEstimated: 2,
      pomodorosCompleted: 0,
      notes: 'Outline thesis statement exploring existential themes.',
      createdAt: new Date().toISOString()
    }
  ];

  saveTasks();
}

function applyTemplate(type) {
  const today = new Date();
  const isoToday = formatDateISO(today);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  let templateTasks = [];

  if (type === 'exam') {
    templateTasks = [
      { id: 't_' + Date.now() + '_1', title: 'Chapter 1-3 Quick Summary & Concept Flashcards', subject: 'Mathematics', priority: 'high', date: isoToday, time: '09:00', duration: 60, pomodorosEstimated: 3, pomodorosCompleted: 0, notes: 'Write one-page cheat sheet for key formulas.', completed: false, createdAt: new Date().toISOString() },
      { id: 't_' + Date.now() + '_2', title: 'Solve 5 Past-Year Exam Papers (Timed Mock Test)', subject: 'Physics', priority: 'high', date: isoToday, time: '14:00', duration: 120, pomodorosEstimated: 4, pomodorosCompleted: 0, notes: 'Time strictly under 2 hours without looking at solutions.', completed: false, createdAt: new Date().toISOString() },
      { id: 't_' + Date.now() + '_3', title: 'Identify Weak Topics & Spaced Revision', subject: 'Computer Science', priority: 'medium', date: formatDateISO(tomorrow), time: '10:00', duration: 45, pomodorosEstimated: 2, pomodorosCompleted: 0, notes: 'Re-solve mistakes from previous test.', completed: false, createdAt: new Date().toISOString() }
    ];
    showToast('Loaded 7-Day Exam Revision Routine! 📝', 'success');
  } else if (type === 'daily') {
    templateTasks = [
      { id: 't_' + Date.now() + '_1', title: 'Morning Deep Focus Block (Hardest Subject First)', subject: 'Mathematics', priority: 'high', date: isoToday, time: '08:30', duration: 90, pomodorosEstimated: 3, pomodorosCompleted: 0, notes: 'No phone / distraction-free morning study block.', completed: false, createdAt: new Date().toISOString() },
      { id: 't_' + Date.now() + '_2', title: 'Midday Assignment & Problem Solving', subject: 'Physics', priority: 'medium', date: isoToday, time: '13:30', duration: 60, pomodorosEstimated: 2, pomodorosCompleted: 0, notes: 'Complete lab report exercises.', completed: false, createdAt: new Date().toISOString() },
      { id: 't_' + Date.now() + '_3', title: 'Evening Active Recall & Flashcard Review', subject: 'Biology', priority: 'low', date: isoToday, time: '18:00', duration: 45, pomodorosEstimated: 2, pomodorosCompleted: 0, notes: 'Active recall on today\'s lecture topics.', completed: false, createdAt: new Date().toISOString() }
    ];
    showToast('Loaded Daily 4-Hour Study Routine! ⏰', 'success');
  } else if (type === 'weekend') {
    templateTasks = [
      { id: 't_' + Date.now() + '_1', title: 'Clear Pending Homework & Project Backlog', subject: 'Computer Science', priority: 'high', date: isoToday, time: '10:00', duration: 120, pomodorosEstimated: 4, pomodorosCompleted: 0, notes: 'Submit final draft before Sunday midnight.', completed: false, createdAt: new Date().toISOString() },
      { id: 't_' + Date.now() + '_2', title: 'Organize Next Week\'s Study Schedule & Goals', subject: 'General', priority: 'medium', date: formatDateISO(tomorrow), time: '16:00', duration: 30, pomodorosEstimated: 1, pomodorosCompleted: 0, notes: 'Plan chapters for upcoming week.', completed: false, createdAt: new Date().toISOString() }
    ];
    showToast('Loaded Weekend Sprint Plan! 🚀', 'success');
  }

  state.tasks = [...templateTasks, ...state.tasks];
  saveTasks();
  renderAll();
}

// ==========================================
// VIEW NAVIGATION & THEME
// ==========================================
function switchView(viewName) {
  if (!viewName) return;
  state.currentView = viewName;

  dom.navItems.forEach(item => {
    if (item.dataset.view === viewName) item.classList.add('active');
    else item.classList.remove('active');
  });

  dom.viewPanels.forEach(panel => {
    if (panel.id === `view-${viewName}`) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  const titles = {
    dashboard: { title: 'All Study Tasks', sub: 'Manage, organize, and filter your study schedule' },
    daily: { title: 'Daily Schedule', sub: 'Hourly time-block timeline and day checklist' },
    weekly: { title: 'Weekly Planner', sub: '7-Day study distribution and workload overview' },
    monthly: { title: 'Monthly Calendar', sub: 'Full calendar schedule with subject dots' },
    pomodoro: { title: 'Pomodoro Focus Timer', sub: 'Deep work interval station with ambient study sounds' },
    examCountdown: { title: 'Exam Countdown Tracker', sub: 'Stay prepared with target days remaining' },
    quickNotes: { title: 'Study Notes & Formulas', sub: 'Your instant scratchpad for key notes and equations' },
    analytics: { title: 'Study Analytics', sub: 'Track completion metrics, subject balance, and streak' }
  };

  if (titles[viewName]) {
    dom.pageHeading.textContent = titles[viewName].title;
    dom.pageSubHeading.textContent = titles[viewName].sub;
  }

  closeMobileSidebar();
  renderAll();
}

function openMobileSidebar() {
  dom.sidebar.classList.add('mobile-open');
  dom.sidebarBackdrop.classList.add('active');
}

function closeMobileSidebar() {
  dom.sidebar.classList.remove('mobile-open');
  dom.sidebarBackdrop.classList.remove('active');
}

function setTheme(theme) {
  state.theme = theme;
  dom.html.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  showToast(`Switched to ${nextTheme} mode`, 'info');
}

// ==========================================
// FIREBASE AUTHENTICATION HANDLERS
// ==========================================
function openAuthModal(mode = 'signin') {
  setAuthTab(mode);
  clearAuthAlert();
  dom.authForm.reset();
  dom.authModal.showModal();
}

function closeAuthModal() {
  dom.authModal.close();
  clearAuthAlert();
}

function setAuthTab(mode) {
  state.authMode = mode;
  clearAuthAlert();
  if (mode === 'signin') {
    dom.tabSignInBtn.classList.add('active');
    dom.tabSignUpBtn.classList.remove('active');
    dom.authModalTitle.textContent = 'Sign In to StudyFlow';
    dom.authSubmitBtnText.textContent = 'Sign In';
    dom.nameFieldGroup.classList.add('hidden');
    dom.authNameInput.removeAttribute('required');
  } else {
    dom.tabSignUpBtn.classList.add('active');
    dom.tabSignInBtn.classList.remove('active');
    dom.authModalTitle.textContent = 'Create Free Account';
    dom.authSubmitBtnText.textContent = 'Create Account';
    dom.nameFieldGroup.classList.remove('hidden');
    dom.authNameInput.setAttribute('required', 'true');
  }
}

function showAuthAlert(message, type = 'error') {
  dom.authAlertBox.textContent = message;
  dom.authAlertBox.className = `auth-alert ${type}`;
  dom.authAlertBox.classList.remove('hidden');
}

function clearAuthAlert() {
  dom.authAlertBox.textContent = '';
  dom.authAlertBox.classList.add('hidden');
}

async function handleGoogleSignIn() {
  try {
    clearAuthAlert();
    const result = await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    showAuthAlert(getFriendlyAuthErrorMessage(error.code));
  }
}

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  clearAuthAlert();

  const email = dom.authEmailInput.value.trim();
  const password = dom.authPasswordInput.value;
  const name = dom.authNameInput.value.trim();

  dom.authSubmitBtn.disabled = true;
  dom.authSubmitBtnText.textContent = 'Processing...';

  try {
    if (state.authMode === 'signup') {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      closeAuthModal();
      showToast(`Account created! Welcome, ${name || email}! 🎉`, 'success');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    }
  } catch (error) {
    showAuthAlert(getFriendlyAuthErrorMessage(error.code));
  } finally {
    dom.authSubmitBtn.disabled = false;
    dom.authSubmitBtnText.textContent = state.authMode === 'signup' ? 'Create Account' : 'Sign In';
  }
}

async function handleForgotPassword() {
  const email = dom.authEmailInput.value.trim();
  if (!email) {
    showAuthAlert('Please enter your email address first', 'error');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showAuthAlert(`Password reset link sent to ${email}! Check your inbox.`, 'success');
  } catch (error) {
    showAuthAlert(getFriendlyAuthErrorMessage(error.code));
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    dom.profileDropdown.classList.add('hidden');
    showToast('Signed out successfully', 'info');
  } catch (error) {
    showToast('Error signing out', 'error');
  }
}

function getFriendlyAuthErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': case 'auth/invalid-credential': return 'Incorrect password or email. Please try again.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password': return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user': return 'Google Sign-in was cancelled.';
    case 'auth/operation-not-allowed': return 'Sign-in method not enabled in Firebase console yet.';
    default: return 'Authentication failed. Please check your credentials.';
  }
}

// ==========================================
// TASK MANAGEMENT
// ==========================================
function openCreateTaskModal(defaultDate = null, defaultTime = null) {
  dom.taskForm.reset();
  dom.editTaskId.value = '';
  dom.taskModalTitle.textContent = 'Create Study Task';
  dom.saveTaskBtnText.textContent = 'Save Task';
  
  dom.taskDateInput.value = defaultDate ? defaultDate : formatDateISO(new Date());
  if (defaultTime) dom.taskTimeInput.value = defaultTime;
  
  dom.taskPomoEstimate.value = 2;
  updatePomoCalcHint();
  dom.taskModal.showModal();
  setTimeout(() => dom.taskTitleInput.focus(), 50);
}

function openEditTaskModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  dom.editTaskId.value = task.id;
  dom.taskTitleInput.value = task.title;
  dom.taskSubjectInput.value = task.subject;
  dom.taskPriorityInput.value = task.priority;
  dom.taskDateInput.value = task.date;
  dom.taskTimeInput.value = task.time || '';
  dom.taskDurationInput.value = task.duration || 45;
  dom.taskPomoEstimate.value = task.pomodorosEstimated || 2;
  dom.taskNotesInput.value = task.notes || '';

  dom.taskModalTitle.textContent = 'Edit Study Task';
  dom.saveTaskBtnText.textContent = 'Update Task';
  updatePomoCalcHint();
  dom.taskModal.showModal();
}

function closeTaskModal() {
  dom.taskModal.close();
}

function handleTaskFormSubmit(e) {
  e.preventDefault();

  const id = dom.editTaskId.value;
  const title = dom.taskTitleInput.value.trim();
  const subject = dom.taskSubjectInput.value.trim() || 'General';
  const priority = dom.taskPriorityInput.value;
  const date = dom.taskDateInput.value;
  const time = dom.taskTimeInput.value;
  const duration = parseInt(dom.taskDurationInput.value, 10) || 45;
  const pomodorosEstimated = parseInt(dom.taskPomoEstimate.value, 10) || 1;
  const notes = dom.taskNotesInput.value.trim();

  if (!title || !date) {
    showToast('Please provide a title and due date', 'error');
    return;
  }

  if (id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      state.tasks[taskIndex] = {
        ...state.tasks[taskIndex],
        title, subject, priority, date, time, duration, pomodorosEstimated, notes
      };
      showToast('Study task updated!', 'success');
    }
  } else {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      title, subject, priority, date, time, duration,
      completed: false,
      pomodorosEstimated,
      pomodorosCompleted: 0,
      notes,
      createdAt: new Date().toISOString()
    };
    state.tasks.unshift(newTask);
    showToast('New study task added!', 'success');
  }

  saveTasks();
  closeTaskModal();
  renderAll();
}

function toggleTaskComplete(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderAll();

  if (task.completed) {
    playChimeSound(660, 880);
    triggerConfetti();
    showToast(`Completed: "${task.title}" 🎉`, 'success');
  } else {
    showToast(`Marked as pending: "${task.title}"`, 'info');
  }
}

function deleteTask(taskId) {
  const taskIndex = state.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  const deletedTask = state.tasks[taskIndex];
  state.tasks.splice(taskIndex, 1);
  saveTasks();
  renderAll();

  showToast(`Task deleted`, 'info', {
    undoText: 'Undo',
    onUndo: () => {
      state.tasks.splice(taskIndex, 0, deletedTask);
      saveTasks();
      renderAll();
      showToast('Task restored!', 'success');
    }
  });
}

function markAllComplete() {
  const pendingTasks = getFilteredTasks().filter(t => !t.completed);
  if (pendingTasks.length === 0) {
    showToast('All visible tasks are already completed!', 'info');
    return;
  }

  pendingTasks.forEach(t => t.completed = true);
  saveTasks();
  renderAll();
  triggerConfetti();
  showToast(`Marked ${pendingTasks.length} tasks as completed! 🚀`, 'success');
}

function getFilteredTasks() {
  let result = [...state.tasks];

  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    result = result.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  if (state.filters.status === 'pending') {
    result = result.filter(t => !t.completed);
  } else if (state.filters.status === 'completed') {
    result = result.filter(t => t.completed);
  }

  if (state.filters.priority !== 'all') {
    result = result.filter(t => t.priority === state.filters.priority);
  }

  if (state.filters.subject !== 'all') {
    result = result.filter(t => t.subject === state.filters.subject);
  }

  result.sort((a, b) => {
    switch (state.filters.sort) {
      case 'date-asc':
        return (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '');
      case 'date-desc':
        return (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || '');
      case 'priority-desc': {
        const rank = { high: 3, medium: 2, low: 1 };
        return (rank[b.priority] || 0) - (rank[a.priority] || 0);
      }
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'created-desc':
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      default:
        return 0;
    }
  });

  return result;
}

function renderAll() {
  renderCounters();
  renderStats();
  renderFilterChips();

  switch (state.currentView) {
    case 'dashboard': renderDashboardTaskList(); break;
    case 'daily': renderDailySchedule(); break;
    case 'weekly': renderWeeklyPlanner(); break;
    case 'monthly': renderMonthlyCalendar(); break;
    case 'pomodoro': renderPomodoroView(); break;
    case 'examCountdown': renderExamCountdown(); break;
    case 'quickNotes': loadNotesLocal(); break;
    case 'analytics': renderAnalyticsView(); break;
  }
}

function renderCounters() {
  const total = state.tasks.length;
  const todayStr = formatDateISO(new Date());
  const todayTasks = state.tasks.filter(t => t.date === todayStr && !t.completed);

  if (dom.navAllCount) dom.navAllCount.textContent = total;
  if (dom.navTodayCount) dom.navTodayCount.textContent = todayTasks.length;
  if (dom.sidebarExamBadge) dom.sidebarExamBadge.textContent = `${state.exams.length} Exams`;
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const highPriority = state.tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (dom.statTotalTasks) dom.statTotalTasks.textContent = total;
  if (dom.statCompletedTasks) dom.statCompletedTasks.textContent = completed;
  if (dom.statCompletionBar) dom.statCompletionBar.style.width = `${percentage}%`;
  if (dom.statPendingHint) dom.statPendingHint.textContent = `${pending} tasks pending`;
  if (dom.statHighPriority) dom.statHighPriority.textContent = highPriority;
  
  if (dom.statPomodoroCount) dom.statPomodoroCount.textContent = state.pomodoro.todayCompleted;
  if (dom.statFocusTimeHint) {
    const hours = Math.floor(state.pomodoro.todayMinutes / 60);
    const mins = state.pomodoro.todayMinutes % 60;
    dom.statFocusTimeHint.textContent = `${hours}h ${mins}m studied today`;
  }
}

function renderDashboardTaskList() {
  const filtered = getFilteredTasks();
  dom.visibleTaskCountBadge.textContent = `${filtered.length} task${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    dom.taskListContainer.innerHTML = '';
    dom.tasksEmptyState.classList.remove('hidden');
    return;
  }

  dom.tasksEmptyState.classList.add('hidden');
  dom.taskListContainer.innerHTML = filtered.map(task => createTaskCardHTML(task)).join('');
}

function createTaskCardHTML(task) {
  const subjectColor = getSubjectColor(task.subject);
  const isCompleted = task.completed;
  const priorityClass = `priority-${task.priority}`;
  const priorityBadgeClass = `badge-${task.priority}`;

  const dateFormatted = formatHumanDate(task.date);
  const timeFormatted = task.time ? formatTimeAmPm(task.time) : '';
  const durationFormatted = task.duration ? `${task.duration}m` : '';

  return `
    <div class="task-item ${priorityClass} ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
      <label class="task-checkbox-wrap" title="Toggle Completion">
        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} onchange="window.studyFlow.toggleTask('${task.id}')">
      </label>

      <div class="task-main-info" onclick="window.studyFlow.editTask('${task.id}')" style="cursor: pointer;">
        <div class="task-title-row">
          <span class="task-title-text">${escapeHTML(task.title)}</span>
        </div>

        <div class="task-meta-row">
          <span class="task-badge-subject" style="background-color: ${subjectColor};">
            ${escapeHTML(task.subject)}
          </span>
          <span class="task-badge-priority ${priorityBadgeClass}">
            ${task.priority === 'high' ? '🔥 High' : task.priority === 'medium' ? '⚡ Med' : '🌱 Low'}
          </span>

          <span class="task-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${dateFormatted} ${timeFormatted ? `at ${timeFormatted}` : ''}
          </span>

          ${durationFormatted ? `
            <span class="task-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${durationFormatted}
            </span>
          ` : ''}

          <span class="task-pomo-badge" title="Pomodoros: Completed / Estimated">
            🍅 ${task.pomodorosCompleted || 0}/${task.pomodorosEstimated || 1}
          </span>
        </div>

        ${task.notes ? `
          <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%;">
            📝 ${escapeHTML(task.notes)}
          </p>
        ` : ''}
      </div>

      <div class="task-actions">
        <button class="btn-task-action action-focus" title="Start Focus Pomodoro" onclick="window.studyFlow.startTaskFocus('${task.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path></svg>
        </button>
        <button class="btn-task-action" title="Edit Task" onclick="window.studyFlow.editTask('${task.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-task-action action-delete" title="Delete Task" onclick="window.studyFlow.deleteTask('${task.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `;
}

function renderFilterChips() {
  const chips = [];
  if (state.filters.search) chips.push({ key: 'search', label: `Search: "${state.filters.search}"` });
  if (state.filters.status !== 'all') chips.push({ key: 'status', label: `Status: ${state.filters.status}` });
  if (state.filters.priority !== 'all') chips.push({ key: 'priority', label: `Priority: ${state.filters.priority}` });
  if (state.filters.subject !== 'all') chips.push({ key: 'subject', label: `Subject: ${state.filters.subject}` });

  if (chips.length > 0) {
    dom.activeFiltersRow.classList.remove('hidden');
    dom.filterChipsContainer.innerHTML = chips.map(c => `
      <span class="filter-chip">
        ${escapeHTML(c.label)}
        <span class="filter-chip-remove" onclick="window.studyFlow.removeFilter('${c.key}')">&times;</span>
      </span>
    `).join('');
  } else {
    dom.activeFiltersRow.classList.add('hidden');
    dom.filterChipsContainer.innerHTML = '';
  }
}

function renderDailySchedule() {
  const dateStr = formatDateISO(state.selectedDailyDate);
  const dayName = state.selectedDailyDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedTitle = state.selectedDailyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  dom.dailyViewDateTitle.textContent = `${isSameDate(state.selectedDailyDate, new Date()) ? 'Today, ' : ''}${formattedTitle}`;
  dom.dailyViewDateSubtitle.textContent = dayName;
  dom.dailyDatePicker.value = dateStr;

  const dayTasks = state.tasks.filter(t => t.date === dateStr);
  const scheduledTasks = dayTasks.filter(t => t.time);

  dom.dailyScheduleCount.textContent = `${scheduledTasks.length} Scheduled`;
  dom.dailyChecklistCount.textContent = `${dayTasks.length} Tasks`;

  let timelineHTML = '';
  for (let hour = 6; hour <= 23; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    const timeLabel = formatHourLabel(hour);
    const tasksInHour = scheduledTasks.filter(t => parseInt(t.time.split(':')[0], 10) === hour);

    timelineHTML += `
      <div class="timeline-slot" data-hour="${hourStr}:00">
        <span class="timeline-time">${timeLabel}</span>
        <div class="timeline-tasks-container">
          ${tasksInHour.length > 0 ? tasksInHour.map(t => `
            <div class="timeline-task-pill ${t.completed ? 'completed' : ''}" 
                 style="border-left-color: ${getSubjectColor(t.subject)};"
                 onclick="window.studyFlow.editTask('${t.id}')">
              <span>${escapeHTML(t.title)} (${t.time} - ${t.duration || 45}m)</span>
              <span class="badge-${t.priority}" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 9999px;">${t.priority}</span>
            </div>
          `).join('') : `
            <span class="timeline-empty-slot" onclick="window.studyFlow.openNewTask('${dateStr}', '${hourStr}:00')">
              + Add study task at ${timeLabel}
            </span>
          `}
        </div>
      </div>
    `;
  }
  dom.dailyTimelineList.innerHTML = timelineHTML;

  if (dayTasks.length === 0) {
    dom.dailyChecklistItems.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        <p>No tasks scheduled for this day.</p>
        <button class="btn-secondary btn-block" style="margin-top: 12px;" onclick="window.studyFlow.openNewTask('${dateStr}')">
          + Add Task to ${dayName}
        </button>
      </div>
    `;
  } else {
    dom.dailyChecklistItems.innerHTML = dayTasks.map(t => createTaskCardHTML(t)).join('');
  }
}

function renderWeeklyPlanner() {
  const startOfWeek = state.selectedWeekStartDate;
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  dom.weeklyRangeTitle.textContent = `Week of ${startStr} - ${endStr}`;

  const daysHTML = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(currentDay.getDate() + i);
    const isoDay = formatDateISO(currentDay);
    const isToday = isSameDate(currentDay, today);
    const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = currentDay.getDate();
    const tasksForDay = state.tasks.filter(t => t.date === isoDay);

    daysHTML.push(`
      <div class="week-column ${isToday ? 'is-today' : ''}" data-date="${isoDay}">
        <div class="week-col-header">
          <div class="week-col-day">${dayName}</div>
          <div class="week-col-num">${dayNum}</div>
        </div>
        <div class="week-col-tasks">
          ${tasksForDay.map(t => `
            <div class="week-task-card ${t.completed ? 'completed' : ''}" 
                 style="border-left: 3px solid ${getSubjectColor(t.subject)};"
                 onclick="window.studyFlow.editTask('${t.id}')">
              <strong>${escapeHTML(t.title)}</strong>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                <span>${t.time || 'All Day'}</span>
                <span>${t.subject}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="week-add-btn" onclick="window.studyFlow.openNewTask('${isoDay}')">
          + Add Task
        </button>
      </div>
    `);
  }

  dom.weeklyBoardGrid.innerHTML = daysHTML.join('');
}

function renderMonthlyCalendar() {
  const targetMonth = state.selectedMonthDate;
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  dom.monthViewTitle.textContent = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const todayISO = formatDateISO(new Date());

  let cellsHTML = '';

  for (let x = firstDayIndex; x > 0; x--) {
    const prevDate = new Date(year, month - 1, prevMonthDays - x + 1);
    const prevISO = formatDateISO(prevDate);
    cellsHTML += `
      <div class="calendar-day-cell other-month" onclick="window.studyFlow.selectMonthDate('${prevISO}')">
        <span class="cal-day-num">${prevDate.getDate()}</span>
      </div>
    `;
  }

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const thisDate = new Date(year, month, day);
    const thisISO = formatDateISO(thisDate);
    const isToday = thisISO === todayISO;
    const tasksOnDay = state.tasks.filter(t => t.date === thisISO);

    cellsHTML += `
      <div class="calendar-day-cell ${isToday ? 'is-today' : ''}" onclick="window.studyFlow.selectMonthDate('${thisISO}')">
        <span class="cal-day-num">${day}</span>
        <div class="cal-day-dots">
          ${tasksOnDay.slice(0, 5).map(t => `
            <span class="cal-dot" style="background-color: ${getSubjectColor(t.subject)};" title="${escapeHTML(t.title)}"></span>
          `).join('')}
          ${tasksOnDay.length > 5 ? `<span style="font-size: 0.65rem; color: var(--text-muted);">+${tasksOnDay.length - 5}</span>` : ''}
        </div>
      </div>
    `;
  }

  const totalSlots = firstDayIndex + totalDaysInMonth;
  const trailingSlots = (7 - (totalSlots % 7)) % 7;
  for (let y = 1; y <= trailingSlots; y++) {
    const nextDate = new Date(year, month + 1, y);
    const nextISO = formatDateISO(nextDate);
    cellsHTML += `
      <div class="calendar-day-cell other-month" onclick="window.studyFlow.selectMonthDate('${nextISO}')">
        <span class="cal-day-num">${nextDate.getDate()}</span>
      </div>
    `;
  }

  dom.calendarDaysGrid.innerHTML = cellsHTML;
}

function selectMonthDate(isoDate) {
  const tasksOnDate = state.tasks.filter(t => t.date === isoDate);
  const dateObj = new Date(isoDate + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  dom.inspectorDateTitle.textContent = `Tasks for ${formatted} (${tasksOnDate.length})`;
  dom.monthDayInspector.classList.remove('hidden');

  if (tasksOnDate.length === 0) {
    dom.inspectorTaskList.innerHTML = `
      <p style="color: var(--text-muted); margin-bottom: 12px;">No tasks set for this date.</p>
      <button class="btn-primary" onclick="window.studyFlow.openNewTask('${isoDate}')">+ Add Task to this Date</button>
    `;
  } else {
    dom.inspectorTaskList.innerHTML = `
      <div class="task-list" style="margin-bottom: 12px;">
        ${tasksOnDate.map(t => createTaskCardHTML(t)).join('')}
      </div>
      <button class="btn-secondary" onclick="window.studyFlow.openNewTask('${isoDate}')">+ Add Another Task</button>
    `;
  }
}

// ==========================================
// POMODORO FOCUS TIMER
// ==========================================
function renderPomodoroView() {
  updateTimerDisplay();
  populateTimerTaskSelect();
  if (dom.pomoTodayCompleted) dom.pomoTodayCompleted.textContent = state.pomodoro.todayCompleted;
  if (dom.pomoTotalMinsToday) dom.pomoTotalMinsToday.textContent = `${state.pomodoro.todayMinutes}m`;
}

function setPomodoroMode(mode) {
  state.pomodoro.mode = mode;
  if (state.pomodoro.isRunning) toggleTimer(false);

  const durationMins = state.pomodoro.durations[mode] || 25;
  state.pomodoro.totalDuration = durationMins * 60;
  state.pomodoro.timeLeft = state.pomodoro.totalDuration;

  dom.pomoModeButtons.forEach(btn => {
    if (btn.dataset.mode === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  const labels = {
    pomodoro: 'Ready to Focus',
    shortBreak: 'Short Rest Break',
    longBreak: 'Long Recharge Break'
  };
  dom.timerStateLabel.textContent = labels[mode] || 'Ready';
  updateTimerDisplay();
}

function toggleTimer(forcedState = null) {
  const willRun = forcedState !== null ? forcedState : !state.pomodoro.isRunning;
  state.pomodoro.isRunning = willRun;

  if (willRun) {
    dom.timerToggleText.textContent = 'Pause Focus';
    dom.timerPlayIcon.classList.add('hidden');
    dom.timerPauseIcon.classList.remove('hidden');
    dom.quickTimerDot.classList.add('running');
    dom.timerStateLabel.textContent = state.pomodoro.mode === 'pomodoro' ? 'Focusing...' : 'Resting...';

    startAmbientAudio(state.pomodoro.ambientType);

    state.pomodoro.intervalId = setInterval(() => {
      if (state.pomodoro.timeLeft > 0) {
        state.pomodoro.timeLeft -= 1;
        updateTimerDisplay();
      } else {
        handleTimerComplete();
      }
    }, 1000);
  } else {
    clearInterval(state.pomodoro.intervalId);
    dom.timerToggleText.textContent = 'Resume Focus';
    dom.timerPlayIcon.classList.remove('hidden');
    dom.timerPauseIcon.classList.add('hidden');
    dom.quickTimerDot.classList.remove('running');
    dom.timerStateLabel.textContent = 'Paused';
    stopAmbientAudio();
  }
}

function resetTimer() {
  if (state.pomodoro.isRunning) toggleTimer(false);
  const durationMins = state.pomodoro.durations[state.pomodoro.mode] || 25;
  state.pomodoro.totalDuration = durationMins * 60;
  state.pomodoro.timeLeft = state.pomodoro.totalDuration;
  dom.timerToggleText.textContent = 'Start Session';
  updateTimerDisplay();
}

function skipTimer() {
  if (state.pomodoro.mode === 'pomodoro') setPomodoroMode('shortBreak');
  else setPomodoroMode('pomodoro');
}

function handleTimerComplete() {
  clearInterval(state.pomodoro.intervalId);
  state.pomodoro.isRunning = false;
  dom.quickTimerDot.classList.remove('running');
  stopAmbientAudio();

  if (state.pomodoro.soundNotification) {
    playChimeSound(523.25, 1046.50);
  }

  if (state.pomodoro.mode === 'pomodoro') {
    const minsStudied = state.pomodoro.durations.pomodoro;
    recordPomodoroSession(minsStudied);
    triggerConfetti();
    showToast(`🎯 Great job! Completed ${minsStudied} minutes of deep focus!`, 'success');
    setPomodoroMode('shortBreak');
  } else {
    showToast('Break finished! Ready for another focus session?', 'info');
    setPomodoroMode('pomodoro');
  }

  if (state.pomodoro.autoStart) toggleTimer(true);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.pomodoro.timeLeft / 60);
  const secs = state.pomodoro.timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  dom.timerDigits.textContent = timeStr;
  dom.quickTimerText.textContent = timeStr;
  dom.sidebarTimerBadge.textContent = `${mins}m`;
  document.title = `(${timeStr}) StudyFlow`;

  const circumference = 753.98;
  const progress = state.pomodoro.totalDuration > 0 ? (state.pomodoro.timeLeft / state.pomodoro.totalDuration) : 0;
  const strokeOffset = circumference * (1 - progress);
  
  if (dom.timerProgressCircle) {
    dom.timerProgressCircle.style.strokeDashoffset = strokeOffset;
  }
}

function populateTimerTaskSelect() {
  if (!dom.timerTaskSelect) return;
  const pendingTasks = state.tasks.filter(t => !t.completed);
  
  let html = `<option value="">-- General Focus Session --</option>`;
  html += pendingTasks.map(t => `
    <option value="${t.id}" ${t.id === state.pomodoro.activeTaskId ? 'selected' : ''}>
      ${escapeHTML(t.title)} (${t.subject})
    </option>
  `).join('');

  dom.timerTaskSelect.innerHTML = html;
}

function attachTaskToTimer(taskId) {
  state.pomodoro.activeTaskId = taskId || null;
  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      dom.currentFocusTaskName.textContent = task.title;
      dom.activeFocusTaskPill.title = `Focusing on: ${task.title}`;
      return;
    }
  }
  dom.currentFocusTaskName.textContent = 'General Focus Session';
}

// ==========================================
// EXAM COUNTDOWN LOGIC
// ==========================================
function renderExamCountdown() {
  if (!dom.examCardsGrid) return;
  if (state.exams.length === 0) {
    dom.examCardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--bg-card); border-radius: var(--radius-lg);">
        <div style="font-size: 3rem; margin-bottom: 8px;">🎯</div>
        <h3>No Target Exams Added Yet</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">Add your upcoming tests, midterm exams, or board exams to stay ahead!</p>
        <button class="btn-primary" onclick="window.studyFlow.openExamModal()">+ Add Your First Exam</button>
      </div>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dom.examCardsGrid.innerHTML = state.exams.map(exam => {
    const examDate = new Date(exam.date + 'T00:00:00');
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let badgeText = `${diffDays} Days Left`;
    let badgeStyle = '';
    if (diffDays === 0) { badgeText = 'Today! Good Luck 🌟'; badgeStyle = 'background: #ef4444; color: white;'; }
    else if (diffDays === 1) { badgeText = 'Tomorrow! 🔥'; badgeStyle = 'background: #f59e0b; color: white;'; }
    else if (diffDays < 0) { badgeText = 'Exam Completed ✔️'; badgeStyle = 'background: var(--bg-subtle); color: var(--text-muted);'; }

    return `
      <div class="exam-card">
        <div>
          <div class="exam-card-header">
            <span class="exam-badge" style="${badgeStyle}">${badgeText}</span>
            <button class="exam-delete-btn" onclick="window.studyFlow.deleteExam('${exam.id}')" title="Delete Exam">&times;</button>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${escapeHTML(exam.title)}</h3>
          <span style="font-size: 0.8rem; color: var(--brand-primary); font-weight: 600;">📖 ${escapeHTML(exam.subject)}</span>
        </div>

        <div>
          <div class="exam-days-huge">${diffDays >= 0 ? diffDays : 0}</div>
          <span class="exam-days-label">${diffDays >= 0 ? 'Days Remaining' : 'Completed'}</span>
          <div class="exam-date-str">📅 Target: ${examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>
    `;
  }).join('');
}

function handleExamFormSubmit(e) {
  e.preventDefault();
  const title = dom.examTitleInput.value.trim();
  const subject = dom.examSubjectInput.value.trim() || 'General';
  const date = dom.examDateInput.value;

  if (!title || !date) return;

  const newExam = {
    id: 'ex_' + Date.now(),
    title,
    subject,
    date
  };

  state.exams.push(newExam);
  saveExams();
  dom.examModal.close();
  renderExamCountdown();
  renderCounters();
  showToast('Target exam added to countdown! 🎯', 'success');
}

function deleteExam(id) {
  state.exams = state.exams.filter(e => e.id !== id);
  saveExams();
  renderExamCountdown();
  renderCounters();
  showToast('Exam removed', 'info');
}

// ==========================================
// WEB AUDIO SYNTHESIS
// ==========================================
function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playChimeSound(freq1 = 587.33, freq2 = 880) {
  try {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq2, now + 0.15);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now + 0.15);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  } catch (e) {}
}

function startAmbientAudio(type) {
  stopAmbientAudio();
  if (type === 'none') return;

  try {
    initAudioContext();
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'binaural') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.sin(2 * Math.PI * 14 * (i / audioCtx.sampleRate)) * 0.5;
      }
    }

    ambientSourceNode = audioCtx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'white' ? 800 : 400, audioCtx.currentTime);

    ambientGainNode = audioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

    ambientSourceNode.connect(filter);
    filter.connect(ambientGainNode);
    ambientGainNode.connect(audioCtx.destination);

    ambientSourceNode.start();
  } catch (e) {}
}

function stopAmbientAudio() {
  if (ambientSourceNode) {
    try {
      ambientSourceNode.stop();
      ambientSourceNode.disconnect();
    } catch (e) {}
    ambientSourceNode = null;
  }
}

// ==========================================
// ANALYTICS
// ==========================================
function renderAnalyticsView() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  dom.analyticsOverallPercentage.textContent = `${rate}% Completed`;
  dom.analyticsProgressBar.style.width = `${rate}%`;
  dom.analyticsCompletedCount.textContent = completed;
  dom.analyticsPendingCount.textContent = pending;
  dom.analyticsTotalCount.textContent = total;

  const subjectMap = {};
  state.tasks.forEach(t => {
    subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1;
  });

  const subjectEntries = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]);
  if (subjectEntries.length === 0) {
    dom.analyticsSubjectBreakdown.innerHTML = `<p style="color: var(--text-muted); padding: 12px;">No task data available.</p>`;
  } else {
    dom.analyticsSubjectBreakdown.innerHTML = subjectEntries.map(([subj, count]) => {
      const pct = Math.round((count / total) * 100);
      const col = getSubjectColor(subj);
      return `
        <div class="subject-stat-row">
          <span class="subject-name" title="${subj}">
            <span class="priority-dot" style="background-color: ${col};"></span>
            ${escapeHTML(subj)}
          </span>
          <div class="subject-bar-wrap">
            <div class="subject-bar-fill" style="width: ${pct}%; background-color: ${col};"></div>
          </div>
          <span class="subject-qty">${count}</span>
        </div>
      `;
    }).join('');
  }

  const high = state.tasks.filter(t => t.priority === 'high').length;
  const med = state.tasks.filter(t => t.priority === 'medium').length;
  const low = state.tasks.filter(t => t.priority === 'low').length;

  dom.barHighPriority.style.width = `${total > 0 ? Math.round((high / total) * 100) : 0}%`;
  dom.barMedPriority.style.width = `${total > 0 ? Math.round((med / total) * 100) : 0}%`;
  dom.barLowPriority.style.width = `${total > 0 ? Math.round((low / total) * 100) : 0}%`;

  dom.countHighPriority.textContent = high;
  dom.countMedPriority.textContent = med;
  dom.countLowPriority.textContent = low;
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  dom.navItems.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  if (dom.mobileMenuBtn) dom.mobileMenuBtn.addEventListener('click', openMobileSidebar);
  if (dom.closeSidebarBtn) dom.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  if (dom.sidebarBackdrop) dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  if (dom.themeToggleBtn) dom.themeToggleBtn.addEventListener('click', toggleTheme);

  // Auth Modal & Profile Dropdown
  if (dom.openAuthModalBtn) dom.openAuthModalBtn.addEventListener('click', () => openAuthModal('signin'));
  if (dom.closeAuthModalBtn) dom.closeAuthModalBtn.addEventListener('click', closeAuthModal);
  if (dom.tabSignInBtn) dom.tabSignInBtn.addEventListener('click', () => setAuthTab('signin'));
  if (dom.tabSignUpBtn) dom.tabSignUpBtn.addEventListener('click', () => setAuthTab('signup'));
  if (dom.googleSignInBtn) dom.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
  if (dom.authForm) dom.authForm.addEventListener('submit', handleAuthFormSubmit);
  if (dom.forgotPasswordBtn) dom.forgotPasswordBtn.addEventListener('click', handleForgotPassword);
  if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', handleLogout);

  if (dom.userAvatarPill) {
    dom.userAvatarPill.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.profileDropdown.classList.toggle('hidden');
    });
  }
  window.addEventListener('click', () => {
    if (dom.profileDropdown && !dom.profileDropdown.classList.contains('hidden')) {
      dom.profileDropdown.classList.add('hidden');
    }
  });

  if (dom.quickTimerPill) {
    dom.quickTimerPill.addEventListener('click', () => switchView('pomodoro'));
  }

  if (dom.sidebarNewTaskBtn) dom.sidebarNewTaskBtn.addEventListener('click', () => openCreateTaskModal());
  if (dom.dashboardAddTaskBtn) dom.dashboardAddTaskBtn.addEventListener('click', () => openCreateTaskModal());
  if (dom.emptyStateCreateBtn) dom.emptyStateCreateBtn.addEventListener('click', () => openCreateTaskModal());
  if (dom.dailyAddTaskBtn) dom.dailyAddTaskBtn.addEventListener('click', () => openCreateTaskModal(formatDateISO(state.selectedDailyDate)));
  if (dom.weeklyAddTaskBtn) dom.weeklyAddTaskBtn.addEventListener('click', () => openCreateTaskModal());
  if (dom.monthAddTaskBtn) dom.monthAddTaskBtn.addEventListener('click', () => openCreateTaskModal(formatDateISO(state.selectedMonthDate)));
  if (dom.loadSampleDataBtn) dom.loadSampleDataBtn.addEventListener('click', () => {
    loadSampleTasks();
    renderAll();
    showToast('Loaded sample study schedule!', 'success');
  });

  if (dom.taskForm) dom.taskForm.addEventListener('submit', handleTaskFormSubmit);
  if (dom.closeTaskModalBtn) dom.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  if (dom.cancelTaskModalBtn) dom.cancelTaskModalBtn.addEventListener('click', closeTaskModal);

  // Exam Modal & Notes
  if (dom.addExamBtn) {
    dom.addExamBtn.addEventListener('click', () => {
      dom.examForm.reset();
      dom.examDateInput.value = formatDateISO(new Date());
      dom.examModal.showModal();
    });
  }
  if (dom.examForm) dom.examForm.addEventListener('submit', handleExamFormSubmit);
  if (dom.closeExamModalBtn) dom.closeExamModalBtn.addEventListener('click', () => dom.examModal.close());
  if (dom.cancelExamModalBtn) dom.cancelExamModalBtn.addEventListener('click', () => dom.examModal.close());

  if (dom.studentQuickNotesArea) {
    dom.studentQuickNotesArea.addEventListener('input', saveNotes);
  }
  if (dom.clearNotesBtn) {
    dom.clearNotesBtn.addEventListener('click', () => {
      if (confirm('Clear study notes & scratchpad?')) {
        dom.studentQuickNotesArea.value = '';
        saveNotes();
        showToast('Notes cleared', 'info');
      }
    });
  }

  if (dom.pomoDecBtn) {
    dom.pomoDecBtn.addEventListener('click', () => {
      dom.taskPomoEstimate.value = Math.max(1, (parseInt(dom.taskPomoEstimate.value, 10) || 1) - 1);
      updatePomoCalcHint();
    });
  }
  if (dom.pomoIncBtn) {
    dom.pomoIncBtn.addEventListener('click', () => {
      dom.taskPomoEstimate.value = Math.min(20, (parseInt(dom.taskPomoEstimate.value, 10) || 1) + 1);
      updatePomoCalcHint();
    });
  }
  if (dom.taskPomoEstimate) dom.taskPomoEstimate.addEventListener('input', updatePomoCalcHint);

  if (dom.taskSearchInput) {
    dom.taskSearchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      if (e.target.value) dom.clearSearchBtn.classList.remove('hidden');
      else dom.clearSearchBtn.classList.add('hidden');
      renderDashboardTaskList();
      renderFilterChips();
    });
  }
  if (dom.clearSearchBtn) {
    dom.clearSearchBtn.addEventListener('click', () => {
      dom.taskSearchInput.value = '';
      state.filters.search = '';
      dom.clearSearchBtn.classList.add('hidden');
      renderDashboardTaskList();
      renderFilterChips();
    });
  }

  if (dom.filterStatus) {
    dom.filterStatus.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderDashboardTaskList();
      renderFilterChips();
    });
  }
  if (dom.filterPriority) {
    dom.filterPriority.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      renderDashboardTaskList();
      renderFilterChips();
    });
  }
  if (dom.filterSubject) {
    dom.filterSubject.addEventListener('change', (e) => {
      state.filters.subject = e.target.value;
      renderDashboardTaskList();
      renderFilterChips();
    });
  }
  if (dom.sortBy) {
    dom.sortBy.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      renderDashboardTaskList();
    });
  }
  if (dom.resetFiltersBtn) dom.resetFiltersBtn.addEventListener('click', resetAllFilters);
  if (dom.markAllCompleteBtn) dom.markAllCompleteBtn.addEventListener('click', markAllComplete);

  // Daily nav
  if (dom.dailyPrevDayBtn) {
    dom.dailyPrevDayBtn.addEventListener('click', () => {
      state.selectedDailyDate.setDate(state.selectedDailyDate.getDate() - 1);
      renderDailySchedule();
    });
  }
  if (dom.dailyNextDayBtn) {
    dom.dailyNextDayBtn.addEventListener('click', () => {
      state.selectedDailyDate.setDate(state.selectedDailyDate.getDate() + 1);
      renderDailySchedule();
    });
  }
  if (dom.dailyJumpTodayBtn) {
    dom.dailyJumpTodayBtn.addEventListener('click', () => {
      state.selectedDailyDate = new Date();
      renderDailySchedule();
    });
  }
  if (dom.dailyDatePicker) {
    dom.dailyDatePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedDailyDate = new Date(e.target.value + 'T00:00:00');
        renderDailySchedule();
      }
    });
  }

  // Weekly nav
  if (dom.weeklyPrevBtn) {
    dom.weeklyPrevBtn.addEventListener('click', () => {
      state.selectedWeekStartDate.setDate(state.selectedWeekStartDate.getDate() - 7);
      renderWeeklyPlanner();
    });
  }
  if (dom.weeklyNextBtn) {
    dom.weeklyNextBtn.addEventListener('click', () => {
      state.selectedWeekStartDate.setDate(state.selectedWeekStartDate.getDate() + 7);
      renderWeeklyPlanner();
    });
  }
  if (dom.weeklyJumpTodayBtn) {
    dom.weeklyJumpTodayBtn.addEventListener('click', () => {
      state.selectedWeekStartDate = getStartOfWeek(new Date());
      renderWeeklyPlanner();
    });
  }

  // Monthly nav
  if (dom.monthPrevBtn) {
    dom.monthPrevBtn.addEventListener('click', () => {
      state.selectedMonthDate.setMonth(state.selectedMonthDate.getMonth() - 1);
      renderMonthlyCalendar();
    });
  }
  if (dom.monthNextBtn) {
    dom.monthNextBtn.addEventListener('click', () => {
      state.selectedMonthDate.setMonth(state.selectedMonthDate.getMonth() + 1);
      renderMonthlyCalendar();
    });
  }
  if (dom.monthJumpTodayBtn) {
    dom.monthJumpTodayBtn.addEventListener('click', () => {
      state.selectedMonthDate = new Date();
      renderMonthlyCalendar();
    });
  }
  if (dom.closeInspectorBtn) {
    dom.closeInspectorBtn.addEventListener('click', () => {
      dom.monthDayInspector.classList.add('hidden');
    });
  }

  // Pomodoro Controls
  dom.pomoModeButtons.forEach(btn => {
    btn.addEventListener('click', () => setPomodoroMode(btn.dataset.mode));
  });

  if (dom.timerToggleBtn) dom.timerToggleBtn.addEventListener('click', () => toggleTimer());
  if (dom.timerResetBtn) dom.timerResetBtn.addEventListener('click', resetTimer);
  if (dom.timerSkipBtn) dom.timerSkipBtn.addEventListener('click', skipTimer);

  if (dom.timerTaskSelect) {
    dom.timerTaskSelect.addEventListener('change', (e) => attachTaskToTimer(e.target.value));
  }

  dom.soundButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.soundButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.pomodoro.ambientType = btn.dataset.sound;
      if (state.pomodoro.isRunning) startAmbientAudio(state.pomodoro.ambientType);
    });
  });

  if (dom.customFocusMins) {
    dom.customFocusMins.addEventListener('change', (e) => {
      state.pomodoro.durations.pomodoro = parseInt(e.target.value, 10) || 25;
      saveSettings();
      if (state.pomodoro.mode === 'pomodoro') resetTimer();
    });
  }
  if (dom.customShortBreakMins) {
    dom.customShortBreakMins.addEventListener('change', (e) => {
      state.pomodoro.durations.shortBreak = parseInt(e.target.value, 10) || 5;
      saveSettings();
      if (state.pomodoro.mode === 'shortBreak') resetTimer();
    });
  }
  if (dom.customLongBreakMins) {
    dom.customLongBreakMins.addEventListener('change', (e) => {
      state.pomodoro.durations.longBreak = parseInt(e.target.value, 10) || 15;
      saveSettings();
      if (state.pomodoro.mode === 'longBreak') resetTimer();
    });
  }
  if (dom.autoStartBreaksCheckbox) {
    dom.autoStartBreaksCheckbox.addEventListener('change', (e) => {
      state.pomodoro.autoStart = e.target.checked;
      saveSettings();
    });
  }
  if (dom.soundNotificationCheckbox) {
    dom.soundNotificationCheckbox.addEventListener('change', (e) => {
      state.pomodoro.soundNotification = e.target.checked;
      saveSettings();
    });
  }

  if (dom.exportDataBtn) dom.exportDataBtn.addEventListener('click', exportDataBackup);
  if (dom.importDataInput) dom.importDataInput.addEventListener('change', handleImportData);
  if (dom.resetDataBtn) dom.resetDataBtn.addEventListener('click', confirmResetData);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openCreateTaskModal();
    }
    if (e.code === 'Space' && state.currentView === 'pomodoro' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleTimer();
    }
    if (e.key === 'Escape') {
      if (dom.taskModal.open) closeTaskModal();
      if (dom.examModal.open) dom.examModal.close();
      if (dom.authModal.open) closeAuthModal();
    }
  });
}

function resetAllFilters() {
  state.filters = { search: '', status: 'all', priority: 'all', subject: 'all', sort: 'date-asc' };
  if (dom.taskSearchInput) dom.taskSearchInput.value = '';
  if (dom.clearSearchBtn) dom.clearSearchBtn.classList.add('hidden');
  if (dom.filterStatus) dom.filterStatus.value = 'all';
  if (dom.filterPriority) dom.filterPriority.value = 'all';
  if (dom.filterSubject) dom.filterSubject.value = 'all';
  if (dom.sortBy) dom.sortBy.value = 'date-asc';
  renderDashboardTaskList();
  renderFilterChips();
}

function populateSubjectDropdowns() {
  const subjects = Array.from(new Set(state.tasks.map(t => t.subject).filter(Boolean)));
  if (dom.filterSubject) {
    const current = state.filters.subject;
    dom.filterSubject.innerHTML = `<option value="all">Subject: All</option>` + 
      subjects.map(s => `<option value="${escapeHTML(s)}" ${s === current ? 'selected' : ''}>${escapeHTML(s)}</option>`).join('');
  }
}

function updatePomoCalcHint() {
  const count = parseInt(dom.taskPomoEstimate.value, 10) || 1;
  const mins = count * (state.pomodoro.durations.pomodoro || 25);
  dom.pomoCalcHint.textContent = `~ ${mins} mins total focus`;
}

function updateDateDisplay() {
  const now = new Date();
  if (dom.currentDateStr) {
    dom.currentDateStr.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

function exportDataBackup() {
  const backupData = {
    version: 1,
    exportDate: new Date().toISOString(),
    tasks: state.tasks,
    exams: state.exams,
    notes: state.quickNotes,
    pomodoroStats: JSON.parse(localStorage.getItem(STORAGE_KEYS.POMO_STATS) || '{}'),
    settings: { durations: state.pomodoro.durations, theme: state.theme }
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `studyflow_backup_${formatDateISO(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Backup exported successfully!', 'success');
}

function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.tasks)) {
        state.tasks = parsed.tasks;
        saveTasks();
        if (parsed.exams) { state.exams = parsed.exams; saveExams(); }
        if (parsed.notes) { state.quickNotes = parsed.notes; saveNotes(); }
        if (parsed.pomodoroStats) localStorage.setItem(STORAGE_KEYS.POMO_STATS, JSON.stringify(parsed.pomodoroStats));
        renderAll();
        showToast(`Successfully imported study plan!`, 'success');
      } else {
        showToast('Invalid backup file structure.', 'error');
      }
    } catch (err) {
      showToast('Error reading backup file.', 'error');
    }
  };
  reader.readAsText(file);
}

function confirmResetData() {
  if (confirm('Are you sure you want to clear all tasks, exams, and notes?')) {
    state.tasks = [];
    state.exams = [];
    state.quickNotes = '';
    saveTasks();
    saveExams();
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    if (dom.studentQuickNotesArea) dom.studentQuickNotesArea.value = '';
    renderAll();
    showToast('All study data cleared', 'info');
  }
}

function showToast(message, type = 'info', options = {}) {
  if (!dom.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHTML(message)}</span>
    <div style="display: flex; align-items: center; gap: 8px;">
      ${options.undoText ? `<button class="btn-link" id="toastUndoBtn">${options.undoText}</button>` : ''}
      <button class="toast-close" aria-label="Close">&times;</button>
    </div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  if (options.onUndo) {
    const undoBtn = toast.querySelector('#toastUndoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        options.onUndo();
        removeToast(toast);
      });
    }
  }

  dom.toastContainer.appendChild(toast);
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(10px) scale(0.95)';
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 200);
}

function triggerConfetti() {
  const canvas = dom.confettiCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height * 0.4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let frame = 0;
  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      p.rotation += p.vRot;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(renderConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  renderConfetti();
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDate(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatHumanDate(isoDate) {
  if (!isoDate) return 'No due date';
  const target = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAmPm(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

function formatHourLabel(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:00 ${ampm}`;
}

function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] || '#8b5cf6';
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.studyFlow = {
  toggleTask: toggleTaskComplete,
  deleteTask: deleteTask,
  editTask: openEditTaskModal,
  openNewTask: (date, time) => openCreateTaskModal(date, time),
  openExamModal: () => {
    dom.examForm.reset();
    dom.examDateInput.value = formatDateISO(new Date());
    dom.examModal.showModal();
  },
  deleteExam: deleteExam,
  applyTemplate: applyTemplate,
  selectMonthDate: selectMonthDate,
  startTaskFocus: (taskId) => {
    attachTaskToTimer(taskId);
    switchView('pomodoro');
    showToast('Attached task to Pomodoro timer!', 'info');
  },
  removeFilter: (key) => {
    if (key === 'search') {
      state.filters.search = '';
      dom.taskSearchInput.value = '';
      dom.clearSearchBtn.classList.add('hidden');
    } else {
      state.filters[key] = 'all';
      if (key === 'status') dom.filterStatus.value = 'all';
      if (key === 'priority') dom.filterPriority.value = 'all';
      if (key === 'subject') dom.filterSubject.value = 'all';
    }
    renderDashboardTaskList();
    renderFilterChips();
  }
};

document.addEventListener('DOMContentLoaded', init);
