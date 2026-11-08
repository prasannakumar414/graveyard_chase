const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const output = mkdtempSync(join(tmpdir(), 'graveyard-rules-'));
const result = spawnSync(process.execPath, [
    require.resolve('typescript/bin/tsc'),
    'src/game/config.ts', 'src/game/world/navigation.ts', 'src/game/systems/ChaseRound.ts', 'src/game/systems/Motion.ts', 'src/game/systems/Combat.ts',
    '--outDir', output, '--target', 'es2020', '--module', 'commonjs', '--strict', '--skipLibCheck',
], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
const { ChaseRound, PHASE_DURATION } = require(join(output, 'systems/ChaseRound.js'));
const { createGrid, findPath, randomWanderTarget, openCells, toCell, toWorld, createGraves, GRAVE_COUNT, SPAWN_CELLS } = require(join(output, 'world/navigation.js'));
const { directionVelocity, instantPathMotion, steerVelocity, pathMotion } = require(join(output, 'systems/Motion.js'));
const { SPEED, MOTION } = require(join(output, 'config.js'));
const { canReaperAttack, canCombatContact } = require(join(output, 'systems/Combat.js'));
after(() => rmSync(output, { recursive: true, force: true }));

test('Reaper melee captures nearby men once without requiring overlapping foot hitboxes', () => {
    const round = new ChaseRound();
    const player = { x: 100, y: 100 };
    const man = { x: 130, y: 100 };
    // The 18px-wide navigation bodies are separated at this visible melee distance.
    assert.ok(canReaperAttack(round.phase, player, man));
    assert.ok(canReaperAttack(round.phase, man, player));
    assert.ok(canReaperAttack(round.phase, player, { x: 100, y: 130 }));
    assert.equal(canReaperAttack(round.phase, player, { x: 140, y: 100 }), false);
    assert.equal(canReaperAttack(round.phase, player, { x: 130, y: 130 }), false);
    let captures = 0;
    for (let frame = 0; frame < 60; frame++) {
        if (canReaperAttack(round.phase, player, man) && round.collide() === 'point') captures++;
    }
    assert.equal(captures, 1);
    assert.equal(round.phase, 'dying');
    round.advance(PHASE_DURATION.death);
    assert.ok(canReaperAttack(round.phase, player, man));
    for (const phase of ['transforming', 'hero', 'reverting', 'respawning', 'gameover']) {
        assert.equal(canReaperAttack(phase, player, player), false);
    }
});

test('transformation cooldown is sampled once per hunt between five and seven seconds', () => {
    const samples = [0, 0.5, 0.999999, 0];
    let sample = 0;
    const round = new ChaseRound(() => samples[sample++]);
    let previousDuration = 3000;
    for (let cycle = 0; cycle < 3; cycle++) {
        const cooldown = 5000 + cycle * 1000;
        assert.equal(round.duration, cooldown);
        assert.equal(sample, cycle + 1);
        assert.equal(round.advance(cooldown - 1), false);
        assert.equal(round.duration, cooldown);
        assert.equal(sample, cycle + 1);
        assert.equal(round.phase, 'man');
        assert.equal(round.advance(1), true);
        assert.equal(round.phase, 'transforming');
        assert.equal(round.collide(), null);
        round.advance(PHASE_DURATION.transformation);
        assert.equal(round.phase, 'hero');
        assert.ok(round.duration > previousDuration);
        previousDuration = round.duration;
        const duration = round.duration;
        round.advance(duration - 1);
        assert.equal(round.duration, duration);
        assert.equal(round.phase, 'hero');
        round.advance(1);
        assert.equal(round.phase, 'reverting');
        assert.equal(round.collide(), null);
        round.advance(PHASE_DURATION.transformation);
        assert.equal(round.phase, 'man');
    }
});

test('hero duration grows with active time and souls, and resets on restart', () => {
    const heroDuration = souls => {
        const round = new ChaseRound(() => 0);
        for (let i = 0; i < souls; i++) {
            assert.equal(round.collide(), 'point');
            round.advance(PHASE_DURATION.death);
            assert.equal(round.duration, 5000);
        }
        // Give both runs the same total active time, isolating score growth.
        round.advance(round.remaining);
        round.advance(PHASE_DURATION.transformation);
        assert.equal(round.phase, 'hero');
        return round.duration;
    };
    const expectedTimeGrowth = (5000 + 650) / 60000 * 1000;
    assert.equal(heroDuration(0), 3000 + expectedTimeGrowth);
    assert.equal(heroDuration(2), 3000 + expectedTimeGrowth + 2 * 150);
    const restarted = new ChaseRound(() => 0);
    restarted.advance(5000);
    restarted.advance(PHASE_DURATION.transformation);
    assert.equal(restarted.duration, 3000 + 5650 / 60000 * 1000);
});

test('souls update live once per capture and persist through lost lives', () => {
    const round = new ChaseRound();
    assert.equal(round.collide(), 'point');
    assert.equal(round.phase, 'dying');
    for (let i = 0; i < 20; i++) assert.equal(round.collide(), null);
    assert.equal(round.score, 1);
    round.advance(PHASE_DURATION.death);
    assert.equal(round.phase, 'man');
    assert.equal(round.collide(), 'point');
    assert.equal(round.score, 2);
    round.advance(PHASE_DURATION.death);
    for (let lives = 2; lives >= 0; lives--) {
        round.advance(round.duration);
        round.advance(PHASE_DURATION.transformation);
        assert.equal(round.collide(), 'caught');
        assert.equal(round.lives, lives);
        assert.equal(round.score, 2);
        if (lives > 0) round.advance(PHASE_DURATION.respawn);
    }
});

test('three hero catches consume three hearts; recovery prevents repeated life loss', () => {
    const round = new ChaseRound();
    assert.equal(round.lives, 3);
    for (let lives = 2; lives >= 0; lives--) {
        round.advance(round.duration);
        assert.equal(round.collide(), null);
        round.advance(PHASE_DURATION.transformation);
        assert.equal(round.collide(), 'caught');
        assert.equal(round.lives, lives);
        for (let i = 0; i < 20; i++) assert.equal(round.collide(), null);
        assert.equal(round.lives, lives);
        if (lives > 0) {
            assert.equal(round.phase, 'respawning');
            assert.equal(round.advance(PHASE_DURATION.respawn - 1), false);
            assert.equal(round.advance(1), true);
            assert.equal(round.phase, 'man');
        }
    }
    assert.equal(round.phase, 'gameover');
    assert.equal(round.score, 0);
    assert.equal(round.advance(100000), false);
    assert.equal(round.collide(), null);
    const restarted = new ChaseRound();
    assert.equal(restarted.lives, 3);
    assert.equal(restarted.score, 0);
    assert.equal(restarted.phase, 'man');
});

test('all open arena tiles connect without crossing a grave or boundary', () => {
    const graves = createGraves(() => 0.5);
    const grid = createGrid(graves);
    const start = { x: 10, y: 8 };
    for (const cell of openCells(grid)) {
        if (cell.x === start.x && cell.y === start.y) continue;
        const path = findPath(grid, start, cell);
        assert.ok(path.length > 0, `Unreachable tile ${cell.x},${cell.y}`);
        assert.deepEqual(toCell(path.at(-1)), cell);
        let previous = toWorld(start);
        for (const point of path) {
            const step = toCell(point);
            assert.ok(grid[step.y][step.x]);
            assert.equal(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y), 40);
            previous = point;
        }
    }
    for (const grave of graves) assert.deepEqual(findPath(grid, start, grave), []);
    assert.deepEqual(findPath(grid, start, { x: 0, y: 0 }), []);
});


