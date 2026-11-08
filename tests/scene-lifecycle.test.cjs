const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

test('scene cleanup finishes whether the physics world is live or already shut down', () => {
    for (const worldDestroyed of [false, true]) {
        const removed = [];
        const emitter = { off: (...args) => removed.push(args) };
        const exports = {};
        const phaser = {
            Scene: class {},
            Scale: { Events: { RESIZE: 'resize' } },
            Physics: { Arcade: { Events: { WORLD_STEP: 'worldstep' } } },
            Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
            Core: { Events: { BLUR: 'blur' } },
            Input: { Events: { POINTER_DOWN: 'pointerdown' } },
        };
        const source = ts.transpileModule(readFileSync('src/game/scenes/Game.ts', 'utf8'), {
            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
        }).outputText;
        runInNewContext(source, {
            exports,
            require(path) {
                if (path === 'phaser') return phaser;
                if (path === '../systems/Haptics') return { stopVibration() {} };
                if (path === '../EventBus') return { EventBus: emitter };
                if (path === '../config') return { GAME_EVENTS: {
                    start: 'start', restart: 'restart', pause: 'pause', move: 'move', mute: 'mute',
                } };
                return {};
            },
        });
        const scene = new exports.Game();
        let audioDestroyed = false;
        scene.audio = { destroy() { audioDestroyed = true; } };
        scene.scale = emitter;
        scene.physics = { world: worldDestroyed ? null : emitter };
        scene.events = emitter;
        scene.game = { events: emitter };
        scene.input = { ...emitter, keyboard: emitter };
        scene.anims = { resumeAll() {} };
        assert.doesNotThrow(() => scene.cleanup());
        assert.equal(audioDestroyed, true);
        for (const event of ['shutdown', 'destroy', 'restart', 'mute', 'blur', 'resize']) {
            assert.ok(removed.some(([name, handler, context]) => name === event
                && typeof handler === 'function' && context === scene));
        }
        assert.equal(removed.some(([name]) => name === 'worldstep'), !worldDestroyed);
    }
});
