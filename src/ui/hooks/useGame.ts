import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../../core/gameEngine';
import type { RoundResult } from '../../core/gameEngine';
import { chooseAction } from '../../ai/aiEngine';
import type { GameState, Card } from '../../types';

export interface UseGameReturn {
  state: GameState | null;
  selectedCards: Card[];
  roundResult: RoundResult | null;
  toggleCard: (card: Card) => void;
  playCards: () => void;
  pass: () => void;
  declareBaoSam: () => void;
  startNewRound: () => void;
  error: string | null;
}

const HUMAN_ID = 'player-0';

export function useGame(): UseGameReturn {
  const engineRef = useRef<GameEngine | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundActiveRef = useRef(false);

  const [state, setState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const engine = new GameEngine({
      players: [
        { id: HUMAN_ID, name: 'Bạn', isBot: false },
        { id: 'bot-1', name: 'Bot 1', isBot: true, difficulty: 'HARD' },
        { id: 'bot-2', name: 'Bot 2', isBot: true, difficulty: 'HARD' },
        { id: 'bot-3', name: 'Bot 3', isBot: true, difficulty: 'HARD' },
      ],
      turnTimeoutMs: 60_000,
    });

    engine.onStateChange((s) => {
      setState({ ...s, passedPlayers: new Set(s.passedPlayers) });
    });

    engine.onRoundEnd((result) => {
      roundActiveRef.current = false;
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      setRoundResult(result);
    });

    engineRef.current = engine;
    roundActiveRef.current = true;
    engine.startRound();

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!state || !roundActiveRef.current || state.gameOver) return;
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) return;

    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    botTimerRef.current = setTimeout(() => {
      if (!roundActiveRef.current) return;
      const engine = engineRef.current;
      if (!engine) return;

      const s = engine.getState();
      const player = s.players[s.currentPlayerIndex];
      if (!player?.isBot) return;

      const action = chooseAction(player.hand, s.pile, s, player.difficulty ?? 'HARD');
      if (action.type === 'PLAY') {
        const result = engine.playCards(player.id, action.combination.cards);
        if (!result.success) engine.pass(player.id);
      } else {
        engine.pass(player.id);
      }
    }, 700);
  }, [state]);

  const toggleCard = useCallback((card: Card) => {
    setSelectedCards((prev) => {
      const idx = prev.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
      return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, card];
    });
    setError(null);
  }, []);

  const playCards = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || selectedCards.length === 0) return;
    const result = engine.playCards(HUMAN_ID, selectedCards);
    if (result.success) { setSelectedCards([]); setError(null); }
    else setError(result.error ?? 'Bài không hợp lệ');
  }, [selectedCards]);

  const pass = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const result = engine.pass(HUMAN_ID);
    if (result.success) { setSelectedCards([]); setError(null); }
    else setError(result.error ?? 'Không thể pass');
  }, []);

  const declareBaoSam = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const result = engine.declareBaoSam(HUMAN_ID);
    if (!result.success) setError(result.error ?? 'Không thể Báo Sâm');
    else setError(null);
  }, []);

  const startNewRound = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setRoundResult(null);
    setSelectedCards([]);
    setError(null);
    roundActiveRef.current = true;
    engine.startRound();
  }, []);

  return { state, selectedCards, roundResult, toggleCard, playCards, pass, declareBaoSam, startNewRound, error };
}