test('random grave layouts preserve spawn clearance and connected walkable space', () => {
    const layouts = new Set();
    for (let seed = 1; seed <= 30; seed++) {
        let state = seed;
        const random = () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 2 ** 32;
        };
        const graves = createGraves(random);
        assert.equal(graves.length, GRAVE_COUNT);
        assert.equal(new Set(graves.map(cell => `${cell.x},${cell.y}`)).size, GRAVE_COUNT);
        layouts.add(JSON.stringify(graves));
        const grid = createGrid(graves);
        for (const spawn of Object.values(SPAWN_CELLS)) {
            for (let y = spawn.y - 1; y <= spawn.y + 1; y++) {
                for (let x = spawn.x - 1; x <= spawn.x + 1; x++) assert.ok(grid[y][x]);
            }
        }
        for (const cell of openCells(grid)) {
            if (cell.x === SPAWN_CELLS.man.x && cell.y === SPAWN_CELLS.man.y) continue;
            assert.ok(findPath(grid, SPAWN_CELLS.man, cell).length > 0);
        }
        // Reaper navigation includes grave tiles, while Man/He-Man navigation blocks them.
        for (const grave of graves) {
            assert.ok(findPath(createGrid(), SPAWN_CELLS.reaper, grave).length > 0);
            assert.deepEqual(findPath(grid, SPAWN_CELLS.man, grave), []);
        }
    }
    assert.equal(layouts.size, 30);
});


