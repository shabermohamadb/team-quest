/**
 * TEAM QUEST — Authoritative Game Answer Validator
 * Validates text answers (Round 1), multiple-choice options (Round 2), and reaction targets (Round 3).
 */

/**
 * Normalizes text answer for comparison (Section 4):
 * 1. Trim leading spaces
 * 2. Trim trailing spaces
 * 3. Convert to lowercase
 * 4. Normalize repeated whitespace
 */
export function normalizeTextAnswer(str) {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    str = String(str);
  }
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Backward compatibility alias
export const normalizeAnswer = normalizeTextAnswer;

/**
 * Helper to strip common web prefixes and TLDs for technical web questions
 */
function stripWebMetadata(s) {
  return s
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|org|net|io|dev|ai|co|app|gov|edu|me|so)$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * ROUND 1: Text Answer Validation (Sections 1, 2, 3, 4, 5, 6, 17)
 * Authoritatively compares submitted answer against correctAnswer and acceptedAnswers.
 * Case-insensitive, space-normalized, supports alternate spellings.
 *
 * @param {string} submission - The player's submitted answer
 * @param {string} correctAnswer - The question's configured primary answer
 * @param {string[]} acceptedAnswers - Optional array of alternative accepted answers
 * @returns {boolean}
 */
export function validateTextAnswer(submission, correctAnswer, acceptedAnswers = []) {
  if (correctAnswer && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
    const q = correctAnswer;
    correctAnswer = q.correctAnswer || q.answer;
    acceptedAnswers = q.acceptedAnswers || q.acceptedAlternateAnswers || q.alternates || acceptedAnswers;
  }

  if (submission === null || submission === undefined) {
    return { isCorrect: false, reason: 'Empty submission' };
  }
  const submissionStr = typeof submission === 'string' ? submission : String(submission);

  if (!correctAnswer) {
    return { isCorrect: false, reason: 'No correct answer configured' };
  }

  const normSub = normalizeTextAnswer(submissionStr);
  if (!normSub) {
    return { isCorrect: false, reason: 'Empty normalized submission' };
  }

  const normCorrect = normalizeTextAnswer(correctAnswer);

  // 1. Direct normalized match (case-insensitive, space-normalized)
  if (normSub === normCorrect) {
    return { isCorrect: true, reason: 'Exact normalized match' };
  }

  // 2. Check accepted alternate answers
  if (Array.isArray(acceptedAnswers)) {
    for (const alt of acceptedAnswers) {
      if (!alt) continue;
      if (normSub === normalizeTextAnswer(alt)) {
        return { isCorrect: true, reason: 'Matched accepted alternate answer' };
      }
    }
  }

  // 3. Normalized web-entity match (e.g. "github.com" vs "github")
  const strippedSub = stripWebMetadata(normSub);
  const strippedCorrect = stripWebMetadata(normCorrect);
  if (strippedSub && strippedCorrect && strippedSub === strippedCorrect) {
    return { isCorrect: true, reason: 'Matched web domain name' };
  }

  if (Array.isArray(acceptedAnswers)) {
    for (const alt of acceptedAnswers) {
      if (!alt) continue;
      const strippedAlt = stripWebMetadata(normalizeTextAnswer(alt));
      if (strippedSub && strippedAlt && strippedSub === strippedAlt) {
        return { isCorrect: true, reason: 'Matched alternate web domain name' };
      }
    }
  }

  return { isCorrect: false, reason: 'Answer does not match' };
}

/**
 * Convenience wrapper specifically for Round 1 text validation
 */
export function validateRound1TextAnswer(submission, questionOrAnswer, acceptedAnswers = []) {
  return validateTextAnswer(submission, questionOrAnswer, acceptedAnswers);
}

// Backward compatibility alias for isAnswerCorrect returning boolean
export function isAnswerCorrect(submission, correctAnswer, acceptedAnswers = []) {
  const res = validateTextAnswer(submission, correctAnswer, acceptedAnswers);
  return typeof res === 'boolean' ? res : Boolean(res?.isCorrect);
}

/**
 * ROUND 2: Multiple Choice Validation (Sections 18, 19, 20, 21)
 * Authoritatively validates option selection using stable IDs (A, B, C, D).
 * Never compares option letters to option text values.
 *
 * @param {string} selectedOptionId - The ID of the option selected by the player (e.g. 'B')
 * @param {object} question - The Round 2 pattern question object
 * @returns {{ isCorrect: boolean, selectedOptionId: string, correctOptionId: string, reason: string }}
 */
export function validateOptionAnswer(selectedOptionId, question) {
  if (!selectedOptionId || !question) {
    return { isCorrect: false, selectedOptionId: null, correctOptionId: null, reason: 'Missing input or question' };
  }

  const targetOptionId = (question.correctOptionId || question.correctOption || '').toString().trim().toUpperCase();
  if (!targetOptionId) {
    return { isCorrect: false, selectedOptionId, correctOptionId: null, reason: 'No correct option configured' };
  }

  const cleanSelected = selectedOptionId.toString().trim().toUpperCase();

  // 1. Authoritative ID match: "B" === "B"
  if (cleanSelected === targetOptionId) {
    return { isCorrect: true, selectedOptionId: cleanSelected, correctOptionId: targetOptionId, reason: 'Option ID match' };
  }

  // 2. Robust fallback if option text was provided instead of option ID
  if (Array.isArray(question.options)) {
    const correctOpt = question.options.find(
      opt => (opt.id || opt.key || '').toString().trim().toUpperCase() === targetOptionId
    );
    if (correctOpt && normalizeTextAnswer(correctOpt.text) === normalizeTextAnswer(selectedOptionId)) {
      return { isCorrect: true, selectedOptionId: targetOptionId, correctOptionId: targetOptionId, reason: 'Option text fallback match' };
    }
  }

  return { isCorrect: false, selectedOptionId: cleanSelected, correctOptionId: targetOptionId, reason: 'Incorrect option' };
}

