import { ARENA, TILE_SIZE } from '../config';

export interface Point { x: number; y: number }
export type Grid = boolean[][];

export const GRAVE_COUNT = 24;
const WANDER_RADIUS = 270;
export const SPAWN_CELLS = { reaper: { x: 10, y: 8 }, man: { x: 14, y: 8 } } as const;

/** Scatter graves without blocking spawns or cutting off walkable areas. */
export function createGraves(random: () => number = Math.random): Point[] {
    const grid = createGrid();
    const candidates = openCells(grid).filter(cell =>
        cell.x > 1 && cell.y > 1 && cell.x < ARENA.columns - 2 && cell.y < ARENA.rows - 2 &&
        Object.values(SPAWN_CELLS).every(spawn =>
            Math.abs(cell.x - spawn.x) > 1 || Math.abs(cell.y - spawn.y) > 1));
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const graves: Point[] = [];
    for (const cell of candidates) {
        grid[cell.y][cell.x] = false;
        const queue: Point[] = [SPAWN_CELLS.man];
        const visited = new Set([`${SPAWN_CELLS.man.x},${SPAWN_CELLS.man.y}`]);
        for (let i = 0; i < queue.length; i++) {
            for (const next of neighbors(grid, queue[i])) {
                const key = `${next.x},${next.y}`;
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push(next);
            }
        }
        if (visited.size === openCells(grid).length) graves.push(cell);
        else grid[cell.y][cell.x] = true;
        if (graves.length === GRAVE_COUNT) break;
    }
    return graves;
}

export function createGrid(graves: readonly Point[] = []): Grid {
    const grid = Array.from({ length: ARENA.rows }, (_, y) =>
        Array.from({ length: ARENA.columns }, (_, x) =>
            x > 0 && y > 0 && x < ARENA.columns - 1 && y < ARENA.rows - 1));
    for (const grave of graves) grid[grave.y][grave.x] = false;
    return grid;
}

export function toCell(point: Point): Point {
    return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
}

export function toWorld(point: Point): Point {
    return { x: point.x * TILE_SIZE + TILE_SIZE / 2, y: point.y * TILE_SIZE + TILE_SIZE / 2 };
}

export function neighbors(grid: Grid, point: Point, allowDiagonal = false): Point[] {
    const adjacent = [{ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 }]
        .filter(p => grid[p.y]?.[p.x]);
    if (allowDiagonal) {
        for (const x of [-1, 1]) {
            for (const y of [-1, 1]) {
                // Both side tiles must be clear to keep the body away from grave corners.
                if (grid[point.y]?.[point.x + x] && grid[point.y + y]?.[point.x]
                    && grid[point.y + y]?.[point.x + x]) {
                    adjacent.push({ x: point.x + x, y: point.y + y });
                }
            }
        }
    }
    return adjacent;
}

/** Shortest-distance grid search; returns cell centers after the starting cell. */
export function findPath(grid: Grid, start: Point, goal: Point, allowDiagonal = false): Point[] {
    if (!grid[start.y]?.[start.x] || !grid[goal.y]?.[goal.x]) return [];
    const key = (p: Point) => `${p.x},${p.y}`;
    const queue = [start];
    const parents = new Map<string, Point | null>([[key(start), null]]);
    const costs = new Map<string, number>([[key(start), 0]]);
    while (queue.length > 0) {
        // Diagonals cost sqrt(2), so prioritize distance rather than number of tiles.
        if (allowDiagonal) queue.sort((a, b) => costs.get(key(a))! - costs.get(key(b))!);
        const current = queue.shift()!;
        if (current.x === goal.x && current.y === goal.y) {
            const path: Point[] = [];
            let step: Point | null = current;
            while (step && parents.get(key(step))) {
                path.unshift(toWorld(step));
                step = parents.get(key(step)) ?? null;
            }
            return path;
        }
        for (const next of neighbors(grid, current, allowDiagonal)) {
            const cost = costs.get(key(current))! + distance(current, next);
            if (cost < (costs.get(key(next)) ?? Infinity)) {
                costs.set(key(next), cost);
                parents.set(key(next), current);
                if (!queue.some(cell => key(cell) === key(next))) queue.push(next);
            }
        }
    }
    return [];
}

export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function openCells(grid: Grid): Point[] {
    return grid.flatMap((row, y) => row.flatMap((open, x) => open ? [{ x, y }] : []));
}

/** Pick a nearby destination without considering the Reaper's position. */
export function randomWanderTarget(cells: readonly Point[], position: Point, random = Math.random): Point {
    const current = toCell(position);
    const candidates = cells.filter(cell =>
        (cell.x !== current.x || cell.y !== current.y)
        && distance(toWorld(cell), position) < WANDER_RADIUS);
    return candidates[Math.floor(random() * candidates.length)] ?? current;
}
