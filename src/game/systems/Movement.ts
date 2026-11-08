import { Input, Scene } from 'phaser';
import { instantPathMotion, pathMotion } from './Motion';
import { Character } from '../entities/Character';
import { distance, findPath, Grid, openCells, Point, randomWanderTarget, toCell, toWorld } from '../world/navigation';

export class PlayerMovement {
    private keys: Record<string, Input.Keyboard.Key>;
    private path: Point[] = [];
    private marker: Phaser.GameObjects.Arc;
    private touchDirection: Point = { x: 0, y: 0 };

    constructor(private scene: Scene, private grid: Grid) {
        this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Input.Keyboard.Key>;
        this.marker = scene.add.circle(0, 0, 7).setStrokeStyle(1, 0xc4e7a1, 0.8).setVisible(false).setDepth(1);
    }

    pointTo(player: Character, point: Point) {
        const cell = toCell(point);
        if (!this.grid[cell.y]?.[cell.x]) return;
        this.path = findPath(this.grid, toCell(player), cell);
        // Align with the current cell first, avoiding diagonal cuts across grave corners.
        if (this.path.length > 0) this.path.unshift(toWorld(toCell(player)));
        const target = this.path[this.path.length - 1];
        if (target) this.marker.setPosition(target.x, target.y).setVisible(true);
    }

    update(player: Character, speed: number, delta: number) {
        const x = this.touchDirection.x || Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
        const y = this.touchDirection.y || Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
        if (x || y) {
            this.clear(); player.move({ x, y }, speed, delta);
        } else {
            followPath(player, this.path, speed, delta);
            if (this.path.length === 0) this.marker.setVisible(false);
        }
    }

    clear() { this.path = []; this.marker.setVisible(false); }

    setTouchDirection(direction: Point) {
        this.touchDirection = direction;
        this.clear();
    }
}

export class OpponentMovement {
    private path: Point[] = [];
    private rethinkIn = 0;
    private cells: Point[];

    constructor(private grid: Grid) { this.cells = openCells(grid); }

    reset() { this.path = []; this.rethinkIn = 0; }

    update(opponent: Character, player: Character, chasing: boolean, speed: number, delta: number) {
        this.rethinkIn -= delta;
        const atCenter = distance(opponent, toWorld(toCell(opponent))) < 4;
        if (this.path.length === 0 || (chasing && this.rethinkIn <= 0 && atCenter)) {
            const start = toCell(opponent);
            // The reaper can stand inside a grave; pursue the nearest reachable tile.
            const target = chasing
                ? this.cells.reduce((best, cell) =>
                    distance(toWorld(cell), player) < distance(toWorld(best), player) ? cell : best)
                : randomWanderTarget(this.cells, opponent);
            this.path = findPath(this.grid, start, target, chasing);
            if (this.path.length > 0 && !atCenter) this.path.unshift(toWorld(start));
            this.rethinkIn = 180;
        }
        if (chasing && toCell(opponent).x === toCell(player).x && toCell(opponent).y === toCell(player).y) {
            opponent.move({ x: player.x - opponent.x, y: player.y - opponent.y }, speed, delta);
        } else {
            followPath(opponent, this.path, speed, delta);
        }
    }

    spawnAwayFrom(player: Point): Point {
        const candidates = this.cells.map(toWorld).filter(point => distance(point, player) > 300);
        return candidates[Math.floor(Math.random() * candidates.length)] ?? toWorld({ x: 21, y: 13 });
    }
}

function followPath(actor: Character, path: Point[], speed: number, delta: number) {
    if (actor.locked) { actor.setVelocity(0, 0); return; }
    const motion = actor.kind === 'skull'
        ? instantPathMotion(actor, path, speed, delta)
        : pathMotion(actor, actor.body.velocity, path, speed);
    actor.move(motion.direction, motion.speed, delta);
}
