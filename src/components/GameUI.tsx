import { Building, Unit, UnitType, BuildingType, GameState, FACTION_CONFIGS } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { isBuilder } from '../engine/gameEngine';

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
  const factionConfig = FACTION_CONFIGS[playerTeam.faction];

  const renderResourceBar = () => (
    <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" style={{ color: factionConfig.color }}>{factionConfig.symbol}</span>
          <div>
            <div className="text-sm font-bold text-white">{factionConfig.name}</div>
            <div className="text-xs text-slate-400">
              {playerTeam.defeated ? 'Побеждены' : 'Активны'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Ресурсы</div>
          <div className="text-xl font-bold text-yellow-400">{Math.floor(playerTeam.resources)}</div>
        </div>
      </div>
      <div className="mt-2 flex gap-2 text-xs text-slate-500">
        <span>Здания: {playerTeam.buildings.length}</span>
        <span>|</span>
        <span>Юниты: {playerTeam.units.length}</span>
        <span>|</span>
        <span>Точки: {gameState.map.controlPoints.filter(cp => cp.owner === playerTeam.id).length}</span>
      </div>
    </div>
  );

  const renderMinimap = () => {
    const map = gameState.map;
    const scale = 3;
    const miniW = map.width * scale;
    const miniH = map.height * scale;

    return (
      <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg p-2">
        <div className="text-xs text-slate-400 mb-1">Карта</div>
        <div className="relative bg-slate-950 border border-slate-600/50" style={{ width: miniW, height: miniH }}>
          {gameState.map.controlPoints.map(cp => {
            const ownerColor = cp.owner !== null ? gameState.teams[cp.owner]?.color : '#ffdd44';
            return (
              <div
                key={cp.id}
                className="absolute rounded-full"
                style={{
                  left: cp.position.x * scale - 1,
                  top: cp.position.y * scale - 1,
                  width: 4,
                  height: 4,
                  backgroundColor: ownerColor,
                }}
              />
            );
          })}
          {gameState.teams.map(team => (
            <div key={team.id}>
              {team.buildings.map(b => (
                <div
                  key={b.id}
                  className="absolute"
                  style={{
                    left: Math.floor(b.position.x / 32) * scale - 1,
                    top: Math.floor(b.position.y / 32) * scale - 1,
                    width: 3,
                    height: 3,
                    backgroundColor: team.color,
                  }}
                />
              ))}
              {team.units.map(u => (
                <div
                  key={u.id}
                  className="absolute"
                  style={{
                    left: Math.floor(u.position.x / 32) * scale,
                    top: Math.floor(u.position.y / 32) * scale,
                    width: 2,
                    height: 2,
                    backgroundColor: team.color,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBuildingPanel = (building: Building) => {
    const config = BUILDING_CONFIGS[building.type];

    return (
      <div className="bg-slate-800/90 border border-slate-600/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" style={{ color: factionConfig.color }}>{config.ascii[1] || config.ascii[0]}</span>
          <div>
            <h3 className="text-base font-bold text-white">{config.name}</h3>
            <div className="text-xs text-slate-400">{config.description}</div>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>HP</span>
            <span>{Math.floor(building.health)}/{building.maxHealth}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${(building.health / building.maxHealth) * 100}%`,
                backgroundColor: building.health / building.maxHealth > 0.6 ? '#22dd22' : building.health / building.maxHealth > 0.3 ? '#ffdd00' : '#ff3333',
              }}
            />
          </div>
        </div>

        {building.producing && (
          <div className="mb-2">
            <div className="text-xs text-yellow-400 mb-1">
              Производство: {UNIT_CONFIGS[building.producing].name}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(building.productionProgress / (building.productionTime * 1000)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {config.canProduce && !building.producing && (
          <div className="space-y-1">
            <div className="text-xs text-slate-400 mb-1">Найти:</div>
            {config.canProduce.map(unitType => {
              const unitConfig = UNIT_CONFIGS[unitType];
              const canAfford = playerTeam.resources >= unitConfig.cost;

              return (
                <button
                  key={unitType}
                  onClick={() => canAfford && onProduceUnit(building, unitType)}
                  disabled={!canAfford}
                  className={`w-full p-2 rounded text-xs transition-all flex items-center justify-between ${
                    canAfford
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500/50'
                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/30'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span style={{ color: factionConfig.color }}>{unitConfig.ascii}</span>
                    <span>{unitConfig.name}</span>
                    {unitConfig.isHero && <span className="text-yellow-400 text-[10px]">ГЕРОЙ</span>}
                  </span>
                  <span className="text-yellow-400">{unitConfig.cost}</span>
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
    const canAddToSquad = unit.squadSize < unit.maxSquadSize && unit.maxSquadSize > 1;
    const addCost = 10;

    return (
      <div className="bg-slate-800/90 border border-slate-600/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded border border-slate-600" style={{ backgroundColor: `${factionConfig.color}22` }}>
            <span className="text-2xl" style={{ color: factionConfig.color }}>{config.ascii}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {config.name}
              {unit.isHero && <span className="text-yellow-400 text-xs ml-1">ГЕРОЙ</span>}
            </h3>
            {unit.isHero && (
              <div className="text-xs text-yellow-400">Ур. {unit.level} ({unit.experience}/{unit.experienceToLevel} XP)</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 mb-2">
          <div>HP: {Math.floor(unit.health)}/{unit.maxHealth}</div>
          <div>Урон: {Math.floor(unit.damage * unit.squadSize)}</div>
          <div>Отряд: {unit.squadSize}/{unit.maxSquadSize}</div>
          <div>Дальность: {unit.range}</div>
          {unit.maxMana > 0 && <div>Мана: {Math.floor(unit.mana)}/{unit.maxMana}</div>}
          <div>Уклонение: {Math.floor(unit.evasion * 100)}%</div>
        </div>

        {canAddToSquad && (
          <button
            onClick={() => onAddToSquad(unit)}
            disabled={playerTeam.resources < addCost}
            className={`w-full mt-1 p-2 rounded text-xs transition-all flex items-center justify-between ${
              playerTeam.resources >= addCost
                ? 'bg-green-700 hover:bg-green-600 text-white border border-green-500/50'
                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/30'
            }`}
          >
            <span>Добавить в отряд</span>
            <span className="text-yellow-400">{addCost}</span>
          </button>
        )}
      </div>
    );
  };

  const renderBuilderPanel = () => (
    <div className="bg-slate-800/90 border border-slate-600/50 rounded-lg p-3">
      <h3 className="text-sm font-bold text-white mb-2">Строительство</h3>
      <div className="space-y-1">
        {factionConfig.buildings.map(buildingType => {
          const config = BUILDING_CONFIGS[buildingType];
          const canAfford = playerTeam.resources >= config.cost;

          return (
            <button
              key={buildingType}
              onClick={() => canAfford && onBuildBuilding(buildingType)}
              disabled={!canAfford}
              className={`w-full p-2 rounded text-xs transition-all flex items-center justify-between ${
                canAfford
                  ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500/50'
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/30'
              }`}
            >
              <span className="flex items-center gap-1">
                <span style={{ color: factionConfig.color }}>{config.ascii[1] || config.ascii[0]}</span>
                <span>{config.name}</span>
              </span>
              <span className="text-yellow-400">{config.cost}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderScoreboard = () => (
    <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg p-2">
      <div className="text-xs text-slate-400 mb-1">Команды</div>
      {gameState.teams.map(team => {
        const fc = FACTION_CONFIGS[team.faction];
        return (
          <div key={team.id} className="flex items-center justify-between text-xs py-0.5">
            <span style={{ color: team.color }}>{fc.symbol} {fc.name}</span>
            <span className="text-slate-500">
              {team.defeated ? 'X' : `${team.units.length}u ${team.buildings.length}b`}
            </span>
          </div>
        );
      })}
    </div>
  );

  const hasBuilders = selectedUnits.some(u => isBuilder(u.type));

  return (
    <div className="flex flex-col gap-2 w-[320px] shrink-0">
      {renderResourceBar()}
      {renderMinimap()}
      {renderScoreboard()}

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
          {selectedUnits.length > 1 && (
            <div className="text-xs text-slate-400 text-center">
              Выбрано юнитов: {selectedUnits.length}
            </div>
          )}
        </div>
      )}

      {hasBuilders && renderBuilderPanel()}

      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-2">
        <div className="text-[10px] text-slate-500 space-y-0.5">
          <div>ЛКМ - Выбор юнитов/зданий</div>
          <div>ПКМ - Движение / Атака</div>
          <div>СКМ / Alt+ЛКМ - Камера</div>
          <div>Колесо - Прокрутка карты</div>
        </div>
      </div>
    </div>
  );
}
