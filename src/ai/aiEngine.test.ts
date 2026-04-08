import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { chooseAction, findAllValidCombinations } from './aiEngine.js';
import { isValidCombination, canBeat } from '../core/validator.js';
import type { Card, Combination, GameState, Rank, RoundHistory, Suit } from '../types.js';

// ============================================================
// Helpers
// ============================================================

const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function card(rank: Rank, suit: Suit = 'SPADE'): Card {
  return { rank, suit };
}

function makeCombination(cards: Card[]): Combination {
  const result = isValidCombination(cards);
  if (!result.valid || !result.combination) {
    throw new Error(`Invalid combination: ${JSON.stringify(cards)}`);
  }
  return result.combination;
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  const emptyHistory: RoundHistory = {
    roundNumber: 1,
    playActions: [],
    roundWinner: null,
  };
  return {
    players: [],
    currentPlayerIndex: 0,
    pile: null,
    roundNumber: 1,
    scores: {},
    passedPlayers: new Set(),
    baoSamPlayerId: null,
    roundHistory: emptyHistory,
    gameOver: false,
    winner: null,
    ...overrides,
  };
}

// ============================================================
// Arbitraries
// ============================================================

const suitArb = fc.constantFrom(...SUITS);
const rankArb = fc.constantFrom(...RANKS);

// Arbitrary cho 1 lá bài
const cardArb = fc.record({ rank: rankArb, suit: suitArb });

// Arbitrary cho tay bài ngẫu nhiên (3–10 lá, không trùng rank+suit)
const handArb = fc.uniqueArray(cardArb, {
  minLength: 3,
  maxLength: 10,
  selector: (c) => `${c.rank}-${c.suit}`,
});

// Arbitrary cho pile hợp lệ (Rác hoặc Đôi)
const racPileArb = rankArb.map((rank) => makeCombination([card(rank, 'SPADE')]));
const doiPileArb = rankArb.map((rank) =>
  makeCombination([card(rank, 'SPADE'), card(rank, 'HEART')]),
);
const pileArb = fc.oneof(
  fc.constant(null),
  racPileArb,
  doiPileArb,
);

// ============================================================
// Unit Tests — findAllValidCombinations
// ============================================================

describe('findAllValidCombinations', () => {
  it('trả về rỗng khi hand rỗng', () => {
    expect(findAllValidCombinations([], null)).toHaveLength(0);
  });

  it('tìm được Rác từ tay 1 lá', () => {
    const hand = [card(7)];
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'RAC' && c.representativeRank === 7)).toBe(true);
  });

  it('tìm được Đôi khi có 2 lá cùng rank', () => {
    const hand = [card(9, 'SPADE'), card(9, 'HEART'), card(5)];
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'DOI' && c.representativeRank === 9)).toBe(true);
  });

  it('tìm được Sảnh khi có lá liên tiếp', () => {
    const hand = [card(3), card(4), card(5), card(6)];
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'SANH')).toBe(true);
  });

  it('tìm được Tứ Quý khi có 4 lá cùng rank', () => {
    const hand = SUITS.map((s) => card(8, s));
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'TU_QUY' && c.representativeRank === 8)).toBe(true);
  });

  it('lọc đúng: chỉ trả về combo có thể đánh đè pile', () => {
    const pile = makeCombination([card(9)]);
    const hand = [card(7), card(8), card(10)];
    const combos = findAllValidCombinations(hand, pile);
    // Chỉ lá 10 (rank=10) mới đánh đè được Rác 9
    expect(combos.every((c) => canBeat(c, pile))).toBe(true);
    expect(combos.some((c) => c.representativeRank === 10)).toBe(true);
    expect(combos.some((c) => c.representativeRank === 7)).toBe(false);
    expect(combos.some((c) => c.representativeRank === 8)).toBe(false);
  });

  it('tìm được 3 Đôi liên tiếp', () => {
    const hand = [
      card(3, 'SPADE'), card(3, 'HEART'),
      card(4, 'SPADE'), card(4, 'HEART'),
      card(5, 'SPADE'), card(5, 'HEART'),
    ];
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'SANH' && c.cards.length === 6)).toBe(true);
  });

  it('tìm được Sảnh A-2-3', () => {
    const hand = [card(14), card(15), card(3)];
    const combos = findAllValidCombinations(hand, null);
    expect(combos.some((c) => c.type === 'SANH' && c.representativeRank === 3)).toBe(true);
  });
});

