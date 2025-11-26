import React, { useRef, useEffect, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PLAYER_SIZE, 
  COLORS, 
  GRAVITY, 
  PLATFORM_WIDTH, 
  PLATFORM_HEIGHT,
  PLATFORM_SPEED_BASE,
  PLATFORM_SPEED_INCREASE,
  MAX_FALL_SPEED,
  PLAYER_SPEED,
  TRAMPOLINE_FORCE,
  CONVEYOR_SPEED,
  CEILING_DAMAGE,
  SPIKE_DAMAGE,
  PLATFORM_GAP_MAX,
  PLATFORM_GAP_MIN,
  ITEM_SIZE,
  ITEM_SPAWN_CHANCE,
  COIN_SCORE,
  POTION_HEAL,
  FREEZE_DURATION,
  SKINS,
  SKILL_DATA,
  JUMP_FORCE
} from '../constants';
import { GameState, Platform, PlatformType, Player, Particle, Item, ItemType } from '../types';
import { audio } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number, hp: number, coins: number, skillCooldownPct: number) => void;
  onGameOver: (score: number, reason: string) => void;
  isLeftPressed: boolean;
  isRightPressed: boolean;
  currentSkinId: string;
  skillTriggerCount: number; // Increment this to trigger skill
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  onScoreUpdate, 
  onGameOver,
  isLeftPressed,
  isRightPressed,
  currentSkinId,
  skillTriggerCount
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const coinsCollectedRef = useRef<number>(0);
  const difficultyMultiplierRef = useRef<number>(1);
  const freezeTimerRef = useRef<number>(0); 
  const lastSkillTriggerRef = useRef<number>(0);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
    y: 100,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    isGrounded: false,
    hp: 100,
    maxHp: 100,
    faceDirection: 1,
    scaleX: 1,
    scaleY: 1,
    trail: [],
    skillCooldown: 0,
    skillActiveTimer: 0,
    isSkillActive: false,
    jumpCount: 0
  });
  
  const platformsRef = useRef<Platform[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);
  const frameCountRef = useRef<number>(0);

  // Initial Setup
  const initGame = useCallback(() => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
      y: 50,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      vx: 0,
      vy: 0,
      isGrounded: false,
      hp: 100,
      maxHp: 100,
      faceDirection: 1,
      scaleX: 1,
      scaleY: 1,
      trail: [],
      skillCooldown: 0,
      skillActiveTimer: 0,
      isSkillActive: false,
      jumpCount: 0
    };

    scoreRef.current = 0;
    coinsCollectedRef.current = 0;
    difficultyMultiplierRef.current = 1;
    frameCountRef.current = 0;
    freezeTimerRef.current = 0;
    particlesRef.current = [];
    // Sync last trigger ref so we don't trigger immediately on start
    lastSkillTriggerRef.current = skillTriggerCount;
    
    // Generate Background Stars
    starsRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.1
    }));

    // Generate initial platforms
    const newPlatforms: Platform[] = [];
    let currentY = CANVAS_HEIGHT;
    let idCounter = 0;

    for (let i = 0; i < 6; i++) {
      currentY -= (Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN);
      newPlatforms.push({
        id: idCounter++,
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: currentY,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PlatformType.NORMAL,
        isActive: true
      });
    }
    platformsRef.current = newPlatforms;
  }, []); // Empty dependency array: Only run on component mount

  const spawnParticles = (x: number, y: number, color: string, count: number = 5, shape: 'circle' | 'square' | 'star' = 'circle', speedMod: number = 1, vyOverride?: number) => {
    for(let i=0; i<count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6 * speedMod,
        vy: vyOverride !== undefined ? vyOverride : (Math.random() - 0.5) * 6 * speedMod,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2,
        shape
      });
    }
  };

  const generateItem = (): Item | undefined => {
    if (Math.random() > ITEM_SPAWN_CHANCE) return undefined;
    const rand = Math.random();
    let type = ItemType.COIN;
    if (rand > 0.9) type = ItemType.HOURGLASS;
    else if (rand > 0.6) type = ItemType.POTION;
    
    return {
      type,
      x: 0,
      y: 0,
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      collected: false,
      floatOffset: Math.random() * Math.PI * 2
    };
  };

  const generatePlatform = (yPos: number, difficulty: number): Platform => {
    const r = Math.random();
    let type = PlatformType.NORMAL;
    
    if (r > 0.9 - (difficulty * 0.05)) type = PlatformType.SPIKE;
    else if (r > 0.8 - (difficulty * 0.05)) type = PlatformType.FRAGILE;
    else if (r > 0.7) type = Math.random() > 0.5 ? PlatformType.CONVEYOR_LEFT : PlatformType.CONVEYOR_RIGHT;
    else if (r > 0.65) type = PlatformType.TRAMPOLINE;

    const platform = {
      id: Math.random(),
      x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
      y: yPos,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
      isActive: true,
      item: type === PlatformType.SPIKE ? undefined : generateItem()
    };

    if (platform.item) {
        platform.item.x = platform.x + (PLATFORM_WIDTH / 2) - (ITEM_SIZE / 2);
        platform.item.y = platform.y - ITEM_SIZE - 5;
    }

    return platform;
  };

  // --- SKILL LOGIC ---
  const activateSkill = () => {
    const p = playerRef.current;
    if (p.skillCooldown > 0) return; // Not ready

    const stats = SKILL_DATA[currentSkinId];
    if (!stats) return;

    p.isSkillActive = true;
    p.skillCooldown = stats.cooldown;
    p.skillActiveTimer = stats.duration;
    
    audio.playSkillActivate();

    // Immediate Trigger Logic & Visuals
    switch(currentSkinId) {
        case 'default': // Double Jump (BUFFED)
            p.vy = JUMP_FORCE * 1.5; // Stronger jump
            p.jumpCount = 0; // Reset just in case
            spawnParticles(p.x + p.width/2, p.y + p.height, 'white', 10, 'circle', 2);
            audio.playJump();
            break;
        case 'ninja': // Shadow Dash
            // Velocity set in update loop to override friction
            p.vy = 0; // Float
            audio.playDash();
            spawnParticles(p.x + p.width/2, p.y + p.height/2, '#1E293B', 15, 'square', 2);
            break;
        case 'zombie': // Regen
            if (scoreRef.current >= 100) {
                p.hp = Math.min(p.hp + 15, p.maxHp);
                scoreRef.current -= 100; // Cost score
                audio.playHeal();
                spawnParticles(p.x + p.width/2, p.y, '#22c55e', 15, 'square');
            } else {
                // Refund if no score
                p.skillCooldown = 0; 
                p.isSkillActive = false;
            }
            break;
        case 'ice': // Freeze
            freezeTimerRef.current = stats.duration; // Use global freeze timer
            audio.playFreeze();
            spawnParticles(p.x + p.width/2, p.y + p.height/2, '#06B6D4', 20, 'star', 3);
            break;
        case 'robot': // Jetpack
            p.vy = -12; // Boost up
            spawnParticles(p.x + p.width/2, p.y + p.height, '#38bdf8', 15, 'square', 2, 5);
            break;
        case 'panda': // Ground Pound
            p.vy = 20; // Smash down fast
            spawnParticles(p.x + p.width/2, p.y, 'white', 10, 'circle');
            break;
        case 'alien': // Hover start
            spawnParticles(p.x + p.width/2, p.y + p.height, '#84CC16', 10, 'circle');
            break;
        case 'gold': // Magnet start
            spawnParticles(p.x + p.width/2, p.y + p.height/2, '#FCD34D', 20, 'star', 2);
            break;
        case 'devil': // Shield start
            spawnParticles(p.x + p.width/2, p.y + p.height/2, '#EF4444', 10, 'square');
            break;
        case 'ghost': // Phase start
            spawnParticles(p.x + p.width/2, p.y + p.height/2, '#FFFFFF', 10, 'circle');
            break;
    }
  };

  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;
    const player = playerRef.current;
    const platforms = platformsRef.current;

    // Check for Skill Trigger
    // This runs every frame, detecting the change in prop without re-initializing
    if (skillTriggerCount > lastSkillTriggerRef.current) {
        activateSkill();
        lastSkillTriggerRef.current = skillTriggerCount;
    }

    // --- SKILL UPDATE LOOP ---
    if (player.skillCooldown > 0) player.skillCooldown--;
    if (player.isSkillActive) {
        player.skillActiveTimer--;
        if (player.skillActiveTimer <= 0) player.isSkillActive = false;
        
        // Continuous Skill Effects
        switch(currentSkinId) {
            case 'alien': // Hover
                if (player.vy > 2) player.vy = 2; // Slow fall limit
                spawnParticles(player.x + Math.random()*player.width, player.y + player.height, '#84cc16', 1, 'circle', 0.5, 2);
                break;
            case 'gold': // Magnet (Global)
                if (frameCountRef.current % 10 === 0) audio.playMagnet();
                platforms.forEach(p => {
                    if(p.item && !p.item.collected && p.item.type === ItemType.COIN) {
                        const dx = player.x - p.item.x;
                        const dy = player.y - p.item.y;
                        // No distance check - Full screen magnet
                        p.item.x += dx * 0.2; // Fast pull
                        p.item.y += dy * 0.2;
                    }
                });
                break;
            case 'ninja': // Dash Friction Override
                player.vx = player.faceDirection * 20; // Maintain high speed
                player.vy = 0; // Anti-gravity during dash
                spawnParticles(player.x, player.y + player.height/2, '#1E293B', 2, 'square', 0.5);
                break;
        }
    } else {
        // Reset non-active skill physics
        // player.vx handled below
    }


    // Time Freeze Logic (Shared by Item & Skill)
    let timeScale = 1;
    if (freezeTimerRef.current > 0) {
        freezeTimerRef.current--;
        timeScale = 0.5; // Global slowmo
    }
    // Ice Skill: Total platform freeze
    if (currentSkinId === 'ice' && player.isSkillActive) {
        timeScale = 0; // Platforms stop
    }


    // --- SKIN SPECIFIC VISUALS (UPDATE) ---
    if (currentSkinId === 'ninja' || currentSkinId === 'ghost' || (currentSkinId === 'default' && player.isSkillActive)) {
      if (frameCountRef.current % 2 === 0) { 
        player.trail.push({ x: player.x, y: player.y, alpha: 0.7 });
        if (player.trail.length > 8) player.trail.shift();
      }
    } else {
        player.trail = [];
    }

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;

    // Ambient Particles
    switch (currentSkinId) {
        case 'alien': 
            if (frameCountRef.current % 2 === 0) {
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width * 1.5,
                    y: player.y + player.height,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -Math.random() * 3 - 1,
                    life: 0.9,
                    color: '#a3e635',
                    size: Math.random() * 3 + 1,
                    shape: 'circle'
                });
            }
            break;
        case 'devil': 
            if (frameCountRef.current % 2 === 0) {
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width,
                    y: player.y + 5,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -Math.random() * 4 - 1,
                    life: 0.7,
                    color: Math.random() > 0.5 ? '#EF4444' : '#fbbf24',
                    size: Math.random() * 4 + 2,
                    shape: 'square'
                });
            }
            break;
        case 'ice': 
            if (frameCountRef.current % 2 === 0) { 
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width * 2,
                    y: player.y - 15,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 2 + 1,
                    life: 0.9,
                    color: '#e0f2fe',
                    size: Math.random() * 3 + 2,
                    shape: 'circle'
                });
            }
            break;
        case 'zombie': 
            if (frameCountRef.current % 5 === 0) {
                    particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width,
                    y: player.y + player.height / 2,
                    vx: 0,
                    vy: Math.random() * 1 + 2,
                    life: 1.2,
                    color: '#4d7c0f',
                    size: Math.random() * 4 + 2,
                    shape: 'circle'
                });
            }
            break;
        case 'gold': 
                if (frameCountRef.current % 3 === 0) {
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width * 2.5,
                    y: cy + (Math.random() - 0.5) * player.height * 2.5,
                    vx: 0,
                    vy: -0.3,
                    life: 0.6,
                    color: Math.random() > 0.5 ? '#FCD34D' : '#FFF',
                    size: Math.random() * 5 + 3,
                    shape: 'star'
                });
                }
            break;
        case 'robot': 
            if (frameCountRef.current % 5 === 0) {
                particlesRef.current.push({
                    x: cx + (Math.random() - 0.5) * player.width * 1.2,
                    y: cy + (Math.random() - 0.5) * player.height * 1.2,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 0.4,
                    color: '#60A5FA',
                    size: 2,
                    shape: 'square'
                });
            }
            break;
        case 'panda': 
            if (frameCountRef.current % 4 === 0) {
                particlesRef.current.push({
                    x: cx,
                    y: cy + 10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1,
                    life: 0.5,
                    color: '#ffffff',
                    size: Math.random() * 3 + 1,
                    shape: 'circle'
                });
            }
            break;
    }


    // 1. Player Movement Input
    // Ninja Dash overrides normal movement input
    if (!(currentSkinId === 'ninja' && player.isSkillActive)) {
        if (isLeftPressed) {
            player.x -= PLAYER_SPEED;
            player.faceDirection = -1;
        }
        if (isRightPressed) {
            player.x += PLAYER_SPEED;
            player.faceDirection = 1;
        }
        // Friction
        player.vx = 0; 
    }

    player.scaleX += (1 - player.scaleX) * 0.1;
    player.scaleY += (1 - player.scaleY) * 0.1;

    // Wall boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    // 2. Gravity and Physics
    if (!(currentSkinId === 'ninja' && player.isSkillActive)) {
        player.vy += GRAVITY * (currentSkinId === 'ice' && player.isSkillActive ? 1 : timeScale); 
        // Note: Ice skill freezes platforms, not gravity
    }
    
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy * (currentSkinId === 'ice' && player.isSkillActive ? 1 : timeScale);

    player.isGrounded = false;

    // 3. Platform Collision & Interaction
    for (const platform of platforms) {
      if (!platform.isActive) continue;
      
      // GHOST PHASE: Skip collision logic if skill active
      if (currentSkinId === 'ghost' && player.isSkillActive) continue;

      // Item Collection
      if (platform.item && !platform.item.collected) {
        const item = platform.item;
        if (
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            item.collected = true;
            spawnParticles(item.x + item.width/2, item.y + item.height/2, 'white', 10);
            
            switch (item.type) {
                case ItemType.COIN:
                    scoreRef.current += COIN_SCORE;
                    coinsCollectedRef.current += 50;
                    audio.playCoin();
                    break;
                case ItemType.POTION:
                    player.hp = Math.min(player.hp + POTION_HEAL, player.maxHp);
                    spawnParticles(player.x, player.y, COLORS.ITEM_POTION, 8, 'square');
                    audio.playHeal();
                    break;
                case ItemType.HOURGLASS:
                    freezeTimerRef.current = FREEZE_DURATION;
                    audio.playFreeze();
                    break;
            }
        }
        // Move items with conveyor
        if (platform.type === PlatformType.CONVEYOR_LEFT || platform.type === PlatformType.CONVEYOR_RIGHT) {
             const offset = platform.type === PlatformType.CONVEYOR_LEFT ? -CONVEYOR_SPEED : CONVEYOR_SPEED;
             item.x += offset * timeScale;

             // Keep item within platform bounds (prevent flying away)
             const minX = platform.x;
             const maxX = platform.x + platform.width - item.width;
             item.x = Math.max(minX, Math.min(maxX, item.x));
        }
        item.y = platform.y - ITEM_SIZE - 5 + Math.sin(frameCountRef.current * 0.1 + item.floatOffset) * 3;
      }

      // Platform Collision
      const isColliding = 
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height >= platform.y &&
        player.y + player.height <= platform.y + platform.height + 14 && 
        player.vy >= 0; 

      if (isColliding) {
        // PANDA SKILL: Shockwave on Land
        if (currentSkinId === 'panda' && player.isSkillActive) {
            player.isSkillActive = false; // End skill
            spawnParticles(player.x + player.width/2, player.y + player.height, 'white', 30, 'circle', 5, -2);
            audio.playJump(); // Thud sound
            
            // Destroy ALL spikes on screen (Shockwave)
            platformsRef.current.forEach(p => {
                if (p.type === PlatformType.SPIKE) {
                    p.type = PlatformType.NORMAL; // Convert to normal
                    spawnParticles(p.x + p.width/2, p.y, COLORS.SPIKE, 5, 'square');
                }
            });
            
            // Break fragile platform instantly
            if (platform.type === PlatformType.FRAGILE) {
                platform.isActive = false;
                continue;
            }
        }

        player.y = platform.y - player.height;
        
        if (player.vy > 2) {
           player.scaleX = 1.3;
           player.scaleY = 0.7;
           spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.PARTICLE_DUST, 5);
           audio.playLand();
        }
        
        player.vy = 0;
        player.isGrounded = true;
        
        // Heal on normal
        if (platform.type === PlatformType.NORMAL && frameCountRef.current % 60 === 0) {
             player.hp = Math.min(player.hp + 1, player.maxHp);
        }

        // Platform Specifics
        switch (platform.type) {
          case PlatformType.SPIKE:
            // Devil/Ninja Invulnerability check
            const isInvincible = (currentSkinId === 'devil' || currentSkinId === 'ninja') && player.isSkillActive;
            if (!isInvincible && frameCountRef.current % 30 === 0) { 
               player.hp -= SPIKE_DAMAGE;
               spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.SPIKE, 8);
               audio.playHurt();
            }
            break;
          case PlatformType.TRAMPOLINE:
            player.vy = TRAMPOLINE_FORCE;
            player.scaleX = 0.7; 
            player.scaleY = 1.3;
            audio.playTrampoline();
            break;
          case PlatformType.CONVEYOR_LEFT:
            player.x -= CONVEYOR_SPEED * timeScale;
            spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.CONVEYOR, 1);
            break;
          case PlatformType.CONVEYOR_RIGHT:
            player.x += CONVEYOR_SPEED * timeScale;
            spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.CONVEYOR, 1);
            break;
          case PlatformType.FRAGILE:
            platform.isActive = false;
            spawnParticles(platform.x + platform.width/2, platform.y, COLORS.FRAGILE, 12);
            audio.playJump(); 
            break;
          case PlatformType.NORMAL:
          default:
            player.y -= (PLATFORM_SPEED_BASE + difficultyMultiplierRef.current) * timeScale;
            break;
        }
      }
    }

    // 4. World Scrolling
    const scrollSpeed = (PLATFORM_SPEED_BASE + (frameCountRef.current * PLATFORM_SPEED_INCREASE)) * timeScale;
    difficultyMultiplierRef.current = frameCountRef.current * PLATFORM_SPEED_INCREASE;

    platforms.forEach(p => {
      p.y -= scrollSpeed;
      if (p.item) p.item.y -= scrollSpeed; 
    });

    starsRef.current.forEach(star => {
      star.y -= (scrollSpeed * 0.3);
      if (star.y < 0) {
        star.y = CANVAS_HEIGHT;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.life -= 0.05;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y < -50) {
        platforms.splice(i, 1);
        scoreRef.current += 10;
      }
    }

    const lastPlatform = platforms[platforms.length - 1];
    if (lastPlatform && lastPlatform.y < CANVAS_HEIGHT - PLATFORM_GAP_MIN) {
       platforms.push(generatePlatform(CANVAS_HEIGHT + 20, difficultyMultiplierRef.current));
    }
    if (platforms.length === 0) {
       platforms.push(generatePlatform(CANVAS_HEIGHT, difficultyMultiplierRef.current));
    }

    // 5. Ceiling Collision
    if (player.y < 30) {
      const isInvincible = (currentSkinId === 'devil' || currentSkinId === 'ninja') && player.isSkillActive;
      if (!isInvincible) {
          player.hp -= CEILING_DAMAGE;
          spawnParticles(player.x + player.width/2, player.y, COLORS.PARTICLE_HURT, 8);
          if (frameCountRef.current % 10 === 0) audio.playHurt();
      }
      player.y = 30;
      player.vy = 5; 
    }

    // 6. Game Over Conditions
    if (player.y > CANVAS_HEIGHT) {
      audio.playGameOver();
      setGameState(GameState.GAME_OVER);
      onGameOver(scoreRef.current, "Fell into the abyss");
      return;
    }

    if (player.hp <= 0) {
      audio.playGameOver();
      setGameState(GameState.GAME_OVER);
      onGameOver(scoreRef.current, "Too much damage taken");
      return;
    }

    if (frameCountRef.current % 5 === 0) {
      const stats = SKILL_DATA[currentSkinId];
      const cooldownPct = stats ? player.skillCooldown / stats.cooldown : 0;
      onScoreUpdate(scoreRef.current, Math.floor(player.hp), coinsCollectedRef.current, cooldownPct);
    }

  }, [gameState, isLeftPressed, isRightPressed, onGameOver, onScoreUpdate, setGameState, currentSkinId, skillTriggerCount]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (freezeTimerRef.current > 0) {
        const opacity = Math.min(0.2, freezeTimerRef.current / 60);
        ctx.fillStyle = `rgba(56, 189, 248, ${opacity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.fillStyle = '#ffffff55';
    starsRef.current.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    const spikeHeight = 30;
    const gradient = ctx.createLinearGradient(0, 0, 0, spikeHeight);
    gradient.addColorStop(0, '#334155');
    gradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
        ctx.lineTo(i + 10, spikeHeight);
        ctx.lineTo(i + 20, 0);
    }
    ctx.lineTo(0, 0);
    ctx.fill();
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'red';
    ctx.fillStyle = 'rgba(248, 113, 113, 0.3)';
    ctx.fillRect(0,0, CANVAS_WIDTH, 40);
    ctx.shadowBlur = 0;


    platformsRef.current.forEach(p => {
      if (!p.isActive) return; 
      
      let color = COLORS.NORMAL;
      let glowColor = 'rgba(74, 222, 128, 0.5)';

      switch (p.type) {
        case PlatformType.SPIKE: 
            color = COLORS.SPIKE; 
            glowColor = 'rgba(248, 113, 113, 0.5)';
            break;
        case PlatformType.TRAMPOLINE: 
            color = COLORS.TRAMPOLINE; 
            glowColor = 'rgba(250, 204, 21, 0.5)';
            break;
        case PlatformType.FRAGILE: 
            color = COLORS.FRAGILE; 
            glowColor = 'rgba(148, 163, 184, 0.5)';
            break;
        case PlatformType.CONVEYOR_LEFT: 
        case PlatformType.CONVEYOR_RIGHT: 
            color = COLORS.CONVEYOR; 
            glowColor = 'rgba(96, 165, 250, 0.5)';
            break;
      }

      ctx.shadowBlur = 10;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = color;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(p.x, p.y, p.width, 2);

      if (p.type === PlatformType.SPIKE) {
        ctx.fillStyle = '#333';
        for(let i=0; i<p.width; i+=10) {
            ctx.beginPath();
            ctx.moveTo(p.x + i, p.y);
            ctx.lineTo(p.x + i + 5, p.y - 8);
            ctx.lineTo(p.x + i + 10, p.y);
            ctx.fill();
        }
      } else if (p.type === PlatformType.CONVEYOR_LEFT || p.type === PlatformType.CONVEYOR_RIGHT) {
        const isLeft = p.type === PlatformType.CONVEYOR_LEFT;
        const arrowSize = 6;
        const spacing = 20;
        const offset = (frameCountRef.current * 1.5) % spacing;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = -spacing; i < p.width; i += spacing) {
          let x = p.x + i + (isLeft ? -offset : offset);
          if (isLeft) x += spacing; 
          if (x > p.x + 2 && x < p.x + p.width - 2) {
             ctx.beginPath();
             if (isLeft) {
                ctx.moveTo(x + arrowSize, p.y + p.height/2 - arrowSize);
                ctx.lineTo(x, p.y + p.height/2);
                ctx.lineTo(x + arrowSize, p.y + p.height/2 + arrowSize);
             } else {
                ctx.moveTo(x, p.y + p.height/2 - arrowSize);
                ctx.lineTo(x + arrowSize, p.y + p.height/2);
                ctx.lineTo(x, p.y + p.height/2 + arrowSize);
             }
             ctx.fill();
          }
        }
      }

      if (p.item && !p.item.collected) {
          const item = p.item;
          ctx.save();
          ctx.translate(item.x + item.width/2, item.y + item.height/2);
          
          if (item.type === ItemType.COIN) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = COLORS.ITEM_COIN;
              ctx.fillStyle = COLORS.ITEM_COIN;
              ctx.beginPath();
              ctx.arc(0, 0, item.width/2, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = '#FFF7ED';
              ctx.font = 'bold 10px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('$', 0, 1);
          } else if (item.type === ItemType.POTION) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = COLORS.ITEM_POTION;
              ctx.fillStyle = COLORS.ITEM_POTION;
              ctx.beginPath();
              ctx.moveTo(0, -5);
              ctx.bezierCurveTo(5, -10, 10, -5, 0, 8);
              ctx.bezierCurveTo(-10, -5, -5, -10, 0, -5);
              ctx.fill();
          } else if (item.type === ItemType.HOURGLASS) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = COLORS.ITEM_HOURGLASS;
              ctx.fillStyle = COLORS.ITEM_HOURGLASS;
              ctx.beginPath();
              ctx.moveTo(-6, -6);
              ctx.lineTo(6, -6);
              ctx.lineTo(0, 0);
              ctx.lineTo(6, 6);
              ctx.lineTo(-6, 6);
              ctx.lineTo(0, 0);
              ctx.fill();
          }

          ctx.restore();
      }
    });

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.shape === 'square') {
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      } else if (p.shape === 'star') {
          ctx.fillRect(p.x - p.size, p.y - p.size/4, p.size*2, p.size/2);
          ctx.fillRect(p.x - p.size/4, p.y - p.size, p.size/2, p.size*2);
      } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    const p = playerRef.current;
    const currentSkin = SKINS.find(s => s.id === currentSkinId) || SKINS[0];
    const lookDir = p.faceDirection; 
    
    // --- SKILL VISUALS (ACTIVE) ---
    if (p.isSkillActive) {
        ctx.save();
        ctx.translate(p.x + p.width/2, p.y + p.height/2);
        
        if (currentSkinId === 'devil' || currentSkinId === 'ninja') {
            // Shield effect
            ctx.strokeStyle = currentSkinId === 'devil' ? '#EF4444' : '#FFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.width, 0, Math.PI*2);
            ctx.stroke();
        } else if (currentSkinId === 'gold') {
             // Magnet waves
             ctx.strokeStyle = '#FCD34D';
             ctx.beginPath();
             ctx.arc(0, 0, p.width + (frameCountRef.current % 20), 0, Math.PI*2);
             ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Trail Effect
    if (p.trail && p.trail.length > 0) {
        p.trail.forEach((pos, i) => {
            const alpha = (i / p.trail.length) * 0.6;
            ctx.save();
            ctx.translate(pos.x + p.width/2, pos.y + p.height/2);
            ctx.scale(p.scaleX, p.scaleY);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = currentSkinId === 'ghost' ? 'rgba(255,255,255,0.5)' : currentSkin.color;
            ctx.beginPath();
            ctx.roundRect(-p.width/2, -p.height/2, p.width, p.height, 6);
            ctx.fill();
            ctx.restore();
        });
    }

    if (currentSkinId === 'robot' && Math.random() > 0.5) {
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#60A5FA';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        let lx = p.x + p.width/2 + (Math.random()-0.5) * 40;
        let ly = p.y + p.height/2 + (Math.random()-0.5) * 40;
        ctx.moveTo(lx, ly);
        for(let i=0; i<4; i++) {
            lx += (Math.random()-0.5) * 15;
            ly += (Math.random()-0.5) * 15;
            ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    if (currentSkinId === 'panda') {
         ctx.save();
         ctx.translate(p.x + p.width/2, p.y + p.height/2);
         ctx.shadowBlur = 20;
         ctx.shadowColor = 'white';
         ctx.fillStyle = 'rgba(255,255,255,0.2)';
         ctx.beginPath();
         ctx.arc(0, 5, 20, 0, Math.PI*2);
         ctx.fill();
         ctx.restore();
    }
    
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    ctx.scale(p.scaleX, p.scaleY);
    
    if (currentSkin.id === 'ghost') {
        ctx.globalAlpha = 0.6;
    }

    if (currentSkinId === 'alien') {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#84CC16';
    } else if (currentSkinId === 'gold') {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#FCD34D';
    } else if (currentSkinId === 'devil') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#EF4444';
    } else {
        ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = currentSkin.color;
    ctx.beginPath();
    ctx.roundRect(-p.width/2, -p.height/2, p.width, p.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face Details
    if (currentSkin.id === 'alien') {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.ellipse(-5 + (lookDir * 3), -3, 4, 6, Math.PI/6 * -lookDir, 0, Math.PI*2);
        ctx.ellipse(5 + (lookDir * 3), -3, 4, 6, Math.PI/6 * lookDir, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 3), -5, 1, 0, Math.PI*2);
        ctx.arc(6 + (lookDir * 3), -5, 1, 0, Math.PI*2);
        ctx.fill();
    } else if (currentSkin.id === 'ninja') {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(-p.width/2 + 2, -6, p.width - 4, 8);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -2, 3, 0, Math.PI*2);
        ctx.arc(6 + (lookDir * 4), -2, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-3 + (lookDir * 5), -2, 1, 0, Math.PI*2); 
        ctx.arc(7 + (lookDir * 5), -2, 1, 0, Math.PI*2); 
        ctx.fill();
    } else if (currentSkin.id === 'gold') {
         ctx.fillStyle = 'black';
         ctx.fillRect(-8 + (lookDir*2), -6, 16, 6);
         ctx.fillStyle = '#FCD34D';
         ctx.fillRect(-1 + (lookDir*2), -6, 2, 6);
         ctx.fillStyle = 'white';
         ctx.font = '10px Arial';
         ctx.fillText('$', -3, 8);
    } else if (currentSkin.id === 'ice') {
        ctx.fillStyle = 'white';
        ctx.fillRect(-p.width/2, 2, p.width, 4);
        ctx.fillRect(-p.width/2 + (lookDir === 1 ? 0 : 16), 2, 8, 10);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -4, 2, 0, Math.PI*2); 
        ctx.arc(6 + (lookDir * 4), -4, 2, 0, Math.PI*2); 
        ctx.fill();
    } else if (currentSkin.id === 'zombie') {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -4, 4, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6 + (lookDir * 4), -4, 2, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -4, 1, 0, Math.PI*2); 
        ctx.arc(6 + (lookDir * 4), -4, 1, 0, Math.PI*2); 
        ctx.fill();
        ctx.strokeStyle = '#3F6212';
        ctx.beginPath();
        ctx.moveTo(-6 + (lookDir * 4), 4);
        ctx.lineTo(2 + (lookDir * 4), 4);
        ctx.stroke();
    } else if (currentSkin.id === 'devil') {
        ctx.fillStyle = currentSkin.color;
        ctx.beginPath();
        ctx.moveTo(-6, -p.height/2);
        ctx.lineTo(-9, -p.height/2 - 6);
        ctx.lineTo(-3, -p.height/2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, -p.height/2);
        ctx.lineTo(9, -p.height/2 - 6);
        ctx.lineTo(6, -p.height/2);
        ctx.fill();
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.moveTo(-7 + (lookDir*4), -6);
        ctx.lineTo(-2 + (lookDir*4), -3);
        ctx.lineTo(-7 + (lookDir*4), -3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(7 + (lookDir*4), -6);
        ctx.lineTo(2 + (lookDir*4), -3);
        ctx.lineTo(7 + (lookDir*4), -3);
        ctx.fill();
    } else if (currentSkin.id === 'panda') {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-8, -p.height/2, 4, 0, Math.PI*2);
        ctx.arc(8, -p.height/2, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(-p.width/2 + 2, -p.height/2 + 2, p.width-4, p.height/2, 4);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.ellipse(-4 + (lookDir * 4), -3, 3, 2, -0.3, 0, Math.PI*2);
        ctx.ellipse(6 + (lookDir * 4), -3, 3, 2, 0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -3, 1, 0, Math.PI*2);
        ctx.arc(6 + (lookDir * 4), -3, 1, 0, Math.PI*2);
        ctx.fill();
    } else if (currentSkin.id === 'robot') {
        ctx.strokeStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(0, -p.height/2);
        ctx.lineTo(0, -p.height/2 - 5);
        ctx.stroke();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(0, -p.height/2 - 5, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(-8 + (lookDir * 2), -6, 16, 4);
    } else if (currentSkin.id === 'ghost') {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -4, 3, 0, Math.PI*2); 
        ctx.arc(6 + (lookDir * 4), -4, 3, 0, Math.PI*2); 
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1 + (lookDir * 4), 2, 2, 0, Math.PI*2);
        ctx.fill();
    } else {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), -4, 5, 0, Math.PI*2); 
        ctx.arc(6 + (lookDir * 4), -4, 5, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 5), -4, 2, 0, Math.PI*2); 
        ctx.arc(6 + (lookDir * 5), -4, 2, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle = 'rgba(255,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(-4 + (lookDir * 4), 2, 2, 0, Math.PI*2);
        ctx.arc(6 + (lookDir * 4), 2, 2, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();

    // HP Bar
    const hpPct = p.hp / p.maxHp;
    const hpColor = p.hp > 50 ? '#22c55e' : (p.hp > 25 ? '#facc15' : '#ef4444');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x, p.y - 12, p.width, 4);
    ctx.fillStyle = hpColor;
    ctx.fillRect(p.x, p.y - 12, p.width * hpPct, 4);

  }, [isLeftPressed, isRightPressed, currentSkinId]);

  useEffect(() => {
    const loop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, draw]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-slate-700 bg-slate-900 mx-auto block w-auto h-auto max-w-full max-h-[65dvh] aspect-[2/3] object-contain touch-none"
    />
  );
};

export default GameCanvas;