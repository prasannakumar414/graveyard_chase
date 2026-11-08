import { MOTION } from '../config';
import { distance, Point } from '../world/navigation';

/** Set movement immediately, normalizing diagonals to the same total speed. */
export function directionVelocity(direction: Point, speed: number): Point {
    const length = Math.hypot(direction.x, direction.y);
    return length > 0.01
        ? { x: direction.x / length * speed, y: direction.y / length * speed }
        : { x: 0, y: 0 };
}

/** Limit the change in velocity, including braking and sideways steering. */
export function steerVelocity(velocity: Point, direction: Point, speed: number, delta: number): Point {
    const target = directionVelocity(direction, speed);
    const change = { x: target.x - velocity.x, y: target.y - velocity.y };
    const changeLength = Math.hypot(change.x, change.y);
    const maxChange = MOTION.acceleration * Math.max(0, delta) / 1000;
    if (changeLength <= maxChange) return target;
    const fraction = changeLength > 0 ? maxChange / changeLength : 0;
    return { x: velocity.x + change.x * fraction, y: velocity.y + change.y * fraction };
}

/** Follow waypoints without inertia or arrival easing, limiting the last step to avoid overshoot. */
export function instantPathMotion(position: Point, path: Point[], speed: number, delta: number) {
    while (path[0] && distance(position, path[0]) <= MOTION.waypointRadius) path.shift();
    const goal = path[0];
    if (!goal || delta <= 0) return { direction: { x: 0, y: 0 }, speed: 0 };
    return {
        direction: { x: goal.x - position.x, y: goal.y - position.y },
        speed: Math.min(speed, distance(position, goal) * 1000 / delta),
    };
}

/** Brake at corners and destinations, retaining momentum through straight tile runs. */
export function pathMotion(position: Point, velocity: Point, path: Point[], speed: number) {
    while (path.length >= 2) {
        const [a, b] = path;
        const toward = { x: a.x - position.x, y: a.y - position.y };
        const onward = { x: b.x - a.x, y: b.y - a.y };
        const cross = toward.x * onward.y - toward.y * onward.x;
        const dot = toward.x * onward.x + toward.y * onward.y;
        const straight = Math.abs(cross) < Math.hypot(onward.x, onward.y) && dot >= 0;
        if (!straight) break;
        path.shift();
    }
    const next = path[0];
    if (next && distance(position, next) <= MOTION.waypointRadius
        && Math.hypot(velocity.x, velocity.y) <= MOTION.waypointSpeed) {
        path.shift();
    }
    const goal = path[0];
    if (!goal) return { direction: { x: 0, y: 0 }, speed: 0 };
    return {
        direction: { x: goal.x - position.x, y: goal.y - position.y },
        speed: Math.min(speed, distance(position, goal) * MOTION.arrivalGain),
    };
}
