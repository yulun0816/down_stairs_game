
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
}

export interface Platform extends Entity {
  id: number;
  type: PlatformType;
  isActive: boolean; // For fragile platforms
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
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
