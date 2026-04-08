import GameBoard from './components/GameBoard';
import { useGame } from './hooks/useGame';

export default function App() {
  const game = useGame();
  return <GameBoard game={game} />;
}
