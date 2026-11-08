import { Scene } from 'phaser';
import { createCharacterArt, loadSkullArt } from '../art/characters';
import { createEnvironmentArt } from '../art/environment';
import { loadCharacterSheets } from '../art/characterAssets';
import { loadGameAudio } from '../audio/GameAudio';

export class Boot extends Scene {
    constructor() { super('Boot'); }

    preload() {
        loadGameAudio(this);
        loadCharacterSheets(this);
        loadSkullArt(this);
    }

    create() {
        createEnvironmentArt(this);
        createCharacterArt(this);
        this.scene.start('Game');
    }
}