test('He-Man speed grows with collected souls and caps at 200 percent', () => {
    const round = new ChaseRound(() => 0);
    for (let souls = 0; souls <= 200; souls++) {
        const expectedRatio = Math.min(1.05 + souls * 0.005, 2.0);
        assert.ok(Math.abs(round.heroSpeed / SPEED.skull - expectedRatio) < 1e-12);
        assert.ok(round.heroSpeed <= SPEED.skull * 2.0);
        assert.equal(round.score, souls);
        if (souls < 200) {
            assert.equal(round.collide(), 'point');
            round.advance(PHASE_DURATION.death);
            if (round.phase === 'transforming') {
                round.advance(PHASE_DURATION.transformation);
                round.advance(round.remaining);
                round.advance(PHASE_DURATION.transformation);
            }
        }
    }
    round.advance(round.duration);
    round.advance(PHASE_DURATION.transformation);
    round.collide();
    round.advance(PHASE_DURATION.respawn);
    assert.equal(round.heroSpeed, SPEED.skull * 2.0);
    assert.equal(new ChaseRound().heroSpeed, SPEED.hero);
});

test('base speed ratios are exact and faster characters need longer to reverse', () => {
    assert.ok(Math.abs(SPEED.man / SPEED.skull - 0.90) < 1e-12);
    assert.ok(Math.abs(SPEED.hero / SPEED.skull - 1.05) < 1e-12);
    const reversalTime = speed => {
        let velocity = { x: speed, y: 0 };
        let elapsed = 0;
        while (velocity.x > 0) {
            velocity = steerVelocity(velocity, { x: -1, y: 0 }, speed, 1);
            elapsed++;
        }
        return elapsed;
    };
    assert.ok(reversalTime(SPEED.man) < reversalTime(SPEED.skull));
    assert.ok(reversalTime(SPEED.skull) < reversalTime(SPEED.hero));
});

test('acceleration, braking and diagonal steering respect the vector acceleration limit', () => {
    const delta = 1000 / 60;
    let velocity = { x: 0, y: 0 };
    for (const direction of [{ x: 1, y: 1 }, { x: -1, y: 0 }, { x: 0, y: 0 }]) {
        for (let i = 0; i < 120; i++) {
            const next = steerVelocity(velocity, direction, SPEED.skull, delta);
            assert.ok(Math.hypot(next.x - velocity.x, next.y - velocity.y) <= MOTION.acceleration * delta / 1000 + 1e-9);
            assert.ok(Math.hypot(next.x, next.y) <= SPEED.skull + 1e-9);
            velocity = next;
        }
    }
    assert.deepEqual(velocity, { x: 0, y: 0 });
    for (const fps of [30, 60, 120]) {
        let current = { x: 0, y: 0 };
        for (let i = 0; i < fps / 10; i++) current = steerVelocity(current, { x: 1, y: 0 }, SPEED.skull, 1000 / fps);
        assert.ok(Math.abs(current.x - 70) < 1e-9);
    }
});

test('inertial paths reach corners and stop at destinations without position snapping', () => {
    for (const speed of Object.values(SPEED)) {
        for (const fps of [20, 30, 60, 120]) {
            const position = { x: 100, y: 100 };
            let velocity = { x: 0, y: 0 };
            const path = [{ x: 140, y: 100 }, { x: 180, y: 100 }, { x: 220, y: 100 }, { x: 220, y: 180 }];
            for (let i = 0; i < fps * 10; i++) {
                const motion = pathMotion(position, velocity, path, speed);
                velocity = steerVelocity(velocity, motion.direction, motion.speed, 1000 / fps);
                position.x += velocity.x / fps;
                position.y += velocity.y / fps;
                // Leave enough clearance for the character's 18px body in a 40px corridor.
                assert.ok(Math.min(Math.abs(position.y - 100), Math.abs(position.x - 220)) < 10);
            }
            assert.equal(path.length, 0);
            assert.ok(Math.hypot(position.x - 220, position.y - 180) < 4);
            assert.deepEqual(velocity, { x: 0, y: 0 });
        }
    }
});


test('hero paths use diagonals in open space without cutting blocked corners', () => {
    const start = { x: 3, y: 3 };
    const goal = { x: 6, y: 6 };
    assert.deepEqual(findPath(createGrid(), start, goal, true).map(toCell), [
        { x: 4, y: 4 }, { x: 5, y: 5 }, goal,
    ]);
    assert.equal(findPath(createGrid(), start, goal).length, 6);
    for (const grave of [{ x: 4, y: 3 }, { x: 3, y: 4 }]) {
        const grid = createGrid([grave]);
        const path = findPath(grid, start, goal, true);
        assert.ok(path.length > 0);
        let previous = start;
        for (const point of path) {
            const next = toCell(point);
            assert.ok(grid[next.y][next.x]);
            if (next.x !== previous.x && next.y !== previous.y) {
                assert.ok(grid[previous.y][next.x]);
                assert.ok(grid[next.y][previous.x]);
            }
            previous = next;
        }
        assert.deepEqual(previous, goal);
    }
});

