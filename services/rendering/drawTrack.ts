/**
 * Draw Track
 * Renders road segments with perspective
 */

import type { Segment } from '../../types';
import { ROAD_WIDTH, SEGMENT_LENGTH, CAMERA_DEPTH, VISIBILITY } from '../../constants';
import { project } from '../gameEngine';

/**
 * Helper to draw a polygon (quad)
 */
function drawPoly(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number,
    color: string
): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw road segments with perspective projection
 */
export function drawTrackSegments(
    ctx: CanvasRenderingContext2D,
    track: Segment[],
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
): number {
    const trackLen = track.length;
    const baseSegmentIndex = Math.floor(cameraZ / SEGMENT_LENGTH) % trackLen;
    const baseSegment = track[baseSegmentIndex];
    const basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;

    let maxY = viewY + viewH;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    // Draw each visible segment
    for (let n = 0; n < VISIBILITY; n++) {
        const i = (baseSegmentIndex + n) % trackLen;
        const segment = track[i];
        const loopZ = (i < baseSegmentIndex) ? trackLen * SEGMENT_LENGTH : 0;
        const segmentZ = (segment.index * SEGMENT_LENGTH + loopZ) - cameraZ;
        segment.clip = maxY;

        const p1 = project({ x: x - cameraX, y: 0, z: segmentZ }, 0, cameraY, 0, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH);
        const p2 = project({ x: x + dx - cameraX, y: 0, z: segmentZ + SEGMENT_LENGTH }, 0, cameraY, 0, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH);

        p1.x += viewX;
        p2.x += viewX;
        p1.y += viewY;
        p2.y += viewY;

        x += dx;
        dx += segment.curve;
        segment.screen = { x: p1.x, y: p1.y, w: p1.w };

        if (p2.y >= maxY || p2.y >= p1.y) continue;

        // Draw road
        drawPoly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);

        // Draw rumble strips
        const r1 = p1.w * 1.2;
        const r2 = p2.w * 1.2;
        drawPoly(ctx, p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y, segment.color.rumble);
        drawPoly(ctx, p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);

        // Draw lane marker
        if (segment.color.lane) {
            const l1 = p1.w * 0.05;
            const l2 = p2.w * 0.05;
            drawPoly(ctx, p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.lane);
        }

        maxY = p2.y;
    }

    return maxY;
}

/**
 * Fill any remaining space beyond rendered segments
 */
export function drawRoadBackground(
    ctx: CanvasRenderingContext2D,
    track: Segment[],
    baseSegmentIndex: number,
    maxY: number,
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
): void {
    if (maxY > viewY + viewH / 2) {
        const lastSegIdx = (baseSegmentIndex + VISIBILITY) % track.length;
        ctx.fillStyle = track[lastSegIdx].color.road;
        ctx.fillRect(viewX, viewY + viewH / 2, viewW, maxY - (viewY + viewH / 2));
    }
}
