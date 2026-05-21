import { UnitConfig, UnitType } from '../types/game';

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  // === ANGELS ===
  servant: {
    name: 'Служитель',
    cost: 15, health: 100, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 80, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: '✝', description: 'Строитель и ремонтник', isHero: false,
  },
  priest: {
    name: 'Священник',
    cost: 40, health: 120, mana: 30, damage: 15, range: 150,
    attackSpeed: 1.2, movementSpeed: 70, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: '†', description: 'Слабый начальный отряд', isHero: false,
  },
  angel: {
    name: 'Ангел',
    cost: 72, health: 960, mana: 50, damage: 120, range: 200,
    attackSpeed: 1.0, movementSpeed: 90, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: '☨', description: 'Мощный одиночный юнит', isHero: false,
  },
  paladin: {
    name: 'Паладин',
    cost: 80, health: 180, mana: 40, damage: 22.5, range: 40,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.1,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: '⚔', description: 'Ближний бой', isHero: false,
  },
  seraphim: {
    name: 'Серафим Света',
    cost: 100, health: 150, mana: 60, damage: 40, range: 180,
    attackSpeed: 1.1, movementSpeed: 85, evasion: 0.12,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: '✦', description: 'Дальний бой молниями', isHero: false,
  },
  archangel: {
    name: 'Архангел',
    cost: 200, health: 800, mana: 150, damage: 80, range: 160,
    attackSpeed: 0.8, movementSpeed: 100, evasion: 0.2,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: '☼', description: 'Герой Ангелов', isHero: true,
  },

  // === DEMONS ===
  slave: {
    name: 'Раб',
    cost: 15, health: 100, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 80, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: '⛧', description: 'Строитель и ремонтник', isHero: false,
  },
  cultist: {
    name: 'Культист',
    cost: 40, health: 120, mana: 30, damage: 15, range: 150,
    attackSpeed: 1.2, movementSpeed: 70, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: '⚝', description: 'Слабый начальный отряд', isHero: false,
  },
  demon: {
    name: 'Демон',
    cost: 72, health: 960, mana: 50, damage: 120, range: 200,
    attackSpeed: 1.0, movementSpeed: 90, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: '⛤', description: 'Мощный одиночный юнит', isHero: false,
  },
  hellknight: {
    name: 'Рыцарь Ада',
    cost: 80, health: 180, mana: 40, damage: 22.5, range: 40,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.1,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: '⚡', description: 'Ближний бой', isHero: false,
  },
  infernal: {
    name: 'Инфернал',
    cost: 100, health: 150, mana: 60, damage: 40, range: 180,
    attackSpeed: 1.1, movementSpeed: 85, evasion: 0.12,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: '♆', description: 'Дальний бой огнем', isHero: false,
  },
  archdemon: {
    name: 'Архидемон',
    cost: 200, health: 850, mana: 150, damage: 90, range: 140,
    attackSpeed: 0.8, movementSpeed: 95, evasion: 0.2,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: '☆', description: 'Герой Демонов', isHero: true,
  },

  // === UNDEAD ===
  skeleton: {
    name: 'Скелет',
    cost: 15, health: 80, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 75, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: '†', description: 'Строитель и ремонтник', isHero: false,
  },
  zombie: {
    name: 'Зомби',
    cost: 40, health: 150, mana: 0, damage: 18, range: 30,
    attackSpeed: 1.4, movementSpeed: 50, evasion: 0.03,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 'U', description: 'Медленный ближний бой', isHero: false,
  },
  lich: {
    name: 'Лич',
    cost: 72, health: 500, mana: 100, damage: 60, range: 200,
    attackSpeed: 1.0, movementSpeed: 60, evasion: 0.1,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: '☠', description: 'Маг нежити', isHero: false,
  },
  deathknight: {
    name: 'Рыцарь Смерти',
    cost: 80, health: 200, mana: 40, damage: 25, range: 40,
    attackSpeed: 1.0, movementSpeed: 80, evasion: 0.12,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: '♱', description: 'Ближний бой', isHero: false,
  },
  banshee: {
    name: 'Банши',
    cost: 100, health: 120, mana: 80, damage: 35, range: 180,
    attackSpeed: 1.1, movementSpeed: 90, evasion: 0.18,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: '☤', description: 'Дальний бой', isHero: false,
  },
  overlord: {
    name: 'Владыка Смерти',
    cost: 200, health: 900, mana: 150, damage: 75, range: 160,
    attackSpeed: 0.8, movementSpeed: 70, evasion: 0.15,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: '☠', description: 'Герой Нежити', isHero: true,
  },

  // === MACHINES ===
  drone: {
    name: 'Дрон',
    cost: 15, health: 120, mana: 0, damage: 5, range: 30,
    attackSpeed: 1.5, movementSpeed: 90, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 10,
    ascii: '⚙', description: 'Строитель и ремонтник', isHero: false,
  },
  soldier: {
    name: 'Солдат',
    cost: 40, health: 130, mana: 0, damage: 18, range: 160,
    attackSpeed: 1.0, movementSpeed: 75, evasion: 0.08,
    initialSquadSize: 1, maxSquadSize: 4, buildTime: 15,
    ascii: 'M', description: 'Стрелковый отряд', isHero: false,
  },
  mech: {
    name: 'Мех',
    cost: 72, health: 800, mana: 0, damage: 100, range: 150,
    attackSpeed: 1.2, movementSpeed: 60, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 25,
    ascii: '▣', description: 'Тяжелый мех', isHero: false,
  },
  tank: {
    name: 'Танк',
    cost: 80, health: 250, mana: 0, damage: 30, range: 50,
    attackSpeed: 1.0, movementSpeed: 55, evasion: 0.03,
    initialSquadSize: 4, maxSquadSize: 7, buildTime: 20,
    ascii: '▤', description: 'Тяжелый ближний бой', isHero: false,
  },
  artillery: {
    name: 'Артиллерия',
    cost: 100, health: 100, mana: 0, damage: 50, range: 250,
    attackSpeed: 1.5, movementSpeed: 40, evasion: 0.02,
    initialSquadSize: 3, maxSquadSize: 5, buildTime: 22,
    ascii: '◈', description: 'Дальний обстрел', isHero: false,
  },
  titan: {
    name: 'Титан',
    cost: 200, health: 1000, mana: 0, damage: 95, range: 120,
    attackSpeed: 0.9, movementSpeed: 50, evasion: 0.05,
    initialSquadSize: 1, maxSquadSize: 1, buildTime: 45,
    ascii: '⬡', description: 'Герой Машин', isHero: true,
  },
};
