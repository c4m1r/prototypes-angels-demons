import { Building, Unit, UnitType, BuildingType, GameState } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';

interface GameUIProps {
  gameState: GameState;
  selectedUnits: Unit[];
  selectedBuildings: Building[];
  onProduceUnit: (building: Building, unitType: UnitType) => void;
  onBuildBuilding: (buildingType: BuildingType) => void;
  onAddToSquad: (unit: Unit) => void;
}

export default function GameUI({
  gameState,
  selectedUnits,
  selectedBuildings,
  onProduceUnit,
  onBuildBuilding,
  onAddToSquad,
}: GameUIProps) {
  const playerTeam = gameState.teams[gameState.playerTeam];

  const renderBuildingPanel = (building: Building) => {
    const config = BUILDING_CONFIGS[building.type];

    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
        <h3 className="text-xl font-bold text-white mb-2">{config.name}</h3>
        <div className="text-slate-300 text-sm mb-3">
          HP: {Math.floor(building.health)}/{building.maxHealth}
        </div>

        {building.producing && (
          <div className="mb-3">
            <div className="text-yellow-400 text-sm mb-1">Производство...</div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(building.productionProgress / (building.productionTime * 1000)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {config.canProduce && !building.producing && (
          <div className="space-y-2">
            <div className="text-slate-400 text-sm mb-2">Производство:</div>
            {config.canProduce.map(unitType => {
              const unitConfig = UNIT_CONFIGS[unitType];
              const canAfford = playerTeam.resources >= unitConfig.cost;

              return (
                <button
                  key={unitType}
                  onClick={() => canAfford && onProduceUnit(building, unitType)}
                  disabled={!canAfford}
                  className={`w-full p-2 rounded text-sm transition-all ${
                    canAfford
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {unitConfig.ascii} {unitConfig.name}
                    </span>
                    <span className="text-yellow-400">{unitConfig.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderUnitPanel = (unit: Unit) => {
    const config = UNIT_CONFIGS[unit.type];
    const canAddToSquad = unit.squadSize < unit.maxSquadSize;
    const addCost = 10;

    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
        <h3 className="text-xl font-bold text-white mb-2">
          {config.ascii} {config.name}
        </h3>
        <div className="text-slate-300 text-sm space-y-1">
          <div>HP: {Math.floor(unit.health)}/{unit.maxHealth}</div>
          <div>Размер отряда: {unit.squadSize}/{unit.maxSquadSize}</div>
          <div>Урон: {unit.damage * unit.squadSize}</div>
          <div>Дальность: {unit.range}</div>
        </div>

        {canAddToSquad && unit.maxSquadSize > 1 && (
          <button
            onClick={() => onAddToSquad(unit)}
            disabled={playerTeam.resources < addCost}
            className={`w-full mt-3 p-2 rounded text-sm transition-all ${
              playerTeam.resources >= addCost
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex justify-between">
              <span>Добавить в отряд</span>
              <span className="text-yellow-400">{addCost}</span>
            </div>
          </button>
        )}
      </div>
    );
  };

  const renderBuilderPanel = () => {
    const buildings: BuildingType[] =
      playerTeam.faction === 'angels'
        ? ['heaven_temple', 'heart_heaven', 'holy_altar', 'holy_relic', 'enlightenment_altar']
        : ['hell_sanctuary', 'heart_hell', 'dark_altar', 'dark_relic', 'corruption_altar'];

    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
        <h3 className="text-xl font-bold text-white mb-3">Строительство</h3>
        <div className="space-y-2">
          {buildings.map(buildingType => {
            const config = BUILDING_CONFIGS[buildingType];
            const canAfford = playerTeam.resources >= config.cost;

            return (
              <button
                key={buildingType}
                onClick={() => canAfford && onBuildBuilding(buildingType)}
                disabled={!canAfford}
                className={`w-full p-2 rounded text-sm transition-all ${
                  canAfford
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{config.name}</span>
                  <span className="text-yellow-400">{config.cost}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const hasBuilders = selectedUnits.some(
    u => u.type === 'servant' || u.type === 'slave'
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
        <div className="flex justify-between items-center text-white">
          <div>
            <span className="text-slate-400">Фракция: </span>
            <span className="font-bold">
              {playerTeam.faction === 'angels' ? 'Ангелы ☨' : 'Демоны ⛤'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Ресурсы: </span>
            <span className="text-yellow-400 font-bold text-xl">
              {Math.floor(playerTeam.resources)}
            </span>
          </div>
        </div>
      </div>

      {selectedBuildings.length > 0 && (
        <div className="space-y-2">
          {selectedBuildings.map(building => (
            <div key={building.id}>{renderBuildingPanel(building)}</div>
          ))}
        </div>
      )}

      {selectedUnits.length > 0 && !hasBuilders && (
        <div className="space-y-2">
          {selectedUnits.slice(0, 1).map(unit => (
            <div key={unit.id}>{renderUnitPanel(unit)}</div>
          ))}
        </div>
      )}

      {hasBuilders && renderBuilderPanel()}

      <div className="bg-slate-800 p-3 rounded-lg border border-slate-600">
        <div className="text-slate-300 text-xs space-y-1">
          <div>ЛКМ - Выбор юнитов/зданий</div>
          <div>ПКМ - Приказ двигаться/атаковать</div>
          <div>СКМ (зажать) - Двигать камеру</div>
          <div>Строитель + ЛКМ здание = Ремонт</div>
        </div>
      </div>
    </div>
  );
}
