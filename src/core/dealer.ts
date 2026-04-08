import type { Card, Rank, Suit } from '../types.js';

export type Hand = Card[];

const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** Tạo bộ bài 52 lá đầy đủ (4 chất × 13 rank từ 3 đến 15). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Xáo bài dùng thuật toán Fisher-Yates (in-place, trả về bản sao). */
export function shuffle(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Chia bài cho người chơi.
 * @param deck - Bộ bài đã xáo
 * @param playerCount - Số người chơi
 * @param cardsPerPlayer - Số lá mỗi người (mặc định 10)
 * @returns Mảng Hand cho từng người chơi
 */
export function deal(deck: Card[], playerCount: number, cardsPerPlayer: number): Hand[] {
  const hands: Hand[] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < playerCount * cardsPerPlayer; i++) {
    hands[i % playerCount].push(deck[i]);
  }
  return hands;
}
