import { useState, useRef } from 'react';
import {
  Building, Unit, UnitType, BuildingType, GameState, FACTION_CONFIGS,
  LevelUpStat, LEVEL_UP_STAT_NAMES, FactionType,
} from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { isBuilder } from '../engine/gameEngine';

// ─── Tooltip ─────────────────────────────────────────────────────────────────
interface TooltipInfo {
  title: string;
  lines: string[];
  cost?: number;
  hotkey?: string;
  color?: string;
}

function UITooltip({ info, anchorRef }: { info: TooltipInfo; anchorRef: React.RefObject<HTMLElement | null> }) {
  const el = anchorRef.current;
  const rect = el?.getBoundingClientRect();
  if (!rect) return null;

  // Render above the anchor
  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: rect.left, bottom: window.innerHeight - rect.top + 6, minWidth: 180, maxWidth: 280 }}
    >
      <div
        className="rounded border shadow-2xl px-3 py-2"
        style={{
          background: 'rgba(6,9,16,0.97)',
          borderColor: info.color ? `${info.color}66` : '#334155',
          boxShadow: info.color ? `0 0 14px ${info.color}22` : undefined,
        }}
      >
        <div className="font-bold text-xs mb-1" style={{ color: info.color || '#e2e8f0' }}>{info.title}</div>
        {info.lines.map((l, i) => (
          <div key={i} className="text-[10px] text-slate-400 leading-tight">{l}</div>
        ))}
        {(info.cost !== undefined || info.hotkey) && (
          <div className="flex items-center gap-3 mt-1.5 pt-1 border-t border-slate-700/60">
            {info.cost !== undefined && (
              <span className="text-[10px] text-yellow-400 font-bold">{info.cost} зол.</span>
            )}
            {info.hotkey && (
              <span className="text-[10px] bg-slate-700 border border-slate-500 px-1.5 py-0.5 rounded text-slate-300">{info.hotkey}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper that shows tooltip on hover
function WithTooltip({ info, children, className, style }: {
  info: TooltipInfo;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && <UITooltip info={info} anchorRef={ref} />}
    </div>
  );
}

// ─── HP / Mana bar ────────────────────────────────────────────────────────────
function BarRow({ label, value, max, color, bg }: {
  label: string; value: number; max: number; color: string; bg?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-500 w-5 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: bg || '#0f172a', border: '1px solid #1e293b' }}>
        <div className="h-full rounded-sm transition-all" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <span className="text-[9px] text-slate-400 w-14 text-right shrink-0">{Math.floor(value)}/{max}</span>
    </div>
  );
}

// ─── Portrait ─────────────────────────────────────────────────────────────────
function Portrait({ lines, color, size = 72 }: { lines: string[]; color: string; size?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded shrink-0 overflow-hidden"
      style={{
        width: size, height: size,
        background: `${color}12`,
        border: `1.5px solid ${color}55`,
        boxShadow: `inset 0 0 12px ${color}18`,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} className="font-mono leading-none whitespace-pre select-none"
          style={{ fontSize: Math.max(8, (size / lines.length) * 0.55), color }}>
          {l}
        </div>
      ))}
    </div>
  );
}

// ─── Panel section header ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 px-0.5 select-none">
      {children}
    </div>
  );
}

