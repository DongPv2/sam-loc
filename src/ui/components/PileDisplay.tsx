import type { Combination } from '../../types';

interface Props {
  pile: Combination | null;
  baoSamPlayerId: string | null;
  playerNames: Record<string, string>;
}

const SUIT_SYMBOL: Record<string, string> = { SPADE: '♠', HEART: '♥', DIAMOND: '♦', CLUB: '♣' };
const SUIT_COLOR: Record<string, string> = { SPADE: '#222', HEART: '#e00', DIAMOND: '#e00', CLUB: '#222' };
const TYPE_LABEL: Record<string, string> = { RAC: 'Rác', DOI: 'Đôi', SAM: 'Sám', TU_QUY: 'Tứ Quý', SANH: 'Sảnh' };

function rankLabel(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  if (rank === 15) return '2';
  return String(rank);
}

export default function PileDisplay({ pile, baoSamPlayerId, playerNames }: Props) {
  return (
    <div style={{ minHeight: 110, background: '#2d6a2d', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 }}>
      {baoSamPlayerId && (
        <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 16 }}>
          🔔 {playerNames[baoSamPlayerId] ?? baoSamPlayerId} đang Báo Sâm!
        </div>
      )}
      {pile ? (
        <>
          <div style={{ color: '#ccc', fontSize: 13 }}>{TYPE_LABEL[pile.type]}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {pile.cards.map((card, i) => (
              <div key={i} style={{ width: 48, height: 70, borderRadius: 6, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 'bold', color: SUIT_COLOR[card.suit], boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                <span>{rankLabel(card.rank)}</span>
                <span style={{ fontSize: 18 }}>{SUIT_SYMBOL[card.suit]}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ color: '#aaa', fontSize: 14 }}>Bàn trống — đánh tự do</div>
      )}
    </div>
  );
}
