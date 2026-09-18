/**
 * TEAM QUEST — Safe Hint Validation & Category Templates Engine
 * Enforces that hints provide ONLY directional clues on how to approach puzzles
 * and NEVER reveal the answer, decoded characters, ASCII decimals, or step-by-step solutions.
 */

export const SAFE_HINT_TEMPLATES = {
  // Binary puzzles (8-bit values)
  'Binary ASCII': 'Each 8-bit group represents one encoded character. Identify the character encoding being used.',
  'Binary': 'Each 8-bit group represents one encoded character. Identify the character encoding being used.',

  // Caesar ciphers & Rotations
  'Caesar Cipher': 'The letters have been shifted. Look for a consistent shift across the message.',
  'ROT13': 'The letters have been rotated through the alphabet. Determine the fixed rotation offset.',

  // Alphabetical / numerical mapping (A1Z26)
  'Alphabetical Mapping': 'Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.',
  'A1Z26': 'Each number corresponds to an alphabetical position. Look for a standard 1-to-26 letter relationship.',

  // Hexadecimal notation (avoids using the word "byte")
  'Hex Encoding': 'The values are written using hexadecimal notation. Convert each pair using standard character encoding.',
  'Hexadecimal': 'The values are written using hexadecimal notation. Convert each pair using standard character encoding.',

  // Symbol substitution & Leetspeak
  'Substitution': 'Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.',
  'Leetspeak': 'Numbers and symbols replace visually similar letters. Identify the character substitutions to read the word.',

  // Matrix coordinates / Polybius Square
  'Polybius Grid': 'The coordinates reference a character grid. Determine row and column intersections to find each character.',
  'Matrix Coordinates': 'The coordinates reference a character grid. Determine row and column intersections to find each character.',

  // Morse code
  'Morse Code': 'The message is represented in standard timing signals. Translate each symbol group into its corresponding letter.',

  // Word reversals
  'Reversal': 'The sequence is intact but inverted. Read the characters from right to left.',

  // Telephone Keypad (T9)
  'Telephone Keypad': 'The digits correspond to a standard phone keypad layout. Match each digit to its letter grouping.',
  'Phone Keypad': 'The digits correspond to a standard phone keypad layout. Match each digit to its letter grouping.',

  // Base64 encoding
  'Base64 Decoding': 'The text is encoded using standard Base64 representation. Convert the data block to reveal the keyword.',
  'Base64': 'The text is encoded using standard Base64 representation. Convert the data block to reveal the keyword.',

  // Keyboard layout shifts
  'Keyboard Cipher': 'Each character is displaced on a standard QWERTY keyboard. Trace the physical shift to decode the word.',

  // Abbreviation / Vowel removal
  'Abbreviation': 'The consonants of a well-known technical term are shown. Reconstruct the word by restoring the missing vowels.',

  // Inverse alphabet (Atbash)
  'Inverse Cipher': 'The alphabet has been reversed. Match each letter from the opposite end of the alphabet.',
  'Atbash': 'The alphabet has been reversed. Match each letter from the opposite end of the alphabet.',

  // Generic fallback
  'Default': 'Each group represents one character. Look at the encoding method carefully.'
};

/**
 * Validates whether a hint is safe to display to contestants.
 *
 * Rules:
 * 1. Must NOT contain the exact correct answer (as a standalone word or phrase).
 * 2. Must NOT contain any accepted alternate answers.
 * 3. Must NOT contain direct character-value mapping patterns (e.g., "01010011 = S", "A=Z", "0x4B = 75 ('K')", "19=S", "W-4=S", "..-. = F").
 * 4. Word count should be approximately <= 25 words (1-2 sentences).
 *
 * @param {string} hint - The proposed hint text
 * @param {string} correctAnswer - The target correct code/answer
 * @param {string[]} acceptedAnswers - Optional alternate accepted answers
 * @returns {{ isSafe: boolean, violations: string[] }}
 */
export function validateSafeHint(hint, correctAnswer, acceptedAnswers = []) {
  const violations = [];
  if (!hint || typeof hint !== 'string') {
    return { isSafe: true, violations: [] };
  }

  const cleanHint = hint.trim();

  // 1. Check word count (max 25 words target)
  const words = cleanHint.split(/\s+/).filter(Boolean);
  if (words.length > 25) {
    violations.push(`Hint exceeds maximum length (${words.length} words > 25 words limit)`);
  }

  // Collect target answers to guard against
  const targets = [];
  if (correctAnswer) targets.push(String(correctAnswer).trim());
  if (Array.isArray(acceptedAnswers)) {
    acceptedAnswers.forEach(alt => {
      if (alt) targets.push(String(alt).trim());
    });
  }

  // 2. Check if hint exposes the target answer or any alternate
  for (const target of targets) {
    const cleanTarget = String(target).trim();
    if (!cleanTarget) continue;

    // Word-boundary check (case-insensitive)
    const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (wordRegex.test(cleanHint)) {
      violations.push(`Hint directly contains target answer "${target}"`);
    }
  }

  // 3. Check for direct character-mapping or solution step patterns:
  const mappingPatterns = [
    /=\s*['"]?[A-Za-z]['"]?(\s|,|\.|\)|$)/,     // "= 'S'" or "= S"
    /['"][A-Za-z]['"]\s*=/,                    // "'S' ="
    /\b[0-9]{1,3}\s*=\s*[A-Za-z]/,             // "19=S" or "19 = S"
    /\b0x[0-9A-Fa-f]{2}\s*=\s*[0-9]{2,3}/,     // "0x4B = 75"
    /\b[01]{8}\s*=\s*[0-9]{2,3}/,              // "01010011 = 83"
    /[A-Za-z]\s*[-+]\s*[0-9]\s*=\s*[A-Za-z]/,  // "W-4=S"
    /[-.]{2,}\s*=\s*[A-Za-z]/                  // "..-. = F"
  ];

  for (const pat of mappingPatterns) {
    if (pat.test(cleanHint)) {
      violations.push('Hint contains direct character-value solution mapping pattern');
      break;
    }
  }

  return {
    isSafe: violations.length === 0,
    violations
  };
}

/**
 * Returns a guaranteed safe, directional hint for a challenge.
 * If the configured hint passes safety validation, it is returned.
 * If the configured hint fails or contains leaks, it falls back to the category template.
 *
 * @param {object} challenge - The Round 3 challenge object
 * @returns {string} Safe hint text (1-2 sentences, max 25 words)
 */
export function getEnforcedSafeHint(challenge) {
  if (!challenge) {
    return SAFE_HINT_TEMPLATES.Default;
  }

  const category = challenge.category || '';
  const title = challenge.title || '';
  const hint = (challenge.hint || '').trim();
  const correctAnswer = challenge.correctAnswer || challenge.correctCode || challenge.code || '';
  const acceptedAnswers = challenge.acceptedAnswers || challenge.acceptedCodes || challenge.alternateCodes || [];

  // Determine fallback template based on category or title
  let fallback = SAFE_HINT_TEMPLATES[category];
  if (!fallback) {
    for (const [catKey, tmpl] of Object.entries(SAFE_HINT_TEMPLATES)) {
      if (category.toLowerCase().includes(catKey.toLowerCase()) || title.toLowerCase().includes(catKey.toLowerCase())) {
        fallback = tmpl;
        break;
      }
    }
  }
  if (!fallback) fallback = SAFE_HINT_TEMPLATES.Default;

  if (!hint) {
    return fallback;
  }

  const validation = validateSafeHint(hint, correctAnswer, acceptedAnswers);
  if (!validation.isSafe) {
    return fallback;
  }

  return hint;
}
