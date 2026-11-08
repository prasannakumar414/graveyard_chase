const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const exportsForTest = {};
runInNewContext(ts.transpileModule(readFileSync('src/game/input/ThumbStick.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForTest });

function setup(rotated = false) {
    let direction, knob;
    const stick = new exportsForTest.ThumbStick((next, offset) => {
        direction = { ...next };
        knob = { ...offset };
    });
    stick.begin(1, { x: 100, y: 100 }, rotated, 30);
    return { stick, get direction() { return direction; }, get knob() { return knob; } };
}

test('thumb movement has a dead zone, holds direction, clamps the knob, and stops on lift', () => {
    const h = setup();
    h.stick.move(1, { x: 105, y: 100 });
    assert.deepEqual(h.direction, { x: 0, y: 0 });
    h.stick.move(1, { x: 20, y: 100 });
    assert.deepEqual(h.direction, { x: -1, y: 0 });
    assert.deepEqual(h.knob, { x: -30, y: 0 });
    assert.equal(h.stick.begin(2, { x: 300, y: 100 }, false, 30), false);
    h.stick.move(2, { x: 400, y: 100 });
    h.stick.release(2);
    assert.deepEqual(h.direction, { x: -1, y: 0 });
    h.stick.move(1, { x: 150, y: 150 });
    assert.ok(Math.abs(Math.hypot(h.direction.x, h.direction.y) - 1) < 1e-9);
    assert.ok(Math.abs(Math.hypot(h.knob.x, h.knob.y) - 30) < 1e-9);
    h.stick.release(1);
    assert.deepEqual(h.direction, { x: 0, y: 0 });
});

test('rotated landscape maps all four screen directions to game-local directions', () => {
    const h = setup(true);
    for (const [screen, expected] of [
        [{ x: 100, y: 150 }, { x: 1, y: 0 }],
        [{ x: 100, y: 50 }, { x: -1, y: 0 }],
        [{ x: 150, y: 100 }, { x: 0, y: -1 }],
        [{ x: 50, y: 100 }, { x: 0, y: 1 }],
    ]) {
        h.stick.move(1, screen);
        assert.equal(h.direction.x, expected.x);
        assert.equal(h.direction.y || 0, expected.y);
    }
});

test('pause, cancellation or resize reset ignores stale events and accepts the next thumb', () => {
    const h = setup();
    h.stick.move(1, { x: 150, y: 100 });
    h.stick.clear();
    h.stick.move(1, { x: 150, y: 100 });
    assert.deepEqual(h.direction, { x: 0, y: 0 });
    assert.equal(h.stick.begin(2, { x: 100, y: 100 }, false, 30), true);
    h.stick.move(2, { x: 100, y: 50 });
    assert.deepEqual(h.direction, { x: 0, y: -1 });
});


test('the same joystick can restart at a new origin without retaining movement', () => {
    const h = setup();
    h.stick.move(1, { x: 150, y: 100 });
    h.stick.release(1);
    assert.deepEqual(h.direction, { x: 0, y: 0 });
    assert.equal(h.stick.begin(2, { x: 650, y: 300 }, false, 30), true);
    h.stick.move(2, { x: 650, y: 300 });
    assert.deepEqual(h.direction, { x: 0, y: 0 });
    h.stick.move(2, { x: 650, y: 350 });
    assert.deepEqual(h.direction, { x: 0, y: 1 });
    h.stick.release(2);
    assert.deepEqual(h.direction, { x: 0, y: 0 });
});
