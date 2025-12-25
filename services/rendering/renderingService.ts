import { Car, Segment } from '../../types';
import { project } from '../gameEngine';
import { ROAD_WIDTH, CAMERA_DEPTH, SEGMENT_LENGTH, VISIBILITY } from '../../constants';
// drawParticles and other stateful helpers are now in Engines, 
// BUT this file should just export pure functions if we want to keep it.
// The Plan said "Modified to export their logic or move".
// GraphicsEngine now has renderScene/renderMap logic.
// However, renderMap in GameCanvas relied on renderingService?
// No, I moved renderMap to GameCanvas.tsx at the bottom in the overwrite? 
// Wait, I overwrote GameCanvas.tsx and used Game class.
// Game class calls GraphicsEngine.
// GraphicsEngine has renderMap!
// So renderingService is strictly for pure helpers or deprecated?
// pure helpers like drawPoly, drawCar, drawSprite can stay here or be moved to 'utils/rendering'.
// For now, let's keep drawPoly, drawCar, drawSprite here and REMOVE renderView/renderMap.
// This ensures no one uses the old non-class renderers.

/**
 * Helper to draw polygons
 */
export const drawPoly = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    color: string
) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
};

/**
 * Logic for rendering car sprites (player and AI)
 */
export const drawCar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    angle: number = 0
) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.05, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const wheelW = w * 0.13;
    const wheelH = h * 0.35;
    const wheelY = -wheelH * 0.85;
    const wheelOffsetX = w * 0.4;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-wheelOffsetX - wheelW, wheelY, wheelW, wheelH);
    ctx.fillRect(wheelOffsetX, wheelY, wheelW, wheelH);

    const bodyH = h * 0.6;
    const bodyY = -bodyH * 1.1;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-w / 2, bodyY, w, bodyH, w * 0.08);
    else ctx.rect(-w / 2, bodyY, w, bodyH);
    ctx.fill();

    const cabinW = w * 0.65;
    const cabinH = h * 0.35;
    const cabinY = bodyY - cabinH * 0.9;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-cabinW / 2, cabinY, cabinW, cabinH, [w * 0.1, w * 0.1, 0, 0]);
    else ctx.rect(-cabinW / 2, cabinY, cabinW, cabinH);
    ctx.fill();

    const lightW = w * 0.16;
    const lightH = h * 0.15;
    const lightY = bodyY + bodyH * 0.3;
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(-w * 0.4, lightY, lightW, lightH);
    ctx.fillRect(w * 0.4 - lightW, lightY, lightW, lightH);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2, w * 0.02);
    else ctx.rect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2);
    ctx.fill();
    ctx.restore();
};
