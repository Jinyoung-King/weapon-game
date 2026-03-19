import { useGameLogic } from './hooks/useGameLogic';
import { AppView } from './components/AppView';

export default function App() {
  const { state, actions } = useGameLogic();
  return <AppView state={state} actions={actions} />;
}
