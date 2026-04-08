import type { Player } from '../../types';

interface Props {
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId: string;
}

export default function ScoreBoard({ players, scores, currentPlayerId }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {players.map((p) => (
        <div key={p.id} style={{ padding: '6px 12px', borderRadius: 8, background: p.id === currentPlayerId ? '#fff3cd' : '#f5f5f5', border: p.id === currentPlayerId ? '2px solid #ffc107' : '1px solid #ddd', minWidth: 90, textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{p.isBot ? '🤖 ' : '👤 '}{p.name}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{p.hand.length} lá</div>
          <div style={{ fontSize: 14, color: (scores[p.id] ?? 0) >= 20 ? '#e00' : '#333', fontWeight: 'bold' }}>{scores[p.id] ?? 0} điểm</div>
        </div>
      ))}
    </div>
  );
}
