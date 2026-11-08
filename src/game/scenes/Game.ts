import { Scene, Input, Scenes, Core, Physics, Scale } from 'phaser';
import { EventBus } from '../EventBus';
import { ACTION_DURATION, ARENA, GAME_EVENTS, GameSnapshot, SPEED } from '../config';
import { Character } from '../entities/Character';
import { GameAudio } from '../audio/GameAudio';
import { ChaseRound, PHASE_DURATION } from '../systems/ChaseRound';
import { stopVibration, vibrateCombat } from '../systems/Haptics';
import { canCombatContact, type CombatPositions } from '../systems/Combat';
import { OpponentMovement, PlayerMovement } from '../systems/Movement';
import { buildGraveyard } from '../world/Graveyard';
import { createGraves, createGrid, Point, SPAWN_CELLS, toWorld } from '../world/navigation';

export class Game extends Scene {
    private player: Character;
    private opponent: Character;
    private round: ChaseRound;
    private playerMovement: PlayerMovement;
    private opponentMovement: OpponentMovement;
    private started = false;
    private paused = false;
    private elapsed = 0;
    private hudIn = 0;
    private endAnimation = 0;
    private over = false;
    private aura: Phaser.GameObjects.Arc;
    private previousCombatPositions: CombatPositions | undefined;
    private audio: GameAudio;

    constructor() { super('Game'); }

