import { Sound, type Scene } from 'phaser';

const AUDIO = {
    ambience: { volume: 0.22, loop: true },
    start: { volume: 0.4 },
    soul: { volume: 0.5 },
    transform: { volume: 0.45 },
    revert: { volume: 0.35 },
    heartLost: { volume: 0.45 },
    respawn: { volume: 0.3 },
    gameover: { volume: 0.4 },
} as const;

type AudioKey = keyof typeof AUDIO;
type Cue = Exclude<AudioKey, 'ambience'>;
const MUTE_STORAGE_KEY = 'graveyard-audio-muted';

export function loadGameAudio(scene: Scene) {
    for (const name of Object.keys(AUDIO)) {
        scene.load.audio(`graveyard-${name}`, `/assets/audio/${name}.wav`);
    }
}

/** Owns only this scene's sounds; decoded assets stay cached across restarts. */
export class GameAudio {
    private sounds = new Map<AudioKey, Sound.BaseSound>();
    private started = false;
    private paused = false;
    private pendingStart = false;

    constructor(private readonly scene: Scene) {
        try { scene.sound.setMute(localStorage.getItem(MUTE_STORAGE_KEY) === 'true'); }
        catch { /* Audio preferences are optional when storage is unavailable. */ }
        for (const name of Object.keys(AUDIO) as AudioKey[]) {
            const key = `graveyard-${name}`;
            // Missing/unsupported audio should never prevent the game from running.
            if (scene.cache.audio.exists(key)) this.sounds.set(name, scene.sound.add(key, AUDIO[name]));
        }
        scene.sound.on(Sound.Events.UNLOCKED, this.syncPlayback, this);
    }

    start() {
        this.started = true;
        this.pendingStart = true;
        this.syncPlayback();
    }

    cue(name: Cue) {
        if (this.paused || this.scene.sound.locked || this.scene.sound.mute) return;
        this.sounds.get(name)?.play();
    }

    setPaused(paused: boolean) {
        this.paused = paused;
        if (paused) {
            for (const sound of this.sounds.values()) {
                if (sound.isPlaying) sound.pause();
            }
        } else {
            // Resume only this scene's sounds, including any interrupted effect.
            if (!this.scene.sound.locked) {
                for (const sound of this.sounds.values()) {
                    if (sound.isPaused) sound.resume();
                }
            }
            this.syncPlayback();
        }
    }

    finish() {
        this.started = false;
        this.pendingStart = false;
        this.sounds.get('ambience')?.stop();
        this.cue('gameover');
    }

    toggleMute() {
        const muted = !this.scene.sound.mute;
        this.scene.sound.setMute(muted);
        try { localStorage.setItem(MUTE_STORAGE_KEY, String(muted)); }
        catch { /* Keep the preference in the sound manager for this session. */ }
    }

    destroy() {
        this.scene.sound.off(Sound.Events.UNLOCKED, this.syncPlayback, this);
        for (const sound of this.sounds.values()) sound.destroy();
        this.sounds.clear();
    }

    private syncPlayback() {
        if (!this.started || this.paused || this.scene.sound.locked) return;
        const ambience = this.sounds.get('ambience');
        if (ambience?.isPaused) ambience.resume();
        else if (ambience && !ambience.isPlaying) ambience.play();
        if (this.pendingStart) {
            this.pendingStart = false;
            this.cue('start');
        }
    }
}
