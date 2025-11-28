
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Entity, Particle, Platform, PowerUp, Decoration } from '../types';
import { 
    GRAVITY, FRICTION, ICE_FRICTION, JUMP_FORCE, MARIO_SPEED, COLORS, 
    MUSHROOM_SPRITE, MARIO_SPRITE, STAR_SPRITE, WINGS_SPRITE, PIANO_SPRITE, COIN_SPRITE, SHIELD_SPRITE,
    WOLF_SPRITE, EGG_SPRITE, MINI_MUSHROOM_SPRITE,
    DRAGON_SPRITE, GORILLA_SPRITE, EAGLE_SPRITE, STORK_SPRITE,
    PLAYER_SIZE, ENEMY_SIZE, BOSS_SIZE, PIANO_SIZE, POWERUP_SIZE
} from '../constants';
import { audio } from './RetroAudio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: React.SetStateAction<number>) => void;
  score: number;
  setDeathReason: (reason: string) => void;
  lives: number;
  setLives: (lives: React.SetStateAction<number>) => void;
  setHasShield: (hasShield: boolean) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    gameState, setGameState, setScore, score, setDeathReason, lives, setLives, setHasShield
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Internal logic refs
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const bossCountRef = useRef(0);
  
  // World State
  const cameraRef = useRef({ x: 0 });
  const nextSpawnXRef = useRef(0);
  const distanceTraveledRef = useRef(0);
  const bossSpawnedRef = useRef(false);
  const isEndingRef = useRef(false);
  const dungeonRef = useRef<{ active: boolean; type: 'DRAGON' | 'GORILLA' | null }>({ active: false, type: null });
  const savedWorldStateRef = useRef<{ camX: number; playerX: number; nextSpawnX: number }>({ camX: 0, playerX: 0, nextSpawnX: 0 });
  
  // Game State Refs
  const playerRef = useRef<Entity>({ 
      x: 0, y: 0, width: PLAYER_SIZE, height: PLAYER_SIZE, 
      vx: 0, vy: 0, grounded: false, facingRight: true,
      invincibleTimer: 0, wingTimer: 0, jumpsAvailable: 2, hasShield: false, shieldTimer: 0,
      hasMoved: false
  });
  const enemiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const platformsRef = useRef<Platform[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const cutsceneEntitiesRef = useRef<Entity[]>([]);
  
  const frameCountRef = useRef(0);
  const coyoteTimerRef = useRef(0); // For jump forgiveness
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Initialize refs
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  // Input handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.code] = true;
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.code] = false;
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        keysRef.current.jumpLocked = false;
    }
  }, []);

  // Procedural Generation
  const generateChunk = (startX: number, endX: number, height: number) => {
      if (isEndingRef.current || dungeonRef.current.active) return;

      const GROUND_Y = height - 40;
      
      // Boss Spawn Logic (Every 2000px approx, but controlled)
      if (startX > 2000 && Math.floor(startX / 3000) > Math.floor((startX - (endX-startX))/3000) && !bossSpawnedRef.current) {
          if (bossCountRef.current < 3) {
              spawnBoss(startX + 400, GROUND_Y - BOSS_SIZE * 1.2, bossCountRef.current + 1);
              return; 
          }
      }

      // 1. Decorations
      for (let x = startX; x < endX; x += Math.random() * 200 + 100) {
          if (Math.random() > 0.3) {
             const type = Math.random() > 0.5 ? 'HILL' : 'BUSH';
             decorationsRef.current.push({
                 x: x,
                 y: GROUND_Y,
                 width: type === 'HILL' ? 100 + Math.random() * 100 : 60,
                 height: type === 'HILL' ? 80 + Math.random() * 50 : 30,
                 type
             });
          }
      }
      for (let x = startX; x < endX; x += Math.random() * 300 + 100) {
          if (Math.random() > 0.4) {
             decorationsRef.current.push({
                 x: x,
                 y: Math.random() * (height / 2),
                 width: 80,
                 height: 40,
                 type: 'CLOUD'
             });
          }
      }

      // 2. Platforms & Pipes
      let currentX = startX;
      while (currentX < endX) {
          if (Math.random() < 0.2) {
              currentX += 150; 
          }

          const platformType = Math.random();
          
          if (platformType < 0.18) {
              // Pipe (Standard or Gold)
              const pipeH = 60 + Math.random() * 40;
              const isMoving = Math.random() < 0.4;
              const isGold = Math.random() < 0.1; // Rare Gold Pipe

              platformsRef.current.push({
                  x: currentX,
                  y: GROUND_Y - pipeH,
                  width: 60,
                  height: pipeH,
                  type: isGold ? 'GOLD_PIPE' : 'PIPE',
                  minY: isMoving && !isGold ? GROUND_Y - pipeH : undefined,
                  maxY: isMoving && !isGold ? GROUND_Y - 20 : undefined,
                  dirY: isMoving && !isGold ? 1 : 0,
                  moveSpeed: isMoving && !isGold ? 0.5 + Math.random() : 0
              });
              currentX += 150;
          } else if (platformType < 0.6) {
              // Floating Platform
              const platY = GROUND_Y - (100 + Math.random() * 200);
              const platW = 100 + Math.random() * 150;
              const isGhost = Math.random() < 0.06; 
              
              // Special Types
              let type: Platform['type'] = 'BRICK';
              if (Math.random() < 0.2) type = 'ICE';
              else if (Math.random() < 0.2) type = 'BOUNCY';

              platformsRef.current.push({
                  x: currentX,
                  y: platY,
                  width: platW,
                  height: 32,
                  type: type,
                  isGhost: isGhost,
                  ghostTimer: Math.random() * 100,
                  isSolid: true
              });
              
              // Reduced enemy spawn density
              if (Math.random() > 0.6) spawnEnemyAt(currentX + platW/2, platY - ENEMY_SIZE);
              if (Math.random() < 0.1) spawnPowerUpAt(currentX + platW/2, platY - POWERUP_SIZE - 10);
              if (Math.random() < 0.4) {
                  for (let i = 0; i < 3; i++) spawnPowerUpAt(currentX + 20 + i * 40, platY - POWERUP_SIZE - 10, 'COIN');
              }

              currentX += platW + 50;
          } else {
              currentX += 100;
          }
      }

      // Upper Row Platforms
      if (Math.random() < 0.4) {
          let upperX = startX;
          while (upperX < endX) {
              if (Math.random() < 0.5) {
                   platformsRef.current.push({
                       x: upperX,
                       y: GROUND_Y - 280,
                       width: 100,
                       height: 32,
                       type: 'BLOCK',
                       isSolid: true
                   });
                   // Flying Enemies
                   if (Math.random() < 0.3) {
                       const type = Math.random() > 0.5 ? 'EAGLE' : 'STORK';
                       spawnEnemyAt(upperX, GROUND_Y - 350, type);
                   }
              }
              upperX += 250;
          }
      }

      // 3. Ground Enemies & Coins
      for (let x = startX; x < endX; x += 500) { // Reduced density (was 400)
          if (Math.random() > 0.5) spawnEnemyAt(x, GROUND_Y - ENEMY_SIZE);
          if (Math.random() > 0.6) {
              spawnPowerUpAt(x + 50, GROUND_Y - 60, 'COIN');
              spawnPowerUpAt(x + 90, GROUND_Y - 60, 'COIN');
          }
      }
  };

  const spawnBoss = (x: number, y: number, variant: number) => {
      audio.startBossMusic();
      bossSpawnedRef.current = true;
      enemiesRef.current.push({
          x, y, 
          width: BOSS_SIZE * 1.2, // Increase boss size/hitbox by 20%
          height: BOSS_SIZE * 1.2,
          vx: -2, vy: 0, grounded: false, facingRight: false,
          type: 'BOSS', hp: 2 + variant, maxHp: 2 + variant, variant
      });
  };

  const spawnDungeonBoss = () => {
       const type = Math.random() > 0.5 ? 'DRAGON' : 'GORILLA';
       dungeonRef.current.type = type;
       
       enemiesRef.current.push({
           x: -1000 + 400, // Dungeon coordinate space
           y: 500, // Ground level in dungeon is different
           width: BOSS_SIZE * 1.2, // Increase hitbox size
           height: BOSS_SIZE * 1.2,
           vx: -2,
           vy: 0,
           grounded: false,
           facingRight: false,
           type: type,
           hp: 5,
           maxHp: 5
       });
  };

  const spawnEnemyAt = (x: number, y: number, type: Entity['type'] = 'ENEMY') => {
    // Safe Zone Check: Ensure enemies don't spawn within ~300px of start (x=0 to 300)
    // Player spawns at x=100.
    if (!dungeonRef.current.active && x < 300) return;

    enemiesRef.current.push({
      x: x,
      y: y,
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      vx: -(Math.random() * MARIO_SPEED + 1),
      vy: 0,
      grounded: false,
      facingRight: false,
      type: type
    });
  };

  const spawnPowerUpAt = (x: number, y: number, type?: PowerUp['type']) => {
    let finalType = type;
    if (!finalType) {
        const r = Math.random();
        if (r < 0.3) finalType = 'STAR';
        else if (r < 0.6) finalType = 'WINGS';
        else finalType = 'SHIELD';
    }
    
    powerUpsRef.current.push({
        id: Math.random(),
        x, y, width: POWERUP_SIZE, height: POWERUP_SIZE,
        type: finalType,
        initialY: y,
        floatOffset: Math.random() * Math.PI * 2
    });
  };
  
  const spawnPiano = (playerX: number, minY: number) => {
      const x = playerX + (Math.random() * 400 - 200);
      enemiesRef.current.push({
          x: x,
          y: -200,
          width: PIANO_SIZE,
          height: PIANO_SIZE,
          vx: 0,
          vy: 10,
          grounded: false,
          type: 'PIANO'
      });
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
        life: 1.0, color, size: Math.random() * 6 + 4
      });
    }
  };

  const resetGame = (width: number, height: number, fullReset: boolean = true) => {
    audio.stopBossMusic();
    
    // Cleanup World
    enemiesRef.current = [];
    particlesRef.current = [];
    platformsRef.current = [];
    powerUpsRef.current = [];
    decorationsRef.current = [];
    cutsceneEntitiesRef.current = [];
    keysRef.current = {}; 
    
    cameraRef.current.x = 0;
    nextSpawnXRef.current = 0;
    bossSpawnedRef.current = false;
    distanceTraveledRef.current = 0;
    isEndingRef.current = false;
    dungeonRef.current.active = false;

    if (fullReset) {
        scoreRef.current = 0;
        setScore(0);
        livesRef.current = 3;
        setLives(3);
        setHasShield(false);
        bossCountRef.current = 0;
    }

    const GROUND_Y = height - 40;

    // SAFE SPAWN: Spawn a pipe at the start and place player on it
    const startPipeX = 100;
    const startPipeH = 80;
    platformsRef.current.push({
        x: startPipeX,
        y: GROUND_Y - startPipeH,
        width: 60,
        height: startPipeH,
        type: 'PIPE',
        isSolid: true
    });

    playerRef.current = {
        x: startPipeX + 5, 
        y: GROUND_Y - startPipeH - PLAYER_SIZE - 5,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        vx: 0, vy: 0, grounded: true, facingRight: true,
        invincibleTimer: 0, wingTimer: 0, jumpsAvailable: 2, hasShield: false, shieldTimer: 0,
        scale: 1,
        hasMoved: false
    };

    // Regenerate chunk starting AFTER the safe zone
    // Increased offset to 500 to ensure no enemies spawn within immediate radius
    generateChunk(500, width + 500, height);
    nextSpawnXRef.current = width + 500;
  };

  const enterDungeon = (canvasHeight: number) => {
      dungeonRef.current.active = true;
      savedWorldStateRef.current = {
          camX: cameraRef.current.x,
          playerX: playerRef.current.x,
          nextSpawnX: nextSpawnXRef.current
      };
      
      // Setup Dungeon "Room" (using negative coordinates to isolate)
      cameraRef.current.x = -1000;
      playerRef.current.x = -1000 + 100;
      playerRef.current.y = 500; // Arbitrary ground
      playerRef.current.vx = 0;
      playerRef.current.hasMoved = true;
      
      enemiesRef.current = []; // Clear current enemies from view (they are saved in memory/refs but we just clear list for now, simpler)
      // Note: In a real persistent world we'd stash them, but here we can just respawn world on exit or accept clears. 
      // To prevent losing main world state, we just accept that entering dungeon clears local enemies.
      
      platformsRef.current = [
          { x: -1000, y: 600, width: 800, height: 40, type: 'BRICK', isSolid: true }, // Floor
          { x: -1000, y: 0, width: 40, height: 600, type: 'BRICK', isSolid: true }, // Left Wall
          { x: -1000 + 760, y: 0, width: 40, height: 600, type: 'BRICK', isSolid: true }, // Right Wall
      ];
      
      spawnDungeonBoss();
  };

  const exitDungeon = () => {
      dungeonRef.current.active = false;
      cameraRef.current.x = savedWorldStateRef.current.camX;
      playerRef.current.x = savedWorldStateRef.current.playerX;
      playerRef.current.y = 0; // Drop from sky
      nextSpawnXRef.current = savedWorldStateRef.current.nextSpawnX;
      
      // Clear dungeon entities
      enemiesRef.current = [];
      platformsRef.current = []; 
      
      // Regenerate immediate area to ensure ground exists
      if (canvasRef.current) generateChunk(cameraRef.current.x, cameraRef.current.x + canvasRef.current.width + 200, canvasRef.current.height);
  };

  const triggerEnding = (width: number, height: number) => {
      isEndingRef.current = true;
      audio.stopBossMusic();
      enemiesRef.current = [];
      const GROUND_Y = height - 40;
      const center = cameraRef.current.x + width / 2;
      
      playerRef.current.x = center - 200;
      playerRef.current.y = GROUND_Y - PLAYER_SIZE;
      playerRef.current.vx = 0;
      playerRef.current.vy = 0;
      playerRef.current.facingRight = true;
      playerRef.current.hasMoved = true; 

      cutsceneEntitiesRef.current.push({
          x: center + 300,
          y: GROUND_Y - 96,
          width: 96,
          height: 96,
          vx: -3,
          vy: 0,
          grounded: true,
          type: 'WOLF',
          facingRight: false
      });
  };

  // Main Loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === GameState.PLAYING) {
      update(canvas.width, canvas.height);
    } else if (gameState === GameState.VICTORY) {
      updateVictory(canvas.width, canvas.height);
    }
    draw(ctx, canvas.width, canvas.height);

    requestRef.current = requestAnimationFrame(animate);
  }, [gameState]);

  // VICTORY CUTSCENE UPDATE
  const updateVictory = (width: number, height: number) => {
      frameCountRef.current++;
      const GROUND_Y = height - 40;
      const center = cameraRef.current.x + width / 2;

      const wolf = cutsceneEntitiesRef.current.find(e => e.type === 'WOLF');
      if (wolf) {
          if (wolf.x > center + 50) {
              wolf.x += wolf.vx;
          } else {
              wolf.vx = 0;
              if (frameCountRef.current % 60 === 0 && Math.random() > 0.5) {
                   wolf.facingRight = !wolf.facingRight; 
              }
          }
      }

      const p = playerRef.current;
      if (wolf && wolf.vx === 0) {
          if (!p.scale) p.scale = 1;
          if (p.scale < 3) {
              p.scale += 0.02;
              p.y = GROUND_Y - (PLAYER_SIZE * p.scale);
          } else if (p.scale >= 3 && !p.dead) {
              p.dead = true;
              audio.playCrash();
              for (let i = 0; i < 20; i++) {
                  cutsceneEntitiesRef.current.push({
                      x: p.x + (PLAYER_SIZE*1.5),
                      y: p.y - 50,
                      width: 24, height: 24,
                      vx: (Math.random() - 0.5) * 15,
                      vy: -Math.random() * 15 - 5,
                      grounded: false,
                      type: 'CUTSCENE_ITEM',
                      itemType: 'MINI_MUSHROOM'
                  });
              }
          }
      }

      cutsceneEntitiesRef.current.forEach(e => {
          if (e.type === 'CUTSCENE_ITEM') {
              e.vy += GRAVITY;
              e.x += e.vx;
              e.y += e.vy;
              if (wolf && checkCollision(e, wolf)) {
                  e.y = height + 100; 
                  createParticles(wolf.x + wolf.width/2, wolf.y, COLORS.WHITE, 2);
                  audio.playCoin();
              }
          }
      });
      cutsceneEntitiesRef.current = cutsceneEntitiesRef.current.filter(e => e.y < height);
  };

  // MAIN GAME UPDATE
  const update = (width: number, height: number) => {
    const player = playerRef.current;
    const GROUND_Y = height - 40;
    frameCountRef.current++;
    distanceTraveledRef.current = Math.max(distanceTraveledRef.current, player.x);

    // Speed Multiplier Logic ($2^{score/2000}$), capped at 3.5x
    const rawSpeed = Math.pow(2, scoreRef.current / 2000);
    const speedMultiplier = Math.min(Math.max(rawSpeed, 1.0), 3.5);

    // Chaos: Falling Piano (Reduced rate)
    if (!dungeonRef.current.active && Math.random() < 0.0004 * speedMultiplier) {
        spawnPiano(player.x, -100);
    }

    // --- Generation & Cleanup ---
    if (!dungeonRef.current.active) {
        if (cameraRef.current.x + width + 200 > nextSpawnXRef.current) {
            generateChunk(nextSpawnXRef.current, nextSpawnXRef.current + width, height);
            nextSpawnXRef.current += width;
        }
        const cleanupThreshold = cameraRef.current.x - 200;
        enemiesRef.current = enemiesRef.current.filter(e => e.x > cleanupThreshold);
        platformsRef.current = platformsRef.current.filter(p => p.x + p.width > cleanupThreshold);
        powerUpsRef.current = powerUpsRef.current.filter(p => p.x > cleanupThreshold);
        decorationsRef.current = decorationsRef.current.filter(d => d.x + d.width > cleanupThreshold);
    }

    // --- Platform Dynamics ---
    platformsRef.current.forEach(p => {
        if (p.moveSpeed && p.minY !== undefined && p.maxY !== undefined && p.dirY !== undefined) {
            p.y += p.moveSpeed * p.dirY * speedMultiplier;
            if (p.y > p.maxY) p.dirY = -1;
            if (p.y < p.minY) p.dirY = 1;
        }
        if (p.isGhost) {
            if (!p.ghostTimer) p.ghostTimer = 0;
            p.ghostTimer += speedMultiplier;
            const cycle = p.ghostTimer % 300;
            if (cycle < 180) p.isSolid = true;
            else p.isSolid = false;
        } else {
            p.isSolid = true;
        }
    });

    // --- Player Movement ---
    let currentFriction = FRICTION;

    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
      player.vx -= 1.5 * speedMultiplier; 
      player.facingRight = false;
      player.hasMoved = true;
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
      player.vx += 1.5 * speedMultiplier; 
      player.facingRight = true;
      player.hasMoved = true;
    }

    // Dungeon Entry
    if ((keysRef.current['ArrowDown'] || keysRef.current['KeyS']) && player.grounded && !dungeonRef.current.active) {
        platformsRef.current.forEach(p => {
            if (p.type === 'GOLD_PIPE' && 
                player.x + player.width/2 > p.x && 
                player.x + player.width/2 < p.x + p.width &&
                Math.abs((player.y + player.height) - p.y) < 5) {
                enterDungeon(height);
            }
        });
    }

    // Camera Logic (Boss Lock or Follow)
    let locked = false;
    if (bossSpawnedRef.current || dungeonRef.current.active) {
        locked = true; 
        // Force clamp player to screen
        if (player.x < cameraRef.current.x) player.x = cameraRef.current.x;
        if (player.x + player.width > cameraRef.current.x + width) player.x = cameraRef.current.x + width - player.width;
    }

    if (!locked) {
        const targetCamX = player.x - width / 3;
        if (targetCamX > cameraRef.current.x) {
            cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
        }
    }

    const jumpPressed = keysRef.current['ArrowUp'] || keysRef.current['Space'] || keysRef.current['KeyW'];
    
    // Coyote Time decrement
    if (coyoteTimerRef.current > 0) coyoteTimerRef.current--;

    if (jumpPressed) {
        player.hasMoved = true;
        if (!keysRef.current.jumpLocked) {
             const hasWings = player.wingTimer && player.wingTimer > 0;
             // Allow jump if grounded OR coyote time > 0
             if (hasWings) {
                 player.vy = JUMP_FORCE;
                 player.grounded = false;
                 audio.playJump();
                 createParticles(player.x + player.width/2, player.y + player.height, COLORS.WINGS, 2);
             } else if (player.jumpsAvailable && player.jumpsAvailable > 0) {
                 player.vy = JUMP_FORCE;
                 player.grounded = false;
                 player.jumpsAvailable--;
                 coyoteTimerRef.current = 0; // consume coyote time
                 audio.playJump();
                 createParticles(player.x + player.width/2, player.y + player.height, COLORS.WHITE, 2);
             }
             keysRef.current.jumpLocked = true;
        }
    } else {
        keysRef.current.jumpLocked = false;
    }

    player.vy += GRAVITY;
    
    // Resolve Collisions
    player.grounded = false;
    let onIce = false;

    // Check Platforms
    platformsRef.current.forEach(plat => {
        if (!plat.isSolid) return; 

        // Fix sticking/landing: Using a slightly larger downward check
        if (player.vy > 0 && 
            player.y + player.height > plat.y - 4 && // Forgiving top detection
            player.y + player.height < plat.y + player.height + 15 && 
            player.x + player.width > plat.x + 5 && 
            player.x < plat.x + plat.width - 5
           ) {
            player.y = plat.y - player.height;
            player.vy = 0;
            player.grounded = true;
            player.jumpsAvailable = 2;
            coyoteTimerRef.current = 10; // Reset coyote timer
            
            if (plat.type === 'ICE') onIce = true;
            if (plat.type === 'BOUNCY') {
                player.vy = JUMP_FORCE * 1.5;
                player.grounded = false;
                audio.playJump();
            }
        }
    });

    const currentGroundY = dungeonRef.current.active ? 600 : GROUND_Y;
    if (player.y + player.height > currentGroundY) {
      player.y = currentGroundY - player.height;
      player.vy = 0;
      player.grounded = true;
      player.jumpsAvailable = 2;
      coyoteTimerRef.current = 10;
    }
    
    // Apply Friction
    if (onIce) currentFriction = ICE_FRICTION;
    player.vx *= currentFriction;
    player.x += player.vx;
    player.y += player.vy;
    
    // Dungeon wall clamping if active (manual check since no walls usually)
    if (dungeonRef.current.active) {
        if (player.x < -1000 + 40) player.x = -1000 + 40;
        if (player.x > -1000 + 760 - player.width) player.x = -1000 + 760 - player.width;
    } else {
        if (player.x < 0) player.x = 0;
    }

    // --- Timers ---
    if (player.invincibleTimer && player.invincibleTimer > 0) player.invincibleTimer--;
    if (player.wingTimer && player.wingTimer > 0) {
        player.wingTimer--;
        if (player.wingTimer === 0) player.hasWings = false;
    }

    // --- SHIELD TIMER LOGIC ---
    if (player.hasShield && player.shieldTimer !== undefined && player.shieldTimer > 0) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) {
            player.hasShield = false;
            setHasShield(false);
            createParticles(player.x + player.width/2, player.y + player.height/2, COLORS.SHIELD, 10);
            audio.playCrash(); // Sound when shield breaks naturally
        }
    }

    // --- Power Ups ---
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const p = powerUpsRef.current[i];
        p.floatOffset += 0.1 * speedMultiplier;
        p.y = p.initialY + Math.sin(p.floatOffset) * 5;

        if (checkCollision(player, p)) {
            if (p.type === 'COIN') {
                incrementScore(10);
                audio.playCoin();
            } else if (p.type === 'STAR') {
                player.invincibleTimer = 600; 
                incrementScore(100);
                audio.playPowerUp();
            } else if (p.type === 'WINGS') {
                player.wingTimer = 900; 
                player.hasWings = true;
                incrementScore(100);
                audio.playPowerUp();
            } else if (p.type === 'SHIELD') {
                player.hasShield = true;
                player.shieldTimer = 1200; // 20 seconds at 60FPS
                setHasShield(true);
                incrementScore(100);
                audio.playPowerUp();
            }
            powerUpsRef.current.splice(i, 1);
        }
    }

    // --- Enemies / Bosses ---
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        if (!enemy) continue; 
        
        // --- Boss & Enemy Physics ---
        if (enemy.type === 'PIANO') {
             enemy.vy += GRAVITY * 1.5 * speedMultiplier; 
             enemy.y += enemy.vy;
             
             if (enemy.y + enemy.height > currentGroundY) {
                 enemy.y = currentGroundY - enemy.height;
                 audio.playCrash();
                 createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height, COLORS.BLACK, 10);
                 enemiesRef.current.splice(i, 1); 
                 continue; 
             }
             // Kills other enemies
             for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                 if (i === j) continue;
                 const target = enemiesRef.current[j];
                 if (!target) continue; // Safety check

                 if (checkCollision(enemy, target)) {
                     createParticles(target.x, target.y, COLORS.MARIO_RED, 10);
                     if (target.type === 'BOSS') {
                        audio.stopBossMusic();
                        bossSpawnedRef.current = false;
                        bossCountRef.current++;
                        if (bossCountRef.current >= 3) {
                            triggerEnding(width, height);
                            break; // Stop loop if ending triggered
                        }
                     }
                     // Safely splice
                     if (enemiesRef.current.length > j) {
                        enemiesRef.current.splice(j, 1);
                     }
                     if (j < i) i--;
                 }
             }
             
             // If ending was triggered during inner loop, stop processing logic
             if (isEndingRef.current) break;
        } else if (['EAGLE', 'STORK'].includes(enemy.type || '')) {
             enemy.x += enemy.vx * speedMultiplier;
             // Bobbing
             enemy.y += Math.sin(frameCountRef.current * 0.05) * 2;
        } else {
             // Ground enemies (Mario, Boss, Dragon, Gorilla)
             enemy.vy += GRAVITY;
             enemy.x += enemy.vx * speedMultiplier;
             enemy.y += enemy.vy;

             if (['BOSS', 'DRAGON', 'GORILLA'].includes(enemy.type || '')) {
                 if (enemy.grounded && Math.random() < 0.02 * speedMultiplier) {
                     enemy.vy = JUMP_FORCE * 1.2;
                     enemy.grounded = false;
                 }
                 // Turn around if hitting walls
                 const leftLimit = dungeonRef.current.active ? -1000 + 40 : cameraRef.current.x;
                 const rightLimit = dungeonRef.current.active ? -1000 + 760 : cameraRef.current.x + width;
                 
                 if (enemy.x < leftLimit && enemy.vx < 0) enemy.vx *= -1;
                 if (enemy.x + enemy.width > rightLimit && enemy.vx > 0) enemy.vx *= -1;
             } else {
                 // Basic Mario AI
                 if (Math.random() < 0.01) enemy.vx = (Math.random() > 0.5 ? 1 : -1) * (MARIO_SPEED * 2.5);
             }

             if (enemy.y + enemy.height > currentGroundY) {
                enemy.y = currentGroundY - enemy.height;
                enemy.vy = 0;
                enemy.grounded = true;
             }
             
             platformsRef.current.forEach(plat => {
                if (!plat.isSolid) return;
                if (enemy.vy > 0 && 
                    enemy.y + enemy.height > plat.y && 
                    enemy.y + enemy.height < plat.y + enemy.height + 15 && 
                    enemy.x + enemy.width > plat.x && 
                    enemy.x < plat.x + plat.width
                ) {
                    enemy.y = plat.y - enemy.height;
                    enemy.vy = 0;
                    if (plat.type === 'BOUNCY') enemy.vy = JUMP_FORCE;
                    if (enemy.x < plat.x) enemy.vx = Math.abs(enemy.vx); 
                    if (enemy.x + enemy.width > plat.x + plat.width) enemy.vx = -Math.abs(enemy.vx);
                }
            });
        }

        // --- PLAYER vs ENEMY COLLISION ---
        if (checkCollision(player, enemy)) {
            if (!player.hasMoved) continue;

            if (enemy.type === 'PIANO') {
                if (player.hasShield) {
                    player.hasShield = false;
                    setHasShield(false);
                    player.invincibleTimer = 60;
                    createParticles(player.x + player.width/2, player.y + player.height/2, COLORS.SHIELD, 15);
                    audio.playCrash();
                    enemiesRef.current.splice(i, 1);
                    continue;
                }
                if (handlePlayerDamage("Crushed by Piano")) break; 
                enemiesRef.current.splice(i, 1);
                continue;
            }
            
            const isInvincible = player.invincibleTimer && player.invincibleTimer > 0;
            // Strict Top Detection for Hardcore Combat
            const hitFromTop = (player.y + player.height) - enemy.y < 30 && player.vy > 0;

            if (hitFromTop || isInvincible) {
                player.vy = -10; // Bounce high
                audio.playStomp();
                
                // Damage Logic
                if (['BOSS', 'DRAGON', 'GORILLA'].includes(enemy.type || '')) {
                    if (enemy.hp && enemy.hp > 1) {
                         enemy.hp--;
                         enemy.vx *= 1.5; 
                         createParticles(enemy.x + enemy.width/2, enemy.y, COLORS.MARIO_RED, 5);
                    } else {
                         createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.MARIO_RED, 20);
                         
                         // Special Boss Rewards/Logic
                         if (enemy.type === 'BOSS') {
                             audio.stopBossMusic();
                             bossSpawnedRef.current = false;
                             bossCountRef.current++;
                             if (bossCountRef.current >= 3) {
                                 triggerEnding(width, height);
                                 setGameState(GameState.VICTORY);
                             } else {
                                 for(let k=0; k<5; k++) spawnPowerUpAt(enemy.x + Math.random()*50, enemy.y - 50);
                             }
                         } else if (dungeonRef.current.active) {
                             exitDungeon();
                             incrementScore(2000);
                         }

                         enemiesRef.current.splice(i, 1);
                         incrementScore(1000);
                    }
                } else {
                    createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.MARIO_RED, 8);
                    enemiesRef.current.splice(i, 1);
                    incrementScore(50);
                }
            } else {
                // Not hit from top = Death (unless shield)
                if (player.hasShield) {
                    player.hasShield = false;
                    setHasShield(false);
                    player.invincibleTimer = 60; 
                    audio.playCrash(); 
                    createParticles(player.x + player.width/2, player.y + player.height/2, COLORS.SHIELD, 10);
                    player.vy = -8;
                    player.vx = player.x < enemy.x ? -10 : 10;
                } else {
                    if (handlePlayerDamage(enemy.type === 'BOSS' ? "Defeated by Boss" : "Killed by Enemy")) break; 
                }
            }
        }
    }

    // --- Particles ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;
        p.life -= 0.05 * speedMultiplier;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }
  };

  const incrementScore = (amount: number) => {
      scoreRef.current += amount;
      setScore(scoreRef.current);
  };

  const checkCollision = (r1: any, r2: any) => {
    if (!r1 || !r2) return false;
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
  };

  const handlePlayerDamage = (reason: string): boolean => {
      const p = playerRef.current;
      if (p.invincibleTimer && p.invincibleTimer > 0) return false;

      if (livesRef.current > 1) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (canvasRef.current) resetGame(canvasRef.current.width, canvasRef.current.height, false); 
          audio.playDie(); 
          return true; 
      } else {
          livesRef.current = 0;
          setLives(0);
          setDeathReason(reason);
          setGameState(GameState.GAME_OVER);
          audio.playDie();
          audio.stopBossMusic();
          return true;
      }
  };

  // Rendering
  const drawSprite = (ctx: CanvasRenderingContext2D, sprite: number[][], x: number, y: number, width: number, height: number, facingRight: boolean, opacity: number = 1.0) => {
    const pixelW = width / 12;
    const pixelH = height / 12;
    const drawX = Math.round(x);
    const drawY = Math.round(y);

    ctx.save();
    ctx.globalAlpha = opacity;
    
    ctx.translate(drawX, drawY);
    if (!facingRight) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 12; col++) {
            const val = sprite[row][col];
            if (val !== 0) {
                // ... Color mapping ...
                let color = COLORS.BLACK;
                if (sprite === PIANO_SPRITE) {
                    color = val === 1 ? COLORS.PIANO_BLACK : COLORS.PIANO_WHITE;
                } else if (sprite === MUSHROOM_SPRITE) {
                    color = val === 1 ? COLORS.MUSHROOM : (val === 2 ? COLORS.MUSHROOM_FACE : COLORS.BLACK);
                } else if (sprite === MINI_MUSHROOM_SPRITE) {
                    color = val === 1 ? COLORS.MUSHROOM : (val === 2 ? COLORS.MUSHROOM_FACE : COLORS.BLACK);
                } else if (sprite === STAR_SPRITE) {
                     color = val === 1 ? COLORS.STAR : COLORS.BLACK;
                } else if (sprite === WINGS_SPRITE) {
                     color = COLORS.WINGS;
                } else if (sprite === SHIELD_SPRITE) {
                     color = val === 1 ? COLORS.SHIELD : (val === 2 ? COLORS.SHIELD_DETAIL : COLORS.WHITE);
                } else if (sprite === COIN_SPRITE) {
                     color = val === 3 ? COLORS.BLACK : (val === 1 ? COLORS.STAR : COLORS.GOLD_DIM);
                } else if (sprite === WOLF_SPRITE) {
                    if (val === 1) color = COLORS.WOLF_GREY;
                    else if (val === 2) color = COLORS.BLACK;
                    else if (val === 3) color = COLORS.BLACK;
                    else if (val === 4) color = COLORS.BOUNCY; // Pinkish
                    else if (val === 5) color = COLORS.WOLF_PANTS;
                } else if (sprite === EGG_SPRITE) {
                    color = val === 2 ? COLORS.EGG : COLORS.BLACK;
                } else if (sprite === DRAGON_SPRITE) {
                    color = val === 1 ? COLORS.DRAGON_GREEN : (val === 2 ? COLORS.DRAGON_RED : COLORS.BLACK);
                } else if (sprite === GORILLA_SPRITE) {
                    color = val === 1 ? COLORS.GORILLA_BROWN : (val === 2 ? COLORS.MUSHROOM_FACE : (val === 3 ? COLORS.GORILLA_BLUE : COLORS.BLACK));
                } else if (sprite === EAGLE_SPRITE) {
                    color = val === 1 ? COLORS.EAGLE_BROWN : (val === 2 ? COLORS.WHITE : COLORS.BLACK);
                } else if (sprite === STORK_SPRITE) {
                    color = val === 1 ? COLORS.STORK_WHITE : (val === 2 ? COLORS.STORK_ORANGE : COLORS.BLACK);
                } else {
                    if (val === 1) color = COLORS.MARIO_RED;
                    else if (val === 2) color = COLORS.MARIO_SKIN;
                    else if (val === 3) color = COLORS.BLACK;
                    else if (val === 4) color = COLORS.MARIO_BLUE;
                }
                ctx.fillStyle = color;
                ctx.fillRect(col * pixelW, row * pixelH, pixelW + 0.5, pixelH + 0.5);
            }
        }
    }
    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const GROUND_Y = dungeonRef.current.active ? 600 : height - 40;
    const camX = Math.floor(cameraRef.current.x);

    // Sky or Dungeon Background
    ctx.fillStyle = dungeonRef.current.active ? '#110011' : COLORS.SKY;
    ctx.fillRect(0, 0, width, height);

    if (dungeonRef.current.active) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height); // Dark dungeon bg
    }

    // Decorations
    if (!dungeonRef.current.active) {
        decorationsRef.current.forEach(d => {
            const screenX = d.x - camX;
            if (screenX + d.width < 0 || screenX > width) return;

            if (d.type === 'CLOUD') {
                ctx.fillStyle = COLORS.CLOUD;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(screenX, d.y, d.width, d.height);
                ctx.globalAlpha = 1.0;
            } else if (d.type === 'HILL') {
                ctx.fillStyle = COLORS.HILL_FILL;
                ctx.strokeStyle = COLORS.HILL_OUTLINE;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(screenX + d.width/2, d.y + d.height, d.width/2, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
            } else if (d.type === 'BUSH') {
                ctx.fillStyle = COLORS.BUSH;
                ctx.beginPath();
                ctx.arc(screenX + 20, d.y + d.height, 20, Math.PI, 0);
                ctx.arc(screenX + 40, d.y + d.height - 10, 25, Math.PI, 0);
                ctx.arc(screenX + 60, d.y + d.height, 20, Math.PI, 0);
                ctx.fill();
            }
        });
    }

    // Platforms
    platformsRef.current.forEach(p => {
        const screenX = p.x - camX;
        if (screenX + p.width < 0 || screenX > width) return;

        let opacity = 1.0;
        if (p.isGhost) {
            const cycle = (p.ghostTimer || 0) % 300;
            if (cycle >= 120 && cycle < 180) opacity = (Math.floor(frameCountRef.current / 5) % 2 === 0) ? 0.5 : 1.0; 
            else if (cycle >= 180) opacity = 0.3; 
        }
        ctx.globalAlpha = opacity;

        if (p.type === 'PIPE' || p.type === 'GOLD_PIPE') {
            const light = p.type === 'GOLD_PIPE' ? COLORS.PIPE_GOLD : COLORS.PIPE_LIGHT;
            const dark = p.type === 'GOLD_PIPE' ? COLORS.PIPE_GOLD_DARK : COLORS.PIPE_DARK;

            ctx.fillStyle = light;
            ctx.fillRect(screenX, p.y, p.width, p.height);
            ctx.fillStyle = dark;
            ctx.fillRect(screenX + 10, p.y, 4, p.height); 
            ctx.fillRect(screenX + p.width - 10, p.y, 4, p.height); 
            ctx.strokeStyle = COLORS.BLACK;
            ctx.strokeRect(screenX, p.y, p.width, p.height);
            ctx.fillStyle = light;
            ctx.fillRect(screenX - 4, p.y, p.width + 8, 30);
            ctx.strokeRect(screenX - 4, p.y, p.width + 8, 30);
        } else if (p.type === 'ICE') {
            ctx.fillStyle = COLORS.ICE;
            ctx.fillRect(screenX, p.y, p.width, p.height);
            ctx.strokeStyle = COLORS.WHITE;
            ctx.strokeRect(screenX, p.y, p.width, p.height);
        } else if (p.type === 'BOUNCY') {
            ctx.fillStyle = COLORS.BOUNCY;
            ctx.fillRect(screenX, p.y, p.width, p.height);
            ctx.strokeStyle = COLORS.WHITE;
            ctx.strokeRect(screenX, p.y, p.width, p.height);
        } else if (p.type === 'BLOCK') {
            ctx.fillStyle = '#C0C0C0'; // Grey Block
            ctx.fillRect(screenX, p.y, p.width, p.height);
            ctx.strokeRect(screenX, p.y, p.width, p.height);
            // Screws
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX + 5, p.y + 5, 4, 4);
            ctx.fillRect(screenX + p.width - 9, p.y + 5, 4, 4);
            ctx.fillRect(screenX + 5, p.y + p.height - 9, 4, 4);
            ctx.fillRect(screenX + p.width - 9, p.y + p.height - 9, 4, 4);
        } else {
            ctx.fillStyle = COLORS.BRICK;
            ctx.fillRect(screenX, p.y, p.width, p.height);
            ctx.fillStyle = COLORS.BRICK_SHADOW;
            for(let i=0; i<p.width; i+=30) {
                ctx.fillRect(screenX + i, p.y, 2, p.height);
                ctx.fillRect(screenX + i, p.y + 15, 30, 2);
            }
            ctx.fillRect(screenX, p.y + p.height - 4, p.width, 4);
        }
        ctx.globalAlpha = 1.0;
    });

    // Ground
    ctx.fillStyle = COLORS.GROUND;
    ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y); // Fill to bottom
    ctx.fillStyle = COLORS.GROUND_TOP; 
    ctx.fillRect(0, GROUND_Y, width, 6);

    // Power Ups
    powerUpsRef.current.forEach(p => {
        const screenX = p.x - camX;
        if (screenX + p.width < 0 || screenX > width) return;
        
        let sprite = STAR_SPRITE;
        if (p.type === 'WINGS') sprite = WINGS_SPRITE;
        else if (p.type === 'COIN') sprite = COIN_SPRITE;
        else if (p.type === 'SHIELD') sprite = SHIELD_SPRITE;

        drawSprite(ctx, sprite, screenX, p.y, p.width, p.height, true);
    });

    // Cutscene Entities
    cutsceneEntitiesRef.current.forEach(e => {
        const screenX = e.x - camX;
        if (e.type === 'WOLF') {
             drawSprite(ctx, WOLF_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
        } else if (e.itemType === 'EGG') {
             drawSprite(ctx, EGG_SPRITE, screenX, e.y, e.width, e.height, true);
        } else if (e.itemType === 'MINI_MUSHROOM') {
             drawSprite(ctx, MINI_MUSHROOM_SPRITE, screenX, e.y, e.width, e.height, true);
        }
    });

    // Player
    const p = playerRef.current;
    if (gameState !== GameState.GAME_OVER && gameState !== GameState.MENU && !p.dead) {
        let opacity = 1.0;
        if ((p.invincibleTimer && p.invincibleTimer > 0) || !p.hasMoved) {
            opacity = Math.floor(frameCountRef.current / 4) % 2 === 0 ? 1.0 : 0.6;
        }

        const screenX = p.x - camX;
        const drawW = p.width * (p.scale || 1);
        const drawH = p.height * (p.scale || 1);
        const drawX = screenX - (drawW - p.width)/2;
        const drawY = p.y - (drawH - p.height);

        if (p.hasWings || (p.wingTimer && p.wingTimer > 0)) {
            const wingX = p.facingRight ? drawX - 15 : drawX + drawW - 15;
            const wingYOffset = Math.sin(frameCountRef.current * 0.5) * 5;
            drawSprite(ctx, WINGS_SPRITE, wingX, drawY - 10 + wingYOffset, 30, 30, p.facingRight || false, opacity);
        }
        
        drawSprite(ctx, MUSHROOM_SPRITE, drawX, drawY, drawW, drawH, p.facingRight || false, opacity);
        
        if (p.hasShield) {
            ctx.save();
            ctx.strokeStyle = COLORS.SHIELD;
            ctx.lineWidth = 3;
            ctx.shadowColor = COLORS.SHIELD;
            ctx.shadowBlur = 10;
            
            // Flicker if low on time
            let shieldOpacity = 0.6 + Math.sin(frameCountRef.current * 0.1) * 0.2;
            if (p.shieldTimer && p.shieldTimer < 180) { // Last 3 seconds (60fps * 3)
                shieldOpacity = (Math.floor(frameCountRef.current / 10) % 2 === 0) ? 0.2 : 0.8;
            }
            
            ctx.globalAlpha = shieldOpacity;
            
            ctx.beginPath();
            ctx.arc(drawX + drawW/2, drawY + drawH/2, drawW/1.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Enemies
    enemiesRef.current.forEach(e => {
       const screenX = e.x - camX;
       if (screenX + e.width < 0 || screenX > width) return;
       
       if (e.type === 'PIANO') {
           drawSprite(ctx, PIANO_SPRITE, screenX, e.y, e.width, e.height, true);
       } else if (e.type === 'DRAGON') {
           drawSprite(ctx, DRAGON_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
       } else if (e.type === 'GORILLA') {
           drawSprite(ctx, GORILLA_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
       } else if (e.type === 'EAGLE') {
           drawSprite(ctx, EAGLE_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
       } else if (e.type === 'STORK') {
           drawSprite(ctx, STORK_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
       } else {
           drawSprite(ctx, MARIO_SPRITE, screenX, e.y, e.width, e.height, e.facingRight || false);
           if (e.type === 'BOSS' && e.hp) {
               ctx.fillStyle = 'red';
               ctx.fillRect(screenX, e.y - 20, e.width, 8);
               ctx.fillStyle = 'green';
               ctx.fillRect(screenX, e.y - 20, e.width * (e.hp / (e.maxHp || 3)), 8);
               ctx.strokeStyle = 'white';
               ctx.strokeRect(screenX, e.y - 20, e.width, 8);
           }
       }
    });

    // Particles
    particlesRef.current.forEach(p => {
        const screenX = p.x - camX;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(screenX, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
    });
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(animate);

    const canvas = canvasRef.current;
    if(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameState === GameState.MENU) {
             // Wait
        } else if (frameCountRef.current === 0) {
             resetGame(canvas.width, canvas.height, true);
        }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate, handleKeyDown, handleKeyUp, gameState]);

  useEffect(() => {
      if (gameState === GameState.PLAYING && frameCountRef.current === 0) {
           if (canvasRef.current) resetGame(canvasRef.current.width, canvasRef.current.height, true);
      }
  }, [gameState]);

  return (
    <>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {gameState === GameState.PLAYING && (
        <div className="absolute bottom-4 left-4 flex gap-4 md:hidden z-20">
            <button 
                className="w-16 h-16 bg-white/20 rounded-full border-2 border-white text-white active:bg-white/40 select-none backdrop-blur-sm"
                onTouchStart={() => keysRef.current['ArrowLeft'] = true}
                onTouchEnd={() => keysRef.current['ArrowLeft'] = false}
            >←</button>
            <button 
                className="w-16 h-16 bg-white/20 rounded-full border-2 border-white text-white active:bg-white/40 select-none backdrop-blur-sm"
                onTouchStart={() => keysRef.current['ArrowRight'] = true}
                onTouchEnd={() => keysRef.current['ArrowRight'] = false}
            >→</button>
        </div>
      )}
       {gameState === GameState.PLAYING && (
        <div className="absolute bottom-4 right-4 md:hidden z-20">
            <button 
                className="w-20 h-20 bg-red-500/50 rounded-full border-2 border-white text-white active:bg-red-500/70 select-none font-bold backdrop-blur-sm"
                onTouchStart={() => keysRef.current['Space'] = true}
                onTouchEnd={() => keysRef.current['Space'] = false}
            >JUMP</button>
        </div>
       )}
    </>
  );
};

export default GameCanvas;
