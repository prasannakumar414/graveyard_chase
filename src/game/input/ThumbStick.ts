import type { Point } from '../world/navigation';

const DEAD_ZONE_PX = 10;
export const ROTATED_LANDSCAPE_QUERY = '(pointer: coarse) and (orientation: portrait)';

/** Owns one thumb at a time; a second thumb cannot cancel or steal movement. */
export class ThumbStick {
    private pointerId: number | null = null;
    private origin: Point = { x: 0, y: 0 };
    private rotated = false;
    private radius = 1;

    constructor(private publish: (direction: Point, knob: Point) => void) {}

    begin(pointerId: number, origin: Point, rotated: boolean, radius: number) {
        if (this.pointerId !== null) return false;
        this.pointerId = pointerId;
        this.origin = origin;
        this.rotated = rotated;
        this.radius = Math.max(1, radius);
        return true;
    }

    move(pointerId: number, position: Point) {
        if (this.pointerId !== pointerId) return;
        const screenX = position.x - this.origin.x;
        const screenY = position.y - this.origin.y;
        // Undo the fallback stage's clockwise rotation for game-local movement.
        const x = this.rotated ? screenY : screenX;
        const y = this.rotated ? -screenX : screenY;
        const length = Math.hypot(x, y);
        if (length < DEAD_ZONE_PX) {
            this.publish({ x: 0, y: 0 }, { x: 0, y: 0 });
            return;
        }
        const direction = { x: x / length, y: y / length };
        const travel = Math.min(length, this.radius);
        this.publish(direction, { x: direction.x * travel, y: direction.y * travel });
    }

    release(pointerId: number) {
        if (this.pointerId === pointerId) this.clear();
    }

    clear() {
        this.pointerId = null;
        this.publish({ x: 0, y: 0 }, { x: 0, y: 0 });
    }
}
