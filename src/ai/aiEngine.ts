import type { Card, Combination, CombinationType, GameState, Rank, Suit, AIAction } from '../types.js';
import { isValidCombination, canBeat } from '../core/validator.js';

// ============================================================
// Helpers
// ============================================================

const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** Nhóm lá bài theo rank. */
function groupByRank(hand: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const card of hand) {
    const group = map.get(card.rank) ?? [];
    group.push(card);
    map.set(card.rank, group);
  }
  return map;
}

/** Tạo Combination từ cards nếu hợp lệ, null nếu không. */
function makeCombination(cards: Card[]): Combination | null {
  const result = isValidCombination(cards);
  return result.valid && result.combination ? result.combination : null;
}

// ============================================================
// Tìm tất cả Combination có thể tạo từ hand
// ============================================================

/**
 * Tìm tất cả Combination hợp lệ từ hand có thể đánh đè pile.
 * Bao gồm: Rác, Đôi, Sám, Tứ Quý, Sảnh (kể cả 3 Đôi liên tiếp).
 */
export function findAllValidCombinations(hand: Card[], pile: Combination | null): Combination[] {
  const results: Combination[] = [];
  const byRank = groupByRank(hand);

  // --- Rác, Đôi, Sám, Tứ Quý ---
  for (const [, cards] of byRank) {
    for (let size = 1; size <= Math.min(cards.length, 4); size++) {
      const combo = makeCombination(cards.slice(0, size));
      if (combo && canBeat(combo, pile)) {
        results.push(combo);
      }
    }
  }

  // --- Sảnh thông thường (mỗi rank 1 lá, liên tiếp) ---
  // Lấy 1 lá đại diện cho mỗi rank có trong tay
  const availableRanks = [...byRank.keys()].sort((a, b) => a - b);

  // Thử mọi chuỗi liên tiếp có thể tạo từ availableRanks
  for (let i = 0; i < availableRanks.length; i++) {
    const sanhCards: Card[] = [byRank.get(availableRanks[i])![0]];
    for (let j = i + 1; j < availableRanks.length; j++) {
      const prevRank = availableRanks[j - 1];
      const currRank = availableRanks[j];
      // Kiểm tra liên tiếp (xử lý cả trường hợp đặc biệt với lá 2)
      if (!isConsecutive(prevRank, currRank, sanhCards.map((c) => c.rank))) {
        break;
      }
      sanhCards.push(byRank.get(currRank)![0]);
      if (sanhCards.length >= 3) {
        const combo = makeCombination([...sanhCards]);
        if (combo && canBeat(combo, pile)) {
          results.push(combo);
        }
      }
    }
  }

  // Sảnh đặc biệt: A-2-3 và 2-3-4
  const specialSanhs: Rank[][] = [
    [14, 15, 3], // A-2-3
    [15, 3, 4],  // 2-3-4
  ];
  for (const rankSeq of specialSanhs) {
    const cards: Card[] = [];
    let valid = true;
    for (const rank of rankSeq) {
      const group = byRank.get(rank as Rank);
      if (!group || group.length === 0) { valid = false; break; }
      cards.push(group[0]);
    }
    if (valid) {
      const combo = makeCombination(cards);
      if (combo && canBeat(combo, pile)) {
        // Tránh trùng lặp với sảnh đã tìm
        const isDuplicate = results.some(
          (r) => r.type === 'SANH' && r.representativeRank === combo.representativeRank &&
            r.cards.length === combo.cards.length &&
            r.cards.every((c, idx) => c.rank === combo.cards[idx]?.rank && c.suit === combo.cards[idx]?.suit)
        );
        if (!isDuplicate) results.push(combo);
      }
    }
  }

  // --- 3 Đôi liên tiếp (6 lá) ---
  // Tìm các rank có ít nhất 2 lá, rồi tìm 3 rank liên tiếp
  const pairRanks = [...byRank.entries()]
    .filter(([, cards]) => cards.length >= 2)
    .map(([rank]) => rank)
    .sort((a, b) => a - b);

  for (let i = 0; i + 2 < pairRanks.length; i++) {
    const r1 = pairRanks[i];
    const r2 = pairRanks[i + 1];
    const r3 = pairRanks[i + 2];
    if (r2 === r1 + 1 && r3 === r1 + 2) {
      const cards = [
        ...byRank.get(r1)!.slice(0, 2),
        ...byRank.get(r2)!.slice(0, 2),
        ...byRank.get(r3)!.slice(0, 2),
      ];
      const combo = makeCombination(cards);
      if (combo && canBeat(combo, pile)) {
        results.push(combo);
      }
    }
  }

  return results;
}

