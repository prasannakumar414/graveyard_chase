export const TILE_SIZE = 40;
export const ARENA = { columns: 24, rows: 16, width: 960, height: 640 } as const;
const REAPER_SPEED = 250;
export const SPEED = { skull: REAPER_SPEED, man: REAPER_SPEED * 0.90, hero: REAPER_SPEED * 1.10 } as const;
export const MAN_SPEED_SCALING = { maxMultiplier: 0.95, timeConstantMs: 60000 } as const;
export const HERO_SPEED_SCALING = { gainPerSoul: 0.005, maxMultiplier: 2.0 } as const;
export const MOTION = {
    acceleration: 700, // px/s²; higher speeds take longer to brake and reverse.
    arrivalGain: 5,
    waypointRadius: 3,
    waypointSpeed: 24,
} as const;
export const ACTION_DURATION = { skullAttack: 420, heroAttack: 650, skullDeath: 900 } as const;
// Combat reach is separate from the narrow foot bodies used to navigate graves.
export const REAPER_ATTACK_REACH = 36;
export const HERO_ATTACK_REACH = 36;
export const PLAYER_LIVES = 3;

export const GAME_EVENTS = {
    ready: 'current-scene-ready',
    state: 'graveyard-state',
    start: 'graveyard-start',
    restart: 'graveyard-restart',
    pause: 'graveyard-pause',
    mute: 'graveyard-mute',
    move: 'graveyard-move',
} as const;

export type Phase = 'man' | 'transforming' | 'hero' | 'reverting' | 'dying' | 'respawning' | 'gameover';
export interface GameSnapshot {
    score: number;
    lives: number;
    phase: Phase;
    seconds: number;
    progress: number;
    elapsed: number;
    started: boolean;
    paused: boolean;
    over: boolean;
    muted: boolean;
}
