import type { Scene } from 'phaser';
import { ARENA, TILE_SIZE } from '../config';
import { Point, toWorld } from './navigation';

export function buildGraveyard(scene: Scene, graves: readonly Point[]) {
    const data = Array.from({ length: ARENA.rows }, (_, y) =>
        Array.from({ length: ARENA.columns }, (_, x) => {
            if (x === 0 || y === 0 || x === ARENA.columns - 1 || y === ARENA.rows - 1) return 3;
            if (x === 2 || x === 3 || x === 11 || x === 12 || x === 20 || x === 21 || y === 7 || y === 8) return (x + y) % 2 ? 2 : 4;
            return [0, 1, 5][(x * 7 + y * 13) % 3];
        }));
    const map = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('graveyard-tiles')!;
    const ground = map.createLayer(0, tileset, 0, 0)!;
    ground.setCollision(3);
    const obstacles = scene.physics.add.staticGroup();
    graves.forEach((cell, index) => {
        const { x, y } = toWorld(cell);
        const zone = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0, 0);
        obstacles.add(zone);
        scene.add.image(x + 2, y + 13, `grave-${index % 3}`).setOrigin(0.5, 0.875).setDepth(y + 12);
        if (index % 3 === 0) addCandle(scene, x - 26, y + 12);
    });
    [[62, 68], [898, 68], [62, 582], [898, 582], [461, 63], [499, 582]].forEach(([x, y]) => addCandle(scene, x, y));
    // Small flowers and pebbles are decoration; only graves and the perimeter block movement.
    const details = scene.add.graphics();
    for (let i = 0; i < 65; i++) {
        const x = 55 + (i * 137) % 850, y = 62 + (i * 83) % 510;
        details.fillStyle(i % 4 === 0 ? 0xa695b1 : 0x59694c, 0.65);
        details.fillRect(x, y, 3, 2);
        details.fillStyle(0x1c3129); details.fillRect(x + 1, y + 2, 1, 4);
    }
    scene.add.image(480, 320, 'vignette').setDepth(2000);
    return { ground, obstacles };
}

function addCandle(scene: Scene, x: number, y: number) {
    const glow = scene.add.image(x, y - 14, 'glow').setDepth(900).setAlpha(0.65);
    scene.add.image(x, y, 'candle').setOrigin(0.5, 1).setDepth(y);
    scene.tweens.add({ targets: glow, alpha: 0.9, scale: 1.15, duration: 750 + x % 400, yoyo: true, repeat: -1 });
}