/**
 * Kiểm tra xem rank hiện tại có liên tiếp với rank trước trong chuỗi sảnh không.
 * Xử lý trường hợp đặc biệt: lá 2 (rank=15) chỉ liên tiếp với A(14) và 3.
 */
function isConsecutive(prevRank: Rank, currRank: Rank, sequence: Rank[]): boolean {
  // Trường hợp thông thường: liên tiếp tự nhiên
  if (currRank === prevRank + 1) return true;

  // Lá 2 (rank=15) sau A (rank=14): A-2
  if (prevRank === 14 && currRank === 15) return true;

  // Lá 3 (rank=3) sau lá 2 (rank=15): 2-3
  // Chỉ hợp lệ nếu chuỗi bắt đầu bằng A-2 hoặc chỉ có 2
  if (prevRank === 15 && currRank === 3) {
    // Chuỗi 2-3-4: sequence chỉ có [15]
    // Chuỗi A-2-3: sequence có [14, 15]
    return sequence.length <= 2;
  }

  return false;
}

// ============================================================
// Hard AI helpers
// ============================================================

/** Lấy tập hợp các rank đã được đánh ra trong roundHistory. */
function getPlayedRanks(gameState: GameState): Set<Rank> {
  const played = new Set<Rank>();
  for (const action of gameState.roundHistory.playActions) {
    if (action.action === 'PLAY' && action.combination) {
      for (const card of action.combination.cards) {
        played.add(card.rank);
      }
    }
  }
  return played;
}

/** Số lá còn lại ít nhất của đối thủ (không tính bản thân). */
function minOpponentCards(gameState: GameState, myId: string): number {
  const opponents = gameState.players.filter((p) => p.id !== myId);
  if (opponents.length === 0) return 99;
  return Math.min(...opponents.map((p) => p.hand.length));
}

/**
 * Tính điểm ưu tiên cho Hard AI khi pile TRỐNG (đánh tự do).
 * Mục tiêu: giảm bài nhanh nhất có thể.
 * - Sảnh dài: ưu tiên cao nhất (giảm nhiều lá nhất)
 * - Tứ Quý / Sám: giảm nhiều lá
 * - Đôi: tốt hơn Rác
 * - Lá 2 đơn: giữ lại trừ khi sắp hết bài
 */
function freePriority(combo: Combination, handSize: number, minOpponent: number): number {
  const cardsReduced = combo.cards.length;
  const isLast = handSize <= combo.cards.length; // đánh xong là hết bài

  // Nếu đánh xong là thắng → ưu tiên tuyệt đối
  if (isLast) return -9999;

  // Sảnh dài (≥4 lá): rất tốt
  if (combo.type === 'SANH' && cardsReduced >= 4) return -100 - cardsReduced * 10;

  // Sảnh 3 lá
  if (combo.type === 'SANH' && cardsReduced === 3) return -50;

  // 3 Đôi liên tiếp (6 lá): rất tốt
  if (combo.type === 'SANH' && cardsReduced === 6) return -120;

  // Tứ Quý: giữ lại để chặn, trừ khi đối thủ sắp hết bài
  if (combo.type === 'TU_QUY') {
    return minOpponent <= 3 ? -80 : 500;
  }

  // Sám: tốt
  if (combo.type === 'SAM') return -40;

  // Đôi: khá tốt
  if (combo.type === 'DOI') {
    // Đôi 2: giữ lại trừ khi đối thủ sắp hết
    if (combo.representativeRank === 15) return minOpponent <= 2 ? -30 : 400;
    return -20;
  }

  // Rác lá 2: giữ lại trừ khi cần thiết
  if (combo.type === 'RAC' && combo.representativeRank === 15) {
    return minOpponent <= 1 ? -10 : 300;
  }

  // Rác thường: đánh lá nhỏ nhất
  return combo.representativeRank;
}

