import type {
  Card,
  Combination,
  GameState,
  PenaltyResult,
  PlayAction,
  Player,
  RoundHistory,
} from '../types.js';
import { createDeck, deal, shuffle } from './dealer.js';
import { ScoreTracker } from './scoreTracker.js';
import { TurnManager } from './turnManager.js';
import { canBeat, isValidCombination } from './validator.js';

// ============================================================
// Public interfaces
// ============================================================

export interface GameConfig {
  players: Array<{ id: string; name: string; isBot: boolean; difficulty?: 'EASY' | 'HARD' }>;
  turnTimeoutMs?: number;
}

export interface RoundResult {
  winnerId: string;
  penalties: PenaltyResult[];
  baoSamResult?: 'SUCCESS' | 'FAILED';
}

// ============================================================
// GameEngine
// ============================================================

/**
 * GameEngine — trung tâm điều phối luồng game Sâm 10 lá.
 * Sử dụng Dealer, Validator, TurnManager, ScoreTracker.
 */
export class GameEngine {
  private state: GameState;
  private turnManager: TurnManager | null = null;
  private scoreTracker: ScoreTracker;
  private readonly turnTimeoutMs: number;

  // Callbacks
  private stateChangeCallbacks: Array<(state: GameState) => void> = [];
  private roundEndCallbacks: Array<(result: RoundResult) => void> = [];
  private gameOverCallbacks: Array<(finalScores: Record<string, number>) => void> = [];

  // Track previous round winner for next round start
  private lastRoundWinnerId: string | null = null;

