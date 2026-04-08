// ============================================================
// Core Types for Sâm 10 Lá Card Game
// ============================================================

// --- Card primitives ---

/** Chất bài: Bích, Cơ, Rô, Nhép. Chỉ dùng để phân biệt, không ảnh hưởng độ lớn. */
export type Suit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';

/**
 * Thứ hạng lá bài.
 * 3–10: mặt số; 11=J, 12=Q, 13=K, 14=A, 15=2 (lá 2 là lớn nhất).
 */
export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/** Một lá bài trong bộ bài 52 lá. */
export interface Card {
  rank: Rank;
  suit: Suit;
}

// --- Combination ---

/** Loại tổ hợp bài hợp lệ. */
export type CombinationType = 'RAC' | 'DOI' | 'SAM' | 'TU_QUY' | 'SANH';

/**
 * Tổ hợp bài được đánh ra trong một lượt.
 * - RAC: 1 lá bất kỳ
 * - DOI: 2 lá cùng Rank
 * - SAM: 3 lá cùng Rank
 * - TU_QUY: 4 lá cùng Rank
 * - SANH: ≥3 lá có Rank liên tiếp
 */
export interface Combination {
  type: CombinationType;
  cards: Card[];
  /**
   * Rank đại diện để so sánh:
   * - Rác/Đôi/Sám/Tứ Quý: rank chung của nhóm lá
   * - Sảnh: rank của lá cao nhất trong chuỗi
   */
  representativeRank: Rank;
}

// --- Player ---

/** Người chơi (người thật hoặc bot AI). */
export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  difficulty?: 'EASY' | 'HARD';
  hand: Card[];
  /** Dùng để phát hiện Cóng: true nếu đã đánh ít nhất 1 lá trong ván. */
  hasPlayedThisRound: boolean;
}

// --- Game State ---

/** Lịch sử một hành động trong ván. */
export interface PlayAction {
  playerId: string;
  action: 'PLAY' | 'PASS' | 'BAO_SAM';
  combination?: Combination;
  timestamp: number;
}

/** Lịch sử một ván bài. */
export interface RoundHistory {
  roundNumber: number;
  playActions: PlayAction[];
  roundWinner: string | null;
}

/** Toàn bộ trạng thái game tại một thời điểm. */
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  pile: Combination | null;
  roundNumber: number;
  /** playerId → tổng điểm phạt tích lũy */
  scores: Record<string, number>;
  /** playerId đã pass trong lượt hiện tại */
  passedPlayers: Set<string>;
  baoSamPlayerId: string | null;
  roundHistory: RoundHistory;
  gameOver: boolean;
  /** playerId thắng toàn game (khi có người đạt ngưỡng 30 điểm) */
  winner: string | null;
}

// --- Scoring ---

/** Kết quả tính điểm phạt cho một người chơi sau ván. */
export interface PenaltyResult {
  playerId: string;
  /** 1 điểm/lá thường còn lại */
  basePoints: number;
  /** 2 điểm/lá 2 còn lại (áp dụng khi Thối 2) */
  thoi2Points: number;
  /** Nhân đôi tổng nếu bị Cóng */
  congMultiplier: number;
  total: number;
  flags: ('CONG' | 'THOI_2' | 'BAO_SAM_PENALTY')[];
}

// --- Validation ---

/** Kết quả kiểm tra tính hợp lệ của một tổ hợp bài. */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  combination?: Combination;
}

// --- AI ---

/** Hành động do AI Engine quyết định. */
export type AIAction =
  | { type: 'PLAY'; combination: Combination }
  | { type: 'PASS' };
