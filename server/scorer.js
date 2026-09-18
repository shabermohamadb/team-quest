/**
 * TEAM QUEST — Authoritative Server Scorer
 */

export const ROUND1_MATRIX = {
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

export const ROUND2_MATRIX = {
  Easy: [30, 20, 15, 10],
  Medium: [50, 30, 20, 10],
  Hard: [75, 50, 35, 20]
};

export const ROUND3_MATRIX = {
  Easy: [40, 25, 15, 10],
  Medium: [60, 35, 20, 10],
  Hard: [80, 50, 30, 15]
};

export function calculateRound1Points(difficulty = 'Medium', clueNumber = 1, rank = 1, config = {}) {
  const norm = (difficulty || 'Medium').trim();
  const diffKey = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
  const tier = ROUND1_MATRIX[diffKey] || ROUND1_MATRIX.Medium;
  const clueTier = tier[Math.min(Math.max(clueNumber, 1), 3)] || tier[1];
  
  if (rank >= 1 && rank <= 4) {
    const rankIdx = rank - 1;
    return clueTier[rankIdx];
  }
  if (rank === 5) {
    return typeof config?.fifthPlacePoints === 'number' ? config.fifthPlacePoints : 5;
  }
  if (rank === 6) {
    return typeof config?.sixthPlacePoints === 'number' ? config.sixthPlacePoints : 3;
  }
  return 0;
}

export function calculateRound2Points(difficulty = 'Medium', rank = 1, config = {}) {
  const norm = (difficulty || 'Medium').trim();
  const diffKey = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
  const tier = ROUND2_MATRIX[diffKey] || ROUND2_MATRIX.Medium;
  
  if (rank >= 1 && rank <= 4) {
    const rankIdx = rank - 1;
    return tier[rankIdx];
  }
  if (rank === 5) {
    return typeof config?.round2FifthPlacePoints === 'number'
      ? config.round2FifthPlacePoints
      : (typeof config?.fifthPlacePoints === 'number' ? config.fifthPlacePoints : 5);
  }
  if (rank === 6) {
    return typeof config?.round2SixthPlacePoints === 'number'
      ? config.round2SixthPlacePoints
      : (typeof config?.sixthPlacePoints === 'number' ? config.sixthPlacePoints : 3);
  }
  return 0;
}

export function calculateRound3Points(difficulty = 'Medium', rank = 1, config = {}) {
  const norm = (difficulty || 'Medium').trim();
  const diffKey = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
  const tier = ROUND3_MATRIX[diffKey] || ROUND3_MATRIX.Medium;
  
  if (rank >= 1 && rank <= 4) {
    const rankIdx = rank - 1;
    return tier[rankIdx];
  }
  if (rank === 5) {
    return typeof config?.round3FifthPlacePoints === 'number'
      ? config.round3FifthPlacePoints
      : (typeof config?.fifthPlacePoints === 'number' ? config.fifthPlacePoints : 5);
  }
  if (rank === 6) {
    return typeof config?.round3SixthPlacePoints === 'number'
      ? config.round3SixthPlacePoints
      : (typeof config?.sixthPlacePoints === 'number' ? config.sixthPlacePoints : 3);
  }
  return 0;
}
