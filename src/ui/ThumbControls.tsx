import { useEffect, useRef, type PointerEvent } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/config';
import { ROTATED_LANDSCAPE_QUERY, ThumbStick } from '../game/input/ThumbStick';

export function ThumbControls({ disabled }: { disabled: boolean }) {
    const activePad = useRef<HTMLDivElement | null>(null);
    const controls = useRef<HTMLDivElement | null>(null);
    const activePointer = useRef<number | null>(null);
    const stick = useRef<ThumbStick | null>(null);
    if (!stick.current) {
        stick.current = new ThumbStick((direction, knob) => {
            const pad = activePad.current;
            const handle = pad?.querySelector<HTMLElement>('.thumb-knob');
            // Pointer feedback stays out of React state and the game render loop.
            if (handle) handle.style.transform = `translate(${knob.x}px, ${knob.y}px)`;
            if (pad) pad.dataset.active = String(direction.x !== 0 || direction.y !== 0);
            EventBus.emit(GAME_EVENTS.move, direction);
        });
    }

    useEffect(() => {
        const clear = () => {
            stick.current?.clear();
            const pointerId = activePointer.current;
            activePointer.current = null;
            if (pointerId !== null && controls.current?.hasPointerCapture(pointerId)) {
                controls.current.releasePointerCapture(pointerId);
            }
        };
        const resize = () => {
            clear();
            // Return to the safe default when the stage changes size or orientation.
            activePad.current?.style.removeProperty('left');
            activePad.current?.style.removeProperty('top');
            activePad.current?.style.removeProperty('bottom');
        };
        clear();
        window.addEventListener('blur', clear);
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', clear);
        return () => {
            clear();
            window.removeEventListener('blur', clear);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', clear);
        };
    }, [disabled]);

    const move = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        stick.current?.move(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const press = (event: PointerEvent<HTMLDivElement>) => {
        const pad = activePad.current;
        if (disabled || !pad || activePointer.current !== null || event.button !== 0) return;
        event.preventDefault();
        const layer = event.currentTarget;
        const bounds = layer.getBoundingClientRect();
        const rotated = window.matchMedia(ROTATED_LANDSCAPE_QUERY).matches;
        // Convert screen coordinates into the stage's local axes, including portrait fallback.
        const x = rotated ? event.clientY - bounds.top : event.clientX - bounds.left;
        const y = rotated ? bounds.right - event.clientX : event.clientY - bounds.top;
        const radius = pad.offsetWidth / 2;
        const centerX = Math.max(radius, Math.min(layer.clientWidth - radius, x));
        const centerY = Math.max(radius, Math.min(layer.clientHeight - radius, y));
        pad.style.left = `${centerX - radius}px`;
        pad.style.top = `${centerY - radius}px`;
        pad.style.bottom = 'auto';
        const padBounds = pad.getBoundingClientRect();
        stick.current?.begin(event.pointerId,
            { x: padBounds.left + padBounds.width / 2, y: padBounds.top + padBounds.height / 2 },
            rotated, pad.clientWidth * 0.3);
        activePointer.current = event.pointerId;
        layer.setPointerCapture(event.pointerId);
        // Start centered even near an edge; movement begins when the thumb slides.
    };
    const release = (event: PointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return;
        stick.current?.release(event.pointerId);
        activePointer.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return <div ref={controls} className="thumb-controls" role="group"
        aria-label="Touch anywhere to place the joystick, slide to move, lift to stop"
        data-disabled={disabled}
        onPointerDown={press} onPointerMove={move}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onContextMenu={event => event.preventDefault()}>
        <div ref={activePad} className="thumb-stick" aria-hidden="true">
            <span className="thumb-knob" /><small>MOVE</small>
        </div>
    </div>;
}
