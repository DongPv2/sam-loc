import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createDeck, shuffle, deal } from './dealer.js';
import type { Card } from '../types.js';

// Helper: tạo "multiset key" cho một lá bài
function cardKey(c: Card): string {
  return `${c.rank}-${c.suit}`;
}

// Helper: đếm tần suất xuất hiện của mỗi lá trong mảng
function cardFrequency(cards: Card[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const c of cards) {
    const k = cardKey(c);
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  return freq;
}

describe('createDeck', () => {
  it('tạo đúng 52 lá', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('không có lá trùng', () => {
    const deck = createDeck();
    const freq = cardFrequency(deck);
    for (const count of freq.values()) {
      expect(count).toBe(1);
    }
  });
});

describe('Dealer — Property Tests', () => {
  // Arbitrary: bộ bài ngẫu nhiên (subset hoặc full deck)
  const cardArb: fc.Arbitrary<Card> = fc.record({
    rank: fc.constantFrom<3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15>(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15),
    suit: fc.constantFrom<'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB'>('SPADE', 'HEART', 'DIAMOND', 'CLUB'),
  });

  const deckArb = fc.uniqueArray(cardArb, {
    minLength: 1,
    maxLength: 52,
    selector: cardKey,
  });

  // Feature: sam-10-la-card-game, Property 1: Shuffle giữ nguyên bộ bài
  // Validates: Requirements 1.2
  it('Property 1: shuffle giữ nguyên multiset (số lượng và thành phần lá bài không đổi)', () => {
    fc.assert(
      fc.property(deckArb, (deck) => {
        const shuffled = shuffle(deck);

        // Cùng độ dài
        expect(shuffled).toHaveLength(deck.length);

        // Cùng multiset
        const before = cardFrequency(deck);
        const after = cardFrequency(shuffled);
        expect(after).toEqual(before);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: sam-10-la-card-game, Property 2: Chia bài đúng số lượng và không trùng lặp
  // Validates: Requirements 1.3
  it('Property 2: deal chia đúng số lá mỗi người và không có lá trùng giữa các tay bài', () => {
    // playerCount: 2–4, cardsPerPlayer: 1–13, deck đủ lớn
    const dealArb = fc.tuple(
      fc.integer({ min: 2, max: 4 }),
      fc.integer({ min: 1, max: 13 }),
    ).chain(([playerCount, cardsPerPlayer]) => {
      const needed = playerCount * cardsPerPlayer;
      return fc.tuple(
        fc.constant(playerCount),
        fc.constant(cardsPerPlayer),
        fc.uniqueArray(cardArb, {
          minLength: needed,
          maxLength: Math.max(needed, 52),
          selector: cardKey,
        }),
      );
    });

    fc.assert(
      fc.property(dealArb, ([playerCount, cardsPerPlayer, deck]) => {
        const hands = deal(deck, playerCount, cardsPerPlayer);

        // Đúng số tay bài
        expect(hands).toHaveLength(playerCount);

        // Mỗi tay đúng số lá
        for (const hand of hands) {
          expect(hand).toHaveLength(cardsPerPlayer);
        }

        // Không có lá trùng giữa các tay bài
        const allDealt = hands.flat();
        const freq = cardFrequency(allDealt);
        for (const count of freq.values()) {
          expect(count).toBe(1);
        }
      }),
      { numRuns: 200 },
    );
  });
});
