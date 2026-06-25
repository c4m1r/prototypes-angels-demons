import { UnitConfig, UnitType, AbilityConfig } from '../types/game';

const HERO_ABILITIES: Record<string, AbilityConfig[]> = {
  archangel: [
    { id: 'divine_light', name: 'Божественный Свет', manaCost: 40, cooldown: 8000, range: 200, effectType: 'heal', value: 150, description: 'Лечит союзников в области', ascii: '+' },
    { id: 'smite', name: 'Кара', manaCost: 60, cooldown: 12000, range: 180, effectType: 'damage', value: 120, description: 'Наносит урон в области', ascii: '*' },
  ],
  archdemon: [
    { id: 'hellfire', name: 'Адский Огонь', manaCost: 50, cooldown: 10000, range: 180, effectType: 'aoe', value: 100, description: 'Поджигает область', ascii: '#' },
    { id: 'dark_pact', name: 'Темный Договор', manaCost: 30, cooldown: 8000, range: 100, effectType: 'buff', value: 30, description: 'Усиливает урон союзников', ascii: '^' },
  ],
  overlord: [
    { id: 'death_coil', name: 'Смертельная Спираль', manaCost: 50, cooldown: 10000, range: 200, effectType: 'damage', value: 110, description: 'Снаряд смерти', ascii: '@' },
    { id: 'raise_dead', name: 'Воскрешение', manaCost: 60, cooldown: 15000, range: 100, effectType: 'heal', value: 200, description: 'Лечит нежить в области', ascii: '+' },
  ],
  titan: [
    { id: 'overcharge', name: 'Перегрузка', manaCost: 40, cooldown: 8000, range: 150, effectType: 'aoe', value: 80, description: 'Электрический разряд', ascii: '#' },
    { id: 'repair', name: 'Ремонт', manaCost: 30, cooldown: 6000, range: 120, effectType: 'heal', value: 100, description: 'Чинит здания и мехов', ascii: '%' },
  ],
};

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  // === ANGELS ===
  servant: {
    name: 'Служитель', cost: 15, health: 100, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 80, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: 'T', description: 'Строитель и ремонтник', isHero: false, isMelee: true, abilities: [],
    portrait: [' +--+ ', ' |TT| ', ' +--+ ', '  ||  '],
  },
  priest: {
    name: 'Священник', cost: 40, health: 120, mana: 30, damage: 15, range: 150,
    attackSpeed: 1.2, movementSpeed: 70, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 't', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: [' +--+ ', ' |tt| ', ' |tt| ', ' +--+ '],
  },
  angel: {
    name: 'Ангел', cost: 72, health: 960, mana: 50, damage: 120, range: 200,
    attackSpeed: 1.0, movementSpeed: 90, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: 'A', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| AA |', '| AA |', '\\====/'],
  },
  paladin: {
    name: 'Паладин', cost: 80, health: 180, mana: 40, damage: 22.5, range: 40,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.1,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: 'P', description: 'Ближний бой', isHero: false, isMelee: true, abilities: [],
    portrait: ['/====\\', '| PP |', '| PP |', '\\====/'],
  },
  seraphim: {
    name: 'Серафим Света', cost: 100, health: 150, mana: 60, damage: 40, range: 180,
    attackSpeed: 1.1, movementSpeed: 85, evasion: 0.12,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: 'S', description: 'Дальний бой молниями', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| SS |', '| SS |', '\\====/'],
  },
  archangel: {
    name: 'Архангел', cost: 200, health: 800, mana: 150, damage: 80, range: 160,
    attackSpeed: 0.8, movementSpeed: 100, evasion: 0.2,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: 'X', description: 'Герой Ангелов', isHero: true, isMelee: false,
    abilities: HERO_ABILITIES.archangel,
    portrait: ['/||||\\', '| XX |', '| XX |', '\\====/'],
  },

  // === DEMONS ===
  slave: {
    name: 'Раб', cost: 15, health: 100, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 80, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: 'w', description: 'Строитель и ремонтник', isHero: false, isMelee: true, abilities: [],
    portrait: [' +--+ ', ' |ww| ', ' +--+ ', '  ||  '],
  },
  cultist: {
    name: 'Культист', cost: 40, health: 120, mana: 30, damage: 15, range: 150,
    attackSpeed: 1.2, movementSpeed: 70, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 'c', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: [' +--+ ', ' |cc| ', ' |cc| ', ' +--+ '],
  },
  demon: {
    name: 'Демон', cost: 72, health: 960, mana: 50, damage: 120, range: 200,
    attackSpeed: 1.0, movementSpeed: 90, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: 'D', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| DD |', '| DD |', '\\====/'],
  },
  hellknight: {
    name: 'Рыцарь Ада', cost: 80, health: 180, mana: 40, damage: 22.5, range: 40,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.1,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: 'H', description: 'Ближний бой', isHero: false, isMelee: true, abilities: [],
    portrait: ['/====\\', '| HH |', '| HH |', '\\====/'],
  },
  infernal: {
    name: 'Инфернал', cost: 100, health: 150, mana: 60, damage: 40, range: 180,
    attackSpeed: 1.1, movementSpeed: 85, evasion: 0.12,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: 'I', description: 'Дальний бой огнем', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| II |', '| II |', '\\====/'],
  },
  archdemon: {
    name: 'Архидемон', cost: 200, health: 850, mana: 150, damage: 90, range: 140,
    attackSpeed: 0.8, movementSpeed: 95, evasion: 0.2,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: 'Y', description: 'Герой Демонов', isHero: true, isMelee: false,
    abilities: HERO_ABILITIES.archdemon,
    portrait: ['/||||\\', '| YY |', '| YY |', '\\====/'],
  },

  // === UNDEAD ===
  skeleton: {
    name: 'Скелет', cost: 15, health: 80, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 75, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: 'k', description: 'Строитель и ремонтник', isHero: false, isMelee: true, abilities: [],
    portrait: [' +--+ ', ' |kk| ', ' +--+ ', '  ||  '],
  },
  zombie: {
    name: 'Зомби', cost: 40, health: 150, mana: 0, damage: 18, range: 30,
    attackSpeed: 1.4, movementSpeed: 50, evasion: 0.03,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 'Z', description: 'Ближний бой', isHero: false, isMelee: true, abilities: [],
    portrait: [' +--+ ', ' |ZZ| ', ' |ZZ| ', ' +--+ '],
  },
  lich: {
    name: 'Лич', cost: 72, health: 500, mana: 100, damage: 60, range: 200,
    attackSpeed: 1.0, movementSpeed: 60, evasion: 0.1,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: 'L', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| LL |', '| LL |', '\\====/'],
  },
  deathknight: {
    name: 'Рыцарь Смерти', cost: 80, health: 200, mana: 40, damage: 25, range: 40,
    attackSpeed: 1.0, movementSpeed: 80, evasion: 0.12,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: 'K', description: 'Ближний бой', isHero: false, isMelee: true, abilities: [],
    portrait: ['/====\\', '| KK |', '| KK |', '\\====/'],
  },
  banshee: {
    name: 'Банши', cost: 100, health: 120, mana: 80, damage: 35, range: 180,
    attackSpeed: 1.1, movementSpeed: 90, evasion: 0.18,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: 'B', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| BB |', '| BB |', '\\====/'],
  },
  overlord: {
    name: 'Владыка Смерти', cost: 200, health: 900, mana: 150, damage: 75, range: 160,
    attackSpeed: 0.8, movementSpeed: 70, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: 'V', description: 'Герой Нежити', isHero: true, isMelee: false,
    abilities: HERO_ABILITIES.overlord,
    portrait: ['/||||\\', '| VV |', '| VV |', '\\====/'],
  },

  // === MACHINES ===
  drone: {
    name: 'Дрон', cost: 15, health: 120, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 90, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: 'o', description: 'Строитель и ремонтник', isHero: false, isMelee: true, abilities: [],
    portrait: [' +--+ ', ' |oo| ', ' +--+ ', '  ||  '],
  },
  soldier: {
    name: 'Солдат', cost: 40, health: 130, mana: 0, damage: 18, range: 160,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 'M', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: [' +--+ ', ' |MM| ', ' |MM| ', ' +--+ '],
  },
  mech: {
    name: 'Мех', cost: 72, health: 800, mana: 0, damage: 100, range: 150,
    attackSpeed: 1.2, movementSpeed: 60, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: 'E', description: 'Дальний бой', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| EE |', '| EE |', '\\====/'],
  },
  tank: {
    name: 'Танк', cost: 80, health: 250, mana: 0, damage: 30, range: 40,
    attackSpeed: 1.0, movementSpeed: 55, evasion: 0.03,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: 'N', description: 'Ближний бой', isHero: false, isMelee: true, abilities: [],
    portrait: ['/====\\', '| NN |', '| NN |', '\\====/'],
  },
  artillery: {
    name: 'Артиллерия', cost: 100, health: 100, mana: 0, damage: 50, range: 250,
    attackSpeed: 1.5, movementSpeed: 40, evasion: 0.02,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: 'R', description: 'Дальний обстрел', isHero: false, isMelee: false, abilities: [],
    portrait: ['/====\\', '| RR |', '| RR |', '\\====/'],
  },
  titan: {
    name: 'Титан', cost: 200, health: 1000, mana: 0, damage: 95, range: 120,
    attackSpeed: 0.9, movementSpeed: 50, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: 'G', description: 'Герой Машин', isHero: true, isMelee: false,
    abilities: HERO_ABILITIES.titan,
    portrait: ['/||||\\', '| GG |', '| GG |', '\\====/'],
  },
};
