export const GAME_CODE = 'QUEST-2026';

export const TEAMS = {
  1: {
    id: 1,
    key: '1',
    name: 'TEAM 1',
    color: '#06B6D4',
    badge: 'bg-cyan-950/60 text-cyan-400 border-cyan-600/40',
    border: 'border-cyan-500',
    text: 'text-cyan-400'
  },
  2: {
    id: 2,
    key: '2',
    name: 'TEAM 2',
    color: '#F59E0B',
    badge: 'bg-amber-950/60 text-amber-400 border-amber-600/40',
    border: 'border-amber-500',
    text: 'text-amber-400'
  },
  3: {
    id: 3,
    key: '3',
    name: 'TEAM 3',
    color: '#10B981',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40',
    border: 'border-emerald-500',
    text: 'text-emerald-400'
  },
  4: {
    id: 4,
    key: '4',
    name: 'TEAM 4',
    color: '#F43F5E',
    badge: 'bg-rose-950/60 text-rose-400 border-rose-600/40',
    border: 'border-rose-500',
    text: 'text-rose-400'
  },
  5: {
    id: 5,
    key: '5',
    name: 'TEAM 5',
    color: '#A855F7',
    badge: 'bg-purple-950/60 text-purple-400 border-purple-600/40',
    border: 'border-purple-500',
    text: 'text-purple-400'
  },
  6: {
    id: 6,
    key: '6',
    name: 'TEAM 6',
    color: '#38BDF8',
    badge: 'bg-sky-950/60 text-sky-400 border-sky-600/40',
    border: 'border-sky-500',
    text: 'text-sky-400'
  }
};

export const ROUNDS = {
  1: {
    number: 1,
    title: 'ROUND 1',
    name: 'CLUE HUNT',
    icon: '🧠',
    summary: 'Technical Knowledge & Problem Solving'
  },
  2: {
    number: 2,
    title: 'ROUND 2',
    name: 'PATTERN BREAK',
    icon: '🧩',
    summary: 'Visual Pattern Recognition & Logic'
  },
  3: {
    number: 3,
    title: 'ROUND 3',
    name: 'CODE CRACKER',
    icon: '🔐',
    summary: 'Inspect clues → Decode cipher → Submit code'
  }
};

export const DOMAINS = [
  { name: "Programming", icon: "💻", badge: "bg-blue-950/60 text-blue-400 border-blue-800/60" },
  { name: "Web Development", icon: "🌐", badge: "bg-cyan-950/60 text-cyan-400 border-cyan-800/60" },
  { name: "Artificial Intelligence", icon: "🤖", badge: "bg-purple-950/60 text-purple-400 border-purple-800/60" },
  { name: "Database", icon: "🗄️", badge: "bg-amber-950/60 text-amber-400 border-amber-800/60" },
  { name: "Cybersecurity", icon: "🔐", badge: "bg-red-950/60 text-red-400 border-red-800/60" },
  { name: "Hardware", icon: "⚙️", badge: "bg-orange-950/60 text-orange-400 border-orange-800/60" },
  { name: "Apps & Mobile", icon: "📱", badge: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60" },
  { name: "Games & Gaming", icon: "🎮", badge: "bg-pink-950/60 text-pink-400 border-pink-800/60" },
  { name: "General Computer Science", icon: "🧠", badge: "bg-indigo-950/60 text-indigo-400 border-indigo-800/60" },
  { name: "Linux & Open Source", icon: "🐧", badge: "bg-yellow-950/60 text-yellow-400 border-yellow-800/60" }
];

export const DIFFICULTIES = {
  Easy: {
    label: 'EASY',
    icon: '🟢',
    color: '#10B981',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50'
  },
  Medium: {
    label: 'MEDIUM',
    icon: '🟡',
    color: '#F59E0B',
    badge: 'bg-amber-950/60 text-amber-400 border-amber-700/50'
  },
  Hard: {
    label: 'HARD',
    icon: '🔴',
    color: '#F43F5E',
    badge: 'bg-rose-950/60 text-rose-400 border-rose-700/50'
  }
};

// Round 1 Clue Hunt Scoring Matrix
export const ROUND1_SCORING = {
  Easy: {
    1: [30, 20, 15, 10],
    2: [20, 15, 10, 5],
    3: [15, 10, 5, 3]
  },
  Medium: {
    1: [50, 30, 20, 10],
    2: [40, 25, 15, 10],
    3: [30, 20, 10, 5]
  },
  Hard: {
    1: [75, 50, 35, 20],
    2: [60, 40, 25, 15],
    3: [45, 30, 20, 10]
  }
};

// Round 2 Pattern Break Scoring Matrix (by difficulty & finish rank)
export const ROUND2_SCORING = {
  Easy: [30, 20, 15, 10],
  Medium: [50, 30, 20, 10],
  Hard: [75, 50, 35, 20]
};

// Round 3 Reaction Clash Scoring (Base speed rank points)
export const ROUND3_SCORING = {
  Easy: [40, 25, 15, 10],
  Medium: [60, 35, 20, 10],
  Hard: [80, 50, 30, 15]
};

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  START_COUNTDOWN: 'START_COUNTDOWN',
  ROUND_1_INTRO: 'ROUND_1_INTRO',
  ROUND_1_CLUE_1: 'ROUND_1_CLUE_1',
  ROUND_1_CLUE_2: 'ROUND_1_CLUE_2',
  ROUND_1_CLUE_3: 'ROUND_1_CLUE_3',
  ROUND_1_ANSWER_REVEAL: 'ROUND_1_ANSWER_REVEAL',
  ROUND_1_RESULT: 'ROUND_1_RESULT',
  ROUND_1_COMPLETE: 'ROUND_1_COMPLETE',
  ROUND_2_INTRO: 'ROUND_2_INTRO',
  ROUND_2_ACTIVE: 'ROUND_2_ACTIVE',
  ROUND_2_RESULT: 'ROUND_2_RESULT',
  ROUND_2_COMPLETE: 'ROUND_2_COMPLETE',
  ROUND_3_INTRO: 'ROUND_3_INTRO',
  ROUND_3_ACTIVE: 'ROUND_3_ACTIVE',
  ROUND_3_RESULT: 'ROUND_3_RESULT',
  ROUND_3_COMPLETE: 'ROUND_3_COMPLETE',
  FINAL_RESULT: 'FINAL_RESULT',
  PAUSED: 'PAUSED',
  SKIPPED: 'SKIPPED',
  COMPLETED: 'COMPLETED'
};

export const ROUND_NAMES = {
  1: 'CLUE HUNT',
  2: 'PATTERN BREAK',
  3: 'REACTION CLASH'
};

export const ROUND_QUESTIONS_COUNT = 10;
