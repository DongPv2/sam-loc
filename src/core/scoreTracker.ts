import type { PenaltyResult, Player, RoundHistory } from '../types.js';

/**
 * ScoreTracker — theo dõi và tính điểm phạt sau mỗi ván.
 *
 * Quy tắc tính điểm:
 * - Mỗi lá thường còn lại: 1 điểm
 * - Thối 2 (toàn bộ hand là lá 2, rank=15): mỗi lá 2 tính 2 điểm
 * - Cóng (không đánh được lá nào): nhân đôi tổng điểm phạt
 * - Báo Sâm thành công: losers bị nhân đôi điểm phạt
 * - Báo Sâm thất bại: người Báo Sâm bị nhân đôi điểm phạt
 */
export class ScoreTracker {
  /** playerId → tổng điểm phạt tích lũy */
  private scores: Map<string, number>;

  constructor(playerIds: string[]) {
    this.scores = new Map(playerIds.map((id) => [id, 0]));
  }

  // ============================================================
  // Detection helpers
  // ============================================================

  /**
   * Kiểm tra Cóng: player không có hành động PLAY nào trong roundHistory.
   * Validates: Requirements 6.2
   */
  isConged(player: Player, roundHistory: RoundHistory): boolean {
    return !roundHistory.playActions.some(
      (action) => action.playerId === player.id && action.action === 'PLAY',
    );
  }

  /**
   * Kiểm tra Thối 2: toàn bộ hand còn lại chỉ là lá 2 (rank=15).
   * Hand phải không rỗng để bị Thối 2.
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  isThoi2(player: Player): boolean {
    if (player.hand.length === 0) return false;
    return player.hand.every((card) => card.rank === 15);
  }

  // ============================================================
  // Penalty calculation
  // ============================================================

  /**
   * Tính điểm phạt cho một player thua sau ván.
   *
   * Công thức:
   * 1. Nếu Thối 2: basePoints = 0, thoi2Points = hand.length * 2
   * 2. Nếu không Thối 2: basePoints = hand.length * 1, thoi2Points = 0
   * 3. subtotal = basePoints + thoi2Points
   * 4. Nếu Cóng: congMultiplier = 2, total = subtotal * 2
   *    Nếu không Cóng: congMultiplier = 1, total = subtotal
   *
   * Validates: Requirements 4.2, 4.3, 4.4, 6.3, 7.2
   */
  calculatePenalty(player: Player, roundHistory: RoundHistory): PenaltyResult {
    const conged = this.isConged(player, roundHistory);
    const thoi2 = this.isThoi2(player);

    const flags: PenaltyResult['flags'] = [];
    if (conged) flags.push('CONG');
    if (thoi2) flags.push('THOI_2');

    let basePoints: number;
    let thoi2Points: number;

    if (thoi2) {
      // Thối 2: mỗi lá 2 tính 2 điểm
      basePoints = 0;
      thoi2Points = player.hand.length * 2;
    } else {
      // Thường: mỗi lá tính 1 điểm
      basePoints = player.hand.length;
      thoi2Points = 0;
    }

    const subtotal = basePoints + thoi2Points;
    const congMultiplier = conged ? 2 : 1;
    const total = subtotal * congMultiplier;

    return {
      playerId: player.id,
      basePoints,
      thoi2Points,
      congMultiplier,
      total,
      flags,
    };
  }

  // ============================================================
  // Score management
  // ============================================================

  /** Cộng điểm phạt vào tổng tích lũy của player. */
  addPenalty(playerId: string, points: number): void {
    const current = this.scores.get(playerId) ?? 0;
    this.scores.set(playerId, current + points);
  }

  /** Lấy tổng điểm phạt tích lũy của player. */
  getTotalScore(playerId: string): number {
    return this.scores.get(playerId) ?? 0;
  }

  /**
   * Kiểm tra game over: có player nào đạt hoặc vượt ngưỡng điểm.
   * Validates: Requirements 4.5
   */
  isGameOver(threshold = 30): boolean {
    for (const score of this.scores.values()) {
      if (score >= threshold) return true;
    }
    return false;
  }

  // ============================================================
  // Báo Sâm
  // ============================================================

  /**
   * Áp dụng thưởng Báo Sâm thành công: nhân đôi điểm phạt của losers.
   * basePenalties: Map<playerId, điểm phạt cơ bản (chưa nhân đôi)>
   * Validates: Requirements 5.3
   */
  applyBaoSamBonus(
    _winnerId: string,
    loserIds: string[],
    basePenalties: Map<string, number>,
  ): void {
    for (const loserId of loserIds) {
      const base = basePenalties.get(loserId) ?? 0;
      this.addPenalty(loserId, base * 2);
    }
  }

  /**
   * Áp dụng phạt Báo Sâm thất bại: nhân đôi điểm phạt của người Báo Sâm.
   * basePenalty: điểm phạt cơ bản (chưa nhân đôi) của người Báo Sâm.
   * Validates: Requirements 5.4
   */
  applyBaoSamPenalty(baoSamPlayerId: string, basePenalty: number): void {
    this.addPenalty(baoSamPlayerId, basePenalty * 2);
  }
}
