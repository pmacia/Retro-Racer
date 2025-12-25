/**
 * Draw UI
 * Renders non-HTML UI elements (mini-map, countdown)
 */

import type { Car, Segment } from '../../types';
import { SEGMENT_LENGTH, WIDTH, HEIGHT } from '../../constants';

/**
 * Draw the mini-map (HUD element)
 */
export function drawMiniMap(
    ctx: CanvasRenderingContext2D,
    track: Segment[],
    cars: Car[],
    x: number,
    y: number,
    size: number
): void {
    if (track.length === 0) return;

    // Calculate track bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of track) {
        if (s.mapX < minX) minX = s.mapX;
        if (s.mapX > maxX) maxX = s.mapX;
        if (s.mapY < minY) minY = s.mapY;
        if (s.mapY > maxY) maxY = s.mapY;
    }

    const w = maxX - minX;
    const h = maxY - minY;
    const scale = Math.min((size - 10) / w, (size - 10) / h);

    ctx.save();
    ctx.translate(x, y);

    const radius = 16;

    // Helper function to draw rounded rect path
    const drawRoundedRect = (c: CanvasRenderingContext2D, s: number, r: number) => {
        c.beginPath();
        c.moveTo(r, 0);
        c.lineTo(s - r, 0);
        c.arcTo(s, 0, s, r, r);
        c.lineTo(s, s - r);
        c.arcTo(s, s, s - r, s, r);
        c.lineTo(r, s);
        c.arcTo(0, s, 0, s - r, r);
        c.lineTo(0, r);
        c.arcTo(0, 0, r, 0, r);
        c.closePath();
    };


    // Enable local clipping for the minimap window
    drawRoundedRect(ctx, size, radius);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();

    // Save context for clipping
    ctx.save();
    ctx.clip();

    // Center track
    const offsetX = (size - w * scale) / 2 - minX * scale;
    const offsetY = (size - h * scale) / 2 - minY * scale;

    // Draw Track Line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < track.length; i++) {
        const s = track[i];
        const sx = s.mapX * scale + offsetX;
        const sy = s.mapY * scale + offsetY;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw Cars
    for (const car of cars) {
        const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % track.length;
        if (segIdx < 0 || segIdx >= track.length) continue;

        const seg = track[segIdx];
        if (!seg) continue;

        const cx = seg.mapX * scale + offsetX;
        const cy = seg.mapY * scale + offsetY;

        ctx.fillStyle = car.isPlayer ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }

    // Restore context (removes clipping)
    ctx.restore();

    // Draw Border on top
    drawRoundedRect(ctx, size, radius);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw countdown overlay
 */
export function drawCountdown(
    ctx: CanvasRenderingContext2D,
    countdown: number,
    isRacing: boolean
): void {
    if (isRacing) return;

    if (countdown > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = countdown === 0 ? '#22c55e' : '#eab308';
        ctx.font = 'bold 200px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.strokeText(countdown.toString(), WIDTH / 2, HEIGHT / 2);
        ctx.fillText(countdown.toString(), WIDTH / 2, HEIGHT / 2);
    } else if (countdown === 0) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 200px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.strokeText("YA!", WIDTH / 2, HEIGHT / 2);
        ctx.fillText("YA!", WIDTH / 2, HEIGHT / 2);
    }
}
