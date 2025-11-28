
export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY
}

export interface Entity {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  grounded: boolean;
  dead?: boolean;
  facingRight?: boolean;
  frame?: number;
  // Powerup States
  invincibleTimer?: number;
  wingTimer?: number; // How long wings last
  hasShield?: boolean;
  jumpsAvailable?: number;
  hasWings?: boolean;
  // New: Spawn immunity state
  hasMoved?: boolean;
  // Enemy/Boss States
  type?: 'ENEMY' | 'BOSS' | 'PIANO' | 'WOLF' | 'CUTSCENE_ITEM' | 'DRAGON' | 'GORILLA' | 'EAGLE' | 'STORK';
  variant?: number; // 1, 2, 3 for bosses
  hp?: number;
  maxHp?: number;
  // Cutscene specific
  scale?: number;
  itemType?: 'EGG' | 'MINI_GOOMBA';
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'BRICK' | 'PIPE' | 'GOLD_PIPE' | 'BLOCK' | 'ICE' | 'BOUNCY'; 
  // Dynamic properties
  isGhost?: boolean;
  ghostTimer?: number;
  isSolid?: boolean;
  // Moving properties
  minY?: number;
  maxY?: number;
  dirY?: number;
  moveSpeed?: number;
}

export interface Decoration {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'HILL' | 'BUSH' | 'CLOUD';
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'STAR' | 'WINGS' | 'COIN' | 'SHIELD';
  initialY: number; 
  floatOffset: number;
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

export interface AIResponse {
  message: string;
}
