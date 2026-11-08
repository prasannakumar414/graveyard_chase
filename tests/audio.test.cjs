const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

// Exercise audio lifecycle without a browser or an actual output device.
const source = ts.transpileModule(readFileSync('src/game/audio/GameAudio.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup({ locked = false, missing = false, storageBlocked = false } = {}) {
    const sounds = new Map();
    const listeners = [];
    const storage = new Map();
    const manager = {
        locked, mute: false,
        setMute(value) { this.mute = value; },
        on(event, handler, context) { listeners.push({ event, handler, context }); },
        off(event, handler, context) {
            const index = listeners.findIndex(listener => listener.event === event
                && listener.handler === handler && listener.context === context);
            if (index >= 0) listeners.splice(index, 1);
        },
        add(key) {
            const sound = {
                isPlaying: false, isPaused: false, destroyed: false, plays: 0,
                play() { this.plays++; this.isPlaying = true; this.isPaused = false; },
                pause() { this.isPlaying = false; this.isPaused = true; },
                resume() { this.isPlaying = true; this.isPaused = false; },
                stop() { this.isPlaying = false; this.isPaused = false; },
                destroy() { this.stop(); this.destroyed = true; },
            };
            sounds.set(key, sound);
            return sound;
        },
    };
    const scene = { sound: manager, cache: { audio: { exists: () => !missing } } };
    const exports = {};
    runInNewContext(source, {
        exports,
        require: () => ({ Sound: { Events: { UNLOCKED: 'unlocked' } } }),
        localStorage: {
            getItem(key) { if (storageBlocked) throw Error('blocked'); return storage.get(key); },
            setItem(key, value) { if (storageBlocked) throw Error('blocked'); storage.set(key, value); },
        },
    });
    return {
        audio: new exports.GameAudio(scene), scene, sounds, manager, listeners, storage,
        get: name => sounds.get(`graveyard-${name}`),
        unlock() {
            manager.locked = false;
            for (const listener of [...listeners]) listener.handler.call(listener.context);
        },
        create: () => new exports.GameAudio(scene),
    };
}

test('audio waits for play and unlock, and does not start while paused', () => {
    const h = setup({ locked: true });
    assert.equal(h.get('ambience').plays, 0);
    h.audio.start();
    h.audio.cue('soul');
    assert.equal(h.get('ambience').plays, 0);
    assert.equal(h.get('soul').plays, 0);
    h.audio.setPaused(true);
    h.unlock();
    assert.equal(h.get('ambience').plays, 0);
    h.audio.setPaused(false);
    assert.equal(h.get('ambience').plays, 1);
    assert.equal(h.get('start').plays, 1);
    h.unlock();
    assert.equal(h.get('ambience').plays, 1);
    assert.equal(h.get('start').plays, 1);
});

test('pause suspends owned sounds and game over stops the ambience', () => {
    const h = setup();
    h.audio.start();
    h.audio.cue('transform');
    h.audio.setPaused(true);
    assert.equal(h.get('ambience').isPaused, true);
    assert.equal(h.get('transform').isPaused, true);
    h.audio.cue('soul');
    assert.equal(h.get('soul').plays, 0);
    h.audio.setPaused(false);
    assert.equal(h.get('ambience').isPlaying, true);
    assert.equal(h.get('transform').isPlaying, true);
    assert.equal(h.get('ambience').plays, 1);
    h.audio.finish();
    assert.equal(h.get('ambience').isPlaying, false);
    assert.equal(h.get('gameover').plays, 1);
    h.unlock();
    assert.equal(h.get('ambience').plays, 1);
});

test('mute persists and restarting destroys old audio and unlock listeners', () => {
    const h = setup();
    h.audio.start();
    h.audio.toggleMute();
    assert.equal(h.manager.mute, true);
    h.audio.cue('soul');
    assert.equal(h.get('soul').plays, 0);
    const oldSounds = [...h.sounds.values()];
    h.audio.destroy();
    assert.equal(h.listeners.length, 0);
    assert.ok(oldSounds.every(sound => sound.destroyed));
    const restarted = h.create();
    assert.equal(h.manager.mute, true);
    assert.equal(h.listeners.length, 1);
    restarted.start();
    assert.equal(h.get('ambience').plays, 1);
    restarted.toggleMute();
    restarted.cue('soul');
    assert.equal(h.get('soul').plays, 1);
    restarted.destroy();
});

test('unavailable audio and blocked preference storage do not break gameplay', () => {
    const h = setup({ missing: true, storageBlocked: true });
    assert.doesNotThrow(() => {
        h.audio.start();
        h.audio.cue('soul');
        h.audio.toggleMute();
        h.audio.setPaused(true);
        h.audio.setPaused(false);
        h.audio.finish();
        h.audio.destroy();
    });
});
