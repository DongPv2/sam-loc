import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getCombinationType, isValidCombination, canBeat } from './validator.js';
import type { Card, Combination, Rank, Suit } from '../types.js';

// ============================================================
// Helpers
// ============================================================

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

// ============================================================
// Arbitraries
// ============================================================

const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const suitArb = fc.constantFrom(...SUITS);
const rankArb = fc.constantFrom(...RANKS);

// Arbitrary cho 1 lá bài
const cardArb = fc.record({ rank: rankArb, suit: suitArb });

// Arbitrary cho Rác (1 lá bất kỳ)
const racArb = fc.tuple(rankArb, suitArb).map(([rank, suit]) => [card(rank, suit)]);

// Arbitrary cho Đôi (2 lá cùng rank, khác chất)
const doiArb = fc
  .tuple(rankArb, fc.uniqueArray(suitArb, { minLength: 2, maxLength: 2 }))
  .map(([rank, suits]) => suits.map((s) => card(rank, s)));

// Arbitrary cho Sám (3 lá cùng rank)
const samArb = fc
  .tuple(rankArb, fc.uniqueArray(suitArb, { minLength: 3, maxLength: 3 }))
  .map(([rank, suits]) => suits.map((s) => card(rank, s)));

// Arbitrary cho Tứ Quý (4 lá cùng rank)
const tuQuyArb = fc
  .tuple(rankArb)
  .map(([rank]) => SUITS.map((s) => card(rank, s)));

// Arbitrary cho Sảnh thông thường (không có lá 2), độ dài 3–10
// Ranks từ 3..14 (không có 15), chọn start sao cho start+len-1 <= 14
const sanhThuongArb = fc
  .integer({ min: 3, max: 12 })
  .chain((len) =>
    fc
      .integer({ min: 3, max: 14 - len + 1 })
      .map((start) => {
        const ranks = Array.from({ length: len }, (_, i) => (start + i) as Rank);
        return ranks.map((r, i) => card(r, SUITS[i % 4]));
      }),
  );

// Arbitrary cho Sảnh A-2-3
const sanhA23Arb = fc.constant([
  card(14, 'SPADE'),
  card(15, 'HEART'),
  card(3, 'DIAMOND'),
]);

// Arbitrary cho Sảnh 2-3-4
const sanh234Arb = fc.constant([
  card(15, 'SPADE'),
  card(3, 'HEART'),
  card(4, 'DIAMOND'),
]);

// Tất cả Sảnh hợp lệ
const sanhArb = fc.oneof(sanhThuongArb, sanhA23Arb, sanh234Arb);

// Tất cả Combination hợp lệ
const validCombinationCardsArb = fc.oneof(racArb, doiArb, samArb, tuQuyArb, sanhArb);

// ============================================================
// Unit Tests — getCombinationType
// ============================================================

describe('getCombinationType', () => {
  it('nhận diện RAC (1 lá)', () => {
    expect(getCombinationType([card(7)])).toBe('RAC');
    expect(getCombinationType([card(15)])).toBe('RAC');
  });

  it('nhận diện DOI (2 lá cùng rank)', () => {
    expect(getCombinationType([card(7, 'SPADE'), card(7, 'HEART')])).toBe('DOI');
  });

  it('từ chối 2 lá khác rank', () => {
    expect(getCombinationType([card(7), card(8)])).toBeNull();
  });

  it('nhận diện SAM (3 lá cùng rank)', () => {
    expect(getCombinationType([card(9, 'SPADE'), card(9, 'HEART'), card(9, 'DIAMOND')])).toBe('SAM');
  });

  it('nhận diện TU_QUY (4 lá cùng rank)', () => {
    expect(getCombinationType(SUITS.map((s) => card(10, s)))).toBe('TU_QUY');
  });

  it('nhận diện SANH thông thường (3-4-5)', () => {
    expect(getCombinationType([card(3), card(4), card(5)])).toBe('SANH');
  });

  it('nhận diện SANH A-2-3', () => {
    expect(getCombinationType([card(14), card(15), card(3)])).toBe('SANH');
  });

  it('nhận diện SANH 2-3-4', () => {
    expect(getCombinationType([card(15), card(3), card(4)])).toBe('SANH');
  });

  it('từ chối 3 lá không liên tiếp', () => {
    expect(getCombinationType([card(3), card(5), card(7)])).toBeNull();
  });

  it('từ chối mảng rỗng', () => {
    expect(getCombinationType([])).toBeNull();
  });
});

