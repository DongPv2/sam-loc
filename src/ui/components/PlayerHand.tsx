import type { Card } from '../../types';

interface Props {
  cards: Card[];
  selectedCards: Card[];
  onToggle: (card: Card) => void;
  disabled: boolean;
}

const SUIT_SYMBOL: Record<string, string> = { SPADE: '♠', HEART: '♥', DIAMOND: '♦', CLUB: '♣' };
const SUIT_COLOR: Record<string, string> = { SPADE: '#222', HEART: '#e00', DIAMOND: '#e00', CLUB: '#222' };

function rankLabel(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  if (rank === 15) return '2';
  return String(rank);
}

export default function PlayerHand({ cards, selectedCards, onToggle, disabled }: Props) {
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', padding: '8px 0' }}>
      {sorted.map((card) => {
        const sel = selectedCards.some((c) => c.rank === card.rank && c.suit === card.suit);
        return (
          <button
            key={`${card.rank}-${card.suit}`}
            onClick={() => !disabled && onToggle(card)}
            disabled={disabled}
            style={{
              width: 52, height: 76, borderRadius: 6,
              border: sel ? '2px solid #2196f3' : '1px solid #aaa',
              background: sel ? '#e3f2fd' : '#fff',
              cursor: disabled ? 'default' : 'pointer',
              transform: sel ? 'translateY(-8px)' : 'none',
              transition: 'transform 0.1s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 'bold', color: SUIT_COLOR[card.suit],
              boxShadow: sel ? '0 4px 8px rgba(33,150,243,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <span>{rankLabel(card.rank)}</span>
            <span style={{ fontSize: 20 }}>{SUIT_SYMBOL[card.suit]}</span>
          </button>
        );
      })}
    </div>
  );
}
