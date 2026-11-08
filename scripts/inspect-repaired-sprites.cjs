// Inspect alpha geometry without rewriting the original or generated artwork.
const sharp = require('sharp');
const fs = require('node:fs');

async function inspect(file, columns, rows, scale) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const width = info.width / columns;
    const height = info.height / rows;
    const frames = [];
    for (let index = 0; index < columns * rows; index++) {
        const x = index % columns * width;
        const y = Math.floor(index / columns) * height;
        let bottom = 0;
        for (let py = Math.ceil(y); py < Math.floor(y + height); py++) {
            for (let px = Math.ceil(x); px < Math.floor(x + width); px++) {
                if (data[(py * info.width + px) * 4 + 3] > 180) bottom = Math.max(bottom, py - y);
            }
        }
        let left = width;
        let right = 0;
        for (let py = Math.ceil(y + bottom - 14); py <= Math.floor(y + bottom); py++) {
            for (let px = Math.ceil(x); px < Math.floor(x + width); px++) {
                if (data[(py * info.width + px) * 4 + 3] > 180) {
                    left = Math.min(left, px - x);
                    right = Math.max(right, px - x);
                }
            }
        }
        frames.push({ x, y, width, height, footX: (left + right) / 2, footY: bottom, scale });
    }
    return frames;
}

(async () => {
    const geometry = {
        transform: await inspect('public/assets/characters/repaired/transform.png', 4, 2, 0.46),
        attack: await inspect('public/assets/characters/repaired/attack.png', 4, 3, 0.60),
    };
    fs.writeFileSync('src/game/art/repairedFrames.json', JSON.stringify(geometry, null, 2) + '\n');
    console.log('Recorded aligned foot pivots for 8 transform and 12 attack poses.');
})();
