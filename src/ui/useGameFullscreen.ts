import { useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/config';

type LockableOrientation = ScreenOrientation & {
    lock?: (orientation: 'landscape') => Promise<void>;
};

/** Native fullscreen where available; CSS keeps play immersive on other browsers. */
export function useGameFullscreen(playing: boolean) {
    const container = useRef<HTMLElement>(null);
    const playingRef = useRef(playing);
    const enteredFullscreen = useRef(false);
    const orientationLocked = useRef(false);
    playingRef.current = playing;

    useEffect(() => {
        const onFullscreenChange = () => {
            const ownsFullscreen = document.fullscreenElement === container.current;
            if (enteredFullscreen.current && !ownsFullscreen && playingRef.current) {
                EventBus.emit(GAME_EVENTS.pause);
            }
            enteredFullscreen.current = ownsFullscreen;
            if (ownsFullscreen && !playingRef.current) {
                void document.exitFullscreen().catch(() => {});
            }
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            if (orientationLocked.current) {
                screen.orientation?.unlock();
                orientationLocked.current = false;
            }
        };
    }, []);

    useEffect(() => {
        if (!playing) {
            if (orientationLocked.current) {
                screen.orientation?.unlock();
                orientationLocked.current = false;
            }
            if (document.fullscreenElement === container.current) {
                void document.exitFullscreen().catch(() => {});
            }
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, [playing]);

    const lockLandscape = async () => {
        if (!window.matchMedia('(pointer: coarse)').matches || !playingRef.current) return;
        const orientation = screen.orientation as LockableOrientation | undefined;
        if (!orientation?.lock) return;
        try {
            await orientation.lock('landscape');
            if (playingRef.current) orientationLocked.current = true;
            else orientation.unlock();
        } catch { /* CSS rotates the game stage on browsers that cannot lock orientation. */ }
    };

    const enterFullscreen = () => {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
            // Keep this call inside the start/resume gesture required by browsers.
            void container.current?.requestFullscreen({ navigationUI: 'hide' })
                .then(lockLandscape).catch(() => {});
        } else if (document.fullscreenElement === container.current) {
            void lockLandscape();
        }
    };

    return { container, enterFullscreen };
}
