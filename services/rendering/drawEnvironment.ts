/**
 * Draw Environment
 * Renders static environmental elements (sky, grass, mountains)
 */

import { COLORS } from '../../constants';

/**
 * Draw the sky background
 */
export function drawSky(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    ctx.fillStyle = COLORS.SKY;
    ctx.fillRect(x, y, width, height);
}

/**
 * Draw the grass/ground
 */
export function drawGrass(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    ctx.fillStyle = COLORS.LIGHT.grass;
    ctx.fillRect(x, y, width, height);
}

/**
 * Draw procedural mountains
 */
export function drawMountains(
    ctx: CanvasRenderingContext2D,
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
): void {
    const h = viewH / 2;
    ctx.fillStyle = COLORS.MOUNTAIN;
    ctx.beginPath();
    ctx.moveTo(viewX, viewY + h);

    for (let i = 0; i <= viewW; i += 20) {
        const seed = (i + viewX) * 0.05;
        const peakHeight = Math.sin(seed) * 10 + Math.cos(seed * 2.5) * 5 + 15;
        ctx.lineTo(viewX + i, viewY + h - peakHeight);
    }

    ctx.lineTo(viewX + viewW, viewY + h);
    ctx.closePath();
    ctx.fill();
}
