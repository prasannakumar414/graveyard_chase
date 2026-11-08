import { useEffect, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS, GameSnapshot, PLAYER_LIVES } from './game/config';
import { GameHud, isDanger, RoundBar } from './ui/GameHud';
import { GameOverlay } from './ui/GameOverlay';
import { HelpDialog } from './ui/HelpDialog';
import { SkullIcon } from './ui/SkullIcon';
import { useGameFullscreen } from './ui/useGameFullscreen';
import { ThumbControls } from './ui/ThumbControls';

const INITIAL_STATE: GameSnapshot = {
    score: 0, lives: PLAYER_LIVES, phase: 'man', seconds: 3, progress: 1, elapsed: 0,
    started: false, paused: false, over: false, muted: false,
};
const BEST_SCORE_KEY = 'graveyard-best';

function App() {
    const [state, setState] = useState(INITIAL_STATE);
    const [ready, setReady] = useState(false);
    const [best, setBest] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const playing = state.started && !state.paused && !state.over;
    const { container, enterFullscreen } = useGameFullscreen(playing);

    useEffect(() => {
        try { setBest(Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0); }
        catch { /* Storage is optional; keep a session record when unavailable. */ }
        const onState = (next: GameSnapshot) => {
            setState(next);
            setReady(true);
            if (next.over) setBest(previous => Math.max(previous, next.score));
        };
        EventBus.on(GAME_EVENTS.state, onState);
        return () => { EventBus.off(GAME_EVENTS.state, onState); };
    }, []);

    useEffect(() => {
        if (best === 0) return;
        try { localStorage.setItem(BEST_SCORE_KEY, String(best)); }
        catch { /* Gameplay remains available without persistent storage. */ }
    }, [best]);

    const send = (event: string) => { EventBus.emit(event); };
    const openHelp = () => {
        if (state.started && !state.paused && !state.over) send(GAME_EVENTS.pause);
        setShowHelp(true);
    };
    const continueGame = () => {
        enterFullscreen();
        send(state.over ? GAME_EVENTS.restart : state.paused ? GAME_EVENTS.pause : GAME_EVENTS.start);
    };
    const restartGame = () => {
        enterFullscreen();
        send(GAME_EVENTS.restart);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!ready || showHelp || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.target instanceof HTMLElement) {
                if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
                if (event.key === 'Enter' && event.target.closest('button, a')) return;
            }
            switch (event.key.toLowerCase()) {
                case 'enter':
                    if (!playing) continueGame();
                    break;
                case 'p':
                    if (state.started && !state.over) {
                        if (state.paused) continueGame();
                        else send(GAME_EVENTS.pause);
                    }
                    break;
                case 'escape':
                    if (playing) send(GAME_EVENTS.pause);
                    break;
                case 'r':
                    restartGame();
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return (
        <div className="game-page">
            <header className="site-header">
                <a href="/" className="brand" aria-label="Graveyard Shift home">
                    <SkullIcon small /><span>AFTERHOURS<span className="brand-light"> ARCADE</span></span>
                </a>
                <span className="header-note"><i /> A LITTLE DEATH. A LOT OF RUNNING.</span>
            </header>
            <main className="game-layout">
                <section className="heading-row">
                    <div>
                        <div className="eyebrow"><span>01</span> THE MIDNIGHT COLLECTION</div>
                        <h1>Graveyard <em>Shift</em><span className="title-star">✦</span></h1>
                        <p>You’re death. Until you’re the one running.</p>
                    </div>
                    <button className="help-button" onClick={openHelp}><span>?</span> How to play</button>
                </section>
                <section ref={container} className={`game-shell ${isDanger(state.phase) ? 'danger' : ''} ${playing ? 'is-playing' : ''}`} aria-label="Graveyard Shift">
                    <div className="game-stage">
                        <GameHud state={state} best={best} ready={ready}
                            onMute={() => send(GAME_EVENTS.mute)}
                            onPause={() => state.paused ? continueGame() : send(GAME_EVENTS.pause)} onRestart={restartGame} />
                        <div className="canvas-wrap">
                            <PhaserGame />
                            <div className="arena-label">
                                <span className="live-dot" /> BLACKTHORN CEMETERY <span>/</span> MIDNIGHT
                            </div>
                            <div className="arena-coordinate">SECTOR 04 <span>✦</span></div>
                            {(!state.started || state.paused || state.over) && (
                                <GameOverlay state={state} ready={ready} onContinue={continueGame} />
                            )}
                        </div>
                        <RoundBar state={state} />
                        <ThumbControls disabled={!playing || state.phase === 'respawning' || state.phase === 'gameover'} />
                    </div>
                </section>
                <section className="below-game">
                    <div className="control-guide">
                        <div className="key-group"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>
                        <div><strong>Keep moving.</strong><p>Arrow keys / WASD on desktop. Touch anywhere to place the joystick on mobile.</p></div>
                    </div>
                    <div className="field-note">
                        <span>FIELD NOTE / 001</span><p>Graves make good cover.<br />Heroes make terrible company.</p>
                    </div>
                    <div className="auto-attack"><span>◎</span><p>Attacks happen<br /><strong>on contact.</strong></p></div>
                </section>
                <footer className="page-footer">
                    <span>BUILT FOR THE WITCHING HOUR</span><span>THREE HEARTS. ONE NIGHT SHIFT. <i>✦</i></span>
                </footer>
            </main>
            {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
        </div>
    );
}

export default App;
