import { Car, Segment, OilStain } from '../../types';
import { COLORS, ROAD_WIDTH, CAMERA_DEPTH, SEGMENT_LENGTH, VISIBILITY } from '../../constants';
import { project } from '../../services/gameEngine';
import { drawCar } from '../../services/rendering/drawCar';
import { drawSprite } from '../../services/rendering/drawObstacles';
import { ParticleEngine } from './ParticleEngine';

export class GraphicsEngine {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    public resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    public renderScene(
        cameraCar: Car,
        cars: Car[],
        track: Segment[],
        particles: ParticleEngine,
        isRacing: boolean,
        oilStains: OilStain[] = [],
        viewX: number = 0,
        viewY: number = 0,
        viewW: number = this.width,
        viewH: number = this.height
    ): void {
        const ctx = this.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.rect(viewX, viewY, viewW, viewH);
        ctx.clip();

        // 1. Draw Sky & Background
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

        // 2. Prepare Track Rendering
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

        // 3. Render Segments (Back to Front painter's algo is naturally handled by z-buffer-like clip or painter's algo?
        // Actually this loop renders front-to-back but uses 'maxY' to clip hidden segments (occlusion culling)?
        // No, standard Outrun uses back-to-front or uses clipping.
        // implementation here uses n=0 to VISIBILITY (Front to Back)
        // creating polygons. 'maxY' tracks the lowest blocking Y coordinate (highest on screen).

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

            this.drawPoly(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);
            const r1 = p1.w * 1.2;
            const r2 = p2.w * 1.2;
            this.drawPoly(p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y, segment.color.rumble);
            this.drawPoly(p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);
            if (segment.color.lane) {
                const l1 = p1.w * 0.05;
                const l2 = p2.w * 0.05;
                this.drawPoly(p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.lane);
            }
            maxY = p2.y;
        }

        // Draw "end of visibility" block
        if (maxY > viewY + viewH / 2) {
            const lastSegIdx = (baseSegmentIndex + VISIBILITY) % trackLen;
            ctx.fillStyle = track[lastSegIdx].color.road;
            ctx.fillRect(viewX, viewY + viewH / 2, viewW, maxY - (viewY + viewH / 2));
        }

        // 4. Render Sprites & Cars (Back-to-Front)
        for (let n = VISIBILITY - 1; n >= 0; n--) {
            const i = (baseSegmentIndex + n) % trackLen;
            const segment = track[i];
            if (!segment.screen) continue;

            // Sprites
            segment.sprites.forEach(sprite => {
                const scale = segment.screen!.w / (ROAD_WIDTH / 2);
                const spriteX = segment.screen!.x + (sprite.offset * segment.screen!.w);
                const spriteY = segment.screen!.y;
                const sW = sprite.width * scale;
                const sH = sprite.height * scale;

                if (spriteX + sW / 2 < viewX || spriteX - sW / 2 > viewX + viewW) return;

                drawSprite(ctx, sprite, spriteX, spriteY, sW, sH);
            });

            // Other Cars
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

        // 5. Draw Player Car
        const playerScreenY = viewY + viewH - 80;
        const basePlayerW = 340;
        const playerW = basePlayerW * (viewW / 1024);
        const playerH = playerW * (140 / 340);
        let pY = playerScreenY;
        if (cameraCar.exploded) pY += (Math.random() - 0.5) * 5;
        else {
            const bounce = (2 * Math.random() * (cameraCar.speed / cameraCar.maxSpeed) * viewH / 480) * (Math.random() > 0.5 ? 1 : -1);
            pY += (isRacing ? bounce : 0);
        }
        const carColor = cameraCar.exploded ? '#2d2d2d' : cameraCar.color;
        drawCar(ctx, viewX + viewW / 2, pY, playerW, playerH, carColor);

        // 6. Draw Particles
        particles.draw(ctx, cameraX, cameraY, cameraZ, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH, viewX, viewY, cameraCar);

        // 7. Draw Oil Stains
        if (oilStains.length > 0) {
            this.drawOilStains(oilStains, viewX, viewY, viewW, viewH);
        }

        ctx.restore();
    }

    private drawPoly(
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        x4: number, y4: number,
        color: string
    ) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }

    private drawOilStains(oilStains: OilStain[], viewX: number, viewY: number, viewW: number, viewH: number) {
        const ctx = this.ctx;
        ctx.save();

        const random = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        oilStains.forEach(stain => {
            if (stain.alpha <= 0) return;

            ctx.globalAlpha = stain.alpha * 0.7;
            ctx.fillStyle = '#1a0f00';

            const blobCount = 3 + Math.floor(random(stain.seed) * 4);

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

    public renderMap(
        cars: Car[],
        track: Segment[],
        width: number,
        height: number,
        isOverlay: boolean = false,
        x: number = 0,
        y: number = 0
    ): void {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);

        // Helper for rounded rect
        // Using arcTo for broad compatibility
        const drawRoundedRect = (c: CanvasRenderingContext2D, w: number, h: number, r: number) => {
            c.beginPath();
            c.moveTo(r, 0);
            c.lineTo(w - r, 0);
            c.arcTo(w, 0, w, r, r);
            c.lineTo(w, h - r);
            c.arcTo(w, h, w - r, h, r);
            c.lineTo(r, h);
            c.arcTo(0, h, 0, h - r, r);
            c.lineTo(0, r);
            c.arcTo(0, 0, r, 0, r);
            c.closePath();
        };

        if (isOverlay) {
            const radius = 16;

            // Define shape
            drawRoundedRect(ctx, width, height, radius);

            // Clip to shape
            ctx.save();
            ctx.clip();

            // Draw Background
            ctx.fillStyle = 'rgba(7, 11, 20, 0.8)';
            ctx.fill();

            // Restore clip after background? No, we want to clip the track/cars too.
            // But if we restore here, the track/cars won't be clipped.
            // So we DON'T restore yet. We keep the clip active.
            // However, the original code had `ctx.fillRect` then rendering.

            // Actually, ctx.clip() intersects with current clip.
            // We want the clip to persist for the track rendering.
            // So we keep it. We will restore at the very end.
            // Note: We need TWO restores at the end then. one for the translation save, one for the clip save.
            // Or simpler: just call clip() on the translation context.
            // But clip is permanent for the context until restore.
            // The outer method calls ctx.save() at start and ctx.restore() at end.
            // So calling ctx.clip() here is fine, it will be cleared by the final restore.

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
        ctx.lineWidth = Math.max(2, 3 * scale);
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
                const carRadius = Math.max(2, 2 * scale);
                ctx.arc(cx, cy, carRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        if (isOverlay) {
            // Restore the clip for the border?
            // If we clip the border, the outer half of the stroke is lost?
            // Usually yes.
            // If we want the border ON TOP of the clip, we should restore first.
            // But we didn't push a new save stack for the clip specifically if we just used the main one.
            // But I added `ctx.save(); ctx.clip();` inside the if(isOverlay).
            // So I should `ctx.restore()` to undo the clip before drawing the border.

            ctx.restore(); // Undo clip

            // Draw Border
            const radius = 16;
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, width, height, radius);
            ctx.stroke();
        }

        ctx.restore(); // Final restore
    }
}
