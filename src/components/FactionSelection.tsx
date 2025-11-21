import { FactionType } from '../types/game';

interface FactionSelectionProps {
  onSelectFaction: (faction: FactionType) => void;
}

export default function FactionSelection({ onSelectFaction }: FactionSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-slate-700 rounded-lg p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-4 text-slate-100">
            Добро пожаловать в прототип стратегии
          </h1>
          <h2 className="text-3xl font-semibold text-center mb-8 text-slate-300">
            Ангелы и Демоны
          </h2>

          <p className="text-center text-slate-400 mb-12 text-lg">
            Выберите сторону для продолжения
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => onSelectFaction('angels')}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 p-8 rounded-lg border-2 border-blue-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="text-6xl mb-4 text-center">☨</div>
                <h3 className="text-2xl font-bold text-white mb-2">Я с Ангелами</h3>
                <p className="text-blue-100 text-sm">
                  Сражайтесь за свет и справедливость
                </p>
              </div>
            </button>

            <button
              onClick={() => onSelectFaction('demons')}
              className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 p-8 rounded-lg border-2 border-red-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="text-6xl mb-4 text-center">⛤</div>
                <h3 className="text-2xl font-bold text-white mb-2">Я с Демонами</h3>
                <p className="text-red-100 text-sm">
                  Захватите мир силой хаоса
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
