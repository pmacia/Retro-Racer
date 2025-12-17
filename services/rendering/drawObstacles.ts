/**
 * Draw Obstacles
 * Renders trackside sprites (trees, boulders, barrels, tires)
 */

import type { Sprite } from '../../types';

/**
 * Draw a tree sprite
 */
function drawTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.4, width * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    const trunkW = width * 0.2;
    const trunkH = height * 0.2;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

    // Foliage layers (triangle-based)
    const drawLayer = (layerY: number, layerW: number, layerH: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - layerW / 2, layerY);
        ctx.lineTo(x, layerY - layerH);
        ctx.lineTo(x + layerW / 2, layerY);
        ctx.closePath();
        ctx.fill();
    };

    const startY = y - trunkH * 0.8;
    drawLayer(startY, width, height * 0.35, '#0d4013');
    drawLayer(startY - height * 0.25, width * 0.8, height * 0.35, '#14521b');
    drawLayer(startY - height * 0.5, width * 0.6, height * 0.35, '#1a6622');
}

/**
 * Draw a boulder sprite
 */
function drawBoulder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.55, width * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boulder body
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(x - width * 0.45, y);
    ctx.quadraticCurveTo(x, y - height * 1.2, x + width * 0.45, y);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(x - width * 0.15, y - height * 0.5, width * 0.15, height * 0.1, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw a barrel sprite
 */
function drawBarrel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.3, width * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barrel body
    const barrelW = width * 0.5;
    const barrelH = height * 0.7;
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x - barrelW / 2, y - barrelH, barrelW, barrelH);

    // Metal bands
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x - barrelW / 2, y - barrelH * 0.7, barrelW, barrelH * 0.1);
    ctx.fillRect(x - barrelW / 2, y - barrelH * 0.3, barrelW, barrelH * 0.1);
}

/**
 * Draw a tire sprite
 */
function drawTire(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.3, width * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tire outer
    const tireW = width * 0.5;
    const tireH = height * 0.5;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(x, y - tireH / 2, tireW / 2, tireH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tire inner
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x, y - tireH / 2, tireW / 4, tireH / 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw a sprite based on its type
 */
export function drawSprite(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    switch (sprite.source) {
        case 'TREE':
            drawTree(ctx, x, y, width, height);
            break;
        case 'BOULDER':
            drawBoulder(ctx, x, y, width, height);
            break;
        case 'BARREL':
            drawBarrel(ctx, x, y, width, height);
            break;
        case 'TIRE':
            drawTire(ctx, x, y, width, height);
            break;
    }
}
