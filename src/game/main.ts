import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { Game as GraveyardGame } from './scenes/Game';
import { ARENA } from './config';

export default function StartGame(parent: HTMLElement) {
    return new Game({
        type: AUTO,
        parent,
        width: parent.clientWidth || ARENA.width,
        height: parent.clientHeight || ARENA.height,
        backgroundColor: '#172322',
        pixelArt: true,
        scale: {
            mode: Scale.NONE,
            autoCenter: Scale.NO_CENTER,
            expandParent: false,
            fullscreenTarget: parent.closest<HTMLElement>('.game-shell') ?? parent,
        },
        physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        input: { activePointers: 2 },
        scene: [Boot, GraveyardGame],
    });
}
