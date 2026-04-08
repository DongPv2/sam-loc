import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TurnManager } from './turnManager.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Số người chơi hợp lệ: 2–4 */
const playerCountArb = fc.integer({ min: 2, max: 4 });

/** Index hợp lệ trong khoảng [0, playerCount) */
const startIndexArb = (playerCount: number) =>
  fc.integer({ min: 0, max: playerCount - 1 });

/** Tạo danh sách playerId dạng "p0", "p1", ... */
function makePlayerIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p${i}`);
}

// ---------------------------------------------------------------------------
// Property 8: Đánh bài hợp lệ → chuyển lượt đúng chiều kim đồng hồ
// Feature: sam-10-la-card-game, Property 8: Đánh bài hợp lệ cập nhật Pile và chuyển lượt
// ---------------------------------------------------------------------------

describe('Property 8: nextTurn() chuyển lượt đúng chiều kim đồng hồ', () => {
  test('sau nextTurn(), currentPlayerIndex tăng 1 (mod playerCount)', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(
        playerCountArb.chain((n) =>
          startIndexArb(n).map((start) => ({ n, start }))
        ),
        ({ n, start }) => {
          const tm = new TurnManager(n, start);
          const before = tm.getCurrentPlayerIndex();
          tm.nextTurn();
          const after = tm.getCurrentPlayerIndex();
          expect(after).toBe((before + 1) % n);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sau nhiều lần nextTurn(), index luôn nằm trong [0, playerCount)', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(
        playerCountArb.chain((n) =>
          fc.tuple(startIndexArb(n), fc.integer({ min: 1, max: 20 })).map(
            ([start, steps]) => ({ n, start, steps })
          )
        ),
        ({ n, start, steps }) => {
          const tm = new TurnManager(n, start);
          for (let i = 0; i < steps; i++) tm.nextTurn();
          const idx = tm.getCurrentPlayerIndex();
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(n);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sau playerCount lần nextTurn(), quay về index ban đầu', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(
        playerCountArb.chain((n) =>
          startIndexArb(n).map((start) => ({ n, start }))
        ),
        ({ n, start }) => {
          const tm = new TurnManager(n, start);
          for (let i = 0; i < n; i++) tm.nextTurn();
          expect(tm.getCurrentPlayerIndex()).toBe(start);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Tất cả pass → isAllPassed() = true
// Feature: sam-10-la-card-game, Property 9: Tất cả Pass → Pile reset
// ---------------------------------------------------------------------------

describe('Property 9: isAllPassed() đúng khi tất cả player khác đều pass', () => {
  test('khi tất cả player khác đều recordPass, isAllPassed() = true', () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        playerCountArb.chain((n) =>
          startIndexArb(n).map((start) => ({ n, start }))
        ),
        ({ n, start }) => {
          const ids = makePlayerIds(n);
          const currentId = ids[start];
          const tm = new TurnManager(n, start);

          // Tất cả player khác pass
          for (const id of ids) {
            if (id !== currentId) tm.recordPass(id);
          }

          expect(tm.isAllPassed(currentId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('khi chưa đủ player khác pass, isAllPassed() = false', () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 4 }).chain((n) =>
          startIndexArb(n).map((start) => ({ n, start }))
        ),
        ({ n, start }) => {
          const ids = makePlayerIds(n);
          const currentId = ids[start];
          const tm = new TurnManager(n, start);

          // Chỉ pass 1 người (thiếu ít nhất 1)
          const others = ids.filter((id) => id !== currentId);
          tm.recordPass(others[0]);

          // Với n >= 3, cần ít nhất 2 người khác pass
          expect(tm.isAllPassed(currentId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('clearPassed() reset → isAllPassed() = false dù trước đó đã pass hết', () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        playerCountArb.chain((n) =>
          startIndexArb(n).map((start) => ({ n, start }))
        ),
        ({ n, start }) => {
          const ids = makePlayerIds(n);
          const currentId = ids[start];
          const tm = new TurnManager(n, start);

          for (const id of ids) {
            if (id !== currentId) tm.recordPass(id);
          }
          expect(tm.isAllPassed(currentId)).toBe(true);

          tm.clearPassed();
          expect(tm.isAllPassed(currentId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests: timeout auto-pass (fake timers)
// ---------------------------------------------------------------------------

describe('Unit: timeout auto-pass (30 giây)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('onTimeout được gọi sau 30 giây mặc định', () => {
    const tm = new TurnManager(2, 0);
    const onTimeout = vi.fn();

    tm.startTimer(onTimeout);

    // Chưa đến 30s → chưa gọi
    vi.advanceTimersByTime(29_999);
    expect(onTimeout).not.toHaveBeenCalled();

    // Đúng 30s → gọi
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  test('onTimeout được gọi sau durationMs tuỳ chỉnh', () => {
    const tm = new TurnManager(2, 0);
    const onTimeout = vi.fn();

    tm.startTimer(onTimeout, 5_000);

    vi.advanceTimersByTime(4_999);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  test('stopTimer() huỷ timeout, onTimeout không được gọi', () => {
    const tm = new TurnManager(2, 0);
    const onTimeout = vi.fn();

    tm.startTimer(onTimeout);
    tm.stopTimer();

    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('startTimer() gọi lại sẽ huỷ timer cũ và bắt đầu timer mới', () => {
    const tm = new TurnManager(2, 0);
    const first = vi.fn();
    const second = vi.fn();

    tm.startTimer(first, 10_000);
    vi.advanceTimersByTime(5_000);

    // Gọi lại với callback mới
    tm.startTimer(second, 10_000);
    vi.advanceTimersByTime(10_000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('Requirements 3.6: player không hành động 30s → auto-pass được trigger', () => {
    const tm = new TurnManager(3, 1);
    let autoPassed = false;

    tm.startTimer(() => {
      // Simulate GameEngine auto-pass
      tm.recordPass('p1');
      autoPassed = true;
    });

    vi.advanceTimersByTime(30_000);

    expect(autoPassed).toBe(true);
    expect(tm.getPassedPlayers().has('p1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: getPassedPlayers trả về bản sao
// ---------------------------------------------------------------------------

describe('Unit: getPassedPlayers() trả về bản sao độc lập', () => {
  test('thay đổi Set trả về không ảnh hưởng state nội bộ', () => {
    const tm = new TurnManager(3, 0);
    tm.recordPass('p1');

    const copy = tm.getPassedPlayers();
    copy.add('p2'); // thêm vào bản sao

    // State nội bộ không bị ảnh hưởng
    expect(tm.getPassedPlayers().has('p2')).toBe(false);
  });
});