test('diagonal path following preserves momentum and stays within hero speed cap', () => {
    const position = { x: 140, y: 140 };
    const speed = SPEED.skull * 2.0;
    const path = [{ x: 180, y: 180 }, { x: 220, y: 220 }, { x: 260, y: 260 }];
    let velocity = { x: 0, y: 0 };
    let movedDiagonally = false;
    for (let frame = 0; frame < 300; frame++) {
        const motion = pathMotion(position, velocity, path, speed);
        velocity = steerVelocity(velocity, motion.direction, motion.speed, 1000 / 60);
        assert.ok(Math.hypot(velocity.x, velocity.y) <= speed + 1e-9);
        if (velocity.x > 0 && velocity.y > 0) movedDiagonally = true;
        position.x += velocity.x / 60;
        position.y += velocity.y / 60;
    }
    assert.ok(movedDiagonally);
    assert.equal(path.length, 0);
    assert.ok(Math.hypot(position.x - 260, position.y - 260) < 4);
    assert.deepEqual(velocity, { x: 0, y: 0 });
    const straightPath = [{ x: 180, y: 180 }, { x: 220, y: 220 }];
    pathMotion({ x: 160, y: 160 }, { x: 100, y: 100 }, straightPath, speed);
    assert.equal(straightPath.length, 1);
});


test('man speed rises from 90 percent toward 95 percent with diminishing time gains', () => {
    const round = new ChaseRound(() => 0);
    assert.equal(round.manSpeed, SPEED.skull * 0.9);
    const speeds = [round.manSpeed];
    for (let minute = 1; minute <= 3; minute++) {
        for (let frame = 0; frame < 1200; frame++) round.advance(50);
        const expected = SPEED.skull * (0.95 - 0.05 * Math.exp(-minute));
        assert.ok(Math.abs(round.manSpeed - expected) < 1e-9);
        assert.ok(round.manSpeed > speeds.at(-1));
        assert.ok(round.manSpeed <= SPEED.skull * 0.95);
        speeds.push(round.manSpeed);
    }
    assert.ok(speeds[2] - speeds[1] < speeds[1] - speeds[0]);
    assert.ok(speeds[3] - speeds[2] < speeds[2] - speeds[1]);
    round.advance(60 * 60 * 1000);
    assert.equal(round.manSpeed, SPEED.skull * 0.95);
    assert.equal(new ChaseRound().manSpeed, SPEED.skull * 0.9);
});

test('man speed progression persists through a capture and respawn', () => {
    const round = new ChaseRound(() => 0);
    round.advance(1000);
    const before = round.manSpeed;
    assert.equal(round.collide(), 'point');
    assert.equal(round.manSpeed, before);
    round.advance(PHASE_DURATION.death);
    assert.equal(round.phase, 'man');
    assert.ok(round.manSpeed > before);
    assert.ok(Math.abs(round.manSpeed - SPEED.skull * (0.95 - 0.05 * Math.exp(-1.75 / 60))) < 1e-9);
});


test('both combat forms register visible contact in every direction', () => {
    for (const phase of ['man', 'hero']) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const positions = radius => ({
                player: { x: 100, y: 100 },
                opponent: { x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius },
            });
            assert.equal(canCombatContact(phase, positions(35)), true);
            assert.equal(canCombatContact(phase, positions(37)), false);
        }
    }
    for (const phase of ['transforming', 'reverting', 'dying', 'respawning', 'gameover']) {
        assert.equal(canCombatContact(phase, { player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } }), false);
    }
});

test('swept combat catches fast crossings but rejects near misses and teleports without history', () => {
    const previous = { player: { x: -40, y: -40 }, opponent: { x: 40, y: 40 } };
    const current = { player: { x: 40, y: 40 }, opponent: { x: -40, y: -40 } };
    for (const phase of ['man', 'hero']) {
        assert.equal(canCombatContact(phase, current, previous), true);
        assert.equal(canCombatContact(phase, current), false);
        const beforeMiss = { player: { x: 0, y: 0 }, opponent: { x: -50, y: 37 } };
        const afterMiss = { player: { x: 0, y: 0 }, opponent: { x: 50, y: 37 } };
        assert.equal(canCombatContact(phase, afterMiss, beforeMiss), false);
        const round = new ChaseRound(() => 0);
        if (phase === 'hero') {
            round.advance(round.duration);
            round.advance(PHASE_DURATION.transformation);
        }
        let hits = 0;
        for (let step = 0; step < 10; step++) {
            if (canCombatContact(round.phase, current, previous) && round.collide()) hits++;
        }
        assert.equal(hits, 1);
    }
});


