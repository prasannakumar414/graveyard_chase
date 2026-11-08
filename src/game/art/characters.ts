import type { Scene } from 'phaser';
import { ACTION_DURATION } from '../config';
import { registerCharacterAnimations } from './characterAssets';
import { CHARACTER_FRAME, createAnimationTexture } from './animationTextures';

interface SkullPose {
    key: string;
    file: string;
    footX: number;
    footY: number;
    scale: number;
}

// Anatomical foot pivots keep the supplied differently-sized images from jumping.
const SKULL_POSES = {
    walk: { key: 'skull-source-walk', file: 'walk.png', footX: 310, footY: 490, scale: 0.31 },
    attack: { key: 'skull-source-attack', file: 'attack.png', footX: 407, footY: 478, scale: 0.30 },
    rest: { key: 'skull-source-rest', file: 'rest.png', footX: 300, footY: 480, scale: 0.32 },
} satisfies Record<string, SkullPose>;
const WALK_FRAMES = 24;
const ATTACK_FRAMES = 20;
const DEATH_FRAMES = 24;

export function loadSkullArt(scene: Scene) {
    for (const pose of Object.values(SKULL_POSES)) {
        scene.load.image(pose.key, `/assets/characters/skull/${pose.file}`);
    }
}

function drawPose(scene: Scene, context: CanvasRenderingContext2D, pose: SkullPose, alpha = 1) {
    if (alpha <= 0) return;
    const source = scene.textures.get(pose.key).getSourceImage() as HTMLImageElement;
    context.save();
    context.globalAlpha = alpha;
    context.scale(pose.scale, pose.scale);
    context.drawImage(source, -pose.footX, -pose.footY);
    context.restore();
}

/** Animate the provided single poses; the originals remain bundled unchanged. */
export function createCharacterArt(scene: Scene) {
    createAnimationTexture(scene, 'skull-idle', 1, context => {
        context.translate(CHARACTER_FRAME.footX, CHARACTER_FRAME.footY);
        drawPose(scene, context, SKULL_POSES.rest);
    });
    createAnimationTexture(scene, 'skull-walk', WALK_FRAMES, (context, index) => {
        const cycle = index / WALK_FRAMES * Math.PI * 2;
        context.translate(CHARACTER_FRAME.footX, CHARACTER_FRAME.footY - Math.abs(Math.sin(cycle)) * 5);
        context.rotate(Math.sin(cycle) * 0.025);
        context.scale(1 + Math.sin(cycle) * 0.012, 1 - Math.sin(cycle) * 0.012);
        drawPose(scene, context, SKULL_POSES.walk);
    });
    createAnimationTexture(scene, 'skull-attack', ATTACK_FRAMES, (context, index) => {
        const progress = index / (ATTACK_FRAMES - 1);
        const swing = Math.sin(progress * Math.PI);
        const attackWeight = Math.min(1, progress * 5, (1 - progress) * 5);
        context.translate(CHARACTER_FRAME.footX + swing * 7, CHARACTER_FRAME.footY);
        context.rotate(-Math.sin(progress * Math.PI * 2) * 0.07);
        drawPose(scene, context, SKULL_POSES.rest, 1 - attackWeight);
        drawPose(scene, context, SKULL_POSES.attack, attackWeight);
    });
    createAnimationTexture(scene, 'skull-die', DEATH_FRAMES, (context, index) => {
        const progress = index / (DEATH_FRAMES - 1);
        const dissolve = Math.max(0, (progress - 0.15) / 0.85);
        context.save();
        context.translate(CHARACTER_FRAME.footX, CHARACTER_FRAME.footY - dissolve * 55);
        context.rotate(Math.sin(progress * Math.PI) * -0.16);
        context.scale(1 - dissolve * 0.65, 1 + dissolve * 0.08);
        // Briefly recoil on impact, then stretch and fade as the soul leaves the body.
        drawPose(scene, context, SKULL_POSES.rest, 1 - dissolve);
        context.restore();
        const wispOpacity = Math.sin(progress * Math.PI);
        context.fillStyle = `rgba(193, 221, 162, ${wispOpacity * 0.75})`;
        for (let wisp = 0; wisp < 7; wisp++) {
            const direction = wisp % 2 === 0 ? 1 : -1;
            const x = CHARACTER_FRAME.footX + direction * (12 + wisp * 4) * dissolve
                + Math.sin(progress * Math.PI * 2 + wisp) * 8;
            const y = CHARACTER_FRAME.footY - 35 - wisp * 12 - dissolve * 60;
            context.beginPath();
            context.ellipse(x, y, 2 + wisp % 3, 5 + dissolve * 5, direction * 0.3, 0, Math.PI * 2);
            context.fill();
        }
    });
    for (const [key, frames, duration, repeat] of [
        ['skull-idle', 1, 1000, -1],
        ['skull-walk', WALK_FRAMES, 640, -1],
        ['skull-attack', ATTACK_FRAMES, ACTION_DURATION.skullAttack, 0],
        ['skull-die', DEATH_FRAMES, ACTION_DURATION.skullDeath, 0],
    ] as const) {
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
            key,
            frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
            duration,
            repeat,
        });
    }
    registerCharacterAnimations(scene);
}
