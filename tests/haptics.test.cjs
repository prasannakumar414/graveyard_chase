const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(readFileSync('src/game/systems/Haptics.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup(environment) {
    const exports = {};
    runInNewContext(source, { exports, ...environment });
    return exports;
}

test('captures pulse briefly, hits double pulse, and stopping cancels vibration', () => {
    const calls = [];
    const navigator = { vibrate(pattern) {
        assert.equal(this, navigator);
        calls.push(Array.isArray(pattern) ? [...pattern] : pattern);
        return true;
    } };
    const haptics = setup({ navigator });
    haptics.vibrateCombat('point');
    haptics.vibrateCombat('caught');
    haptics.stopVibration();
    assert.deepEqual(calls, [[35], [100, 50, 100], 0]);
});

test('missing, refused or throwing vibration APIs never interrupt combat', () => {
    for (const environment of [
        {}, { navigator: {} },
        { navigator: { vibrate: () => false } },
        { navigator: { vibrate() { throw Error('blocked'); } } },
    ]) {
        const haptics = setup(environment);
        assert.doesNotThrow(() => {
            haptics.vibrateCombat('point');
            haptics.vibrateCombat('caught');
            haptics.stopVibration();
        });
    }
});

test('hidden pages suppress combat feedback but can cancel a pending pulse', () => {
    const calls = [];
    const haptics = setup({
        document: { hidden: true }, navigator: { vibrate: pattern => calls.push(pattern) },
    });
    haptics.vibrateCombat('caught');
    haptics.stopVibration();
    assert.deepEqual(calls, [0]);
});
