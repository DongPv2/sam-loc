import type { GameState, Player, Combination, Card, RoundHistory, PlayAction } from '../types.js';

const SAVE_KEY = 'sam10la_game_state';

// In-memory fallback for environments without localStorage (e.g. Node.js tests)
const memoryStore = new Map<string, string>();

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

function getStorage(): StorageLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ls = (globalThis as any).localStorage as StorageLike | undefined;
    if (ls !== undefined) {
      // Quick availability check
      ls.setItem('__test__', '1');
      ls.removeItem('__test__');
      return ls;
    }
  } catch {
    // fall through to in-memory
  }
  return null;
}

function storageGet(key: string): string | null {
  const ls = getStorage();
  if (ls) return ls.getItem(key);
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  const ls = getStorage();
  if (ls) {
    ls.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

function storageRemove(key: string): void {
  const ls = getStorage();
  if (ls) {
    ls.removeItem(key);
  } else {
    memoryStore.delete(key);
  }
}

// Serialized form: passedPlayers stored as array
interface SerializedGameState extends Omit<GameState, 'passedPlayers'> {
  passedPlayers: string[];
}

function serialize(state: GameState): string {
  const serialized: SerializedGameState = {
    ...state,
    passedPlayers: Array.from(state.passedPlayers),
  };
  return JSON.stringify(serialized);
}

function deserialize(raw: string): GameState {
  const parsed: SerializedGameState = JSON.parse(raw);
  return {
    ...parsed,
    passedPlayers: new Set<string>(parsed.passedPlayers),
  };
}

export class SaveManager {
  save(state: GameState): void {
    try {
      storageSet(SAVE_KEY, serialize(state));
    } catch (err) {
      console.error('[SaveManager] Failed to save game state:', err);
    }
  }

  load(): GameState | null {
    try {
      const raw = storageGet(SAVE_KEY);
      if (raw === null) return null;
      const state = deserialize(raw);
      if (!this.isValid(state)) return null;
      return state;
    } catch (err) {
      console.error('[SaveManager] Failed to load game state:', err);
      return null;
    }
  }

  clear(): void {
    try {
      storageRemove(SAVE_KEY);
    } catch (err) {
      console.error('[SaveManager] Failed to clear game state:', err);
    }
  }

  isValid(state: unknown): state is GameState {
    if (typeof state !== 'object' || state === null) return false;
    const s = state as Record<string, unknown>;

    // players: array
    if (!Array.isArray(s.players)) return false;

    // currentPlayerIndex: number
    if (typeof s.currentPlayerIndex !== 'number') return false;

    // pile: Combination | null
    if (s.pile !== null && !isCombination(s.pile)) return false;

    // roundNumber: number
    if (typeof s.roundNumber !== 'number') return false;

    // scores: object (Record<string, number>)
    if (typeof s.scores !== 'object' || s.scores === null || Array.isArray(s.scores)) return false;

    // passedPlayers: array or Set
    if (!Array.isArray(s.passedPlayers) && !(s.passedPlayers instanceof Set)) return false;

    // baoSamPlayerId: string | null
    if (s.baoSamPlayerId !== null && typeof s.baoSamPlayerId !== 'string') return false;

    // roundHistory: object with required fields
    if (!isRoundHistory(s.roundHistory)) return false;

    // gameOver: boolean
    if (typeof s.gameOver !== 'boolean') return false;

    // winner: string | null
    if (s.winner !== null && typeof s.winner !== 'string') return false;

    return true;
  }
}

function isCombination(val: unknown): val is Combination {
  if (typeof val !== 'object' || val === null) return false;
  const c = val as Record<string, unknown>;
  return (
    typeof c.type === 'string' &&
    Array.isArray(c.cards) &&
    typeof c.representativeRank === 'number'
  );
}

function isRoundHistory(val: unknown): val is RoundHistory {
  if (typeof val !== 'object' || val === null) return false;
  const r = val as Record<string, unknown>;
  return (
    typeof r.roundNumber === 'number' &&
    Array.isArray(r.playActions) &&
    (r.roundWinner === null || typeof r.roundWinner === 'string')
  );
}

export const saveManager = new SaveManager();
