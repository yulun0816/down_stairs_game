
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
  PLATFORM_GAP_MIN
} from '../constants';
import { GameState, Platform, PlatformType, Player, Particle } from '../types';
import { audio } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number, hp: number) => void;
  onGameOver: (score: number, reason: string) => void;
  isLeftPressed: boolean;
  isRightPressed: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  onScoreUpdate, 
  onGameOver,
  isLeftPressed,
  isRightPressed
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const difficultyMultiplierRef = useRef<number>(1);
  
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
    scaleY: 1
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
      scaleY: 1
    };

    scoreRef.current = 0;
    difficultyMultiplierRef.current = 1;
    frameCountRef.current = 0;
    particlesRef.current = [];
    
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

    // Create a solid floor at start
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
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
    for(let i=0; i<count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color,
        size: Math.random() * 3 + 1
      });
    }
  };

  // Generate a random platform
  const generatePlatform = (yPos: number, difficulty: number): Platform => {
    const r = Math.random();
    let type = PlatformType.NORMAL;
    
    if (r > 0.9 - (difficulty * 0.05)) type = PlatformType.SPIKE;
    else if (r > 0.8 - (difficulty * 0.05)) type = PlatformType.FRAGILE;
    else if (r > 0.7) type = Math.random() > 0.5 ? PlatformType.CONVEYOR_LEFT : PlatformType.CONVEYOR_RIGHT;
    else if (r > 0.65) type = PlatformType.TRAMPOLINE;

    return {
      id: Math.random(),
      x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
      y: yPos,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
      isActive: true
    };
  };

  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;
    const player = playerRef.current;
    const platforms = platformsRef.current;

    // 1. Player Movement Input
    if (isLeftPressed) {
      player.x -= PLAYER_SPEED;
      player.faceDirection = -1;
    }
    if (isRightPressed) {
      player.x += PLAYER_SPEED;
      player.faceDirection = 1;
    }

    // Animation smoothing (return to normal scale)
    player.scaleX += (1 - player.scaleX) * 0.1;
    player.scaleY += (1 - player.scaleY) * 0.1;

    // Wall boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

    // 2. Gravity and Physics
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy;

    player.isGrounded = false;

    // 3. Platform Collision Logic
    for (const platform of platforms) {
      if (!platform.isActive) continue;

      // AABB Collision Detection (Feet only)
      const isColliding = 
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height >= platform.y &&
        player.y + player.height <= platform.y + platform.height + 14 && // Increased tolerance
        player.vy >= 0; // Only when falling

      if (isColliding) {
        player.y = platform.y - player.height;
        
        // Squash effect on landing
        if (player.vy > 2) {
           player.scaleX = 1.3;
           player.scaleY = 0.7;
           spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.PARTICLE_DUST, 3);
           audio.playLand();
        }
        
        player.vy = 0;
        player.isGrounded = true;
        
        // Heal slightly
        if (platform.type === PlatformType.NORMAL && frameCountRef.current % 60 === 0) {
             player.hp = Math.min(player.hp + 1, player.maxHp);
        }

        // Platform Specifics
        switch (platform.type) {
          case PlatformType.SPIKE:
            if (frameCountRef.current % 30 === 0) { // Throttle damage
               player.hp -= SPIKE_DAMAGE;
               spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.SPIKE);
               audio.playHurt();
            }
            break;
          case PlatformType.TRAMPOLINE:
            player.vy = TRAMPOLINE_FORCE;
            player.scaleX = 0.7; // Stretch effect
            player.scaleY = 1.3;
            audio.playTrampoline();
            break;
          case PlatformType.CONVEYOR_LEFT:
            player.x -= CONVEYOR_SPEED;
            spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.CONVEYOR, 1);
            break;
          case PlatformType.CONVEYOR_RIGHT:
            player.x += CONVEYOR_SPEED;
            spawnParticles(player.x + player.width/2, player.y + player.height, COLORS.CONVEYOR, 1);
            break;
          case PlatformType.FRAGILE:
            platform.isActive = false;
            spawnParticles(platform.x + platform.width/2, platform.y, COLORS.FRAGILE, 8);
            audio.playJump(); // Small pop sound
            break;
          case PlatformType.NORMAL:
          default:
            // Platform moves player up with it
            player.y -= (PLATFORM_SPEED_BASE + difficultyMultiplierRef.current);
            break;
        }
      }
    }

    // 4. World Scrolling
    const scrollSpeed = PLATFORM_SPEED_BASE + (frameCountRef.current * PLATFORM_SPEED_INCREASE);
    difficultyMultiplierRef.current = frameCountRef.current * PLATFORM_SPEED_INCREASE;

    // Scroll Platforms
    platforms.forEach(p => {
      p.y -= scrollSpeed;
    });

    // Scroll Stars (Parallax)
    starsRef.current.forEach(star => {
      star.y -= (scrollSpeed * 0.3);
      if (star.y < 0) {
        star.y = CANVAS_HEIGHT;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Remove old platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y < -50) {
        platforms.splice(i, 1);
        scoreRef.current += 10;
      }
    }

    // Add new platforms
    const lastPlatform = platforms[platforms.length - 1];
    if (lastPlatform && lastPlatform.y < CANVAS_HEIGHT - PLATFORM_GAP_MIN) {
       platforms.push(generatePlatform(CANVAS_HEIGHT + 20, difficultyMultiplierRef.current));
    }
    if (platforms.length === 0) {
       platforms.push(generatePlatform(CANVAS_HEIGHT, difficultyMultiplierRef.current));
    }

    // 5. Ceiling Collision
    if (player.y < 30) {
      player.hp -= CEILING_DAMAGE;
      player.y = 30;
      player.vy = 5; 
      spawnParticles(player.x + player.width/2, player.y, COLORS.PARTICLE_HURT);
      if (frameCountRef.current % 10 === 0) audio.playHurt();
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
      onScoreUpdate(scoreRef.current, Math.floor(player.hp));
    }

  }, [gameState, isLeftPressed, isRightPressed, onGameOver, onScoreUpdate, setGameState]);

  // Render Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with semi-transparent black for trail effect (optional, disabled for crispness)
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Stars
    ctx.fillStyle = '#ffffff55';
    starsRef.current.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Ceiling Spikes (More graphic)
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
    
    // Danger Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'red';
    ctx.fillStyle = 'rgba(248, 113, 113, 0.3)';
    ctx.fillRect(0,0, CANVAS_WIDTH, 40);
    ctx.shadowBlur = 0;


    // Draw Platforms with Neon Style
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

      // Texture details
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(p.x, p.y, p.width, 2); // Top highlight

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
        const dir = p.type === PlatformType.CONVEYOR_LEFT ? 1 : -1;
        const offset = (frameCountRef.current * 2 * dir) % 20;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for(let i=-20; i<p.width; i+=20) {
            const xPos = p.x + i + offset;
            if (xPos >= p.x && xPos < p.x + p.width - 5) {
                ctx.beginPath();
                ctx.moveTo(xPos, p.y + 2);
                ctx.lineTo(xPos + 5, p.y + p.height/2);
                ctx.lineTo(xPos, p.y + p.height - 2);
                ctx.stroke();
            }
        }
      }
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw Player with Squash and Stretch
    const p = playerRef.current;
    
    ctx.save();
    // Move to center of player for scaling
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    ctx.scale(p.scaleX, p.scaleY);
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.PLAYER;
    
    // Body
    ctx.fillStyle = COLORS.PLAYER;
    ctx.beginPath();
    ctx.roundRect(-p.width/2, -p.height/2, p.width, p.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face
    ctx.fillStyle = 'white';
    const lookDir = p.faceDirection; // 1 or -1
    ctx.beginPath();
    ctx.arc(-4 + (lookDir * 4), -4, 5, 0, Math.PI*2); // Left Eye
    ctx.arc(6 + (lookDir * 4), -4, 5, 0, Math.PI*2); // Right Eye
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-4 + (lookDir * 5), -4, 2, 0, Math.PI*2); // Left Pupil
    ctx.arc(6 + (lookDir * 5), -4, 2, 0, Math.PI*2); // Right Pupil
    ctx.fill();

    // Cheeks (cute factor)
    ctx.fillStyle = 'rgba(255,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(-4 + (lookDir * 4), 2, 2, 0, Math.PI*2);
    ctx.arc(6 + (lookDir * 4), 2, 2, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    // HP Bar (Floating above)
    const hpPct = p.hp / p.maxHp;
    const hpColor = p.hp > 50 ? '#22c55e' : (p.hp > 25 ? '#facc15' : '#ef4444');
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x, p.y - 12, p.width, 4);
    
    ctx.fillStyle = hpColor;
    ctx.fillRect(p.x, p.y - 12, p.width * hpPct, 4);

  }, [isLeftPressed, isRightPressed]);

  // Animation Frame Loop
  useEffect(() => {
    const loop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, draw]);

  // Initialize on mount (ensures reset works when Key changes)
  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      // Improved responsive styles: 
      // max-w-full: ensure it doesn't overflow horizontally
      // max-h-[65dvh]: leave room for header/footer on mobile
      // w-auto h-auto: maintain aspect ratio
      // aspect-[2/3]: helps layout engine reserve space
      className="rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-slate-700 bg-slate-900 mx-auto block w-auto h-auto max-w-full max-h-[65dvh] aspect-[2/3] object-contain touch-none"
    />
  );
};

export default GameCanvas;
