import { HERO_ATTACK_REACH, REAPER_ATTACK_REACH, type Phase } from '../config';
import type { Point } from '../world/navigation';

/** Trigger the scythe at visible melee contact, rather than requiring feet to overlap. */
export function canReaperAttack(phase: Phase, player: Point, opponent: Point): boolean {
    if (phase !== 'man') return false;
    return canCombatContact(phase, { player, opponent });
}

export interface CombatPositions {
    player: Point;
    opponent: Point;
}

/** Test relative movement between physics steps, including fast diagonal crossings. */
export function canCombatContact(phase: Phase, current: CombatPositions, previous = current): boolean {
    if (phase !== 'man' && phase !== 'hero') return false;
    const reach = phase === 'man' ? REAPER_ATTACK_REACH : HERO_ATTACK_REACH;
    const start = {
        x: previous.opponent.x - previous.player.x,
        y: previous.opponent.y - previous.player.y,
    };
    const end = {
        x: current.opponent.x - current.player.x,
        y: current.opponent.y - current.player.y,
    };
    const movement = { x: end.x - start.x, y: end.y - start.y };
    const lengthSquared = movement.x * movement.x + movement.y * movement.y;
    const closestTime = lengthSquared > 0
        ? Math.max(0, Math.min(1, -(start.x * movement.x + start.y * movement.y) / lengthSquared))
        : 0;
    const x = start.x + movement.x * closestTime;
    const y = start.y + movement.y * closestTime;
    return x * x + y * y <= reach * reach;
}
