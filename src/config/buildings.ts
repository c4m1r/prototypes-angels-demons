import { BuildingConfig, BuildingType } from '../types/game';

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  // === ANGELS ===
  heaven_temple: {
    name: 'Храм Небес', cost: 300, health: 400, buildTime: 30,
    resourceGeneration: 1, canProduce: ['servant', 'priest', 'angel', 'archangel'],
    ascii: ['/---\\', '| + |', '\\---/'],
    width: 5, height: 3, description: 'Главное здание ангелов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  heart_heaven: {
    name: 'Сердце Небес', cost: 150, health: 300, buildTime: 25,
    canProduce: ['paladin', 'seraphim'],
    ascii: ['/---\\', '| * |', '\\---/'],
    width: 5, height: 3, description: 'Элитные войска',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  holy_altar: {
    name: 'Святой Алтарь', cost: 80, health: 200, buildTime: 15,
    resourceGeneration: 3,
    ascii: ['/-\\', '|+|', '\\-/'],
    width: 3, height: 3, description: 'Генератор ресурсов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  holy_relic: {
    name: 'Святые Мощи', cost: 70, health: 250, buildTime: 12,
    ascii: ['+', '|', '+'],
    width: 1, height: 3, description: 'Оборонная турель',
    isTurret: true, turretRange: 180, turretDamage: 25, turretAttackSpeed: 1.2,
  },
  enlightenment_altar: {
    name: 'Алтарь Просвещения', cost: 130, health: 280, buildTime: 20,
    ascii: ['/==\\', '|++|', '\\==/'],
    width: 4, height: 3, description: 'Центр исследований',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },

  // === DEMONS ===
  hell_sanctuary: {
    name: 'Пристанище Ада', cost: 300, health: 400, buildTime: 30,
    resourceGeneration: 1, canProduce: ['slave', 'cultist', 'demon', 'archdemon'],
    ascii: ['/---\\', '| # |', '\\---/'],
    width: 5, height: 3, description: 'Главное здание демонов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  heart_hell: {
    name: 'Сердце Ада', cost: 150, health: 300, buildTime: 25,
    canProduce: ['hellknight', 'infernal'],
    ascii: ['/---\\', '| @ |', '\\---/'],
    width: 5, height: 3, description: 'Элитные войска',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  dark_altar: {
    name: 'Темный Алтарь', cost: 80, health: 200, buildTime: 15,
    resourceGeneration: 3,
    ascii: ['/-\\', '|#|', '\\-/'],
    width: 3, height: 3, description: 'Генератор ресурсов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  dark_relic: {
    name: 'Темные Реликвии', cost: 70, health: 250, buildTime: 12,
    ascii: ['#', '|', '#'],
    width: 1, height: 3, description: 'Оборонная турель',
    isTurret: true, turretRange: 180, turretDamage: 25, turretAttackSpeed: 1.2,
  },
  corruption_altar: {
    name: 'Алтарь Искажения', cost: 130, health: 280, buildTime: 20,
    ascii: ['/==\\', '|##|', '\\==/'],
    width: 4, height: 3, description: 'Центр исследований',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },

  // === UNDEAD ===
  necropolis: {
    name: 'Некрополь', cost: 300, health: 400, buildTime: 30,
    resourceGeneration: 1, canProduce: ['skeleton', 'zombie', 'lich', 'overlord'],
    ascii: ['/---\\', '| & |', '\\---/'],
    width: 5, height: 3, description: 'Главное здание нежити',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  bone_pit: {
    name: 'Костяная Яма', cost: 150, health: 300, buildTime: 25,
    canProduce: ['deathknight', 'banshee'],
    ascii: ['/---\\', '| % |', '\\---/'],
    width: 5, height: 3, description: 'Элитные войска',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  soul_well: {
    name: 'Колодец Душ', cost: 80, health: 200, buildTime: 15,
    resourceGeneration: 3,
    ascii: ['/-\\', '|&|', '\\-/'],
    width: 3, height: 3, description: 'Генератор ресурсов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  grave_tower: {
    name: 'Могильная Башня', cost: 70, health: 250, buildTime: 12,
    ascii: ['&', '|', '&'],
    width: 1, height: 3, description: 'Оборонная турель',
    isTurret: true, turretRange: 180, turretDamage: 25, turretAttackSpeed: 1.2,
  },
  crypt_altar: {
    name: 'Алтарь Крипты', cost: 130, health: 280, buildTime: 20,
    ascii: ['/==\\', '|&&|', '\\==/'],
    width: 4, height: 3, description: 'Центр исследований',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },

  // === MACHINES ===
  factory: {
    name: 'Фабрика', cost: 300, health: 500, buildTime: 30,
    resourceGeneration: 1, canProduce: ['drone', 'soldier', 'mech', 'titan'],
    ascii: ['/---\\', '| O |', '\\---/'],
    width: 5, height: 3, description: 'Главное здание машин',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  barracks_m: {
    name: 'Казармы', cost: 150, health: 350, buildTime: 25,
    canProduce: ['tank', 'artillery'],
    ascii: ['/---\\', '| = |', '\\---/'],
    width: 5, height: 3, description: 'Тяжелые войска',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  power_plant: {
    name: 'Электростанция', cost: 80, health: 200, buildTime: 15,
    resourceGeneration: 3,
    ascii: ['/-\\', '|O|', '\\-/'],
    width: 3, height: 3, description: 'Генератор ресурсов',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
  turret_m: {
    name: 'Турель', cost: 70, health: 250, buildTime: 12,
    ascii: ['=', '|', '='],
    width: 1, height: 3, description: 'Оборонная турель',
    isTurret: true, turretRange: 200, turretDamage: 30, turretAttackSpeed: 1.0,
  },
  tech_lab: {
    name: 'Технолаборатория', cost: 130, health: 280, buildTime: 20,
    ascii: ['/==\\', '|OO|', '\\==/'],
    width: 4, height: 3, description: 'Центр исследований',
    isTurret: false, turretRange: 0, turretDamage: 0, turretAttackSpeed: 0,
  },
};