// ============================================================
// Unit Tests — isValidCombination
// ============================================================

describe('isValidCombination', () => {
  it('Rác: representativeRank = rank của lá', () => {
    const result = isValidCombination([card(14)]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(14);
  });

  it('Đôi: representativeRank = rank chung', () => {
    const result = isValidCombination([card(7, 'SPADE'), card(7, 'HEART')]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(7);
  });

  it('Sảnh A-2-3: representativeRank = 3 (lá cao nhất trong chuỗi)', () => {
    const result = isValidCombination([card(14), card(15), card(3)]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(3);
  });

  it('Sảnh 2-3-4: representativeRank = 4', () => {
    const result = isValidCombination([card(15), card(3), card(4)]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(4);
  });

  it('Sảnh 3-4-5: representativeRank = 5', () => {
    const result = isValidCombination([card(3), card(4), card(5)]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(5);
  });

  it('Sảnh 12-13-14: representativeRank = 14 (A)', () => {
    const result = isValidCombination([card(12), card(13), card(14)]);
    expect(result.valid).toBe(true);
    expect(result.combination?.representativeRank).toBe(14);
  });

  it('từ chối mảng rỗng', () => {
    const result = isValidCombination([]);
    expect(result.valid).toBe(false);
  });

  it('từ chối 2 lá khác rank', () => {
    const result = isValidCombination([card(3), card(5)]);
    expect(result.valid).toBe(false);
  });

  it('từ chối Sảnh có lá 2 không liên tiếp (5-2-7)', () => {
    const result = isValidCombination([card(5), card(15), card(7)]);
    expect(result.valid).toBe(false);
  });

  it('từ chối Sảnh có lá 2 không liên tiếp (3-5-2)', () => {
    const result = isValidCombination([card(3), card(5), card(15)]);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// Property 4: Validator chấp nhận mọi Combination hợp lệ
// Feature: sam-10-la-card-game, Property 4: Validator chấp nhận mọi Combination hợp lệ
// Validates: Requirements 2.1
// ============================================================

describe('Property 4: Validator chấp nhận mọi Combination hợp lệ', () => {
  it('isValidCombination trả về valid=true cho mọi combination hợp lệ', () => {
    fc.assert(
      fc.property(validCombinationCardsArb, (cards) => {
        const result = isValidCombination(cards);
        expect(result.valid).toBe(true);
        expect(result.combination).toBeDefined();
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 5: Sảnh với lá 2
// Feature: sam-10-la-card-game, Property 5: Sảnh với lá 2 — chấp nhận khi liên tiếp, từ chối khi không
// Validates: Requirements 2.2
// ============================================================

describe('Property 5: Sảnh với lá 2', () => {
  it('chấp nhận A-2-3 và 2-3-4', () => {
    // A-2-3
    fc.assert(
      fc.property(sanhA23Arb, (cards) => {
        const result = isValidCombination(cards);
        expect(result.valid).toBe(true);
        expect(result.combination?.type).toBe('SANH');
        expect(result.combination?.representativeRank).toBe(3);
      }),
      { numRuns: 1 },
    );

    // 2-3-4
    fc.assert(
      fc.property(sanh234Arb, (cards) => {
        const result = isValidCombination(cards);
        expect(result.valid).toBe(true);
        expect(result.combination?.type).toBe('SANH');
        expect(result.combination?.representativeRank).toBe(4);
      }),
      { numRuns: 1 },
    );
  });

  it('từ chối Sảnh có lá 2 không liên tiếp', () => {
    // Tạo các sảnh không hợp lệ có lá 2: lá 2 không ở vị trí A-2-3 hay 2-3-4
    // Ví dụ: 5-6-2, 3-2-5, 4-5-2, v.v.
    const invalidSanh2Arb = fc
      .tuple(
        fc.integer({ min: 3, max: 13 }), // rank1 (không phải 14 hay 3)
        fc.integer({ min: 3, max: 13 }), // rank2
        suitArb,
        suitArb,
        suitArb,
      )
      .filter(([r1, r2]) => {
        // Đảm bảo không tạo ra A-2-3 hay 2-3-4
        const sorted = [r1, r2, 15].sort((a, b) => a - b);
        const isA23 = sorted[0] === 3 && sorted[1] === 14 && sorted[2] === 15;
        const is234 = sorted[0] === 3 && sorted[1] === 4 && sorted[2] === 15;
        return !isA23 && !is234 && r1 !== r2;
      })
      .map(([r1, r2, s1, s2, s3]) => [
        card(r1 as Rank, s1),
        card(r2 as Rank, s2),
        card(15, s3),
      ]);

    fc.assert(
      fc.property(invalidSanh2Arb, (cards) => {
        const result = isValidCombination(cards);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Unit Tests — canBeat (cùng loại)
// ============================================================

describe('canBeat — cùng loại', () => {
  it('Rác: rank cao hơn thắng', () => {
    const incoming = makeCombination([card(8)]);
    const pile = makeCombination([card(7)]);
    expect(canBeat(incoming, pile)).toBe(true);
  });

  it('Rác: rank thấp hơn thua', () => {
    const incoming = makeCombination([card(6)]);
    const pile = makeCombination([card(7)]);
    expect(canBeat(incoming, pile)).toBe(false);
  });

  it('Rác: rank bằng nhau thua', () => {
    const incoming = makeCombination([card(7, 'HEART')]);
    const pile = makeCombination([card(7, 'SPADE')]);
    expect(canBeat(incoming, pile)).toBe(false);
  });

  it('Đôi: rank cao hơn thắng', () => {
    const incoming = makeCombination([card(9, 'SPADE'), card(9, 'HEART')]);
    const pile = makeCombination([card(8, 'SPADE'), card(8, 'HEART')]);
    expect(canBeat(incoming, pile)).toBe(true);
  });

  it('Sảnh: cùng số lá, rank cao hơn thắng', () => {
    const incoming = makeCombination([card(4), card(5), card(6)]);
    const pile = makeCombination([card(3), card(4), card(5)]);
    expect(canBeat(incoming, pile)).toBe(true);
  });

  it('Sảnh: khác số lá → không thắng', () => {
    const incoming = makeCombination([card(4), card(5), card(6), card(7)]);
    const pile = makeCombination([card(3), card(4), card(5)]);
    expect(canBeat(incoming, pile)).toBe(false);
  });

  it('Khác loại (không phải luật đặc biệt) → không thắng', () => {
    const incoming = makeCombination([card(9, 'SPADE'), card(9, 'HEART')]);
    const pile = makeCombination([card(7)]);
    expect(canBeat(incoming, pile)).toBe(false);
  });
});

// ============================================================
// Property 6: canBeat — cùng loại và rank cao hơn thì thắng
// Feature: sam-10-la-card-game, Property 6: canBeat — chỉ thắng khi cùng loại và Rank cao hơn
// Validates: Requirements 2.3, 2.4, 2.5
// ============================================================

describe('Property 6: canBeat — cùng loại và rank cao hơn thì thắng', () => {
  // Arbitrary cho một Combination hợp lệ (không phải SANH để đơn giản)
  const nonSanhCombArb = fc.oneof(racArb, doiArb, samArb, tuQuyArb).map((cards) =>
    makeCombination(cards),
  );

  it('cùng loại: incoming.representativeRank > pile.representativeRank → true', () => {
    // Tạo 2 rank khác nhau, đảm bảo r1 > r2
    const twoRanksArb = fc
      .tuple(rankArb, rankArb)
      .filter(([r1, r2]) => r1 !== r2)
      .map(([r1, r2]) => (r1 > r2 ? [r1, r2] : [r2, r1]) as [Rank, Rank]);

    fc.assert(
      fc.property(
        twoRanksArb,
        fc.constantFrom('RAC' as const, 'DOI' as const, 'SAM' as const, 'TU_QUY' as const),
        ([higherRank, lowerRank], type) => {
          // Tạo cards cho mỗi loại
          const makeCards = (rank: Rank, t: typeof type): Card[] => {
            switch (t) {
              case 'RAC': return [card(rank, 'SPADE')];
              case 'DOI': return [card(rank, 'SPADE'), card(rank, 'HEART')];
              case 'SAM': return [card(rank, 'SPADE'), card(rank, 'HEART'), card(rank, 'DIAMOND')];
              case 'TU_QUY': return SUITS.map((s) => card(rank, s));
            }
          };

          const incomingCards = makeCards(higherRank, type);
          const pileCards = makeCards(lowerRank, type);

          const incoming = makeCombination(incomingCards);
          const pile = makeCombination(pileCards);

          expect(canBeat(incoming, pile)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('cùng loại: incoming.representativeRank <= pile.representativeRank → false', () => {
    const twoRanksArb = fc
      .tuple(rankArb, rankArb)
      .filter(([r1, r2]) => r1 <= r2)
      .map(([r1, r2]) => [r1, r2] as [Rank, Rank]);

    fc.assert(
      fc.property(
        twoRanksArb,
        fc.constantFrom('RAC' as const, 'DOI' as const, 'SAM' as const),
        ([lowerOrEqualRank, higherOrEqualRank], type) => {
          const makeCards = (rank: Rank, t: typeof type): Card[] => {
            switch (t) {
              case 'RAC': return [card(rank, 'SPADE')];
              case 'DOI': return [card(rank, 'SPADE'), card(rank, 'HEART')];
              case 'SAM': return [card(rank, 'SPADE'), card(rank, 'HEART'), card(rank, 'DIAMOND')];
            }
          };

          const incomingCards = makeCards(lowerOrEqualRank, type);
          const pileCards = makeCards(higherOrEqualRank, type);

          const incoming = makeCombination(incomingCards);
          const pile = makeCombination(pileCards);

          expect(canBeat(incoming, pile)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('khác loại (không phải luật đặc biệt) → false', () => {
    // RAC vs DOI, SAM vs RAC, v.v.
    const differentTypePairs: Array<[Card[], Card[]]> = [
      [[card(9)], [card(8, 'SPADE'), card(8, 'HEART')]],                          // RAC vs DOI
      [[card(9, 'SPADE'), card(9, 'HEART')], [card(8)]],                          // DOI vs RAC
      [[card(9, 'SPADE'), card(9, 'HEART')], [card(8, 'SPADE'), card(8, 'HEART'), card(8, 'DIAMOND')]], // DOI vs SAM
    ];

    for (const [inCards, pileCards] of differentTypePairs) {
      const incoming = makeCombination(inCards);
      const pile = makeCombination(pileCards);
      expect(canBeat(incoming, pile)).toBe(false);
    }
  });
});

// ============================================================
// Property 7: Pile trống → mọi Combination hợp lệ đều được đánh
// Feature: sam-10-la-card-game, Property 7: Pile trống — mọi Combination hợp lệ đều được đánh
// Validates: Requirements 2.7
// ============================================================

describe('Property 7: Pile trống → mọi Combination hợp lệ đều được đánh', () => {
  it('canBeat(combo, null) = true cho mọi combination hợp lệ', () => {
    fc.assert(
      fc.property(validCombinationCardsArb, (cards) => {
        const combo = makeCombination(cards);
        expect(canBeat(combo, null)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Unit Tests — Luật đặc biệt
// ============================================================

describe('Luật đặc biệt', () => {
  // TU_QUY chặt RAC-2 (lá 2 đơn)
  it('TU_QUY chặt RAC rank=15 (lá 2 đơn)', () => {
    const tuQuy = makeCombination(SUITS.map((s) => card(3, s))); // Tứ Quý 3
    const rac2 = makeCombination([card(15)]); // Rác lá 2
    expect(canBeat(tuQuy, rac2)).toBe(true);
  });

  it('TU_QUY rank cao chặt RAC rank=15', () => {
    const tuQuy = makeCombination(SUITS.map((s) => card(14, s))); // Tứ Quý A
    const rac2 = makeCombination([card(15)]); // Rác lá 2
    expect(canBeat(tuQuy, rac2)).toBe(true);
  });

  it('TU_QUY KHÔNG chặt RAC rank thường (không phải lá 2)', () => {
    const tuQuy = makeCombination(SUITS.map((s) => card(14, s))); // Tứ Quý A
    const rac7 = makeCombination([card(7)]); // Rác 7
    expect(canBeat(tuQuy, rac7)).toBe(false);
  });

  // TU_QUY chặt DOI-2 (đôi 2)
  it('TU_QUY chặt DOI rank=15 (đôi 2)', () => {
    const tuQuy = makeCombination(SUITS.map((s) => card(3, s))); // Tứ Quý 3
    const doi2 = makeCombination([card(15, 'SPADE'), card(15, 'HEART')]); // Đôi 2
    expect(canBeat(tuQuy, doi2)).toBe(true);
  });

  it('TU_QUY KHÔNG chặt DOI rank thường', () => {
    const tuQuy = makeCombination(SUITS.map((s) => card(14, s))); // Tứ Quý A
    const doi8 = makeCombination([card(8, 'SPADE'), card(8, 'HEART')]); // Đôi 8
    expect(canBeat(tuQuy, doi8)).toBe(false);
  });

  // 3 Đôi liên tiếp chặt RAC-2
  it('3 Đôi liên tiếp (6 lá) chặt RAC rank=15 (lá 2 đơn)', () => {
    // 3-3-4-4-5-5
    const threePairs = makeCombination([
      card(3, 'SPADE'), card(3, 'HEART'),
      card(4, 'SPADE'), card(4, 'HEART'),
      card(5, 'SPADE'), card(5, 'HEART'),
    ]);
    const rac2 = makeCombination([card(15)]);
    expect(canBeat(threePairs, rac2)).toBe(true);
  });

  it('3 Đôi liên tiếp khác (7-7-8-8-9-9) chặt RAC rank=15', () => {
    const threePairs = makeCombination([
      card(7, 'SPADE'), card(7, 'HEART'),
      card(8, 'SPADE'), card(8, 'HEART'),
      card(9, 'SPADE'), card(9, 'HEART'),
    ]);
    const rac2 = makeCombination([card(15)]);
    expect(canBeat(threePairs, rac2)).toBe(true);
  });

  it('3 Đôi KHÔNG liên tiếp KHÔNG chặt RAC rank=15', () => {
    // 3-3-5-5-7-7 (không liên tiếp) → không phải combination hợp lệ
    // Kiểm tra isValidCombination từ chối
    const invalidCards = [
      card(3, 'SPADE'), card(3, 'HEART'),
      card(5, 'SPADE'), card(5, 'HEART'),
      card(7, 'SPADE'), card(7, 'HEART'),
    ];
    const result = isValidCombination(invalidCards);
    expect(result.valid).toBe(false);
  });

  it('6 lá Sảnh thông thường KHÔNG chặt RAC rank=15', () => {
    // 3-4-5-6-7-8 là Sảnh 6 lá, không phải 3 đôi liên tiếp
    const sanh6 = makeCombination([
      card(3), card(4), card(5), card(6), card(7), card(8),
    ]);
    const rac2 = makeCombination([card(15)]);
    expect(canBeat(sanh6, rac2)).toBe(false);
  });

  it('3 Đôi liên tiếp KHÔNG chặt RAC rank thường', () => {
    const threePairs = makeCombination([
      card(3, 'SPADE'), card(3, 'HEART'),
      card(4, 'SPADE'), card(4, 'HEART'),
      card(5, 'SPADE'), card(5, 'HEART'),
    ]);
    const rac7 = makeCombination([card(7)]);
    expect(canBeat(threePairs, rac7)).toBe(false);
  });
});

// ============================================================
// Unit Tests — canBeat với pile = null
// ============================================================

describe('canBeat với pile = null', () => {
  it('luôn trả về true khi pile = null', () => {
    const combos = [
      makeCombination([card(7)]),
      makeCombination([card(15)]),
      makeCombination([card(9, 'SPADE'), card(9, 'HEART')]),
      makeCombination(SUITS.map((s) => card(5, s))),
      makeCombination([card(3), card(4), card(5)]),
    ];
    for (const combo of combos) {
      expect(canBeat(combo, null)).toBe(true);
    }
  });
});
