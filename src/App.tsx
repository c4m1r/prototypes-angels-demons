import { useState } from 'react';
import { FactionType } from './types/game';
import FactionSelection from './components/FactionSelection';
import Game from './components/Game';

function App() {
  const [selectedFaction, setSelectedFaction] = useState<FactionType | null>(null);

  if (!selectedFaction) {
    return <FactionSelection onSelectFaction={setSelectedFaction} />;
  }

  return <Game faction={selectedFaction} />;
}

export default App;
