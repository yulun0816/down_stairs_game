
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum PlatformType {
  NORMAL = 'NORMAL',
  SPIKE = 'SPIKE',
  CONVEYOR_LEFT = 'CONVEYOR_LEFT',
  CONVEYOR_RIGHT = 'CONVEYOR_RIGHT',
  TRAMPOLINE = 'TRAMPOLINE',
  FRAGILE = 'FRAGILE',
}

export enum ItemType {
  COIN = 'COIN',
  POTION = 'POTION',
  HOURGLASS = 'HOURGLASS',
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends Entity {
  vx: number;
  vy: number;
  isGrounded: boolean;
  hp: number;
  maxHp: number;
  faceDirection: 1 | -1; // 1 right, -1 left
  scaleX: number; // For animation (squash/stretch)
  scaleY: number;
  trail: { x: number; y: number; alpha: number }[]; // For after-image effects
  
  // Skill System
  skillCooldown: number; // Current cooldown timer (0 means ready)
  skillActiveTimer: number; // How long the skill effect lasts
  isSkillActive: boolean; // Is the skill currently running?
  jumpCount: number; // For double jump
}

export interface Item extends Entity {
  type: ItemType;
  collected: boolean;
  floatOffset: number; // For floating animation
}

export interface Platform extends Entity {
  id: number;
  type: PlatformType;
  isActive: boolean; // For fragile platforms
  item?: Item; // Platform might hold an item
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  shape?: 'circle' | 'square' | 'star'; // Different shapes for different skins
}

export interface GameStats {
  score: number;
  depth: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  depth: number;
}

export interface Skin {
  id: string;
  name: string;
  price: number;
  color: string;
  description: string;
}

export interface SkillStats {
  name: string;
  description: string;
  cooldown: number; // In frames (60 = 1 sec)
  duration: number; // In frames
}

export interface UserData {
  result: 'found' | 'new' | 'error';
  coins: number;
  skins: string[];
  score: number;
}

export interface SyncResponse {
  result: 'updated' | 'created' | 'error';
}
