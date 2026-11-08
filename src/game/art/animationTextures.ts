import { Scene, Textures } from 'phaser';

export const CHARACTER_FRAME = { width: 256, height: 256, footX: 128, footY: 240 } as const;

/** Build animation textures once at boot; never allocate image frames inside the game loop. */
export function createAnimationTexture(
    scene: Scene,
    key: string,
    frames: number,
    drawFrame: (context: CanvasRenderingContext2D, index: number) => void,
) {
    if (scene.textures.exists(key)) return;
    const columns = Math.min(frames, 8);
    const canvas = document.createElement('canvas');
    canvas.width = CHARACTER_FRAME.width * columns;
    canvas.height = CHARACTER_FRAME.height * Math.ceil(frames / columns);
    const context = canvas.getContext('2d')!;
    for (let index = 0; index < frames; index++) {
        context.save();
        context.translate(index % columns * CHARACTER_FRAME.width,
            Math.floor(index / columns) * CHARACTER_FRAME.height);
        // Keep draw operations inside their own atlas cell, including rotated scythes.
        context.beginPath();
        context.rect(0, 0, CHARACTER_FRAME.width, CHARACTER_FRAME.height);
        context.clip();
        drawFrame(context, index);
        context.restore();
    }
    const texture = scene.textures.addCanvas(key, canvas)!;
    scene.textures.addSpriteSheet(key, texture, {
        frameWidth: CHARACTER_FRAME.width,
        frameHeight: CHARACTER_FRAME.height,
    });
    texture.setFilter(Textures.FilterMode.LINEAR);
}
