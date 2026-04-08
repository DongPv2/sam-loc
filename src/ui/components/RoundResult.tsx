import type { RoundResult as RoundResultType } from '../../core/gameEngine';
import type { GameState } from '../../types';

interface Props {
  result: RoundResultType;
  state: GameState;
  onNext: () => void;
}

export default function RoundResult({ result, state, onNext }: Props) {
  const winner = state.players.find((p) => p.id === result.winnerId);
  const isGameOver = state.gameOver;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, minWidth: 300, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ margin: '0 0 12px', textAlign: 'center', color: '#2d6a2d' }}>
          {isGameOver ? '🏆 Kết thúc game!' : `Ván ${state.roundNumber} kết thúc`}
        </h2>

        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 16 }}>
          <strong>{winner?.name ?? result.winnerId}</strong> thắng ván!
          {result.baoSamResult === 'SUCCESS' && <span style={{ color: '#ffc107', marginLeft: 8 }}>🔔 Báo Sâm thành công!</span>}
          {result.baoSamResult === 'FAILED' && <span style={{ color: '#e00', marginLeft: 8 }}>❌ Báo Sâm thất bại!</span>}
        </div>

        {result.penalties.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Điểm phạt ván này:</div>
            {result.penalties.map((p) => {
              const player = state.players.find((pl) => pl.id === p.playerId);
              return (
                <div key={p.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                  <span>
                    {player?.name ?? p.playerId}
                    {p.flags.includes('CONG') && <span style={{ color: '#e00', marginLeft: 4 }}>[Cóng]</span>}
                    {p.flags.includes('THOI_2') && <span style={{ color: '#e67e00', marginLeft: 4 }}>[Thối 2]</span>}
                    {p.flags.includes('BAO_SAM_PENALTY') && <span style={{ color: '#9c27b0', marginLeft: 4 }}>[Báo Sâm phạt]</span>}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#e00' }}>+{p.total}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Tổng điểm:</div>
          {state.players.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 14 }}>
              <span>{p.isBot ? '🤖 ' : '👤 '}{p.name}</span>
              <span style={{ fontWeight: 'bold', color: (state.scores[p.id] ?? 0) >= 20 ? '#e00' : '#333' }}>{state.scores[p.id] ?? 0} điểm</span>
            </div>
          ))}
        </div>

        {isGameOver && (
          <div style={{ textAlign: 'center', color: '#2d6a2d', fontWeight: 'bold', marginBottom: 12 }}>
            Người thắng: {state.players.find((p) => p.id === state.winner)?.name ?? state.winner}
          </div>
        )}

        <button onClick={onNext} style={{ width: '100%', padding: '10px 0', background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }}>
          {isGameOver ? 'Chơi lại' : 'Ván tiếp theo'}
        </button>
      </div>
    </div>
  );
}
