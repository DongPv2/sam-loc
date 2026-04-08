import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { ScoreTracker } from './scoreTracker.js';
import type { Card, Player, PlayAction, RoundHistory, Rank, Suit } from '../types.js';

// ============================================================
// Arbitraries
// ============================================================

const suitArb = fc.constantFrom<Suit>('SPADE', 'HEART', 'DIAMOND', 'CLUB');
const normalRankArb = fc.constantFrom<Rank>(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14);
const rank2Arb = fc.constant<Rank>(15);

/** Lá bài thường (không phải lá 2) */
const normalCardArb: fc.Arbitrary<Card> = fc.record({
  rank: normalRankArb,
  suit: suitArb,
});

/** Lá 2 (rank=15) */
const card2Arb: fc.Arbitrary<Card> = fc.record({
  rank: rank2Arb,
  suit: suitArb,
});

/** Tay bài gồm toàn lá thường (1–10 lá) */
const normalHandArb = fc.array(normalCardArb, { minLength: 1, maxLength: 10 });

/** Tay bài gồm toàn lá 2 (1–4 lá) */
const thoi2HandArb = fc.array(card2Arb, { minLength: 1, maxLength: 4 });

/** Tay bài hỗn hợp có ít nhất 1 lá thường */
const mixedHandArb = fc.tuple(
  fc.array(normalCardArb, { minLength: 1, maxLength: 9 }),
  fc.array(card2Arb, { minLength: 0, maxLength: 4 }),
).map(([normals, twos]) => [...normals, ...twos]);

/** Tạo Player với hand cho trước */
function makePlayer(id: string, hand: Card[]): Player {
  return {
    id,
    name: id,
    isBot: false,
    hand,
    hasPlayedThisRound: false,
  };
}

/** Tạo RoundHistory với danh sách hành động */
function makeRoundHistory(actions: PlayAction[]): RoundHistory {
  return {
    roundNumber: 1,
    playActions: actions,
    roundWinner: null,
  };
}

/** Tạo hành động PLAY cho player */
function makePlayAction(playerId: string): PlayAction {
  return {
    playerId,
    action: 'PLAY',
    timestamp: Date.now(),
  };
}

/** Tạo hành động PASS cho player */
function makePassAction(playerId: string): PlayAction {
  return {
    playerId,
    action: 'PASS',
    timestamp: Date.now(),
  };
}

// ============================================================
// Property 11: Tính điểm phạt đúng công thức
// Feature: sam-10-la-card-game, Property 11: Tính điểm phạt đúng công thức
// Validates: Requirements 4.2, 4.3, 4.4, 7.2
// ============================================================