  constructor(config: GameConfig) {
    const { players, turnTimeoutMs = 30_000 } = config;

    if (players.length < 2 || players.length > 4) {
      throw new Error(
        `Số người chơi không hợp lệ: ${players.length}. Cần từ 2 đến 4 người chơi.`,
      );
    }

    this.turnTimeoutMs = turnTimeoutMs;

    const initialPlayers: Player[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      difficulty: p.difficulty,
      hand: [],
      hasPlayedThisRound: false,
    }));

    const playerIds = initialPlayers.map((p) => p.id);
    this.scoreTracker = new ScoreTracker(playerIds);

    this.state = {
      players: initialPlayers,
      currentPlayerIndex: 0,
      pile: null,
      roundNumber: 0,
      scores: Object.fromEntries(playerIds.map((id) => [id, 0])),
      passedPlayers: new Set(),
      baoSamPlayerId: null,
      roundHistory: { roundNumber: 0, playActions: [], roundWinner: null },
      gameOver: false,
      winner: null,
    };
  }

  // ============================================================
  // startRound
  // ============================================================

  /**
   * Khởi tạo ván mới: shuffle + deal, chọn người đánh đầu tiên.
   * - Ván 1: chọn ngẫu nhiên
   * - Ván tiếp theo: người thắng ván trước đánh trước (Property 3)
   * Validates: Requirements 1.4, 1.5
   */
  startRound(): void {
    if (this.state.gameOver) return;

    const playerCount = this.state.players.length;
    const roundNumber = this.state.roundNumber + 1;

    // Shuffle + deal
    const deck = shuffle(createDeck());
    const hands = deal(deck, playerCount, 10);

    // Reset players
    const players: Player[] = this.state.players.map((p, i) => ({
      ...p,
      hand: hands[i],
      hasPlayedThisRound: false,
    }));

    // Chọn người đánh đầu tiên
    let startIndex: number;
    if (this.lastRoundWinnerId !== null) {
      // Ván tiếp theo: người thắng ván trước đánh trước (Property 3)
      const winnerIdx = players.findIndex((p) => p.id === this.lastRoundWinnerId);
      startIndex = winnerIdx >= 0 ? winnerIdx : Math.floor(Math.random() * playerCount);
    } else {
      // Ván đầu tiên: chọn ngẫu nhiên
      startIndex = Math.floor(Math.random() * playerCount);
    }

    const roundHistory: RoundHistory = {
      roundNumber,
      playActions: [],
      roundWinner: null,
    };

    this.state = {
      ...this.state,
      players,
      currentPlayerIndex: startIndex,
      pile: null,
      roundNumber,
      passedPlayers: new Set(),
      baoSamPlayerId: null,
      roundHistory,
    };

    // Khởi tạo TurnManager
    this.turnManager = new TurnManager(playerCount, startIndex);

    // Bắt đầu timer
    this.startTurnTimer();

    this.notifyStateChange();
  }

  // ============================================================
  // playCards
  // ============================================================

  /**
   * Xử lý hành động PLAY.
   *
   * Luồng Báo Sâm:
   * - Nếu baoSamPlayerId đặt và người đang đánh LÀ baoSamPlayer → bình thường.
   * - Nếu baoSamPlayerId đặt và người đang đánh KHÔNG phải baoSamPlayer:
   *   → Nếu canBeat = true → Báo Sâm bị chặn: reset baoSamPlayerId, cho phép đánh (Property 14)
   *   → Nếu canBeat = false → từ chối (Property 13)
   *
   * Validates: Requirements 3.1, 3.2, 4.1, 5.2, 5.5
   */
  playCards(playerId: string, cards: Card[]): { success: boolean; error?: string } {
    if (this.state.gameOver) {
      return { success: false, error: 'Game đã kết thúc.' };
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    // Kiểm tra đúng lượt
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Không phải lượt của bạn.' };
    }

    // Validate combination
    const validResult = isValidCombination(cards);
    if (!validResult.valid || !validResult.combination) {
      return { success: false, error: validResult.reason ?? 'Tổ hợp bài không hợp lệ.' };
    }

    const combination = validResult.combination;

    // Kiểm tra canBeat pile
    if (!canBeat(combination, this.state.pile)) {
      return { success: false, error: 'Bài không đủ lớn để đánh đè.' };
    }

    // Kiểm tra Báo Sâm: chỉ người Báo Sâm được đánh (Property 13)
    // Ngoại lệ: nếu người khác canBeat được → Báo Sâm bị chặn (Property 14)
    const isBaoSamActive = this.state.baoSamPlayerId !== null;
    const isNotBaoSamPlayer = isBaoSamActive && this.state.baoSamPlayerId !== playerId;

    if (isNotBaoSamPlayer) {
      // canBeat đã true ở trên → Báo Sâm bị chặn → reset baoSamPlayerId
      // (Property 14: khi có người chặn được bài, reset baoSamPlayerId)
      // Cho phép đánh và reset baoSam
    }

    // Kiểm tra player có đủ bài trong tay không
    if (!this.playerHasCards(currentPlayer, cards)) {
      return { success: false, error: 'Bạn không có những lá bài này trong tay.' };
    }

    // Dừng timer
    this.turnManager?.stopTimer();

    // Xác định baoSamPlayerId mới
    // - Nếu người khác chặn được Báo Sâm → reset (Property 14)
    // - Nếu người Báo Sâm đánh → giữ nguyên
    const newBaoSamPlayerId = isNotBaoSamPlayer ? null : this.state.baoSamPlayerId;

    // Cập nhật tay bài
    const updatedPlayers = this.state.players.map((p) => {
      if (p.id !== playerId) return p;
      const newHand = this.removeCardsFromHand(p.hand, cards);
      return { ...p, hand: newHand, hasPlayedThisRound: true };
    });

    // Ghi lịch sử
    const playAction: PlayAction = {
      playerId,
      action: 'PLAY',
      combination,
      timestamp: Date.now(),
    };

    const updatedHistory: RoundHistory = {
      ...this.state.roundHistory,
      playActions: [...this.state.roundHistory.playActions, playAction],
    };

    // Cập nhật state
    this.state = {
      ...this.state,
      players: updatedPlayers,
      pile: combination,
      passedPlayers: new Set(),
      baoSamPlayerId: newBaoSamPlayerId,
      roundHistory: updatedHistory,
    };

    // Kiểm tra hết bài → kết thúc ván (Property 10)
    const playedPlayer = updatedPlayers.find((p) => p.id === playerId);
    if (playedPlayer && playedPlayer.hand.length === 0) {
      this.endRound(playerId);
      return { success: true };
    }

    // Chuyển lượt
    this.turnManager?.clearPassed();
    this.turnManager?.nextTurn();
    this.state = {
      ...this.state,
      currentPlayerIndex: this.turnManager?.getCurrentPlayerIndex() ?? this.state.currentPlayerIndex,
      passedPlayers: new Set(),
    };

    this.startTurnTimer();
    this.notifyStateChange();

    return { success: true };
  }

  // ============================================================
  // pass
  // ============================================================

  /**
   * Xử lý hành động PASS.
   * Validates: Requirements 3.3, 3.4
   */
  pass(playerId: string): { success: boolean; error?: string } {
    if (this.state.gameOver) {
      return { success: false, error: 'Game đã kết thúc.' };
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Không phải lượt của bạn.' };
    }

    // Trong chế độ Báo Sâm, người Báo Sâm không được pass
    if (this.state.baoSamPlayerId === playerId) {
      return { success: false, error: 'Người Báo Sâm không thể pass.' };
    }

    this.turnManager?.stopTimer();

    // Ghi nhận pass
    this.turnManager?.recordPass(playerId);

    const passAction: PlayAction = {
      playerId,
      action: 'PASS',
      timestamp: Date.now(),
    };

    const updatedHistory: RoundHistory = {
      ...this.state.roundHistory,
      playActions: [...this.state.roundHistory.playActions, passAction],
    };

    // Cập nhật passedPlayers
    const newPassedPlayers = new Set(this.state.passedPlayers);
    newPassedPlayers.add(playerId);

    this.state = {
      ...this.state,
      passedPlayers: newPassedPlayers,
      roundHistory: updatedHistory,
    };

    // Kiểm tra allPassed: tất cả người khác đều pass
    const lastPlayerId = this.getLastPlayerId();

    if (lastPlayerId !== null && this.turnManager?.isAllPassed(lastPlayerId)) {
      // Reset pile, người vừa đánh được đánh tự do
      const lastPlayerIndex = this.state.players.findIndex((p) => p.id === lastPlayerId);
      this.turnManager.clearPassed();

      this.state = {
        ...this.state,
        pile: null,
        passedPlayers: new Set(),
        currentPlayerIndex: lastPlayerIndex,
        baoSamPlayerId: null,
      };

      this.turnManager = new TurnManager(this.state.players.length, lastPlayerIndex);
      this.startTurnTimer();
      this.notifyStateChange();
      return { success: true };
    }

    // Chuyển lượt
    this.turnManager?.nextTurn();
    this.state = {
      ...this.state,
      currentPlayerIndex: this.turnManager?.getCurrentPlayerIndex() ?? this.state.currentPlayerIndex,
    };

    this.startTurnTimer();
    this.notifyStateChange();

    return { success: true };
  }

  // ============================================================
  // declareBaoSam
  // ============================================================

  /**
   * Xử lý Báo Sâm.
   * Validates: Requirements 5.1, 5.2
   */
  declareBaoSam(playerId: string): { success: boolean; error?: string } {
    if (this.state.gameOver) {
      return { success: false, error: 'Game đã kết thúc.' };
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Không phải lượt của bạn.' };
    }

    if (this.state.baoSamPlayerId !== null) {
      return { success: false, error: 'Đã có người Báo Sâm rồi.' };
    }

    this.turnManager?.stopTimer();

    const baoSamAction: PlayAction = {
      playerId,
      action: 'BAO_SAM',
      timestamp: Date.now(),
    };

    const updatedHistory: RoundHistory = {
      ...this.state.roundHistory,
      playActions: [...this.state.roundHistory.playActions, baoSamAction],
    };

    this.state = {
      ...this.state,
      baoSamPlayerId: playerId,
      pile: null, // reset pile khi Báo Sâm
      passedPlayers: new Set(),
      roundHistory: updatedHistory,
    };

    this.startTurnTimer();
    this.notifyStateChange();

    return { success: true };
  }

  // ============================================================
  // getState / callbacks
  // ============================================================

  getState(): Readonly<GameState> {
    return this.state;
  }

  onStateChange(callback: (state: GameState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  onRoundEnd(callback: (result: RoundResult) => void): void {
    this.roundEndCallbacks.push(callback);
  }

  onGameOver(callback: (finalScores: Record<string, number>) => void): void {
    this.gameOverCallbacks.push(callback);
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private startTurnTimer(): void {
    this.turnManager?.startTimer(() => {
      const currentPlayer = this.state.players[this.state.currentPlayerIndex];
      if (currentPlayer) {
        this.pass(currentPlayer.id);
      }
    }, this.turnTimeoutMs);
  }

  private notifyStateChange(): void {
    for (const cb of this.stateChangeCallbacks) {
      cb(this.state);
    }
  }

  private playerHasCards(player: Player, cards: Card[]): boolean {
    const handCopy = [...player.hand];
    for (const card of cards) {
      const idx = handCopy.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
      if (idx === -1) return false;
      handCopy.splice(idx, 1);
    }
    return true;
  }

  private removeCardsFromHand(hand: Card[], cards: Card[]): Card[] {
    const result = [...hand];
    for (const card of cards) {
      const idx = result.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
      if (idx !== -1) result.splice(idx, 1);
    }
    return result;
  }

  /** Lấy playerId của người đánh bài cuối cùng (người có pile hiện tại). */
  private getLastPlayerId(): string | null {
    const actions = this.state.roundHistory.playActions;
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].action === 'PLAY') {
        return actions[i].playerId;
      }
    }
    return null;
  }

  /**
   * Kết thúc ván: tính điểm, kiểm tra game over, chuẩn bị ván mới.
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  private endRound(winnerId: string): void {
    this.turnManager?.stopTimer();

    const losers = this.state.players.filter((p) => p.id !== winnerId);
    const penalties: PenaltyResult[] = [];

    const isBaoSam = this.state.baoSamPlayerId === winnerId;
    const baoSamFailed =
      this.state.baoSamPlayerId !== null && this.state.baoSamPlayerId !== winnerId;

    if (isBaoSam) {
      // Báo Sâm thành công: losers bị nhân đôi
      const basePenalties = new Map<string, number>();
      for (const loser of losers) {
        const penalty = this.scoreTracker.calculatePenalty(loser, this.state.roundHistory);
        basePenalties.set(loser.id, penalty.total);
        penalties.push({ ...penalty, total: penalty.total * 2 });
      }
      this.scoreTracker.applyBaoSamBonus(
        winnerId,
        losers.map((l) => l.id),
        basePenalties,
      );
    } else if (baoSamFailed) {
      // Báo Sâm thất bại: người Báo Sâm bị nhân đôi
      for (const loser of losers) {
        const penalty = this.scoreTracker.calculatePenalty(loser, this.state.roundHistory);
        if (loser.id === this.state.baoSamPlayerId) {
          this.scoreTracker.applyBaoSamPenalty(loser.id, penalty.total);
          penalties.push({
            ...penalty,
            total: penalty.total * 2,
            flags: [...penalty.flags, 'BAO_SAM_PENALTY'],
          });
        } else {
          this.scoreTracker.addPenalty(loser.id, penalty.total);
          penalties.push(penalty);
        }
      }
    } else {
      // Ván thường
      for (const loser of losers) {
        const penalty = this.scoreTracker.calculatePenalty(loser, this.state.roundHistory);
        this.scoreTracker.addPenalty(loser.id, penalty.total);
        penalties.push(penalty);
      }
    }

    // Cập nhật scores trong state
    const newScores: Record<string, number> = {};
    for (const p of this.state.players) {
      newScores[p.id] = this.scoreTracker.getTotalScore(p.id);
    }

    // Cập nhật roundHistory
    const updatedHistory: RoundHistory = {
      ...this.state.roundHistory,
      roundWinner: winnerId,
    };

    this.lastRoundWinnerId = winnerId;

    // Kiểm tra game over
    const gameOver = this.scoreTracker.isGameOver();
    let gameWinner: string | null = null;
    if (gameOver) {
      // Người có điểm thấp nhất thắng game
      gameWinner = this.state.players.reduce((best, p) =>
        newScores[p.id] < newScores[best.id] ? p : best,
      ).id;
    }

    this.state = {
      ...this.state,
      scores: newScores,
      roundHistory: updatedHistory,
      gameOver,
      winner: gameWinner,
      baoSamPlayerId: null,
    };

    this.notifyStateChange();

    // Gọi callbacks
    const baoSamResult: RoundResult['baoSamResult'] = isBaoSam
      ? 'SUCCESS'
      : baoSamFailed
        ? 'FAILED'
        : undefined;

    const roundResult: RoundResult = {
      winnerId,
      penalties,
      baoSamResult,
    };

    for (const cb of this.roundEndCallbacks) {
      cb(roundResult);
    }

    if (gameOver) {
      const finalScores: Record<string, number> = { ...newScores };
      for (const cb of this.gameOverCallbacks) {
        cb(finalScores);
      }
    }
  }
}
