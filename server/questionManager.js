import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

/**
 * Fisher-Yates array shuffle helper
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class QuestionManager {
  constructor() {
    this.round1Questions = [];
    this.round2Patterns = [];
    this.round3CodeCrackers = [];
    this.round3Reactions = [];
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(QUESTIONS_FILE)) {
        const raw = fs.readFileSync(QUESTIONS_FILE, 'utf8');
        const data = JSON.parse(raw);
        this.round1Questions = Array.isArray(data.round1Questions) ? data.round1Questions : [];
        this.round2Patterns = Array.isArray(data.round2Patterns) ? data.round2Patterns : [];
        this.round3CodeCrackers = Array.isArray(data.round3CodeCrackers) ? data.round3CodeCrackers : [];
      } else {
        this.initDefaultData();
        this.saveToFile();
      }
    } catch (err) {
      console.error('[QuestionManager] Error reading questions.json, falling back to defaults:', err);
      this.initDefaultData();
    }

    this.normalizeData();
  }

  normalizeData() {
    // Ensure Round 1 questions have clues array and isActive flag
    for (const q of this.round1Questions) {
      if (q.isActive === undefined) q.isActive = true;
      if (!q.clues || !Array.isArray(q.clues) || q.clues.length === 0) {
        q.clues = [q.clue1, q.clue2, q.clue3].filter(Boolean);
      }
      if (!q.acceptedAnswers) q.acceptedAnswers = [];
    }

    // Ensure Round 2 patterns have options, option IDs and isActive flag
    for (const p of this.round2Patterns) {
      if (p.isActive === undefined) p.isActive = true;
      if (!p.correctOptionId && p.correctOption) p.correctOptionId = p.correctOption;
      if (!p.correctOption && p.correctOptionId) p.correctOption = p.correctOptionId;
      if (Array.isArray(p.options)) {
        p.options = p.options.map(opt => ({
          ...opt,
          id: (opt.id || opt.key || '').toString().toUpperCase(),
          key: (opt.key || opt.id || '').toString().toUpperCase()
        }));
      }
    }

    // Ensure Round 3 code crackers have codes, hints and isActive flag
    for (const c of this.round3CodeCrackers) {
      if (c.isActive === undefined) c.isActive = true;
      if (!c.acceptedCodes && c.alternateCodes) c.acceptedCodes = [...c.alternateCodes];
      if (!c.alternateCodes && c.acceptedCodes) c.alternateCodes = [...c.acceptedCodes];
      if (!c.correctCode && c.target) c.correctCode = c.target;
      if (!c.timeLimit) c.timeLimit = 45;
    }

    this.round3Reactions = this.round3CodeCrackers;
  }

  saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const payload = {
        version: '2.0.0',
        totalChallenges: this.round1Questions.length + this.round2Patterns.length + this.round3CodeCrackers.length,
        counts: {
          round1: this.round1Questions.length,
          round2: this.round2Patterns.length,
          round3: this.round3CodeCrackers.length
        },
        round1Questions: this.round1Questions,
        round2Patterns: this.round2Patterns,
        round3CodeCrackers: this.round3CodeCrackers
      };
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(payload, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[QuestionManager] Failed to save questions to file:', err);
      return false;
    }
  }

  // ================= BALANCED RANDOM SELECTION ENGINE =================

  /**
   * Selects an authoritative, balanced, non-repeating set of questions for a game round.
   *
   * @param {number} roundNumber - 1, 2, or 3
   * @param {number} count - Target number of questions (default: 10)
   * @param {string[]} history - Array of recently used question IDs to deprioritize
   * @param {object} options - Optional config (e.g. preserveFirstTestQuestion)
   * @returns {object[]} Selected questions with assigned questionNumber
   */
  selectQuestionsForGame(roundNumber, count = 10, history = [], options = {}) {
    let pool = [];
    if (roundNumber === 1) pool = this.round1Questions;
    else if (roundNumber === 2) pool = this.round2Patterns;
    else if (roundNumber === 3) pool = this.round3CodeCrackers;

    // Filter active items only
    const activePool = pool.filter(item => item.isActive !== false);

    if (activePool.length <= count) {
      const shuffled = shuffle(activePool);
      return shuffled.map((q, idx) => ({
        ...q,
        round: roundNumber,
        questionNumber: idx + 1,
        challengeNumber: idx + 1
      }));
    }

    const historySet = new Set(Array.isArray(history) ? history : []);
    const selected = [];
    const selectedIds = new Set();

    // Deterministic test question handling if requested
    if (options.preserveFirstTestQuestion) {
      let testQId = null;
      if (roundNumber === 1) testQId = 'round1-test-01';
      else if (roundNumber === 2) testQId = 'r2-01';
      else if (roundNumber === 3) testQId = 'r3-01';

      if (testQId) {
        const primaryTestQ = activePool.find(q => q.id === testQId);
        if (primaryTestQ) {
          selected.push({ ...primaryTestQ });
          selectedIds.add(primaryTestQ.id);
        }
      }
    }

    // Partition pool into difficulty tiers: Easy, Medium, Hard
    const easyBucket = activePool.filter(q => (q.difficulty || '').toLowerCase() === 'easy' && !selectedIds.has(q.id));
    const medBucket = activePool.filter(q => (q.difficulty || '').toLowerCase() === 'medium' && !selectedIds.has(q.id));
    const hardBucket = activePool.filter(q => (q.difficulty || '').toLowerCase() === 'hard' && !selectedIds.has(q.id));

    // Target balance for 10 questions: 3 Easy, 4 Medium, 3 Hard
    const remainingSlots = count - selected.length;
    let targetEasy = Math.min(3, remainingSlots);
    let targetHard = Math.min(3, Math.max(0, remainingSlots - targetEasy));
    let targetMed = remainingSlots - targetEasy - targetHard;

    // Helper: select N from a bucket, prioritizing items not in recent history
    const selectFromBucket = (bucket, n) => {
      if (n <= 0) return [];
      const fresh = bucket.filter(item => !historySet.has(item.id));
      const recent = bucket.filter(item => historySet.has(item.id));

      const shuffledFresh = shuffle(fresh);
      const shuffledRecent = shuffle(recent);

      const picked = [];
      for (const item of shuffledFresh) {
        if (picked.length >= n) break;
        picked.push(item);
      }
      for (const item of shuffledRecent) {
        if (picked.length >= n) break;
        picked.push(item);
      }
      return picked;
    };

    const pickedEasy = selectFromBucket(easyBucket, targetEasy);
    pickedEasy.forEach(item => { selected.push(item); selectedIds.add(item.id); });

    const pickedMed = selectFromBucket(medBucket, targetMed);
    pickedMed.forEach(item => { selected.push(item); selectedIds.add(item.id); });

    const pickedHard = selectFromBucket(hardBucket, targetHard);
    pickedHard.forEach(item => { selected.push(item); selectedIds.add(item.id); });

    // If any difficulty bucket didn't meet its quota, fill remaining from any available active items
    if (selected.length < count) {
      const remainingPool = shuffle(activePool.filter(q => !selectedIds.has(q.id)));
      for (const item of remainingPool) {
        if (selected.length >= count) break;
        selected.push(item);
        selectedIds.add(item.id);
      }
    }

    // If preserveFirstTestQuestion is set, keep it as first element
    let finalList = selected;
    if (options.preserveFirstTestQuestion && selected[0]?.id && ['round1-test-01', 'r2-01', 'r3-01'].includes(selected[0].id)) {
      const first = selected[0];
      const rest = shuffle(selected.slice(1));
      finalList = [first, ...rest];
    } else {
      finalList = shuffle(selected);
    }

    // Number sequentially
    return finalList.slice(0, count).map((item, idx) => ({
      ...item,
      round: roundNumber,
      questionNumber: idx + 1,
      challengeNumber: idx + 1
    }));
  }

  // ================= CRUD METHODS =================

  getListByRound(round) {
    const r = parseInt(round, 10);
    if (r === 1) return this.round1Questions;
    if (r === 2) return this.round2Patterns;
    if (r === 3) return this.round3CodeCrackers;
    return null;
  }

  getQuestionById(round, id) {
    const list = this.getListByRound(round);
    if (list) {
      return list.find(q => q.id === id);
    }
    // Search across all
    return this.round1Questions.find(q => q.id === id) ||
           this.round2Patterns.find(p => p.id === id) ||
           this.round3CodeCrackers.find(c => c.id === id);
  }

  addQuestion(round, questionData) {
    const r = parseInt(round, 10);
    const list = this.getListByRound(r);
    if (!list) throw new Error(`Invalid round: ${round}`);

    const idPrefix = r === 1 ? 'r1-' : r === 2 ? 'r2-' : 'r3-';
    const newId = questionData.id || `${idPrefix}custom-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newQuestion = {
      ...questionData,
      id: newId,
      round: r,
      isActive: questionData.isActive !== false
    };

    if (r === 1) {
      if (!newQuestion.clues) {
        newQuestion.clues = [newQuestion.clue1, newQuestion.clue2, newQuestion.clue3].filter(Boolean);
      }
      if (!newQuestion.acceptedAnswers) newQuestion.acceptedAnswers = [];
    } else if (r === 2) {
      if (!newQuestion.correctOptionId && newQuestion.correctOption) {
        newQuestion.correctOptionId = newQuestion.correctOption;
      }
    } else if (r === 3) {
      if (!newQuestion.acceptedCodes && newQuestion.alternateCodes) {
        newQuestion.acceptedCodes = [...newQuestion.alternateCodes];
      }
      if (!newQuestion.timeLimit) newQuestion.timeLimit = 45;
    }

    list.push(newQuestion);
    this.saveToFile();
    return newQuestion;
  }

  updateQuestion(round, id, updates) {
    const r = parseInt(round, 10);
    const list = this.getListByRound(r);
    if (!list) throw new Error(`Invalid round: ${round}`);

    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) throw new Error(`Question ${id} not found in round ${round}`);

    const updated = {
      ...list[idx],
      ...updates,
      id // preserve original ID
    };

    if (r === 1) {
      if (updated.clue1 || updated.clue2 || updated.clue3) {
        updated.clues = [updated.clue1, updated.clue2, updated.clue3].filter(Boolean);
      }
    } else if (r === 2) {
      if (updated.correctOption && !updated.correctOptionId) {
        updated.correctOptionId = updated.correctOption;
      }
    } else if (r === 3) {
      if (updated.alternateCodes && !updated.acceptedCodes) {
        updated.acceptedCodes = [...updated.alternateCodes];
      }
    }

    list[idx] = updated;
    this.saveToFile();
    return updated;
  }

  deleteQuestion(round, id) {
    const r = parseInt(round, 10);
    const list = this.getListByRound(r);
    if (!list) throw new Error(`Invalid round: ${round}`);

    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) throw new Error(`Question ${id} not found in round ${round}`);

    const deleted = list.splice(idx, 1)[0];
    this.saveToFile();
    return { success: true, deletedId: id, deleted };
  }

  duplicateQuestion(round, id) {
    const original = this.getQuestionById(round, id);
    if (!original) throw new Error(`Question ${id} not found in round ${round}`);

    const clone = JSON.parse(JSON.stringify(original));
    const r = parseInt(round, 10);
    const idPrefix = r === 1 ? 'r1-' : r === 2 ? 'r2-' : 'r3-';
    clone.id = `${idPrefix}dup-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    if (clone.title) clone.title = `${clone.title} (Copy)`;
    else if (clone.website) clone.website = `${clone.website} (Copy)`;

    return this.addQuestion(round, clone);
  }

  toggleQuestionStatus(round, id, isActive) {
    const q = this.getQuestionById(round, id);
    if (!q) throw new Error(`Question ${id} not found in round ${round}`);

    q.isActive = isActive === undefined ? !q.isActive : !!isActive;
    this.saveToFile();
    return { success: true, id, isActive: q.isActive };
  }

  getBankStats() {
    const getStats = (list) => {
      const total = list.length;
      const active = list.filter(item => item.isActive !== false).length;
      const inactive = total - active;
      const easy = list.filter(item => (item.difficulty || '').toLowerCase() === 'easy').length;
      const medium = list.filter(item => (item.difficulty || '').toLowerCase() === 'medium').length;
      const hard = list.filter(item => (item.difficulty || '').toLowerCase() === 'hard').length;
      return { total, active, inactive, easy, medium, hard };
    };

    return {
      round1: getStats(this.round1Questions),
      round2: getStats(this.round2Patterns),
      round3: getStats(this.round3CodeCrackers),
      totalChallenges: this.round1Questions.length + this.round2Patterns.length + this.round3CodeCrackers.length
    };
  }

  // ================= ROUND QUERIES =================

  getRound1All() {
    return [...this.round1Questions];
  }

  getRound1ById(id) {
    return this.round1Questions.find(q => q.id === id);
  }

  getRound2All() {
    return [...this.round2Patterns];
  }

  getRound2ById(id) {
    return this.round2Patterns.find(p => p.id === id);
  }

  getRound3All() {
    return [...this.round3CodeCrackers];
  }

  getRound3ById(id) {
    return this.round3CodeCrackers.find(c => c.id === id);
  }

  initDefaultData() {
    this.round1Questions = [];
    this.round2Patterns = [];
    this.round3CodeCrackers = [];
    this.round3Reactions = [];
  }
}
