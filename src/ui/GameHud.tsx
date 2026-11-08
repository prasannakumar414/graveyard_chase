import type { GameSnapshot, Phase } from '../game/config';
import { PLAYER_LIVES } from '../game/config';
import { SkullIcon } from './SkullIcon';

const STATUS: Record<Phase, { title: string; hint: string }> = {
    man: { title: 'THE HUNT IS ON', hint: 'Catch the man. Claim a soul.' },
    transforming: { title: 'POWER IS RISING', hint: 'He is transforming. Get some distance!' },
    hero: { title: 'THE TABLES HAVE TURNED', hint: 'He-Man is hunting you. Run!' },
    reverting: { title: 'POWER IS FADING', hint: 'Get ready. Your next hunt is almost here.' },
    dying: { title: 'SOUL COLLECTED', hint: 'One down. He will return somewhere new.' },
    respawning: { title: 'HEART LOST', hint: 'Take a breath. Your hunt continues.' },
    gameover: { title: 'YOUR TIME HAS COME', hint: 'Even death can get caught.' },
};

export function isDanger(phase: Phase) {
    return phase === 'hero' || phase === 'transforming' || phase === 'gameover';
}

interface HudProps {
    state: GameSnapshot;
    best: number;
    ready: boolean;
    onPause: () => void;
    onRestart: () => void;
    onMute: () => void;
}

export function GameHud({ state, best, ready, onPause, onRestart, onMute }: HudProps) {
    const minutes = String(Math.floor(state.elapsed / 60)).padStart(2, '0');
    const seconds = String(Math.floor(state.elapsed % 60)).padStart(2, '0');
    return (
        <div className="hud">
            <div className="score-group">
                <div className="score-icon"><SkullIcon small /></div>
                <div>
                    <span className="stat-label">{state.over ? 'FINAL SCORE' : 'SOULS'}</span>
                    <strong className="score" aria-live="polite">{String(state.score).padStart(2, '0')}</strong>
                </div>
                <div className="player-lives" role="status" aria-label={`${state.lives} of ${PLAYER_LIVES} lives remaining`}>
                    <span className="stat-label">HEARTS</span>
                    <div className="hearts" aria-hidden="true">
                        {Array.from({ length: PLAYER_LIVES }, (_, index) => (
                            <span key={index} className={index < state.lives ? 'heart' : 'heart lost'}>♥</span>
                        ))}
                    </div>
                </div>
                <div className="record">
                    <span className="stat-label">PERSONAL BEST</span>
                    <strong>♜ <span>{String(best).padStart(2, '0')}</span></strong>
                </div>
            </div>
            <div className="round-status">
                <span className="phase-tag"><i />{isDanger(state.phase) ? 'SURVIVE' : 'HUNT'}</span>
                <strong>{STATUS[state.phase].title}</strong>
            </div>
            <div className="hud-actions">
                <span className="timer">{minutes}:{seconds}</span>
                <button className="icon-button" aria-label={state.muted ? 'Unmute audio' : 'Mute audio'}
                    aria-pressed={state.muted} title={state.muted ? 'Unmute audio' : 'Mute audio'}
                    disabled={!ready} onClick={onMute}>
                    {state.muted ? '🔇' : '🔊'}
                </button>
                <button className="icon-button" aria-label={state.paused ? 'Resume game' : 'Pause game'}
                    disabled={!state.started || state.over} onClick={onPause}>
                    {state.paused ? '▷' : 'Ⅱ'}
                </button>
                <button className="icon-button" aria-label="Restart game" disabled={!ready} onClick={onRestart}>↻</button>
            </div>
        </div>
    );
}

export function RoundBar({ state }: { state: GameSnapshot }) {
    const timerLabel = state.phase === 'man' ? 'TRANSFORMS IN'
        : state.phase === 'hero' ? 'POWER FADES IN'
        : state.phase === 'dying' || state.phase === 'respawning' ? 'RETURNS IN' : 'SHIFTING';
    return (
        <div className="phase-bar">
            <div className="phase-copy">
                <span className="phase-symbol">{isDanger(state.phase) ? 'ϟ' : '✦'}</span>
                <span>{STATUS[state.phase].hint}</span>
            </div>
            <div className="phase-countdown">
                {state.phase === 'gameover' ? <span>SHIFT ENDED</span> : <>
                    <span>{timerLabel}</span>
                    <strong>{state.seconds.toFixed(1)}<small>s</small></strong>
                    <div className="progress-track"><div style={{ width: `${state.progress * 100}%` }} /></div>
                </>}
            </div>
        </div>
    );
}
