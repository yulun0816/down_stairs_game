export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

export const PLAYER_SIZE = 24;
export const PLAYER_SPEED = 5;
export const GRAVITY = 0.4;
export const JUMP_FORCE = -8;
export const TRAMPOLINE_FORCE = -15;
export const MAX_FALL_SPEED = 12; // Slightly faster for better feel

export const PLATFORM_WIDTH = 100;
export const PLATFORM_HEIGHT = 16;
export const PLATFORM_GAP_MIN = 80;
export const PLATFORM_GAP_MAX = 110;
export const PLATFORM_SPEED_BASE = 1.5; 
export const PLATFORM_SPEED_INCREASE = 0.001;

export const CONVEYOR_SPEED = 3;

export const CEILING_DAMAGE = 5;
export const SPIKE_DAMAGE = 20; // Increased damage for spikes

export const COLORS = {
  PLAYER: '#F472B6', // Pink 400
  PLAYER_GLOW: 'rgba(244, 114, 182, 0.5)',
  NORMAL: '#4ADE80', // Green 400
  SPIKE: '#F87171', // Red 400
  CONVEYOR: '#60A5FA', // Blue 400
  TRAMPOLINE: '#FACC15', // Yellow 400
  FRAGILE: '#94A3B8', // Slate 400
  BACKGROUND: '#0F172A', // Slate 900
  PARTICLE_HURT: '#F87171',
  PARTICLE_DUST: '#E2E8F0',
};