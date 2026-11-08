import { HERO_SPEED_SCALING, MAN_SPEED_SCALING, PLAYER_LIVES, SPEED, type Phase } from '../config';

export const PHASE_DURATION = { transformation: 650, death: 750, respawn: 1200 } as const;
export const TRANSFORMATION_TIMING = {
    cooldownMin: 5000,
    cooldownMax: 7000,
    baseHeroDuration: 3000,
    growthPerMinute: 1000,
    growthPerSoul: 150,
} as const;

/** Pure round rules; Phaser owns rendering and movement, not scoring decisions. */
export class ChaseRound {
    phase: Phase = 'man';
    lives = PLAYER_LIVES;
    private collectedSouls = 0;
    private elapsed = 0;
    private cooldownRemaining = 0;
    private cooldownDuration = 0;
    remaining = 0;
    duration = 0;

    constructor(private readonly random: () => number = Math.random) {
        this.setPhase('man');
    }

    get score() {
        return this.collectedSouls;
    }

    get manSpeed() {
        // Exponential ease-out: speed rises continuously while its growth rate decays.
        const cap = SPEED.skull * MAN_SPEED_SCALING.maxMultiplier;
        const progress = -Math.expm1(-this.elapsed / MAN_SPEED_SCALING.timeConstantMs);
        return Math.min(cap, SPEED.man + (cap - SPEED.man) * progress);
    }

    get heroSpeed() {
        const increase = this.collectedSouls * SPEED.skull * HERO_SPEED_SCALING.gainPerSoul;
        return Math.min(SPEED.hero + increase, SPEED.skull * HERO_SPEED_SCALING.maxMultiplier);
    }

    advance(delta: number): boolean {
        if (this.phase === 'gameover') return false;
        // Only active gameplay advances this clock; the scene skips updates while paused.
        this.elapsed += delta;
        if (this.phase === 'man' || this.phase === 'dying') {
            this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
        }
        this.remaining -= delta;
        if (this.remaining > 0) return false;
        const next: Record<Exclude<Phase, 'gameover'>, Phase> = {
            man: 'transforming', transforming: 'hero', hero: 'reverting',
            reverting: 'man', dying: this.cooldownRemaining > 0 ? 'man' : 'transforming', respawning: 'man',
        };
        this.setPhase(next[this.phase]);
        return true;
    }

    collide(): 'point' | 'caught' | null {
        if (this.phase === 'man') {
            this.collectedSouls += 1;
            this.setPhase('dying');
            return 'point';
        }
        if (this.phase === 'hero') {
            this.lives -= 1;
            this.setPhase(this.lives === 0 ? 'gameover' : 'respawning');
            return 'caught';
        }
        return null;
    }

    private setPhase(phase: Phase) {
        const previous = this.phase;
        this.phase = phase;
        // Capturing Man does not buy a fresh cooldown; only a new cycle resets it.
        if (phase === 'man' && previous !== 'dying') {
            this.cooldownDuration = TRANSFORMATION_TIMING.cooldownMin
                + Math.floor(this.random() * (TRANSFORMATION_TIMING.cooldownMax - TRANSFORMATION_TIMING.cooldownMin + 1));
            this.cooldownRemaining = this.cooldownDuration;
        }
        this.duration = phase === 'man' ? this.cooldownDuration
            : phase === 'hero' ? TRANSFORMATION_TIMING.baseHeroDuration
                + this.elapsed / 60000 * TRANSFORMATION_TIMING.growthPerMinute
                + this.collectedSouls * TRANSFORMATION_TIMING.growthPerSoul
            : phase === 'dying' ? PHASE_DURATION.death
            : phase === 'respawning' ? PHASE_DURATION.respawn : PHASE_DURATION.transformation;
        this.remaining = phase === 'man' ? this.cooldownRemaining : this.duration;
    }
}
