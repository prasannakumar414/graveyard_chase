import { useEffect, useRef, type PointerEvent } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/config';
import { ROTATED_LANDSCAPE_QUERY, ThumbStick } from '../game/input/ThumbStick';

export function ThumbControls({ disabled }: { disabled: boolean }) {
    const activePad = useRef<HTMLButtonElement | null>(null);
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
        const clear = () => stick.current?.clear();
        clear();
        window.addEventListener('blur', clear);
        window.addEventListener('resize', clear);
        document.addEventListener('visibilitychange', clear);
        return () => {
            clear();
            window.removeEventListener('blur', clear);
            window.removeEventListener('resize', clear);
            document.removeEventListener('visibilitychange', clear);
        };
    }, [disabled]);

    const move = (event: PointerEvent<HTMLButtonElement>) => {
        if (disabled) return;
        stick.current?.move(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const press = (event: PointerEvent<HTMLButtonElement>) => {
        if (disabled) return;
        event.preventDefault();
        const pad = event.currentTarget;
        const bounds = pad.getBoundingClientRect();
        const accepted = stick.current?.begin(event.pointerId,
            { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
            window.matchMedia(ROTATED_LANDSCAPE_QUERY).matches, pad.clientWidth * 0.3);
        if (!accepted) return;
        activePad.current = pad;
        pad.setPointerCapture(event.pointerId);
        move(event);
    };
    const release = (event: PointerEvent<HTMLButtonElement>) => stick.current?.release(event.pointerId);

    return <div className="thumb-controls" role="group" aria-label="Thumb movement controls">
        {(['left', 'right'] as const).map(side => (
            <button key={side} className={`thumb-stick ${side}`} disabled={disabled}
                aria-label={`Move using ${side} thumb stick`}
                onPointerDown={press} onPointerMove={move}
                onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
                onContextMenu={event => event.preventDefault()}>
                <span className="thumb-knob" /><small>MOVE</small>
            </button>
        ))}
    </div>;
}
