
import { Skin, SkillStats } from "./types";

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

export const PLAYER_SIZE = 24;
export const PLAYER_SPEED = 5;
export const GRAVITY = 0.4;
export const JUMP_FORCE = -8;
export const TRAMPOLINE_FORCE = -11; 
export const MAX_FALL_SPEED = 12;

export const PLATFORM_WIDTH = 100;
export const PLATFORM_HEIGHT = 16;
export const PLATFORM_GAP_MIN = 80;
export const PLATFORM_GAP_MAX = 110;
export const PLATFORM_SPEED_BASE = 1.5; 
export const PLATFORM_SPEED_INCREASE = 0.001;

export const CONVEYOR_SPEED = 3;

export const CEILING_DAMAGE = 5;
export const SPIKE_DAMAGE = 20;

// Item Configs
export const ITEM_SIZE = 16;
export const ITEM_SPAWN_CHANCE = 0.3; // 30% chance a platform has an item
export const COIN_SCORE = 50;
export const POTION_HEAL = 15;
export const FREEZE_DURATION = 180; // Frames (approx 3 seconds)

export const COLORS = {
  PLAYER: '#F472B6', // Pink 400 (Default)
  PLAYER_GLOW: 'rgba(244, 114, 182, 0.5)',
  NORMAL: '#4ADE80', // Green 400
  SPIKE: '#F87171', // Red 400
  CONVEYOR: '#60A5FA', // Blue 400
  TRAMPOLINE: '#FACC15', // Yellow 400
  FRAGILE: '#94A3B8', // Slate 400
  BACKGROUND: '#0F172A', // Slate 900
  PARTICLE_HURT: '#F87171',
  PARTICLE_DUST: '#E2E8F0',
  ITEM_COIN: '#FBBF24', // Amber 400
  ITEM_POTION: '#F43F5E', // Rose 500
  ITEM_HOURGLASS: '#38BDF8', // Sky 400
  SKILL_READY: '#22D3EE', // Cyan 400
  SKILL_ACTIVE: '#F472B6', // Pink 400
};

export const SKINS: Skin[] = [
  {
    id: 'default',
    name: '經典粉紅',
    price: 0,
    color: '#F472B6',
    description: '最初的感動'
  },
  {
    id: 'ninja',
    name: '暗夜忍者',
    price: 200,
    color: '#1E293B',
    description: '身手矯健'
  },
  {
    id: 'alien',
    name: '火星人',
    price: 500,
    color: '#84CC16',
    description: '來自遙遠星系'
  },
  {
    id: 'ice',
    name: '急凍人',
    price: 800,
    color: '#06B6D4',
    description: '心如止水'
  },
  {
    id: 'gold',
    name: '土豪金',
    price: 1000,
    color: '#FCD34D',
    description: '閃瞎別人'
  },
  {
    id: 'zombie',
    name: '殭屍',
    price: 1500,
    color: '#65A30D',
    description: '腦袋...好吃...'
  },
  {
    id: 'devil',
    name: '小惡魔',
    price: 2500,
    color: '#EF4444',
    description: '來自地獄'
  },
  {
    id: 'panda',
    name: '功夫熊貓',
    price: 4000,
    color: '#F8FAFC',
    description: '神龍大俠'
  },
  {
    id: 'robot',
    name: '機器人',
    price: 6000,
    color: '#94A3B8',
    description: '逼逼波波'
  },
  {
    id: 'ghost',
    name: '幽靈',
    price: 9999,
    color: '#FFFFFF',
    description: '你看不到我'
  }
];

// Skill Configurations (Cooldowns in Frames, 60 = 1 sec)
export const SKILL_DATA: Record<string, SkillStats> = {
  default: {
    name: "二段跳",
    description: "空中再次跳躍",
    cooldown: 300, // 5s
    duration: 0
  },
  ninja: {
    name: "瞬移衝刺",
    description: "無敵並快速衝刺",
    cooldown: 480, // 8s
    duration: 20 // 0.3s (Short burst)
  },
  alien: {
    name: "反重力",
    description: "緩慢飄浮下降",
    cooldown: 720, // 12s
    duration: 180 // 3s
  },
  ice: {
    name: "絕對零度",
    description: "凍結所有平台",
    cooldown: 900, // 15s
    duration: 180 // 3s
  },
  gold: {
    name: "財富磁鐵",
    description: "吸取全圖金幣",
    cooldown: 1200, // 20s
    duration: 300 // 5s
  },
  zombie: {
    name: "嗜血再生",
    description: "扣分數回血",
    cooldown: 1500, // 25s
    duration: 0
  },
  devil: {
    name: "地獄行者",
    description: "免疫所有傷害",
    cooldown: 900, // 15s
    duration: 180 // 3s
  },
  panda: {
    name: "千斤墜",
    description: "下墜並震碎尖刺",
    cooldown: 480, // 8s
    duration: 40 // ~0.7s
  },
  robot: {
    name: "噴射背包",
    description: "向上飛行",
    cooldown: 720, // 12s
    duration: 60 // 1s
  },
  ghost: {
    name: "虛無穿梭",
    description: "穿過一層地板",
    cooldown: 360, // 6s
    duration: 20 // 0.3s (Short enough to fall just one layer)
  }
};