    create(data: { autoStart?: boolean } = {}) {
        this.round = new ChaseRound();
        this.started = data.autoStart ?? false;
        this.paused = false;
        this.elapsed = 0;
        this.hudIn = 0;
        this.endAnimation = 0;
        this.over = false;
        this.previousCombatPositions = undefined;
        this.audio = new GameAudio(this);
        this.cameras.main.setBackgroundColor('#24392f');
        this.physics.world.setBounds(40, 40, ARENA.width - 80, ARENA.height - 80);
        const graves = createGraves();
        const grid = createGrid(graves);
        const { ground, obstacles } = buildGraveyard(this, graves);
        this.player = new Character(this, toWorld(SPAWN_CELLS.reaper), 'skull');
        this.opponent = new Character(this, toWorld(SPAWN_CELLS.man), 'man');
        this.aura = this.add.circle(this.opponent.x, this.opponent.y, 26, 0xffc876, 0.08)
            .setStrokeStyle(1, 0xffcf82, 0.5).setVisible(false);
        this.physics.add.collider([this.player, this.opponent], ground);
        this.physics.add.collider(this.opponent, obstacles);
        this.physics.world.on(Physics.Arcade.Events.WORLD_STEP, this.checkCombatContact, this);
        this.playerMovement = new PlayerMovement(this, createGrid());
        this.opponentMovement = new OpponentMovement(grid);
        this.resizeCamera();
        this.scale.on(Scale.Events.RESIZE, this.resizeCamera, this);
        this.input.on(Input.Events.POINTER_DOWN, this.onPointer, this);
        this.game.events.on(Core.Events.BLUR, this.onBlur, this);
        EventBus.on(GAME_EVENTS.start, this.start, this);
        EventBus.on(GAME_EVENTS.restart, this.restart, this);
        EventBus.on(GAME_EVENTS.pause, this.togglePause, this);
        EventBus.on(GAME_EVENTS.move, this.onTouchMove, this);
        EventBus.on(GAME_EVENTS.mute, this.toggleMute, this);
        this.events.once(Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.events.once(Scenes.Events.DESTROY, this.cleanup, this);
        this.player.move({ x: 0, y: 0 }, 0, 0);
        this.opponent.move({ x: 0, y: 0 }, 0, 0);
        EventBus.emit(GAME_EVENTS.ready, this);
        this.publish();
        if (this.started) this.audio.start();
    }

    update(_time: number, delta: number) {
        if (!this.started || this.paused || this.over) return;
        // Keep behavior stable after long frame stalls; tab blur pauses the round explicitly.
        const step = Math.min(delta, 50);
        this.player.updateVisual(step);
        this.opponent.updateVisual(step);
        if (this.round.phase === 'gameover') {
            this.endAnimation -= step;
            if (this.endAnimation <= 0 && !this.opponent.locked && !this.player.locked) {
                this.over = true;
                this.publish();
            }
            return;
        }
        this.elapsed += step;
        const previous = this.round.phase;
        if (this.round.advance(step)) this.onPhaseChange(previous);
        if (this.round.phase !== 'respawning') {
            this.playerMovement.update(this.player, SPEED.skull, step);
        }
        if (this.round.phase === 'man' || this.round.phase === 'hero') {
            const hero = this.round.phase === 'hero';
            this.opponentMovement.update(this.opponent, this.player, hero, hero ? this.round.heroSpeed : this.round.manSpeed, step);
        } else this.opponent.setVelocity(0, 0);
        this.aura.setPosition(this.opponent.x, this.opponent.y).setDepth(this.opponent.y - 2);
        this.hudIn -= step;
        if (this.hudIn <= 0) { this.publish(); this.hudIn = 80; }
    }

    private onPhaseChange(previous: string) {
        // Do not sweep across respawn teleports or between vulnerable and protected forms.
        this.previousCombatPositions = undefined;
        this.opponentMovement.reset();
        if (previous === 'dying') {
            const spawn = this.opponentMovement.spawnAwayFrom(this.player);
            this.opponent.enableBody(true, spawn.x, spawn.y, true, true);
            this.opponent.setAlpha(1);
        }
        switch (this.round.phase) {
            case 'transforming':
                this.audio.cue('transform');
                this.opponent.action('man-transform', PHASE_DURATION.transformation);
                this.aura.setVisible(true);
                this.floatingText(this.opponent, 'BY THE POWER!', '#f9d38b');
                break;
            case 'hero':
                this.opponent.setKind('hero');
                this.cameras.main.flash(120, 222, 178, 97, false);
                break;
            case 'reverting':
                this.audio.cue('revert');
                this.opponent.action('man-revert', PHASE_DURATION.transformation);
                break;
            case 'man':
                this.aura.setVisible(false);
                this.opponent.setKind('man');
                if (previous === 'respawning') {
                    this.audio.cue('respawn');
                    const spawn = toWorld(SPAWN_CELLS.reaper);
                    this.player.revive(spawn);
                    const opponentSpawn = this.opponentMovement.spawnAwayFrom(this.player);
                    this.opponent.enableBody(true, opponentSpawn.x, opponentSpawn.y, true, true);
                    this.opponent.move({ x: 0, y: 0 }, 0, 0);
                }
                break;
        }
        this.publish();
    }

    private checkCombatContact() {
        if (!this.started || this.paused || this.over
            || !this.player.body.enable || !this.opponent.body.enable
            || (this.round.phase !== 'man' && this.round.phase !== 'hero')) {
            this.previousCombatPositions = undefined;
            return;
        }
        // Body centers are current here; sprite positions synchronize after physics finishes.
        const current: CombatPositions = {
            player: { x: this.player.body.center.x, y: this.player.body.center.y },
            opponent: { x: this.opponent.body.center.x, y: this.opponent.body.center.y },
        };
        const touching = canCombatContact(this.round.phase, current, this.previousCombatPositions);
        this.previousCombatPositions = current;
        if (touching) {
            this.previousCombatPositions = undefined;
            this.onContact();
        }
    }

    private onContact() {
        if (!this.started || this.paused || this.over) return;
        const result = this.round.collide();
        if (result) vibrateCombat(result);
        if (result === 'point') {
            this.audio.cue('soul');
            this.player.setFlipX(this.opponent.x < this.player.x);
            this.player.action('skull-attack', ACTION_DURATION.skullAttack);
            this.opponent.action('man-die', PHASE_DURATION.death);
            this.opponent.body.enable = false;
            this.floatingText(this.opponent, '+1 SOUL', '#d2f0a3');
            this.playerMovement.clear();
        } else if (result === 'caught') {
            if (this.round.lives === 0) this.audio.finish();
            else this.audio.cue('heartLost');
            this.player.action('skull-die', ACTION_DURATION.skullDeath);
            this.player.body.enable = false;
            this.opponent.setFlipX(this.player.x < this.opponent.x);
            this.opponent.action('hero-attack', ACTION_DURATION.heroAttack);
            this.playerMovement.clear();
            this.endAnimation = Math.max(ACTION_DURATION.heroAttack, ACTION_DURATION.skullDeath);
            this.cameras.main.shake(220, 0.004);
            this.floatingText(this.player, this.round.lives > 0 ? '−1 HEART' : 'LAST HEART LOST', '#f4ab97');
        }
        if (result) this.publish();
    }

    private floatingText(point: Point, message: string, color: string) {
        const label = this.add.text(point.x, point.y - 75, message, {
            fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color,
            stroke: '#152125', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(2200);
        this.tweens.add({ targets: label, y: label.y - 35, alpha: 0, duration: 900, onComplete: () => label.destroy() });
    }

    private onPointer(pointer: Input.Pointer) {
        if (!pointer.wasTouch && this.started && !this.paused && !this.over && this.round.phase !== 'gameover'
            && this.round.phase !== 'respawning') {
            this.playerMovement.pointTo(this.player, { x: pointer.worldX, y: pointer.worldY });
        }
    }

    private resizeCamera() {
        // Fill every viewport without stretching sprites. Narrow screens follow the
        // reaper across the same arena rather than shrinking play into letterboxes.
        const camera = this.cameras.main;
        const zoom = Math.max(this.scale.width / ARENA.width, this.scale.height / ARENA.height);
        camera.setZoom(zoom);
        camera.setBounds(0, 0, ARENA.width, ARENA.height);
        camera.startFollow(this.player, true, 1, 1);
        camera.centerOn(this.player.x, this.player.y);
        this.playerMovement.setTouchDirection({ x: 0, y: 0 });
    }

    private start() {
        if (this.started) return;
        this.started = true;
        this.audio.start();
        this.publish();
    }

    private onTouchMove(direction: Point) {
        const canMove = this.started && !this.paused && !this.over
            && this.round.phase !== 'gameover' && this.round.phase !== 'respawning';
        this.playerMovement.setTouchDirection(canMove ? direction : { x: 0, y: 0 });
    }

    private restart() {
        this.anims.resumeAll();
        this.scene.restart({ autoStart: true });
    }

    private onBlur() {
        if (this.started && !this.paused && !this.over) this.togglePause();
    }

    private togglePause() {
        if (!this.started || this.over) return;
        this.paused = !this.paused;
        this.audio.setPaused(this.paused);
        this.playerMovement.setTouchDirection({ x: 0, y: 0 });
        this.playerMovement.clear();
        if (this.paused) {
            stopVibration();
            this.physics.world.pause(); this.anims.pauseAll(); this.tweens.pauseAll();
        } else {
            this.physics.world.resume(); this.anims.resumeAll(); this.tweens.resumeAll();
        }
        this.publish();
    }

    private toggleMute() {
        this.audio.toggleMute();
        this.publish();
    }

    private publish() {
        const state: GameSnapshot = {
            score: this.round.score, lives: this.round.lives, phase: this.round.phase,
            seconds: Math.max(0, this.round.remaining / 1000),
            progress: Math.max(0, this.round.remaining / this.round.duration),
            elapsed: this.elapsed / 1000, started: this.started, paused: this.paused, over: this.over,
            muted: this.sound.mute,
        };
        EventBus.emit(GAME_EVENTS.state, state);
    }

    private cleanup() {
        stopVibration();
        this.audio.destroy();
        this.scale.off(Scale.Events.RESIZE, this.resizeCamera, this);
        // Arcade Physics may already have cleared its world in its shutdown handler.
        this.physics.world?.off(Physics.Arcade.Events.WORLD_STEP, this.checkCombatContact, this);
        this.events.off(Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.events.off(Scenes.Events.DESTROY, this.cleanup, this);
        EventBus.off(GAME_EVENTS.start, this.start, this);
        EventBus.off(GAME_EVENTS.restart, this.restart, this);
        EventBus.off(GAME_EVENTS.pause, this.togglePause, this);
        EventBus.off(GAME_EVENTS.move, this.onTouchMove, this);
        EventBus.off(GAME_EVENTS.mute, this.toggleMute, this);
        this.game.events.off(Core.Events.BLUR, this.onBlur, this);
        this.input.off(Input.Events.POINTER_DOWN, this.onPointer, this);
        this.anims?.resumeAll();
    }
}
