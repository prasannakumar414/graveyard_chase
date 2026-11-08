const COMBAT_VIBRATION = {
    point: [35],
    caught: [100, 50, 100],
};

function vibrate(pattern: number | number[]) {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate(pattern);
    } catch { /* Unsupported or blocked haptics must never interrupt gameplay. */ }
}

/** Trigger only for confirmed captures and hits, once per combat result. */
export function vibrateCombat(result: 'point' | 'caught') {
    if (typeof document !== 'undefined' && document.hidden) return;
    vibrate(COMBAT_VIBRATION[result]);
}

export function stopVibration() {
    vibrate(0);
}