describe('Property 11: Tính điểm phạt đúng công thức', () => {
  test('tay bài thường (không Thối 2): mỗi lá = 1 điểm', () => {
    fc.assert(
      fc.property(normalHandArb, (hand) => {
        const player = makePlayer('p1', hand);
        // Có ít nhất 1 PLAY để không bị Cóng
        const history = makeRoundHistory([makePlayAction('p1')]);
        const tracker = new ScoreTracker(['p1']);

        const result = tracker.calculatePenalty(player, history);

        expect(result.basePoints).toBe(hand.length);
        expect(result.thoi2Points).toBe(0);
        expect(result.congMultiplier).toBe(1);
        expect(result.total).toBe(hand.length);
        expect(result.flags).not.toContain('THOI_2');
        expect(result.flags).not.toContain('CONG');
      }),
      { numRuns: 200 },
    );
  });

  test('Thối 2 (toàn lá 2): mỗi lá 2 = 2 điểm', () => {
    fc.assert(
      fc.property(thoi2HandArb, (hand) => {
        const player = makePlayer('p1', hand);
        // Có ít nhất 1 PLAY để không bị Cóng
        const history = makeRoundHistory([makePlayAction('p1')]);
        const tracker = new ScoreTracker(['p1']);

        const result = tracker.calculatePenalty(player, history);

        expect(result.basePoints).toBe(0);
        expect(result.thoi2Points).toBe(hand.length * 2);
        expect(result.congMultiplier).toBe(1);
        expect(result.total).toBe(hand.length * 2);
        expect(result.flags).toContain('THOI_2');
      }),
      { numRuns: 200 },
    );
  });

  test('tay bài hỗn hợp (có lá thường): không áp dụng Thối 2', () => {
    fc.assert(
      fc.property(mixedHandArb, (hand) => {
        const player = makePlayer('p1', hand);
        const history = makeRoundHistory([makePlayAction('p1')]);
        const tracker = new ScoreTracker(['p1']);

        const result = tracker.calculatePenalty(player, history);

        // Có lá thường → không Thối 2
        expect(result.thoi2Points).toBe(0);
        expect(result.basePoints).toBe(hand.length);
        expect(result.flags).not.toContain('THOI_2');
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 12: Game kết thúc khi đạt ngưỡng 30 điểm
// Feature: sam-10-la-card-game, Property 12: Game kết thúc khi đạt ngưỡng 30 điểm
// Validates: Requirements 4.5
// ============================================================

describe('Property 12: Game kết thúc khi đạt ngưỡng 30 điểm', () => {
  test('isGameOver() = true khi và chỉ khi có player >= threshold', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 10, max: 50 }),
        (scores, threshold) => {
          const playerIds = scores.map((_, i) => `p${i}`);
          const tracker = new ScoreTracker(playerIds);

          for (let i = 0; i < scores.length; i++) {
            tracker.addPenalty(`p${i}`, scores[i]);
          }

          const hasReached = scores.some((s) => s >= threshold);
          expect(tracker.isGameOver(threshold)).toBe(hasReached);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('ngưỡng mặc định là 30', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }),
        (score) => {
          const tracker = new ScoreTracker(['p1']);
          tracker.addPenalty('p1', score);
          expect(tracker.isGameOver()).toBe(score >= 30);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('addPenalty tích lũy đúng qua nhiều ván', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 15 }), { minLength: 1, maxLength: 10 }),
        (penalties) => {
          const tracker = new ScoreTracker(['p1']);
          let expected = 0;
          for (const p of penalties) {
            tracker.addPenalty('p1', p);
            expected += p;
          }
          expect(tracker.getTotalScore('p1')).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 15: Phát hiện Cóng chính xác
// Feature: sam-10-la-card-game, Property 15: Phát hiện Cóng chính xác
// Validates: Requirements 6.2
// ============================================================

describe('Property 15: Phát hiện Cóng chính xác', () => {
  test('isConged() = true khi player không có hành động PLAY nào', () => {
    fc.assert(
      fc.property(
        // Tạo danh sách hành động chỉ gồm PASS (không có PLAY của p1)
        fc.array(
          fc.oneof(
            fc.constant(makePassAction('p1')),
            fc.constant(makePlayAction('p2')), // PLAY của player khác
            fc.constant(makePassAction('p2')),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (actions) => {
          const player = makePlayer('p1', []);
          const history = makeRoundHistory(actions);
          const tracker = new ScoreTracker(['p1']);

          // p1 không có PLAY nào → Cóng
          expect(tracker.isConged(player, history)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('isConged() = false khi player có ít nhất 1 hành động PLAY', () => {
    fc.assert(
      fc.property(
        // Số lượng PLAY của p1 (ít nhất 1)
        fc.integer({ min: 1, max: 5 }),
        // Số lượng PASS của p1
        fc.integer({ min: 0, max: 5 }),
        (playCount, passCount) => {
          const actions: PlayAction[] = [
            ...Array.from({ length: playCount }, () => makePlayAction('p1')),
            ...Array.from({ length: passCount }, () => makePassAction('p1')),
          ];
          const player = makePlayer('p1', []);
          const history = makeRoundHistory(actions);
          const tracker = new ScoreTracker(['p1']);

          expect(tracker.isConged(player, history)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('isConged() chỉ xét hành động của đúng player đó', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (playCount) => {
          // p2 có PLAY nhưng p1 không có
          const actions: PlayAction[] = Array.from({ length: playCount }, () =>
            makePlayAction('p2'),
          );
          const player = makePlayer('p1', []);
          const history = makeRoundHistory(actions);
          const tracker = new ScoreTracker(['p1', 'p2']);

          expect(tracker.isConged(player, history)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Property 16: Phạt Cóng nặng hơn phạt thường
// Feature: sam-10-la-card-game, Property 16: Phạt Cóng nặng hơn phạt thường
// Validates: Requirements 6.3
// ============================================================

describe('Property 16: Phạt Cóng nặng hơn phạt thường', () => {
  test('player bị Cóng có total > player không bị Cóng với cùng tay bài', () => {
    fc.assert(
      fc.property(normalHandArb, (hand) => {
        const playerCong = makePlayer('p1', hand);
        const playerNormal = makePlayer('p2', hand);

        // p1 bị Cóng: không có PLAY
        const historyCong = makeRoundHistory([makePassAction('p1')]);
        // p2 không bị Cóng: có PLAY
        const historyNormal = makeRoundHistory([makePlayAction('p2')]);

        const tracker = new ScoreTracker(['p1', 'p2']);

        const resultCong = tracker.calculatePenalty(playerCong, historyCong);
        const resultNormal = tracker.calculatePenalty(playerNormal, historyNormal);

        // Cóng nhân đôi → luôn lớn hơn
        expect(resultCong.total).toBeGreaterThan(resultNormal.total);
        expect(resultCong.congMultiplier).toBe(2);
        expect(resultNormal.congMultiplier).toBe(1);
        expect(resultCong.flags).toContain('CONG');
      }),
      { numRuns: 200 },
    );
  });

  test('Cóng + Thối 2: total = hand.length * 2 * 2 = hand.length * 4', () => {
    fc.assert(
      fc.property(thoi2HandArb, (hand) => {
        const player = makePlayer('p1', hand);
        // Không có PLAY → Cóng
        const history = makeRoundHistory([makePassAction('p1')]);
        const tracker = new ScoreTracker(['p1']);

        const result = tracker.calculatePenalty(player, history);

        expect(result.flags).toContain('CONG');
        expect(result.flags).toContain('THOI_2');
        expect(result.total).toBe(hand.length * 4);
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 17: Phát hiện Thối 2 chính xác
// Feature: sam-10-la-card-game, Property 17: Phát hiện Thối 2 chính xác
// Validates: Requirements 7.2, 7.3
// ============================================================

describe('Property 17: Phát hiện Thối 2 chính xác', () => {
  test('isThoi2() = true khi toàn bộ hand là lá 2 (rank=15)', () => {
    fc.assert(
      fc.property(thoi2HandArb, (hand) => {
        const player = makePlayer('p1', hand);
        const tracker = new ScoreTracker(['p1']);
        expect(tracker.isThoi2(player)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test('isThoi2() = false khi có ít nhất 1 lá không phải lá 2', () => {
    fc.assert(
      fc.property(mixedHandArb, (hand) => {
        const player = makePlayer('p1', hand);
        const tracker = new ScoreTracker(['p1']);
        expect(tracker.isThoi2(player)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  test('isThoi2() = false khi hand rỗng', () => {
    const player = makePlayer('p1', []);
    const tracker = new ScoreTracker(['p1']);
    expect(tracker.isThoi2(player)).toBe(false);
  });

  test('isThoi2() = false khi hand chỉ có lá thường', () => {
    fc.assert(
      fc.property(normalHandArb, (hand) => {
        const player = makePlayer('p1', hand);
        const tracker = new ScoreTracker(['p1']);
        expect(tracker.isThoi2(player)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Task 6.3: Unit tests cho Báo Sâm thưởng/phạt
// Validates: Requirements 5.3, 5.4
// ============================================================

describe('Unit: Báo Sâm thành công — applyBaoSamBonus', () => {
  test('losers bị nhân đôi điểm phạt cơ bản', () => {
    const tracker = new ScoreTracker(['winner', 'loser1', 'loser2']);

    const basePenalties = new Map([
      ['loser1', 5],
      ['loser2', 8],
    ]);

    tracker.applyBaoSamBonus('winner', ['loser1', 'loser2'], basePenalties);

    // loser1: 5 * 2 = 10
    expect(tracker.getTotalScore('loser1')).toBe(10);
    // loser2: 8 * 2 = 16
    expect(tracker.getTotalScore('loser2')).toBe(16);
    // winner không bị phạt
    expect(tracker.getTotalScore('winner')).toBe(0);
  });

  test('Báo Sâm thành công với 1 loser', () => {
    const tracker = new ScoreTracker(['winner', 'loser1']);

    const basePenalties = new Map([['loser1', 7]]);
    tracker.applyBaoSamBonus('winner', ['loser1'], basePenalties);

    expect(tracker.getTotalScore('loser1')).toBe(14);
    expect(tracker.getTotalScore('winner')).toBe(0);
  });

  test('Báo Sâm thành công tích lũy trên điểm hiện có', () => {
    const tracker = new ScoreTracker(['winner', 'loser1']);
    // loser1 đã có 10 điểm từ ván trước
    tracker.addPenalty('loser1', 10);

    const basePenalties = new Map([['loser1', 6]]);
    tracker.applyBaoSamBonus('winner', ['loser1'], basePenalties);

    // 10 (cũ) + 6*2 (Báo Sâm) = 22
    expect(tracker.getTotalScore('loser1')).toBe(22);
  });

  test('Báo Sâm thành công với 3 losers', () => {
    const tracker = new ScoreTracker(['winner', 'loser1', 'loser2', 'loser3']);

    const basePenalties = new Map([
      ['loser1', 3],
      ['loser2', 5],
      ['loser3', 10],
    ]);

    tracker.applyBaoSamBonus('winner', ['loser1', 'loser2', 'loser3'], basePenalties);

    expect(tracker.getTotalScore('loser1')).toBe(6);
    expect(tracker.getTotalScore('loser2')).toBe(10);
    expect(tracker.getTotalScore('loser3')).toBe(20);
    expect(tracker.getTotalScore('winner')).toBe(0);
  });

  test('Báo Sâm thành công có thể kích hoạt game over', () => {
    const tracker = new ScoreTracker(['winner', 'loser1']);
    // loser1 đã có 20 điểm
    tracker.addPenalty('loser1', 20);

    // Báo Sâm thành công: loser1 bị thêm 6*2=12 → tổng 32 >= 30
    const basePenalties = new Map([['loser1', 6]]);
    tracker.applyBaoSamBonus('winner', ['loser1'], basePenalties);

    expect(tracker.getTotalScore('loser1')).toBe(32);
    expect(tracker.isGameOver()).toBe(true);
  });
});

describe('Unit: Báo Sâm thất bại — applyBaoSamPenalty', () => {
  test('người Báo Sâm bị nhân đôi điểm phạt cơ bản', () => {
    const tracker = new ScoreTracker(['baoSam', 'other']);

    tracker.applyBaoSamPenalty('baoSam', 8);

    // 8 * 2 = 16
    expect(tracker.getTotalScore('baoSam')).toBe(16);
    expect(tracker.getTotalScore('other')).toBe(0);
  });

  test('Báo Sâm thất bại tích lũy trên điểm hiện có', () => {
    const tracker = new ScoreTracker(['baoSam']);
    tracker.addPenalty('baoSam', 5);

    tracker.applyBaoSamPenalty('baoSam', 4);

    // 5 (cũ) + 4*2 (phạt Báo Sâm) = 13
    expect(tracker.getTotalScore('baoSam')).toBe(13);
  });

  test('Báo Sâm thất bại với basePenalty = 0 → không thêm điểm', () => {
    const tracker = new ScoreTracker(['baoSam']);
    tracker.applyBaoSamPenalty('baoSam', 0);
    expect(tracker.getTotalScore('baoSam')).toBe(0);
  });

  test('Báo Sâm thất bại có thể kích hoạt game over', () => {
    const tracker = new ScoreTracker(['baoSam']);
    tracker.addPenalty('baoSam', 20);

    // basePenalty = 6 → 6*2 = 12 → tổng 32 >= 30
    tracker.applyBaoSamPenalty('baoSam', 6);

    expect(tracker.getTotalScore('baoSam')).toBe(32);
    expect(tracker.isGameOver()).toBe(true);
  });

  test('Báo Sâm thất bại: chỉ người Báo Sâm bị phạt, người khác không đổi', () => {
    const tracker = new ScoreTracker(['baoSam', 'p2', 'p3']);
    tracker.addPenalty('p2', 5);
    tracker.addPenalty('p3', 3);

    tracker.applyBaoSamPenalty('baoSam', 7);

    expect(tracker.getTotalScore('baoSam')).toBe(14);
    expect(tracker.getTotalScore('p2')).toBe(5); // không đổi
    expect(tracker.getTotalScore('p3')).toBe(3); // không đổi
  });
});
