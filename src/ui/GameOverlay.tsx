import type { GameSnapshot } from '../game/config';
import { SkullIcon } from './SkullIcon';

interface Props { state: GameSnapshot; ready: boolean; onContinue: () => void }

export function GameOverlay({ state, ready, onContinue }: Props) {
    const eyebrow = state.over ? 'THE REAPER GOT REAPED'
        : state.paused ? 'TAKE A BREATHER' : 'WELCOME TO YOUR NIGHT SHIFT';
    const copy = state.over
        ? `All three hearts are gone. Final score: ${state.score} ${state.score === 1 ? 'soul' : 'souls'}. There’s always another midnight.`
        : state.paused
            ? 'The graveyard can wait. Your hunt resumes right where you left it.'
            : 'Chase the man and collect his soul. Run when he becomes He-Man. You have three hearts; collect as many souls as you can.';
    const buttonLabel = !ready ? 'WAKING THE DEAD…'
        : state.over ? 'ONE MORE SHIFT' : state.paused ? 'BACK TO THE HUNT' : 'START YOUR SHIFT';

    return (
        <div className="game-overlay">
            <div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
                <div className="overlay-emblem"><SkullIcon /></div>
                <span className="eyebrow">{eyebrow}</span>
                <h2 id="overlay-title">
                    {state.over ? 'Dead. Again.' : state.paused ? 'Time stands still.' : <>Hunt. Haunt. <em>Run.</em></>}
                </h2>
                <p>{copy}</p>
                {!state.started && (
                    <div className="intro-cycle">
                        <span>☠<small>YOU HUNT</small></span><b>→</b>
                        <span>ϟ<small>HE TRANSFORMS</small></span><b>→</b>
                        <span>↗<small>YOU RUN</small></span>
                    </div>
                )}
                <button className="primary-button" disabled={!ready} onClick={onContinue}>
                    {buttonLabel}<span>↗</span>
                </button>
                <span className="overlay-footnote">
                    {state.started ? 'P TO PAUSE · R TO RESTART' : 'ARROW KEYS / WASD · TOUCH ANYWHERE ON MOBILE'}
                </span>
            </div>
        </div>
    );
}
