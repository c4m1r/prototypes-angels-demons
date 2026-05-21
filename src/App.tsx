import { useState } from 'react';
import { FactionType, MapSize, Difficulty } from './types/game';
import FactionSelection from './components/FactionSelection';
import Game from './components/Game';

interface GameSettings {
  faction: FactionType;
  mapSize: MapSize;
  difficulty: Difficulty;
}

function App() {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  if (!settings) {
    return <FactionSelection onSelectSettings={setSettings} />;
  }

  return <Game faction={settings.faction} mapSize={settings.mapSize} difficulty={settings.difficulty} />;
}

export default App;