/**
 * Tính điểm ưu tiên khi pile CÓ BÀI (cần chặn).
 * Mục tiêu: chặn bằng bài nhỏ nhất có thể, giữ bài mạnh.
 * Ngoại lệ: nếu đối thủ sắp hết bài thì phải chặn bằng bài mạnh nhất.
 */
function beatPriority(combo: Combination, minOpponent: number, playedRanks: Set<Rank>): number {
  const isUrgent = minOpponent <= 2; // đối thủ sắp hết bài → phải chặn mạnh

  // Nếu đánh xong là hết bài → ưu tiên tuyệt đối
  // (handled by caller checking hand size)

  // Tứ Quý chặt lá 2: chỉ dùng khi cần thiết
  if (combo.type === 'TU_QUY') {
    return isUrgent ? -500 : 800;
  }

  // 3 Đôi liên tiếp chặt lá 2: chỉ dùng khi cần
  if (combo.type === 'SANH' && combo.cards.length === 6) {
    return isUrgent ? -400 : 700;
  }

  // Lá 2 đơn/đôi: giữ lại trừ khi urgent
  if (combo.representativeRank === 15) {
    return isUrgent ? -300 : 600;
  }

  // Sảnh: ưu tiên đánh sảnh ngắn để giữ sảnh dài
  if (combo.type === 'SANH') {
    const alreadyPlayed = combo.cards.filter((c) => playedRanks.has(c.rank)).length;
    return combo.representativeRank + combo.cards.length * 2 - alreadyPlayed;
  }

  // Còn lại: chặn bằng bài nhỏ nhất có thể
  return combo.representativeRank;
}

// ============================================================
// Public API
// ============================================================

/**
 * AI Engine: chọn hành động cho bot.
 *
 * @param hand - Tay bài hiện tại của bot
 * @param pile - Combination trên bàn (null nếu pile trống)
 * @param gameState - Trạng thái game hiện tại
 * @param difficulty - Độ khó: 'EASY' hoặc 'HARD'
 * @returns AIAction: { type: 'PLAY', combination } hoặc { type: 'PASS' }
 */
export function chooseAction(
  hand: Card[],
  pile: Combination | null,
  gameState: GameState,
  difficulty: 'EASY' | 'HARD',
): AIAction {
  const validCombos = findAllValidCombinations(hand, pile);

  if (validCombos.length === 0) {
    return { type: 'PASS' };
  }

  if (difficulty === 'EASY') {
    // Easy: chọn Combination có representativeRank nhỏ nhất (giữ bài mạnh)
    const best = validCombos.reduce((min, combo) =>
      combo.representativeRank < min.representativeRank ? combo : min,
    );
    return { type: 'PLAY', combination: best };
  }

  // Hard: chiến lược thông minh
  const playedRanks = getPlayedRanks(gameState);

  // Tìm id của bot này (người đang đến lượt)
  const myId = gameState.players[gameState.currentPlayerIndex]?.id ?? '';
  const minOpponent = minOpponentCards(gameState, myId);

  // Nếu đánh xong là hết bài → thắng ngay, ưu tiên tuyệt đối
  const winningCombo = validCombos.find((c) => c.cards.length === hand.length);
  if (winningCombo) {
    return { type: 'PLAY', combination: winningCombo };
  }

  let best: Combination;

  if (pile === null) {
    // Pile trống: chọn combo tối ưu để giảm bài
    best = validCombos.reduce((a, b) => {
      const sa = freePriority(a, hand.length, minOpponent);
      const sb = freePriority(b, hand.length, minOpponent);
      return sb < sa ? b : a;
    });
  } else {
    // Pile có bài: chặn bằng bài nhỏ nhất hợp lý
    best = validCombos.reduce((a, b) => {
      const sa = beatPriority(a, minOpponent, playedRanks);
      const sb = beatPriority(b, minOpponent, playedRanks);
      return sb < sa ? b : a;
    });
  }

  return { type: 'PLAY', combination: best };
}