// ─── Unit panel (left side of HUD) ───────────────────────────────────────────
function UnitInfoPanel({ unit, teamColor, glowColor }: { unit: Unit; teamColor: string; glowColor: string }) {
  const cfg = UNIT_CONFIGS[unit.type];
  const hpColor = unit.health / unit.maxHealth > 0.6 ? '#22c55e' : unit.health / unit.maxHealth > 0.3 ? '#eab308' : '#ef4444';

  return (
    <div className="flex gap-2 h-full">
      <Portrait lines={cfg.portrait} color={teamColor} size={72} />
      <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold truncate" style={{ color: glowColor }}>{cfg.name}</span>
            {unit.isHero && <span className="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1 rounded font-bold">ГЕРОЙ</span>}
          </div>
          <div className="text-[9px] text-slate-500 mb-1">
            {unit.isHero ? 'Ур. ' + unit.level : (cfg.isMelee ? 'Ближний бой' : 'Дальний бой')}
            {' · '}{cfg.description}
          </div>
          <div className="space-y-0.5">
            <BarRow label="HP" value={unit.health} max={unit.maxHealth} color={hpColor} />
            {unit.maxMana > 0 && <BarRow label="МП" value={unit.mana} max={unit.maxMana} color="#3b82f6" />}
            {unit.isHero && <BarRow label="XP" value={unit.experience} max={unit.experienceToLevel} color="#eab308" />}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-0 mt-1">
          {[
            ['АТК', `${Math.floor(unit.damage * unit.squadSize)}`],
            ['ДАЛ', `${Math.floor(unit.range)}`],
            ['СКР', `${Math.floor(unit.movementSpeed)}`],
            ['УКЛ', `${Math.floor(unit.evasion * 100)}%`],
            ['ОТР', `${unit.squadSize}/${unit.maxSquadSize}`],
            ['АС', `${unit.attackSpeed.toFixed(1)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-0.5">
              <span className="text-[8px] text-slate-600">{k}</span>
              <span className="text-[9px] text-slate-300 font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Building panel ───────────────────────────────────────────────────────────
function BuildingInfoPanel({ building, teamColor, glowColor }: { building: Building; teamColor: string; glowColor: string }) {
  const cfg = BUILDING_CONFIGS[building.type];
  const hpColor = building.health / building.maxHealth > 0.6 ? '#22c55e' : building.health / building.maxHealth > 0.3 ? '#eab308' : '#ef4444';

  return (
    <div className="flex gap-2 h-full">
      <Portrait lines={cfg.ascii} color={teamColor} size={72} />
      <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold truncate" style={{ color: glowColor }}>{cfg.name}</span>
            {cfg.isTurret && <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1 rounded">ТУРЕЛЬ</span>}
          </div>
          <div className="text-[9px] text-slate-500 mb-1">{cfg.description}</div>
          <BarRow label="HP" value={building.health} max={building.maxHealth} color={hpColor} />
          {building.producing && (
            <div className="mt-1">
              <div className="text-[9px] text-yellow-400 mb-0.5">Производство: {UNIT_CONFIGS[building.producing].name}</div>
              <BarRow label="" value={building.productionProgress} max={building.productionTime * 1000} color="#eab308" bg="#0f172a" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-2 mt-1">
          {cfg.isTurret && [
            ['ДАЛ', `${cfg.turretRange}`],
            ['УРН', `${cfg.turretDamage}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-0.5">
              <span className="text-[8px] text-slate-600">{k}</span>
              <span className="text-[9px] text-slate-300 font-mono">{v}</span>
            </div>
          ))}
          {cfg.resourceGeneration && (
            <div className="flex items-center gap-0.5">
              <span className="text-[8px] text-slate-600">ДОХ</span>
              <span className="text-[9px] text-yellow-300 font-mono">+{cfg.resourceGeneration}/с</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Multi-unit grid ──────────────────────────────────────────────────────────
function MultiUnitGrid({ units, teamColor }: { units: Unit[]; teamColor: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {units.map(unit => {
        const cfg = UNIT_CONFIGS[unit.type];
        const hp = unit.health / unit.maxHealth;
        const hpColor = hp > 0.6 ? '#22c55e' : hp > 0.3 ? '#eab308' : '#ef4444';
        return (
          <WithTooltip
            key={unit.id}
            className="relative"
            info={{
              title: cfg.name,
              color: teamColor,
              lines: [
                `HP: ${Math.floor(unit.health)}/${unit.maxHealth}`,
                `Атака: ${Math.floor(unit.damage * unit.squadSize)} | Дальн.: ${Math.floor(unit.range)}`,
                cfg.isMelee ? 'Ближний бой' : 'Дальний бой',
              ],
            }}
          >
            <div
              className="flex flex-col items-center justify-center rounded select-none"
              style={{ width: 36, height: 36, background: `${teamColor}14`, border: `1.5px solid ${teamColor}44` }}
            >
              <span className="font-mono text-sm font-bold" style={{ color: teamColor }}>{cfg.ascii}</span>
              <div className="w-[28px] h-1 rounded-sm overflow-hidden bg-slate-800 mt-0.5">
                <div className="h-full" style={{ width: `${hp * 100}%`, background: hpColor }} />
              </div>
            </div>
          </WithTooltip>
        );
      })}
    </div>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────
function ActionBtn({
  label, sublabel, color, disabled, active, onClick, tooltip,
}: {
  label: string; sublabel?: string; color?: string; disabled?: boolean;
  active?: boolean; onClick?: () => void; tooltip?: TooltipInfo;
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative flex flex-col items-center justify-center rounded select-none transition-all duration-100',
        'w-[52px] h-[52px] text-center',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 active:scale-95',
        active ? 'ring-2 ring-offset-1 ring-offset-slate-900' : '',
      ].join(' ')}
      style={{
        background: active ? `${color || '#475569'}33` : `${color || '#475569'}18`,
        border: `1.5px solid ${active ? (color || '#94a3b8') : (color || '#475569') + '55'}`,
        boxShadow: active ? `0 0 10px ${color || '#475569'}44` : undefined,
        color: disabled ? '#475569' : (color || '#94a3b8'),
      }}
    >
      <span className="font-mono font-bold text-sm leading-none">{label}</span>
      {sublabel && <span className="text-[8px] mt-0.5 leading-none opacity-70 font-sans">{sublabel}</span>}
    </button>
  );

  if (!tooltip) return btn;
  return <WithTooltip info={tooltip} className="contents">{btn}</WithTooltip>;
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
function Minimap({ gameState, size = 144 }: { gameState: GameState; size?: number }) {
  const { map, teams } = gameState;
  const scaleX = size / map.width;
  const scaleY = size / map.height;

  return (
    <div style={{ width: size, height: size }} className="relative rounded overflow-hidden border border-slate-700/60"
>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {/* Terrain hints */}
        {map.controlPoints.map(cp => {
          const oc = cp.owner !== null ? teams[cp.owner]?.color : '#eab308';
          return (
            <circle key={cp.id}
              cx={cp.position.x * scaleX} cy={cp.position.y * scaleY}
              r={3} fill={oc} opacity={0.8} />
          );
        })}
        {/* Buildings */}
        {teams.map(team => team.buildings.map(b => {
          const tx = Math.floor(b.position.x / 32);
          const ty = Math.floor(b.position.y / 32);
          return (
            <rect key={b.id}
              x={tx * scaleX - 2} y={ty * scaleY - 2}
              width={4} height={4}
              fill={team.color} opacity={0.9} />
          );
        }))}
        {/* Units */}
        {teams.map(team => team.units.map(u => {
          const tx = u.position.x / 32;
          const ty = u.position.y / 32;
          return (
            <circle key={u.id}
              cx={tx * scaleX} cy={ty * scaleY}
              r={u.isHero ? 2 : 1.2} fill={team.color} opacity={0.75} />
          );
        }))}
      </svg>
      {/* Dark base */}
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1 }}>
        <rect width={size} height={size} fill="#060912" />
      </svg>
    </div>
  );
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────
interface GameUIProps {
  gameState: GameState;
  selectedUnits: Unit[];
  selectedBuildings: Building[];
  inspectedUnit: Unit | null;
  inspectedBuilding: Building | null;
  onProduceUnit: (building: Building, unitType: UnitType) => void;
  onBuildBuilding: (buildingType: BuildingType) => void;
  onAddToSquad: (unit: Unit) => void;
  onLevelUp: (unit: Unit, stat: LevelUpStat) => void;
  onCastAbility: (unit: Unit, abilityId: string) => void;
  abilityTargetMode: { unitId: string; abilityId: string } | null;
}

export default function GameUI({
  gameState,
  selectedUnits,
  selectedBuildings,
  inspectedUnit,
  inspectedBuilding,
  onProduceUnit,
  onBuildBuilding,
  onAddToSquad,
  onLevelUp,
  onCastAbility,
  abilityTargetMode,
}: GameUIProps) {
  const playerTeam = gameState.teams[gameState.playerTeam];
  const fc = FACTION_CONFIGS[playerTeam.faction];

  // Derived selection state
  const hasBuilders = selectedUnits.some(u => isBuilder(u.type));
  const singleUnit = selectedUnits.length === 1 ? selectedUnits[0] : null;
  const singleBuilding = selectedBuildings.length === 1 ? selectedBuildings[0] : null;
  const multi = selectedUnits.length > 1;

  // What to show in left (portrait) pane
  const portraitUnit = singleUnit || inspectedUnit || null;
  const portraitBuilding = !portraitUnit ? (singleBuilding || inspectedBuilding || null) : null;
  const isEnemy = !singleUnit && !singleBuilding && (inspectedUnit !== null || inspectedBuilding !== null);

  // Owner color for portrait
  const portraitTeamId = portraitUnit?.teamId ?? portraitBuilding?.teamId ?? playerTeam.id;
  const portraitTeam = gameState.teams[portraitTeamId];
  const portraitColor = portraitTeam?.color || fc.color;
  const portraitGlow = portraitTeam?.glowColor || fc.glowColor;

  // ── Abilities for center panel ──────────────────────────────────────────────
  const renderAbilities = (unit: Unit) => {
    const now = Date.now();
    return (
      <div>
        <SectionTitle>Способности</SectionTitle>
        <div className="flex gap-1.5">
          {unit.abilities.map((ab, i) => {
            const onCd = now - ab.lastUsed < ab.cooldown;
            const canUse = !onCd && unit.mana >= ab.manaCost;
            const isTarget = abilityTargetMode?.abilityId === ab.id;
            const cdPct = onCd ? ((now - ab.lastUsed) / ab.cooldown) : 1;
            return (
              <WithTooltip
                key={ab.id}
                className="contents"
                info={{
                  title: ab.name,
                  color: canUse ? '#fb923c' : '#475569',
                  hotkey: i === 0 ? 'Q' : 'W',
                  lines: [
                    ab.description,
                    `Эффект: ${ab.effectType === 'damage' ? 'Урон' : ab.effectType === 'heal' ? 'Лечение' : ab.effectType === 'buff' ? 'Усиление' : 'Область'} ${ab.value}`,
                    `Мана: ${ab.manaCost}  |  Откат: ${(ab.cooldown / 1000).toFixed(0)}с`,
                    onCd ? `Перезарядка: ${((ab.cooldown - (now - ab.lastUsed)) / 1000).toFixed(1)}с` : 'Готово!',
                  ],
                }}
              >
                <button
                  onClick={() => canUse && onCastAbility(unit, ab.id)}
                  disabled={!canUse}
                  className={[
                    'relative flex flex-col items-center justify-center rounded overflow-hidden transition-all duration-100',
                    'w-[52px] h-[52px]',
                    !canUse ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125 active:scale-95',
                    isTarget ? 'ring-2 ring-orange-400 animate-pulse' : '',
                  ].join(' ')}
                  style={{
                    background: isTarget ? '#7c2d1220' : '#0f172a',
                    border: `1.5px solid ${canUse ? '#fb923c66' : '#1e293b'}`,
                  }}
                >
                  <span className="font-mono font-bold text-lg" style={{ color: canUse ? '#fb923c' : '#475569' }}>{ab.ascii}</span>
                  <span className="text-[8px] text-slate-500 leading-none mt-0.5">{(ab.manaCost)}м</span>
                  {/* Cooldown overlay */}
                  {onCd && (
                    <div
                      className="absolute inset-0 rounded"
                      style={{ background: `rgba(0,0,0,${0.7 * (1 - cdPct)})`, bottom: `${cdPct * 100}%` }}
                    />
                  )}
                  {/* Hotkey badge */}
                  <div className="absolute top-0.5 right-0.5 text-[7px] text-slate-500 bg-slate-900/80 px-0.5 rounded">
                    {i === 0 ? 'Q' : 'W'}
                  </div>
                </button>
              </WithTooltip>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Level-up panel ──────────────────────────────────────────────────────────
  const renderLevelUp = (unit: Unit) => (
    <div>
      <SectionTitle>Прокачка ({unit.pendingLevelUps})</SectionTitle>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(LEVEL_UP_STAT_NAMES) as LevelUpStat[]).map(stat => (
          <WithTooltip
            key={stat}
            className="contents"
            info={{
              title: LEVEL_UP_STAT_NAMES[stat],
              color: '#eab308',
              lines: [`Повысить: ${LEVEL_UP_STAT_NAMES[stat]}`, 'Нажмите для подтверждения'],
            }}
          >
            <button
              onClick={() => onLevelUp(unit, stat)}
              className="px-2 py-1 rounded text-[10px] font-bold transition-all hover:brightness-125 active:scale-95"
              style={{
                background: '#78350f22',
                border: '1.5px solid #d9770655',
                color: '#fbbf24',
              }}
            >
              {LEVEL_UP_STAT_NAMES[stat]}
            </button>
          </WithTooltip>
        ))}
      </div>
    </div>
  );

  // ── Production queue ────────────────────────────────────────────────────────
  const renderProductionQueue = (building: Building) => {
    if (!building.producing && building.productionQueue.length === 0) return null;
    return (
      <div>
        <SectionTitle>Производство</SectionTitle>
        <div className="flex gap-1 items-center">
          {building.producing && (
            <WithTooltip
              className="contents"
              info={{
                title: UNIT_CONFIGS[building.producing].name,
                color: '#eab308',
                lines: ['Производится сейчас'],
              }}
            >
              <div className="relative w-10 h-10 rounded" style={{ background: '#78350f22', border: '1.5px solid #d9770655' }}>
                <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-yellow-400 text-base">
                  {UNIT_CONFIGS[building.producing].ascii}
                </span>
                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#eab30833" strokeWidth="3" />
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#eab308" strokeWidth="3"
                    strokeDasharray={`${113 * (building.productionProgress / (building.productionTime * 1000))} 113`} />
                </svg>
              </div>
            </WithTooltip>
          )}
          {building.productionQueue.map((ut, i) => (
            <WithTooltip
              key={i}
              className="contents"
              info={{ title: UNIT_CONFIGS[ut].name, color: '#94a3b8', lines: ['В очереди'] }}
            >
              <div className="w-8 h-8 rounded flex items-center justify-center"
                style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <span className="font-mono text-slate-400 text-sm">{UNIT_CONFIGS[ut].ascii}</span>
              </div>
            </WithTooltip>
          ))}
        </div>
      </div>
    );
  };

  // ── Unit-train buttons (when building selected) ─────────────────────────────
  const renderTrainButtons = (building: Building) => {
    const cfg = BUILDING_CONFIGS[building.type];
    if (!cfg.canProduce?.length) return null;
    return (
      <div>
        <SectionTitle>Нанять</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {cfg.canProduce.map(ut => {
            const uc = UNIT_CONFIGS[ut];
            const canAfford = playerTeam.resources >= uc.cost;
            return (
              <WithTooltip
                key={ut}
                className="contents"
                info={{
                  title: uc.name,
                  color: canAfford ? fc.color : '#475569',
                  cost: uc.cost,
                  lines: [
                    uc.description,
                    `HP: ${uc.health}  Атака: ${uc.damage}  Дальн.: ${uc.range}`,
                    uc.isMelee ? 'Ближний бой' : 'Дальний бой',
                    uc.isHero ? '-- ГЕРОЙ --' : `Отряд: 1-${uc.maxSquadSize}`,
                    `Время: ${uc.buildTime}с`,
                  ],
                }}
              >
                <ActionBtn
                  label={uc.ascii}
                  sublabel={`${uc.cost}`}
                  color={canAfford ? fc.color : undefined}
                  disabled={!canAfford}
                  onClick={() => canAfford && onProduceUnit(building, ut)}
                />
              </WithTooltip>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Build buttons (when builder selected) ──────────────────────────────────
  const renderBuildButtons = () => (
    <div>
      <SectionTitle>Построить</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {fc.buildings.map(bt => {
          const bc = BUILDING_CONFIGS[bt];
          const canAfford = playerTeam.resources >= bc.cost;
          return (
            <WithTooltip
              key={bt}
              className="contents"
              info={{
                title: bc.name,
                color: canAfford ? fc.color : '#475569',
                cost: bc.cost,
                lines: [
                  bc.description,
                  `HP: ${bc.health}`,
                  bc.isTurret ? `Турель: Урон ${bc.turretDamage} | Дальн. ${bc.turretRange}` : '',
                  bc.resourceGeneration ? `Доход: +${bc.resourceGeneration}/с` : '',
                  bc.canProduce ? `Нанимает: ${bc.canProduce.map(u => UNIT_CONFIGS[u].name).join(', ')}` : '',
                  `Время: ${bc.buildTime}с`,
                ].filter(Boolean),
              }}
            >
              <ActionBtn
                label={bc.ascii[1] || bc.ascii[0]}
                sublabel={`${bc.cost}`}
                color={canAfford ? fc.color : undefined}
                disabled={!canAfford}
                onClick={() => canAfford && onBuildBuilding(bt)}
              />
            </WithTooltip>
          );
        })}
      </div>
    </div>
  );

  // ── Squad expand ────────────────────────────────────────────────────────────
  const renderSquadExpand = (unit: Unit) => {
    if (unit.maxSquadSize <= 1) return null;
    const canExpand = unit.squadSize < unit.maxSquadSize;
    const cost = 10;
    const canAfford = playerTeam.resources >= cost;
    return (
      <div>
        <SectionTitle>Отряд {unit.squadSize}/{unit.maxSquadSize}</SectionTitle>
        <ActionBtn
          label="+1"
          sublabel={`${cost} зол`}
          color={canExpand && canAfford ? '#22c55e' : undefined}
          disabled={!canExpand || !canAfford}
          onClick={() => onAddToSquad(unit)}
          tooltip={{
            title: 'Пополнить отряд',
            color: '#22c55e',
            cost,
            lines: [`Добавить солдата в отряд`, `Текущий: ${unit.squadSize}/${unit.maxSquadSize}`],
          }}
        />
      </div>
    );
  };

  // ─── Center action panel content ─────────────────────────────────────────────
  const renderCenterPanel = () => {
    if (hasBuilders) {
      const builder = selectedUnits.find(u => isBuilder(u.type))!;
      return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
          {renderBuildButtons()}
          {renderSquadExpand(builder)}
        </div>
      );
    }
    if (singleBuilding) {
      return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
          {renderProductionQueue(singleBuilding)}
          {renderTrainButtons(singleBuilding)}
        </div>
      );
    }
    if (singleUnit) {
      return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
          {singleUnit.isHero && singleUnit.abilities.length > 0 && renderAbilities(singleUnit)}
          {singleUnit.pendingLevelUps > 0 && renderLevelUp(singleUnit)}
          {renderSquadExpand(singleUnit)}
          {!singleUnit.isHero && !hasBuilders && (
            <div>
              <SectionTitle>Команды</SectionTitle>
              <div className="flex gap-1.5">
                <ActionBtn label="A" sublabel="Атака" color="#ef4444"
                  tooltip={{ title: 'Атака-движение', hotkey: 'A', color: '#ef4444', lines: ['Двигаться и атаковать врагов по пути'] }} />
                <ActionBtn label="H" sublabel="Стоп" color="#f97316"
                  tooltip={{ title: 'Удержать позицию', hotkey: 'H', color: '#f97316', lines: ['Держать позицию, не преследовать'] }} />
                <ActionBtn label="S" sublabel="Стоп" color="#94a3b8"
                  tooltip={{ title: 'Остановиться', hotkey: 'S', color: '#94a3b8', lines: ['Отменить все команды'] }} />
              </div>
            </div>
          )}
        </div>
      );
    }
    if (multi) {
      return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
          <div>
            <SectionTitle>Выбрано юнитов: {selectedUnits.length}</SectionTitle>
            <MultiUnitGrid units={selectedUnits} teamColor={fc.color} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 text-[10px] text-center gap-0.5 select-none">
        <div className="font-mono text-2xl" style={{ color: fc.color }}>[ ]</div>
        <div>Выберите юнита или здание</div>
        <div className="mt-2 text-[9px] space-y-0.5 text-slate-700">
          <div>ЛКМ — выбор | ПКМ — движение/атака</div>
          <div>A — атака-движение | H — удержать</div>
          <div>Пробел — центр | ESC — меню</div>
        </div>
      </div>
    );
  };

  // ─── Top info bar in portrait pane ──────────────────────────────────────────
  const renderPortraitPane = () => {
    if (isEnemy) {
      const teamLabel = portraitTeam ? FACTION_CONFIGS[portraitTeam.faction as FactionType].name : '?';
      return (
        <div className="flex flex-col h-full">
          <div className="text-[8px] text-red-400 font-bold uppercase tracking-widest mb-1">
            Разведка · {teamLabel}
          </div>
          {portraitUnit && (
            <UnitInfoPanel unit={portraitUnit} teamColor={portraitColor} glowColor={portraitGlow} />
          )}
          {portraitBuilding && !portraitUnit && (
            <BuildingInfoPanel building={portraitBuilding} teamColor={portraitColor} glowColor={portraitGlow} />
          )}
        </div>
      );
    }
    if (portraitUnit) return <UnitInfoPanel unit={portraitUnit} teamColor={portraitColor} glowColor={portraitGlow} />;
    if (portraitBuilding) return <BuildingInfoPanel building={portraitBuilding} teamColor={portraitColor} glowColor={portraitGlow} />;
    // Faction emblem when nothing selected
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1 select-none">
        <Portrait lines={[' ' + fc.symbol + ' ', '/' + fc.symbol + fc.symbol + '\\', '\\' + fc.symbol + fc.symbol + '/']} color={fc.color} size={72} />
        <div className="text-[10px] font-bold" style={{ color: fc.color }}>{fc.name}</div>
        <div className="text-[9px] text-slate-600 text-center">{fc.description}</div>
      </div>
    );
  };

  // ─── Score strip ─────────────────────────────────────────────────────────────
  const renderScoreStrip = () => (
    <div className="flex items-center gap-2 px-2 h-full">
      {gameState.teams.map(team => {
        const tfc = FACTION_CONFIGS[team.faction as FactionType];
        const pts = gameState.map.controlPoints.filter(cp => cp.owner === team.id).length;
        return (
          <WithTooltip
            key={team.id}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded"
            info={{
              title: tfc.name,
              color: team.color,
              lines: [
                team.defeated ? 'ПОБЕЖДЁН' : 'Активен',
                `Юниты: ${team.units.length} | Здания: ${team.buildings.length}`,
                `Точки: ${pts} | Ресурсы: ${Math.floor(team.resources)}`,
              ],
            }}
            style={{ background: `${team.color}18`, border: `1px solid ${team.color}33` }}
          >
            <span className="font-mono font-bold text-xs" style={{ color: team.color }}>{tfc.symbol}</span>
            <span className="text-[9px]" style={{ color: team.color }}>{pts}</span>
            {team.defeated && <span className="text-[8px] text-red-500 font-bold ml-0.5">✗</span>}
          </WithTooltip>
        );
      })}
    </div>
  );

  // ─── Assemble HUD ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full select-none" style={{ height: '100%' }}>

      {/* ── Top resource bar ── */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: 32,
          background: 'linear-gradient(to bottom, #0a0f1a, #060912)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Faction + resources */}
        <div className="flex items-center gap-3">
          <WithTooltip
            className="flex items-center gap-1.5"
            info={{
              title: fc.name,
              color: fc.color,
              lines: [fc.description, `Главное здание: ${BUILDING_CONFIGS[FACTION_CONFIGS[playerTeam.faction].mainBuilding].name}`],
            }}
          >
            <span className="font-mono font-bold text-base" style={{ color: fc.color }}>{fc.symbol}</span>
            <span className="text-xs font-bold" style={{ color: fc.color }}>{fc.name}</span>
          </WithTooltip>
          <div className="w-px h-4 bg-slate-700" />
          <WithTooltip
            className="flex items-center gap-1"
            info={{ title: 'Ресурсы', color: '#eab308', lines: ['Золото для найма и строительства'] }}
          >
            <span className="text-[10px] text-slate-500 font-mono">ЗОЛОТО</span>
            <span className="text-sm font-bold font-mono text-yellow-400">{Math.floor(playerTeam.resources)}</span>
          </WithTooltip>
          <WithTooltip
            className="flex items-center gap-1"
            info={{ title: 'Здания', color: '#94a3b8', lines: ['Количество построенных зданий'] }}
          >
            <span className="text-[10px] text-slate-500 font-mono">ЗДНЙ</span>
            <span className="text-sm font-bold font-mono text-slate-300">{playerTeam.buildings.length}</span>
          </WithTooltip>
          <WithTooltip
            className="flex items-center gap-1"
            info={{ title: 'Армия', color: '#94a3b8', lines: ['Количество юнитов в армии'] }}
          >
            <span className="text-[10px] text-slate-500 font-mono">АРМЯ</span>
            <span className="text-sm font-bold font-mono text-slate-300">{playerTeam.units.length}</span>
          </WithTooltip>
        </div>

        {/* Game time + control points */}
        <div className="flex items-center gap-3">
          <WithTooltip
            className="flex items-center gap-1"
            info={{ title: 'Время игры', color: '#94a3b8', lines: ['Прошедшее время с начала партии'] }}
          >
            <span className="text-[10px] text-slate-600 font-mono">ВРЕМЯ</span>
            <span className="text-xs font-mono text-slate-300">
              {String(Math.floor(gameState.gameTime / 60000)).padStart(2, '0')}:{String(Math.floor((gameState.gameTime % 60000) / 1000)).padStart(2, '0')}
            </span>
          </WithTooltip>
          <div className="w-px h-4 bg-slate-700" />
          {renderScoreStrip()}
        </div>
      </div>

      {/* ── Bottom 3-pane HUD ── */}
      <div
        className="flex flex-1 min-h-0"
        style={{
          background: 'linear-gradient(to top, #040609, #07090f)',
          borderTop: '1px solid #1e2a3a',
        }}
      >
        {/* Left: portrait + unit stats */}
        <div
          className="flex flex-col justify-center px-3 py-2 shrink-0"
          style={{
            width: 260,
            borderRight: '1px solid #1e2a3a',
            background: 'linear-gradient(135deg, #07090f 0%, #0a0f1a 100%)',
          }}
        >
          {renderPortraitPane()}
        </div>

        {/* Center: actions / commands / production */}
        <div className="flex-1 flex flex-col justify-center px-3 py-2 min-w-0">
          {renderCenterPanel()}
        </div>

        {/* Right: minimap + team scores */}
        <div
          className="flex flex-col items-center justify-between py-2 px-2 shrink-0 gap-1"
          style={{
            width: 168,
            borderLeft: '1px solid #1e2a3a',
            background: 'linear-gradient(225deg, #07090f 0%, #0a0f1a 100%)',
          }}
        >
          <div className="text-[8px] text-slate-600 uppercase tracking-widest self-start">Карта</div>
          <Minimap gameState={gameState} size={144} />
          <div className="text-[8px] text-slate-600 uppercase tracking-widest self-start mt-1">Команды</div>
          <div className="flex flex-col gap-0.5 w-full">
            {gameState.teams.map(team => {
              const tfc = FACTION_CONFIGS[team.faction as FactionType];
              const pts = gameState.map.controlPoints.filter(cp => cp.owner === team.id).length;
              return (
                <div key={team.id} className="flex items-center justify-between px-1.5 py-0.5 rounded"
                  style={{ background: `${team.color}12`, border: `1px solid ${team.color}28` }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color: team.color }}>{tfc.symbol} {tfc.name}</span>
                  <span className="text-[9px] text-slate-500">{team.defeated ? 'X' : `${team.units.length}u ${pts}pt`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