/**
 * ROUND 3: Code Cracker Validation (Sections 26, 27, 28)
 * Authoritatively validates decoded text/code against correctCode and acceptedCodes.
 * Normalizes harmless differences: case, leading/trailing whitespace, repeated spaces.
 * Supports challenge-level caseSensitive flag.
 *
 * @param {string} submission - The player's submitted code
 * @param {object} challenge - The Round 3 challenge object
 * @returns {{ isCorrect: boolean, reason: string }}
 */
export function validateCodeCrackerAnswer(submission, challenge) {
  if (!challenge) {
    return { isCorrect: false, reason: 'No challenge provided' };
  }
  if (submission === undefined || submission === null) {
    return { isCorrect: false, reason: 'Empty submission' };
  }

  const rawSub = typeof submission === 'string' ? submission : String(submission);
  const targetCode = (challenge.correctCode || challenge.code || challenge.answer || '').toString();
  if (!targetCode) {
    return { isCorrect: false, reason: 'No correct code configured' };
  }

  const isCaseSensitive = Boolean(challenge.caseSensitive);

  const cleanSub = isCaseSensitive
    ? rawSub.trim().replace(/\s+/g, ' ')
    : normalizeTextAnswer(rawSub);

  const cleanTarget = isCaseSensitive
    ? targetCode.trim().replace(/\s+/g, ' ')
    : normalizeTextAnswer(targetCode);

  if (!cleanSub) {
    return { isCorrect: false, reason: 'Empty normalized submission' };
  }

  // 1. Direct comparison
  if (cleanSub === cleanTarget) {
    return { isCorrect: true, reason: 'Exact code match' };
  }

  // 2. Accepted alternate codes
  const alternates = challenge.acceptedCodes || challenge.acceptedAnswers || [];
  if (Array.isArray(alternates)) {
    for (const alt of alternates) {
      if (!alt) continue;
      const cleanAlt = isCaseSensitive
        ? String(alt).trim().replace(/\s+/g, ' ')
        : normalizeTextAnswer(alt);
      if (cleanSub === cleanAlt) {
        return { isCorrect: true, reason: 'Matched accepted alternate code' };
      }
    }
  }

  return { isCorrect: false, reason: 'Incorrect code' };
}

/**
 * ROUND 3: Reaction Target Validation (Legacy Fallback)
 * @param {any} clickedValue
 * @param {object} question
 * @returns {{ isCorrect: boolean, targetValue: any, clickedValue: any }}
 */
export function validateReactionAnswer(clickedValue, question) {
  if (!question) return { isCorrect: false, reason: 'No question provided' };
  if (clickedValue === undefined || clickedValue === null) {
    return { isCorrect: false, reason: 'Missing clicked value' };
  }

  const target = question.targetValue ?? question.target ?? question.correctCode;
  if (target === undefined || target === null) {
    return { isCorrect: false, reason: 'No target configured' };
  }

  const isCorrect = String(clickedValue).trim().toLowerCase() === String(target).trim().toLowerCase();
  return { isCorrect, targetValue: target, clickedValue };
}

/**
 * Question Configuration Validator (Sections 28, 29)
 * Checks if question is properly configured before starting it.
 */
export function isQuestionConfigured(question, roundNumber = 1) {
  if (!question) {
    return { isValid: false, reason: 'Question is undefined' };
  }

  if (roundNumber === 1) {
    const hasAnswer = Boolean(question.correctAnswer && typeof question.correctAnswer === 'string' && question.correctAnswer.trim());
    return {
      isValid: hasAnswer,
      reason: hasAnswer ? null : 'Missing correctAnswer for Round 1 question'
    };
  }

  if (roundNumber === 2) {
    const hasCorrect = Boolean(question.correctOptionId || question.correctOption);
    const hasOptions = Array.isArray(question.options) && question.options.length === 4;
    const correctOpt = (question.correctOptionId || question.correctOption || '').toUpperCase();
    const match = hasOptions && question.options.some(o => (o.id || o.key || '').toUpperCase() === correctOpt);
    const isValid = Boolean(hasCorrect && hasOptions && match);
    let reason = null;
    if (!hasCorrect) reason = 'Missing correctOptionId in pattern question';
    else if (!hasOptions) reason = 'Pattern question does not have exactly 4 options';
    else if (!match) reason = `correctOptionId "${correctOpt}" not found among options`;

    return { isValid, reason };
  }

  if (roundNumber === 3) {
    const hasCode = Boolean(question.correctCode || question.targetValue || question.target);
    return {
      isValid: hasCode,
      reason: hasCode ? null : 'Missing correctCode in Code Cracker challenge'
    };
  }

  return { isValid: true, reason: null };
}

