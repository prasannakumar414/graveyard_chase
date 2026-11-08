import { forwardRef, useLayoutEffect, useRef } from 'react';
import type { Game, Scene } from 'phaser';
import StartGame from './game/main';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/config';

export interface IRefPhaserGame {
    game: Game | null;
    scene: Scene | null;
}

interface Props { currentActiveScene?: (scene: Scene) => void }

export const PhaserGame = forwardRef<IRefPhaserGame, Props>(function PhaserGame({ currentActiveScene }, ref) {
    const game = useRef<Game | null>(null);
    const host = useRef<HTMLDivElement>(null);
    const callback = useRef(currentActiveScene);
    callback.current = currentActiveScene;

    useLayoutEffect(() => {
        const setRef = (scene: Scene | null) => {
            const value = { game: game.current, scene };
            if (typeof ref === 'function') ref(value);
            else if (ref) ref.current = value;
        };
        const onReady = (scene: Scene) => { setRef(scene); callback.current?.(scene); };
        EventBus.on(GAME_EVENTS.ready, onReady);
        const parent = host.current;
        if (!parent) return;
        // Use the mounted node directly: an ID lookup can fall back to document.body
        // when React reveals a dynamically loaded tree in a production build.
        game.current = StartGame(parent);
        // The parent also changes size when mobile browser chrome or page UI changes.
        let resizeFrame = 0;
        const refreshScale = () => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
                const instance = game.current;
                if (!instance?.isRunning || !parent.clientWidth || !parent.clientHeight) return;
                // CSS may rotate the mobile stage by 90 degrees. Layout dimensions
                // retain its landscape size; bounding rectangles swap the axes.
                instance.canvas.style.width = `${parent.clientWidth}px`;
                instance.canvas.style.height = `${parent.clientHeight}px`;
                instance.scale.resize(parent.clientWidth, parent.clientHeight);
            });
        };
        const resizeObserver = new ResizeObserver(refreshScale);
        resizeObserver.observe(parent);
        refreshScale();
        document.addEventListener('fullscreenchange', refreshScale);
        setRef(null);
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(resizeFrame);
            document.removeEventListener('fullscreenchange', refreshScale);
            EventBus.off(GAME_EVENTS.ready, onReady);
            game.current?.destroy(true);
            game.current = null;
            if (typeof ref === 'function') ref(null);
            else if (ref) ref.current = null;
        };
    }, [ref]);

    return <div ref={host} id="game-container" aria-label="Graveyard chase game. Use arrow keys or WASD on desktop. On mobile, use either thumb stick to move and lift to stop." />;
});
