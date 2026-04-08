import type { Card, Combination, CombinationType, Rank, ValidationResult } from '../types.js';

// ============================================================
// Helpers
// ============================================================

/** Sắp xếp lá bài theo rank tăng dần. */
function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.rank - b.rank);
}

/** Kiểm tra tất cả lá có cùng rank không. */
function allSameRank(cards: Card[]): boolean {
  return cards.every((c) => c.rank === cards[0].rank);
}

// ============================================================
// Sảnh (Straight) detection
// ============================================================

/**
 * Thứ tự rank trong chuỗi sảnh tự nhiên (3..14 = 3..A, 15 = lá 2).
 * Sảnh đặc biệt: A-2-3 (ranks 14-15-3) và 2-3-4 (ranks 15-3-4).
 *
 * Trả về mảng rank theo thứ tự chuỗi nếu hợp lệ, null nếu không.
 * Hỗ trợ cả sảnh thông thường (mỗi rank 1 lá) và 3 Đôi liên tiếp (mỗi rank 2 lá).
 */
function getSanhSequence(cards: Card[]): Rank[] | null {
  const sorted = sortByRank(cards);
  const ranks = sorted.map((c) => c.rank);

  // Kiểm tra 3 Đôi liên tiếp (6 lá): mỗi rank xuất hiện đúng 2 lần, 3 rank liên tiếp
  if (cards.length === 6) {
    const threePairSeq = getThreeConsecutivePairsSequence(ranks);
    if (threePairSeq !== null) return threePairSeq;
  }

  // Chuỗi thông thường: mỗi rank xuất hiện đúng 1 lần
  // Lá 2 (rank=15) chỉ được phép ở vị trí đặc biệt
  const has2 = ranks.includes(15);

  if (!has2) {
    // Không có lá 2: kiểm tra chuỗi liên tiếp thông thường
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] !== ranks[i - 1] + 1) return null;
    }
    return ranks;
  }

  // Có lá 2 (rank=15): chỉ cho phép A-2-3 hoặc 2-3-4
  // A-2-3: ranks phải là [3, 14, 15] (sau sort) → chuỗi [14, 15, 3]
  // 2-3-4: ranks phải là [3, 4, 15] (sau sort) → chuỗi [15, 3, 4]
  // Các sảnh dài hơn có lá 2 không được phép (vì 2 chỉ liên tiếp với A và 3)

  const nonTwoRanks = ranks.filter((r) => r !== 15);

  // A-2-3: nonTwoRanks = [3, 14]
  if (
    nonTwoRanks.length === 2 &&
    nonTwoRanks[0] === 3 &&
    nonTwoRanks[1] === 14
  ) {
    // Chuỗi: A(14) → 2(15) → 3(3), lá cao nhất là 3
    return [14, 15, 3];
  }

  // 2-3-4: nonTwoRanks = [3, 4]
  if (
    nonTwoRanks.length === 2 &&
    nonTwoRanks[0] === 3 &&
    nonTwoRanks[1] === 4
  ) {
    // Chuỗi: 2(15) → 3(3) → 4(4), lá cao nhất là 4
    return [15, 3, 4];
  }

  // Mọi trường hợp khác có lá 2 đều không hợp lệ
  return null;
}

/**
 * Kiểm tra 3 Đôi liên tiếp: 6 lá gồm 3 cặp đôi có rank liên tiếp.
 * Trả về chuỗi rank (3 rank, mỗi rank 1 lần) nếu hợp lệ, null nếu không.
 */
function getThreeConsecutivePairsSequence(sortedRanks: Rank[]): Rank[] | null {
  if (sortedRanks.length !== 6) return null;
  // Sau sort: [r, r, r+1, r+1, r+2, r+2]
  if (
    sortedRanks[0] === sortedRanks[1] &&
    sortedRanks[2] === sortedRanks[3] &&
    sortedRanks[4] === sortedRanks[5] &&
    sortedRanks[2] === sortedRanks[0] + 1 &&
    sortedRanks[4] === sortedRanks[0] + 2
  ) {
    return [sortedRanks[0], sortedRanks[2], sortedRanks[4]];
  }
  return null;
}

// ============================================================
// Public API
// ============================================================

/**
 * Xác định loại Combination từ tập lá bài.
 * Trả về null nếu không phải Combination hợp lệ.
 */