// ============================================================
// Unit Tests — chooseAction
// ============================================================

describe('chooseAction', () => {
  it('trả về PASS khi không có combo hợp lệ', () => {
    const hand = [card(3), card(4)];
    const pile = makeCombination([card(15)]); // Rác lá 2 — không thể đánh đè bằng Rác thường
    const state = makeGameState();
    const action = chooseAction(hand, pile, state, 'EASY');
    expect(action.type).toBe('PASS');
  });

  it('Easy: chọn Rác nhỏ nhất khi pile null', () => {
    const hand = [card(5), card(8), card(12)];
    const state = makeGameState();
    const action = chooseAction(hand, null, state, 'EASY');
    expect(action.type).toBe('PLAY');
    if (action.type === 'PLAY') {
      expect(action.combination.representativeRank).toBe(5);
    }
  });

  it('Easy: chọn combo nhỏ nhất có thể đánh đè pile', () => {
    const hand = [card(7), card(9), card(11)];
    const pile = makeCombination([card(8)]);
    const state = makeGameState();
    const action = chooseAction(hand, pile, state, 'EASY');
    expect(action.type).toBe('PLAY');
    if (action.type === 'PLAY') {
      expect(action.combination.representativeRank).toBe(9);
    }
  });

  it('Hard: giữ lại Tứ Quý, đánh bài yếu trước', () => {
    const hand = [
      card(5), // Rác yếu
      ...SUITS.map((s) => card(14, s)), // Tứ Quý A
    ];
    const state = makeGameState();
    const action = chooseAction(hand, null, state, 'HARD');
    expect(action.type).toBe('PLAY');
    if (action.type === 'PLAY') {
      // Không nên chọn Tứ Quý khi còn bài yếu hơn
      expect(action.combination.type).not.toBe('TU_QUY');
    }
  });

  it('Hard: giữ lại lá 2, đánh bài yếu trước', () => {
    const hand = [card(6), card(15)];
    const state = makeGameState();
    const action = chooseAction(hand, null, state, 'HARD');
    expect(action.type).toBe('PLAY');
    if (action.type === 'PLAY') {
      expect(action.combination.representativeRank).not.toBe(15);
    }
  });
});

// ============================================================
// Property 18: AI luôn trả về hành động hợp lệ
// Feature: sam-10-la-card-game, Property 18: AI luôn trả về hành động hợp lệ
// Validates: Requirements 8.2, 8.3
// ============================================================

describe('Property 18: AI luôn trả về hành động hợp lệ', () => {
  it('chooseAction trả về PLAY với combo hợp lệ canBeat pile, hoặc PASS', () => {
    fc.assert(
      fc.property(
        handArb,
        pileArb,
        fc.constantFrom('EASY' as const, 'HARD' as const),
        (hand, pile, difficulty) => {
          const state = makeGameState();
          const action = chooseAction(hand, pile, state, difficulty);

          if (action.type === 'PASS') {
            // PASS hợp lệ: không có combo nào có thể đánh đè pile
            const validCombos = findAllValidCombinations(hand, pile);
            expect(validCombos.length).toBe(0);
          } else {
            // PLAY hợp lệ: combination phải hợp lệ và canBeat pile
            const { combination } = action;
            const validResult = isValidCombination(combination.cards);
            expect(validResult.valid).toBe(true);
            expect(canBeat(combination, pile)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 19: Easy AI chọn Combination nhỏ nhất hợp lệ
// Feature: sam-10-la-card-game, Property 19: Easy AI chọn Combination nhỏ nhất hợp lệ
// Validates: Requirements 8.4
// ============================================================

describe('Property 19: Easy AI chọn Combination có representativeRank nhỏ nhất', () => {
  it('Easy AI chọn combo có representativeRank nhỏ nhất trong tất cả combo hợp lệ', () => {
    fc.assert(
      fc.property(
        handArb,
        pileArb,
        (hand, pile) => {
          const state = makeGameState();
          const action = chooseAction(hand, pile, state, 'EASY');
          const validCombos = findAllValidCombinations(hand, pile);

          if (validCombos.length === 0) {
            // Không có combo → phải PASS
            expect(action.type).toBe('PASS');
          } else {
            // Có combo → phải PLAY với combo có representativeRank nhỏ nhất
            expect(action.type).toBe('PLAY');
            if (action.type === 'PLAY') {
              const minRank = Math.min(...validCombos.map((c) => c.representativeRank));
              expect(action.combination.representativeRank).toBe(minRank);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
