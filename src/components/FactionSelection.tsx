import { useState } from 'react';
import { FactionType, MapSize, Difficulty, FACTION_CONFIGS } from '../types/game';

interface GameSettings {
  faction: FactionType;
  mapSize: MapSize;
  difficulty: Difficulty;
}

interface FactionSelectionProps {
  onSelectSettings: (settings: GameSettings) => void;
}

const FACTION_LIST: { type: FactionType; symbol: string; glow: string }[] = [
  { type: 'angels', symbol: '+', glow: 'from-blue-600 to-cyan-500' },
  { type: 'demons', symbol: '#', glow: 'from-red-600 to-orange-500' },
  { type: 'undead', symbol: '&', glow: 'from-green-600 to-emerald-500' },
  { type: 'machines', symbol: 'O', glow: 'from-yellow-600 to-amber-500' },
];

export default function FactionSelection({ onSelectSettings }: FactionSelectionProps) {
  const [faction, setFaction] = useState<FactionType | null>(null);
  const [mapSize, setMapSize] = useState<MapSize>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleStart = () => {
    if (faction) {
      onSelectSettings({ faction, mapSize, difficulty });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative">
      <div className="absolute bottom-4 left-4 text-xs text-slate-600">
        ver.0.6.4 by{' '}
        <a
          href="https://c4m1r.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-200 underline transition-colors"
        >
          c4m1r.github.io
        </a>
      </div>
      <div className="max-w-5xl w-full mx-4">
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-2 text-slate-100 tracking-wide">
            АНГЕЛЫ И ДЕМОНЫ
          </h1>
          <h2 className="text-lg text-center mb-8 text-slate-400">
            Прототип стратегии в стиле ASCII
          </h2>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Выберите фракцию
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FACTION_LIST.map(({ type, symbol, glow }) => {
                const config = FACTION_CONFIGS[type];
                const selected = faction === type;

                return (
                  <button
                    key={type}
                    onClick={() => setFaction(type)}
                    className={`group relative overflow-hidden p-6 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                      selected
                        ? `bg-gradient-to-br ${glow} border-white/50 shadow-lg`
                        : 'bg-slate-800/80 border-slate-600/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="relative z-10 text-center">
                      <div className={`text-5xl mb-3 ${selected ? 'text-white' : 'text-slate-300'}`}>
                        {symbol}
                      </div>
                      <h4 className={`text-lg font-bold mb-1 ${selected ? 'text-white' : 'text-slate-200'}`}>
                        {config.name}
                      </h4>
                      <p className={`text-xs ${selected ? 'text-white/80' : 'text-slate-500'}`}>
                        {config.description}
                      </p>
                    </div>
                    {selected && (
                      <div className="absolute inset-0 bg-white/5 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Размер карты
              </h3>
              <div className="flex gap-3">
                {(['small', 'medium', 'large'] as MapSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setMapSize(size)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium ${
                      mapSize === size
                        ? 'bg-slate-600 border-slate-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {size === 'small' ? 'Малая' : size === 'medium' ? 'Средняя' : 'Большая'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Сложность
              </h3>
              <div className="flex gap-3">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium ${
                      difficulty === diff
                        ? 'bg-slate-600 border-slate-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {diff === 'easy' ? 'Легко' : diff === 'normal' ? 'Нормально' : 'Сложно'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!faction}
            className={`w-full py-4 rounded-lg text-lg font-bold transition-all duration-300 ${
              faction
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-lg hover:shadow-xl border border-slate-500/50'
                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {faction ? `Начать игру за ${FACTION_CONFIGS[faction].name}` : 'Выберите фракцию'}
          </button>
        </div>
      </div>
    </div>
  );
}