test('Grim starts, stops and reverses instantly with normalized diagonal speed', () => {
    assert.deepEqual(directionVelocity({ x: 1, y: 0 }, SPEED.skull), { x: 250, y: 0 });
    assert.deepEqual(directionVelocity({ x: -1, y: 0 }, SPEED.skull), { x: -250, y: 0 });
    assert.deepEqual(directionVelocity({ x: 0, y: -1 }, SPEED.skull), { x: 0, y: -250 });
    assert.deepEqual(directionVelocity({ x: 0, y: 0 }, SPEED.skull), { x: 0, y: 0 });
    const diagonal = directionVelocity({ x: 1, y: 1 }, SPEED.skull);
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - SPEED.skull) < 1e-9);
    // Opponents still accelerate rather than immediately reaching their target speed.
    const opponent = steerVelocity({ x: 0, y: 0 }, { x: 1, y: 0 }, SPEED.man, 1000 / 60);
    assert.ok(opponent.x > 0 && opponent.x < SPEED.man);
});

test('Grim click paths turn and stop without momentum at different frame rates', () => {
    for (const fps of [20, 30, 60, 120]) {
        const delta = 1000 / fps;
        const position = { x: 100, y: 100 };
        const path = [{ x: 140, y: 100 }, { x: 140, y: 180 }];
        const initial = instantPathMotion(position, path, SPEED.skull, delta);
        assert.equal(initial.speed, SPEED.skull);
        let velocity;
        for (let frame = 0; frame < fps * 2; frame++) {
            const motion = instantPathMotion(position, path, SPEED.skull, delta);
            velocity = directionVelocity(motion.direction, motion.speed);
            position.x += velocity.x / fps;
            position.y += velocity.y / fps;
            assert.ok(position.x <= 140 + 1e-9);
            assert.ok(position.y <= 180 + 1e-9);
        }
        assert.equal(path.length, 0);
        assert.deepEqual(velocity, { x: 0, y: 0 });
        assert.ok(Math.hypot(position.x - 140, position.y - 180) <= MOTION.waypointRadius);
    }
});


test('Man wandering samples every nearby open destination and excludes his current tile', () => {
    const start = { x: 10, y: 8 };
    const position = toWorld(start);
    const choices = [start, { x: 9, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 7 }, { x: 10, y: 9 }, { x: 20, y: 8 }];
    const grid = createGrid();
    for (let i = 0; i < 4; i++) {
        const target = randomWanderTarget(choices, position, () => (i + 0.5) / 4);
        assert.deepEqual(target, choices[i + 1]);
        assert.ok(findPath(grid, start, target).length > 0);
    }
    assert.deepEqual(randomWanderTarget([start], position), start);
});


test('captures preserve transformation countdown including time spent dying', () => {
    let samples = 0;
    const round = new ChaseRound(() => { samples++; return 0; });
    round.advance(1000);
    round.collide();
    round.advance(PHASE_DURATION.death);
    assert.equal(round.phase, 'man');
    assert.equal(round.duration, 5000);
    assert.equal(round.remaining, 3250);
    assert.equal(samples, 1);
    round.collide();
    round.advance(PHASE_DURATION.death);
    assert.equal(round.remaining, 2500);
    assert.equal(samples, 1);
    round.advance(2499);
    assert.equal(round.phase, 'man');
    round.advance(1);
    assert.equal(round.phase, 'transforming');
    round.advance(PHASE_DURATION.transformation);
    round.advance(round.remaining);
    round.advance(PHASE_DURATION.transformation);
    assert.equal(round.phase, 'man');
    assert.equal(round.remaining, 5000);
    assert.equal(samples, 2);
});

test('cooldown expiring during death transforms on respawn instead of resetting', () => {
    const round = new ChaseRound(() => 0);
    round.advance(4900);
    round.collide();
    round.advance(100);
    assert.equal(round.phase, 'dying');
    assert.equal(round.collide(), null);
    round.advance(PHASE_DURATION.death - 100);
    assert.equal(round.phase, 'transforming');
    assert.equal(round.remaining, PHASE_DURATION.transformation);
    assert.equal(round.collide(), null);
    round.advance(PHASE_DURATION.transformation);
    assert.equal(round.phase, 'hero');
});
