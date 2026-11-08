import { Scene } from 'phaser';
import { ACTION_DURATION } from '../config';
import { PHASE_DURATION } from '../systems/ChaseRound';
import { CHARACTER_FRAME, createAnimationTexture } from './animationTextures';
import geometry from './repairedFrames.json';

interface Pose {
    sourceKey: string;
    x: number;
    y: number;
    width: number;
    height: number;
    footX: number;
    footY: number;
    scale: number;
}

const RAW_SHEETS = [
    { key: 'man-walk', file: 'scared_walk_sheet.png', frames: 4, loop: true },
    { key: 'man-die', file: 'scared_death_sheet.png', frames: 5, duration: PHASE_DURATION.death },
    { key: 'hero-walk', file: 'powerful_walk_sheet.png', frames: 4, loop: true },
];

export function loadCharacterSheets(scene: Scene) {
    for (const sheet of RAW_SHEETS) {
        scene.load.spritesheet(sheet.key, `/assets/characters/${sheet.file}`, {
            frameWidth: 256, frameHeight: 256, endFrame: sheet.frames - 1,
        });
    }
    scene.load.image('transform-source', '/assets/characters/repaired/transform.png');
    scene.load.image('attack-source', '/assets/characters/repaired/attack.png');
}

function standingPose(sourceKey: string): Pose {
    return { sourceKey, x: 0, y: 0, width: 256, height: 256, footX: 128, footY: 240, scale: 1 };
}

function drawPose(scene: Scene, context: CanvasRenderingContext2D, pose: Pose, opacity: number) {
    if (opacity <= 0) return;
    const image = scene.textures.get(pose.sourceKey).getSourceImage() as HTMLImageElement;
    context.save();
    context.globalAlpha = opacity;
    context.translate(CHARACTER_FRAME.footX, CHARACTER_FRAME.footY);
    context.scale(pose.scale, pose.scale);
    context.drawImage(image, pose.x, pose.y, pose.width, pose.height,
        -pose.footX, -pose.footY, pose.width, pose.height);
    context.restore();
}

/** Blend adjacent aligned poses at boot, including the entry/exit walking poses. */
function createSmoothClip(scene: Scene, key: string, poses: Pose[], subdivisions: number) {
    const frameCount = (poses.length - 1) * subdivisions + 1;
    createAnimationTexture(scene, key, frameCount, (context, index) => {
        const position = index / subdivisions;
        const current = Math.min(Math.floor(position), poses.length - 1);
        const next = Math.min(current + 1, poses.length - 1);
        const blend = position - current;
        drawPose(scene, context, poses[current], 1 - blend);
        // Additive alpha composition makes crossfades retain opacity without a dark midpoint.
        context.globalCompositeOperation = 'lighter';
        drawPose(scene, context, poses[next], blend);
    });
    return frameCount;
}

export function registerCharacterAnimations(scene: Scene) {
    for (const sheet of RAW_SHEETS) {
        if (scene.anims.exists(sheet.key)) continue;
        scene.anims.create({
            key: sheet.key,
            frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frames - 1 }),
            ...('duration' in sheet ? { duration: sheet.duration } : { frameRate: 10 }),
            repeat: 'loop' in sheet && sheet.loop ? -1 : 0,
        });
    }
    const man = standingPose('man-walk');
    const hero = standingPose('hero-walk');
    const transformationPoses = [man,
        ...geometry.transform.map(frame => ({ ...frame, sourceKey: 'transform-source' })), hero];
    const attackPoses = [hero,
        ...geometry.attack.map(frame => ({ ...frame, sourceKey: 'attack-source' })), hero];
    const transformFrames = createSmoothClip(scene, 'man-transform', transformationPoses, 3);
    const attackFrames = createSmoothClip(scene, 'hero-attack', attackPoses, 2);
    for (const [key, textureKey, frameCount, duration, reverse] of [
        ['man-transform', 'man-transform', transformFrames, PHASE_DURATION.transformation, false],
        ['man-revert', 'man-transform', transformFrames, PHASE_DURATION.transformation, true],
        ['hero-attack', 'hero-attack', attackFrames, ACTION_DURATION.heroAttack, false],
    ] as const) {
        if (scene.anims.exists(key)) continue;
        const frames = scene.anims.generateFrameNumbers(textureKey, { start: 0, end: frameCount - 1 });
        scene.anims.create({ key, frames: reverse ? frames.reverse() : frames, duration, repeat: 0 });
    }
}
