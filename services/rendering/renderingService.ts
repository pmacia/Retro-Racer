import { Car, Segment, OilStain } from '../../types';
import { COLORS, ROAD_WIDTH, CAMERA_DEPTH, SEGMENT_LENGTH, VISIBILITY } from '../../constants';
import { project } from '../gameEngine';
import { drawParticles } from './drawParticles';
import { drawSprite } from './drawObstacles';

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

/**
 * The main 2.5D rendering pipeline
 */
export const renderView = (
    ctx: CanvasRenderingContext2D,
    cameraCar: Car,
    cars: Car[],
    track: Segment[],
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number,
    isRacing: boolean,
    oilStains: OilStain[] = []
) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewX, viewY, viewW, viewH);
    ctx.clip();

    ctx.fillStyle = COLORS.SKY;
    ctx.fillRect(viewX, viewY, viewW, viewH);

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

    ctx.fillStyle = COLORS.LIGHT.grass;
    ctx.fillRect(viewX, viewY + viewH / 2, viewW, viewH / 2);

    const trackLen = track.length;
    const cameraX = cameraCar.offset * ROAD_WIDTH;
    const cameraY = 1500;
    const cameraZ = cameraCar.z;
    const baseSegmentIndex = Math.floor(cameraZ / SEGMENT_LENGTH) % trackLen;
    const baseSegment = track[baseSegmentIndex];
    const basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    let maxY = viewY + viewH;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

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

        drawPoly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);
        const r1 = p1.w * 1.2;
        const r2 = p2.w * 1.2;
        drawPoly(ctx, p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y, segment.color.rumble);
        drawPoly(ctx, p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);
        if (segment.color.lane) {
            const l1 = p1.w * 0.05;
            const l2 = p2.w * 0.05;
            drawPoly(ctx, p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.lane);
        }
        maxY = p2.y;
    }

    if (maxY > viewY + viewH / 2) {
        const lastSegIdx = (baseSegmentIndex + VISIBILITY) % trackLen;
        ctx.fillStyle = track[lastSegIdx].color.road;
        ctx.fillRect(viewX, viewY + viewH / 2, viewW, maxY - (viewY + viewH / 2));
    }

    for (let n = VISIBILITY - 1; n >= 0; n--) {
        const i = (baseSegmentIndex + n) % trackLen;
        const segment = track[i];
        if (!segment.screen) continue;

        segment.sprites.forEach(sprite => {
            const scale = segment.screen!.w / (ROAD_WIDTH / 2);
            const spriteX = segment.screen!.x + (sprite.offset * segment.screen!.w);
            const spriteY = segment.screen!.y;
            const sW = sprite.width * scale;
            const sH = sprite.height * scale;

            if (spriteX + sW / 2 < viewX || spriteX - sW / 2 > viewX + viewW) return;

            drawSprite(ctx, sprite, spriteX, spriteY, sW, sH);
        });

        cars.forEach(car => {
            if (car === cameraCar) return;
            const carSegIdx = Math.floor(car.z / SEGMENT_LENGTH) % trackLen;
            if (carSegIdx === i) {
                const scale = segment.screen!.w / (ROAD_WIDTH / 2);
                const carX = segment.screen!.x + (car.offset * segment.screen!.w);
                const carY = segment.screen!.y;
                const cW = 400 * scale;
                const cH = cW * 0.45;

                if (carX + cW / 2 < viewX || carX - cW / 2 > viewX + viewW) return;

                drawCar(ctx, carX, carY, cW, cH, car.color);
            }
        });
    }

    const playerScreenY = viewY + viewH - 80;
    // Scale player car size proportionally to viewport width
    const basePlayerW = 340;
    const playerW = basePlayerW * (viewW / 1024); // Using literal 1024 to avoid import issues if any
    const playerH = playerW * (140 / 340); // Maintain aspect ratio
    let pY = playerScreenY;
    if (cameraCar.exploded) pY += (Math.random() - 0.5) * 5;
    else {
        const bounce = (2 * Math.random() * (cameraCar.speed / cameraCar.maxSpeed) * viewH / 480) * (Math.random() > 0.5 ? 1 : -1);
        pY += (isRacing ? bounce : 0);
    }
    const carColor = cameraCar.exploded ? '#2d2d2d' : cameraCar.color;
    drawCar(ctx, viewX + viewW / 2, pY, playerW, playerH, carColor);

    // Draw particles in world space
    drawParticles(ctx, cameraX, cameraY, cameraZ, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH);

    // --- OIL STAIN OVERLAY ---
    if (oilStains.length > 0) {
        ctx.save();

        // Simple pseudo-random function to keep blobs consistent for a given seed
        const random = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Render each stain
        oilStains.forEach(stain => {
            if (stain.alpha <= 0) return;

            ctx.globalAlpha = stain.alpha * 0.7;
            ctx.fillStyle = '#1a0f00'; // Dark oil color

            const blobCount = 3 + Math.floor(random(stain.seed) * 4); // 3 to 6 blobs

            for (let i = 0; i < blobCount; i++) {
                const rSeed = stain.seed + i * 0.1;
                const bx = viewX + viewW * (0.2 + random(rSeed) * 0.6);
                const by = viewY + viewH * (0.2 + random(rSeed + 1) * 0.6);
                const br = viewW * (0.05 + random(rSeed + 2) * 0.15);

                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }
    ctx.restore();
};

/**
 * The 2D mini-map rendering logic
 */
export const renderMap = (
    ctx: CanvasRenderingContext2D,
    cars: Car[],
    track: Segment[],
    width: number,
    height: number,
    isOverlay: boolean = false
) => {
    ctx.save();
    if (isOverlay) {
        // Draw a semi-transparent background for the overlay
        ctx.fillStyle = 'rgba(7, 11, 20, 0.8)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
    } else {
        ctx.fillStyle = '#070B14';
        ctx.fillRect(0, 0, width, height);
    }

    // Calculate track bounds for perfect scaling
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    track.forEach(s => {
        if (s.mapX < minX) minX = s.mapX;
        if (s.mapX > maxX) maxX = s.mapX;
        if (s.mapY < minY) minY = s.mapY;
        if (s.mapY > maxY) maxY = s.mapY;
    });

    const trackW = maxX - minX;
    const trackH = maxY - minY;
    const padding = 20;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2;

    // Calculate scale to fit track in available space
    const scale = Math.min(availableW / trackW, availableH / trackH);

    // Center the track
    const offsetX = (width - trackW * scale) / 2 - minX * scale;
    const offsetY = (height - trackH * scale) / 2 - minY * scale;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, 15 * scale);
    ctx.beginPath();
    for (let i = 0; i < track.length; i++) {
        const s = track[i];
        const sx = s.mapX * scale + offsetX;
        const sy = s.mapY * scale + offsetY;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    for (const car of cars) {
        const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % track.length;
        const seg = track[segIdx];
        if (seg) {
            const cx = seg.mapX * scale + offsetX;
            const cy = seg.mapY * scale + offsetY;
            ctx.fillStyle = car.isPlayer ? '#22c55e' : '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 5 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    ctx.restore();
};
