import { Physics, Scene } from 'phaser';
import { directionVelocity, steerVelocity } from '../systems/Motion';
import type { Point } from '../world/navigation';

const SPRITE_SCALE = 0.4;
const FOOT_Y = 240;
const BODY_SIZE = { width: 18, height: 14 } as const;

export class Character extends Physics.Arcade.Sprite {
    declare body: Physics.Arcade.Body;
    private shadow: Phaser.GameObjects.Image;
    private label: Phaser.GameObjects.Text;
    private lockedFor = 0;
    private actionKey: string | null = null;
    private dying = false;
    kind: 'skull' | 'man' | 'hero';

    constructor(scene: Scene, position: Point, kind: 'skull' | 'man') {
        super(scene, position.x, position.y, `${kind}-walk`);
        this.kind = kind;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        // Every animation now uses the same 256px cell and foot pivot, including the skull.
        // Visual artwork can change without changing the world-space collision footprint.
        const width = BODY_SIZE.width / SPRITE_SCALE;
        const height = BODY_SIZE.height / SPRITE_SCALE;
        this.setScale(SPRITE_SCALE).setOrigin(0.5, FOOT_Y / 256);
        this.setSize(width, height).setOffset(128 - width / 2, FOOT_Y - height / 2);
        this.setCollideWorldBounds(true);
        this.shadow = scene.add.image(this.x, this.y, 'shadow');
        this.label = scene.add.text(this.x, this.y - 68, kind === 'skull' ? 'YOU' : 'MAN', {
            fontFamily: 'monospace', fontSize: '10px', color: kind === 'skull' ? '#d3efad' : '#eee0be',
            backgroundColor: '#182322cc', padding: { x: 5, y: 3 },
        }).setOrigin(0.5);
        this.play(`${kind}-walk`);
        this.on('animationcomplete', (animation: Phaser.Animations.Animation) => {
            if (animation.key === this.actionKey) this.actionKey = null;
            if (animation.key === 'skull-die') this.setVisible(false);
        });
        this.on('destroy', () => { this.shadow.destroy(); this.label.destroy(); });
    }

    get locked() {
        return this.lockedFor > 0 || (this.actionKey !== null && this.anims.isPlaying);
    }

    move(direction: Point, speed: number, delta: number) {
        if (this.locked) { this.setVelocity(0, 0); return; }
        const velocity = this.kind === 'skull'
            ? directionVelocity(direction, speed)
            : steerVelocity(this.body.velocity, direction, speed, delta);
        this.setVelocity(velocity.x, velocity.y);
        if (Math.hypot(velocity.x, velocity.y) < 1) {
            if (this.kind === 'skull') this.play('skull-idle', true);
            else {
                this.play(`${this.kind}-walk`, true);
                this.anims.pause(this.anims.currentAnim?.frames[0]);
            }
            return;
        }
        if (Math.abs(velocity.x) > 1) this.setFlipX(velocity.x < 0);
        this.play(`${this.kind}-walk`, true);
        this.anims.resume();
    }

    action(key: string, duration: number) {
        this.setVelocity(0, 0);
        this.lockedFor = duration;
        this.actionKey = key;
        this.dying = key === 'skull-die';
        this.play(key);
    }

    revive(position: Point) {
        this.dying = false;
        this.lockedFor = 0;
        this.actionKey = null;
        this.enableBody(true, position.x, position.y, true, true);
        this.setAlpha(1);
        this.move({ x: 0, y: 0 }, 0, 0);
    }

    setKind(kind: 'man' | 'hero') {
        this.kind = kind;
        this.label.setText(kind === 'hero' ? 'HE-MAN' : 'MAN');
        this.label.setColor(kind === 'hero' ? '#f4c786' : '#eee0be');
    }

    updateVisual(delta: number) {
        this.lockedFor = Math.max(0, this.lockedFor - delta);
        this.setDepth(this.y);
        const showDetails = this.visible && !this.dying;
        this.shadow.setPosition(this.x, this.y + 2).setDepth(this.y - 1).setVisible(showDetails);
        this.label.setPosition(this.x, this.y - 66).setDepth(this.y + 100).setVisible(showDetails);
    }
}
