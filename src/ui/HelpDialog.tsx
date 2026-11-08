export function HelpDialog({ onClose }: { onClose: () => void }) {
    return (
        <div className="help-backdrop" onClick={onClose}>
            <div className="help-card" role="dialog" aria-modal="true" aria-labelledby="help-title"
                onClick={event => event.stopPropagation()}>
                <span className="eyebrow">A REAPER’S HANDBOOK</span>
                <h2 id="help-title">Rules of the night.</h2>
                <ol>
                    <li><strong>Chase the man.</strong> Touch him for one soul. Your skull attacks automatically; the man dies and respawns. He starts at 90% of your speed and gradually approaches 95% as you play, with smaller increases over time.</li>
                    <li><strong>Watch the countdown.</strong> Each hunt gives the man a random 5–7-second cooldown before transforming into He-Man. Capturing him does not reset this countdown, which continues during his death animation.</li>
                    <li><strong>Protect your three hearts.</strong> He-Man’s power starts at 3 seconds and grows by 1 second per minute played and 0.15 seconds per soul collected. His speed starts at 105% of yours and rises by 0.5 percentage points per soul, capped at 200%. Each catch costs one heart. You respawn after the first two; the third ends your shift. Neither form can hit during a transformation.</li>
                    <li><strong>Use the graveyard.</strong> Move with arrow keys / WASD on desktop, or click a destination. On mobile, use either thumb stick to move. Slide your thumb in any direction and hold to continue; lift to stop. Attacks happen automatically on contact. The game switches to a landscape layout when you start. P / Esc pauses. R restarts.</li>
                </ol>
                <button className="primary-button" onClick={onClose}>GOT IT <span>↗</span></button>
            </div>
        </div>
    );
}