export function getCombinationType(cards: Card[]): CombinationType | null {
  if (cards.length === 0) return null;

  if (cards.length === 1) return 'RAC';

  if (cards.length === 2) {
    return allSameRank(cards) ? 'DOI' : null;
  }

  if (cards.length === 3) {
    if (allSameRank(cards)) return 'SAM';
    if (getSanhSequence(cards) !== null) return 'SANH';
    return null;
  }

  if (cards.length === 4) {
    if (allSameRank(cards)) return 'TU_QUY';
    if (getSanhSequence(cards) !== null) return 'SANH';
    return null;
  }

  // 5+ lá: chỉ có thể là Sảnh (bao gồm 3 Đôi liên tiếp ở 6 lá)
  if (getSanhSequence(cards) !== null) return 'SANH';
  return null;
}

/**
 * Kiểm tra tính hợp lệ của một tổ hợp lá bài và trả về ValidationResult.
 * Nếu hợp lệ, trả về combination đầy đủ với representativeRank.
 */
export function isValidCombination(cards: Card[]): ValidationResult {
  if (cards.length === 0) {
    return { valid: false, reason: 'Không có lá bài nào' };
  }

  const type = getCombinationType(cards);
  if (type === null) {
    return { valid: false, reason: 'Tổ hợp lá bài không hợp lệ' };
  }

  let representativeRank: Rank;

  if (type === 'SANH') {
    const seq = getSanhSequence(cards)!;
    // representativeRank = rank của lá cao nhất trong chuỗi (phần tử cuối)
    representativeRank = seq[seq.length - 1] as Rank;
  } else {
    // RAC, DOI, SAM, TU_QUY: tất cả cùng rank (hoặc 1 lá)
    representativeRank = cards[0].rank;
  }

  const combination: Combination = {
    type,
    cards: [...cards],
    representativeRank,
  };

  return { valid: true, combination };
}

// ============================================================
// canBeat
// ============================================================

/**
 * Kiểm tra xem `incoming` có thể đánh đè lên `pile` không.
 * - pile = null → luôn true (pile trống)
 * - Cùng loại: so sánh representativeRank
 * - Luật đặc biệt:
 *   - TU_QUY chặt RAC rank=15 (lá 2 đơn)
 *   - TU_QUY chặt DOI rank=15 (đôi 2)
 *   - 3 Đôi liên tiếp (6 lá SANH với 3 cặp đôi liên tiếp) chặt RAC rank=15
 */
export function canBeat(incoming: Combination, pile: Combination | null): boolean {
  // Pile trống → luôn được đánh
  if (pile === null) return true;

  // Luật đặc biệt: TU_QUY chặt RAC-2 (lá 2 đơn)
  if (
    incoming.type === 'TU_QUY' &&
    pile.type === 'RAC' &&
    pile.representativeRank === 15
  ) {
    return true;
  }

  // Luật đặc biệt: TU_QUY chặt DOI-2 (đôi 2)
  if (
    incoming.type === 'TU_QUY' &&
    pile.type === 'DOI' &&
    pile.representativeRank === 15
  ) {
    return true;
  }

  // Luật đặc biệt: 3 Đôi liên tiếp (6 lá) chặt RAC-2
  if (
    pile.type === 'RAC' &&
    pile.representativeRank === 15 &&
    isThreeConsecutivePairs(incoming)
  ) {
    return true;
  }

  // Cùng loại: so sánh representativeRank
  if (incoming.type === pile.type) {
    // Sảnh: phải cùng số lá
    if (incoming.type === 'SANH' && incoming.cards.length !== pile.cards.length) {
      return false;
    }
    return incoming.representativeRank > pile.representativeRank;
  }

  return false;
}

/**
 * Kiểm tra xem combination có phải là 3 Đôi liên tiếp (6 lá) không.
 * 3 Đôi liên tiếp: 6 lá gồm 3 cặp đôi có rank liên tiếp nhau.
 * Ví dụ: 3-3-4-4-5-5, 7-7-8-8-9-9
 */
function isThreeConsecutivePairs(combo: Combination): boolean {
  if (combo.cards.length !== 6) return false;
  const sorted = sortByRank(combo.cards);
  const ranks = sorted.map((c) => c.rank);
  return getThreeConsecutivePairsSequence(ranks) !== null;
}
