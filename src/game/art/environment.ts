import type { Scene } from 'phaser';
import { TILE_SIZE } from '../config';

function canvasTexture(scene: Scene, key: string, width: number, height: number,
    draw: (ctx: CanvasRenderingContext2D) => void) {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d')!);
    scene.textures.addCanvas(key, canvas);
}

export function createEnvironmentArt(scene: Scene) {
    canvasTexture(scene, 'graveyard-tiles', TILE_SIZE * 6, TILE_SIZE, ctx => {
        for (let tile = 0; tile < 6; tile++) {
            const x = tile * TILE_SIZE;
            ctx.fillStyle = ['#263b32', '#293e34', '#37433d', '#202a2c', '#39463e', '#243930'][tile];
            ctx.fillRect(x, 0, 40, 40);
            if (tile === 2 || tile === 4) {
                // Offset stone slabs with dark mortar and a lit upper edge.
                for (let row = 0; row < 2; row++) {
                    for (let column = -1; column < 3; column++) {
                        const sx = x + column * 22 + row * 11;
                        ctx.save(); ctx.beginPath(); ctx.rect(x, 0, 40, 40); ctx.clip();
                        ctx.fillStyle = '#273730'; ctx.fillRect(sx, row * 20, 21, 19);
                        ctx.fillStyle = tile === 2 ? '#465149' : '#424e45'; ctx.fillRect(sx + 1, row * 20 + 1, 19, 16);
                        ctx.fillStyle = '#536054'; ctx.fillRect(sx + 2, row * 20 + 1, 17, 1);
                        ctx.fillStyle = '#37453c'; ctx.fillRect(sx + 7, row * 20 + 8, 5, 1);
                        ctx.restore();
                    }
                }
            } else if (tile === 3) {
                ctx.fillStyle = '#101c1d'; ctx.fillRect(x, 0, 40, 40);
                ctx.fillStyle = '#394444'; ctx.fillRect(x, 10, 40, 23);
                ctx.fillStyle = '#5c6460'; ctx.fillRect(x, 10, 40, 3);
                ctx.fillStyle = '#273536'; ctx.fillRect(x + 19, 13, 2, 20);
                ctx.fillStyle = '#697365'; ctx.fillRect(x + 3, 11, 12, 1);
                ctx.fillStyle = '#182526'; ctx.fillRect(x, 34, 40, 6);
            } else {
                for (let i = 0; i < 22; i++) {
                    const px = (i * 17 + tile * 7) % 38, py = (i * 11 + tile * 13) % 38;
                    ctx.fillStyle = i % 3 ? '#324b39' : '#1d302c';
                    ctx.fillRect(x + px, py, 2, 3);
                    if (i % 4 === 0) { ctx.fillStyle = '#4b5b3c'; ctx.fillRect(x + px + 1, py, 1, 1); }
                }
            }
        }
    });
    for (let variant = 0; variant < 3; variant++) {
        canvasTexture(scene, `grave-${variant}`, 48, 64, ctx => {
            ctx.fillStyle = '#17241e'; ctx.fillRect(4, 49, 40, 12);
            ctx.fillStyle = '#3b4937'; ctx.fillRect(6, 48, 36, 9);
            ctx.fillStyle = '#687365'; ctx.fillRect(7, 46, 34, 7);
            ctx.fillStyle = '#8c9784'; ctx.fillRect(8, 46, 32, 2);
            ctx.fillStyle = '#384b47'; ctx.fillRect(12, 22, 26, 25);
            ctx.fillStyle = '#7c8b7e';
            if (variant === 1) {
                ctx.fillRect(21, 9, 8, 37); ctx.fillRect(12, 18, 26, 8);
                ctx.fillStyle = '#afbaa0'; ctx.fillRect(21, 9, 3, 34); ctx.fillRect(12, 18, 25, 2);
            } else {
                ctx.fillRect(13, 19, 22, 27); ctx.fillRect(16, 14, 16, 6);
                ctx.fillRect(19, 11, 10, 4);
                ctx.fillStyle = '#abb59e'; ctx.fillRect(15, 20, 3, 25); ctx.fillRect(17, 14, 14, 2);
                ctx.fillStyle = '#475c56'; ctx.fillRect(21, 26, 9, 2); ctx.fillRect(21, 31, 7, 2);
                ctx.fillRect(22, 36, 8, 2);
            }
            ctx.fillStyle = '#455d3f'; ctx.fillRect(11, 42, 7, 4); ctx.fillRect(29, 48, 10, 5);
            ctx.fillStyle = '#80905c'; ctx.fillRect(12, 42, 4, 2);
        });
    }
    canvasTexture(scene, 'candle', 16, 32, ctx => {
        ctx.fillStyle = '#1a211c'; ctx.fillRect(2, 26, 12, 4);
        ctx.fillStyle = '#b7a881'; ctx.fillRect(5, 14, 7, 13);
        ctx.fillStyle = '#ecdcac'; ctx.fillRect(5, 14, 3, 12);
        ctx.fillStyle = '#ca7a40'; ctx.fillRect(5, 6, 6, 8);
        ctx.fillStyle = '#ffcc72'; ctx.fillRect(6, 3, 4, 9);
        ctx.fillStyle = '#fff1bd'; ctx.fillRect(7, 8, 2, 5);
    });
    canvasTexture(scene, 'glow', 128, 128, ctx => {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255,196,102,0.23)');
        gradient.addColorStop(1, 'rgba(255,196,102,0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    });
    canvasTexture(scene, 'shadow', 48, 20, ctx => {
        ctx.fillStyle = 'rgba(5,14,16,0.5)'; ctx.beginPath(); ctx.ellipse(24, 10, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
    });
    canvasTexture(scene, 'vignette', 960, 640, ctx => {
        const gradient = ctx.createRadialGradient(480, 320, 200, 480, 320, 570);
        gradient.addColorStop(0, 'rgba(8,15,23,0)'); gradient.addColorStop(1, 'rgba(8,15,23,0.65)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 960, 640);
    });
}
