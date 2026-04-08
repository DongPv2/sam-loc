import type { CSSProperties } from 'react';
import type { UseGameReturn } from '../hooks/useGame';
import PlayerHand from './PlayerHand';
import PileDisplay from './PileDisplay';
import ScoreBoard from './ScoreBoard';
import RoundResultModal from './RoundResult';

const HUMAN_ID = 'player-0';

interface Props { game: UseGameReturn; }

export default function GameBoard({ game }: Props) {
  const { state, selectedCards, roundResult, toggleCard, playCards, pass, declareBaoSam, startNewRound, error } = game;

  if (!state) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>Đang khởi tạo...</div>;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === HUMAN_ID;
  const humanPlayer = state.players.find((p) => p.id === HUMAN_ID);
  const playerNames: Record<string, string> = Object.fromEntries(state.players.map((p) => [p.id, p.name]));
  const bots = state.players.filter((p) => p.isBot);

  return (
    <div style={{ minHeight: '100vh', background: '#1a4a1a', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>🃏 Sâm 10 Lá — Ván {state.roundNumber}</div>

      <ScoreBoard players={state.players} scores={state.scores} currentPlayerId={currentPlayer?.id ?? ''} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13, color: '#ccc' }}>
        {bots.map((bot) => (
          <span key={bot.id}>
            🤖 {bot.name}: {bot.hand.length} lá
            {state.passedPlayers.has(bot.id) && <span style={{ color: '#ffa0a0', marginLeft: 4 }}>(pass)</span>}
          </span>
        ))}
      </div>

      <PileDisplay pile={state.pile} baoSamPlayerId={state.baoSamPlayerId} playerNames={playerNames} />

      <div style={{ textAlign: 'center', fontSize: 14, color: isMyTurn ? '#ffd700' : '#aaa' }}>
        {isMyTurn ? '⭐ Lượt của bạn' : `⏳ Lượt của ${currentPlayer?.name ?? '...'}`}
      </div>

      {error && <div style={{ background: '#c62828', color: '#fff', padding: '6px 12px', borderRadius: 6, textAlign: 'center', fontSize: 14 }}>{error}</div>}

      <div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#ccc', marginBottom: 4 }}>
          Tay bài của bạn ({humanPlayer?.hand.length ?? 0} lá)
          {selectedCards.length > 0 && <span style={{ color: '#2196f3', marginLeft: 8 }}>— đã chọn {selectedCards.length} lá</span>}
        </div>
        <PlayerHand cards={humanPlayer?.hand ?? []} selectedCards={selectedCards} onToggle={toggleCard} disabled={!isMyTurn} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={playCards} disabled={!isMyTurn || selectedCards.length === 0} style={btnStyle(!isMyTurn || selectedCards.length === 0, '#1565c0')}>
          Đánh ({selectedCards.length} lá)
        </button>
        <button onClick={pass} disabled={!isMyTurn || state.pile === null} style={btnStyle(!isMyTurn || state.pile === null, '#555')}>
          Pass
        </button>
        <button onClick={declareBaoSam} disabled={!isMyTurn || state.baoSamPlayerId !== null} style={btnStyle(!isMyTurn || state.baoSamPlayerId !== null, '#7b1fa2')}>
          Báo Sâm 🔔
        </button>
      </div>

      {roundResult && <RoundResultModal result={roundResult} state={state} onNext={startNewRound} />}
    </div>
  );
}

function btnStyle(disabled: boolean, bg: string): CSSProperties {
  return { padding: '10px 20px', background: disabled ? '#444' : bg, color: disabled ? '#888' : '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: disabled ? 'default' : 'pointer', fontWeight: 'bold', opacity: disabled ? 0.6 : 1 };
}
