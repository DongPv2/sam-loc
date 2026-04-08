/**
 * TurnManager — quản lý thứ tự lượt chơi, trạng thái pass, và đồng hồ đếm ngược.
 * Không biết về Pile hay Combination; GameEngine sẽ gọi TurnManager.
 */
export class TurnManager {
  private currentIndex: number;
  private readonly playerCount: number;
  private passedPlayers: Set<string>;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param playerCount - Số người chơi (2–4)
   * @param startIndex  - Index của người đánh đầu tiên
   */
  constructor(playerCount: number, startIndex: number) {
    this.playerCount = playerCount;
    this.currentIndex = startIndex;
    this.passedPlayers = new Set();
  }

  /** Trả về index của người chơi hiện tại. */
  getCurrentPlayerIndex(): number {
    return this.currentIndex;
  }

  /** Chuyển lượt sang người tiếp theo theo chiều kim đồng hồ. */
  nextTurn(): void {
    this.currentIndex = (this.currentIndex + 1) % this.playerCount;
  }

  /** Ghi nhận player đã pass trong lượt này. */
  recordPass(playerId: string): void {
    this.passedPlayers.add(playerId);
  }

  /**
   * Kiểm tra tất cả player khác (không phải currentPlayerId) đều đã pass.
   * @param currentPlayerId - Id của người vừa đánh (không tính vào danh sách pass)
   */
  isAllPassed(currentPlayerId: string): boolean {
    // Cần (playerCount - 1) người khác đều pass
    const othersCount = this.playerCount - 1;
    if (othersCount <= 0) return false;

    // Đếm số người đã pass mà không phải currentPlayerId
    let passedOthers = 0;
    for (const id of this.passedPlayers) {
      if (id !== currentPlayerId) passedOthers++;
    }
    return passedOthers >= othersCount;
  }

  /** Reset danh sách pass (khi pile reset hoặc bắt đầu lượt mới tự do). */
  clearPassed(): void {
    this.passedPlayers.clear();
  }

  /** Trả về tập hợp các playerId đã pass. */
  getPassedPlayers(): Set<string> {
    return new Set(this.passedPlayers);
  }

  /**
   * Bắt đầu đồng hồ đếm ngược. Khi hết giờ, gọi onTimeout().
   * @param onTimeout   - Callback khi hết giờ
   * @param durationMs  - Thời gian (ms), mặc định 30000
   */
  startTimer(onTimeout: () => void, durationMs = 30_000): void {
    this.stopTimer();
    this.timerId = setTimeout(onTimeout, durationMs);
  }

  /** Dừng đồng hồ đếm ngược (nếu đang chạy). */
  stopTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
