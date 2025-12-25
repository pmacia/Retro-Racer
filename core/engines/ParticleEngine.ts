import { Car } from '../../types';
import { project } from '../../services/gameEngine';
import { STEP } from '../../constants';

export interface Particle {
    worldX: number;
    worldY: number;
    worldZ: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    size: number;
    r: number;
    g: number;
    b: number;
    a: number;
    type: 'SMOKE' | 'FIRE' | 'DEBRIS' | 'SPARK' | 'LEAF' | 'FIREWORK' | 'EMBER' | 'WATER' | 'OIL';
    angle?: number;
    spin?: number;
    phase?: number;     // For oscillation
    amplitude?: number; // For oscillation
    owner?: Car;        // The car that emitted this particle
}

export class ParticleEngine {
    private particles: Particle[] = [];

    public clear(): void {
        this.particles = [];
    }

    public update(): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Apply velocity in world space
            p.worldX += p.vx;
            p.worldY += p.vy;
            p.worldZ += p.vz;

            // Apply gravity to specific types
            if (p.type === 'WATER' || p.type === 'OIL' || p.type === 'DEBRIS' || p.type === 'FIREWORK') {
                p.vy -= 0.8; // Gravity
            }

            // Apply oscillation (sine wave drift)
            if (p.phase !== undefined && p.amplitude !== undefined) {
                p.worldX += Math.sin(p.phase) * p.amplitude;
                p.phase += 0.15; // Speed of oscillation
            }

            // Apply rotation
            if (p.angle !== undefined && p.spin !== undefined) {
                p.angle += p.spin;
            }

            if (p.type === 'DEBRIS' || p.type === 'LEAF') {
                p.vy -= 0.5; // Gravity
                p.life -= 0.03;
            } else if (p.type === 'SPARK') {
                p.vy -= 0.2;
                p.life -= 0.05;
            } else if (p.type === 'FIREWORK') {
                p.vy += 2.0; // Strong buoyancy
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.vz *= 0.98;
                p.life -= 0.012;
            } else if (p.type === 'SMOKE' || p.type === 'FIRE') {
                // Buoyancy: upward acceleration
                p.vy += 1.2;

                // Air resistance (stronger for smoke to make it lose forward speed faster)
                // Increased friction from 0.92 to 0.96 for longer trail
                const friction = p.type === 'SMOKE' ? 0.96 : 0.95;
                p.vx *= friction;
                p.vy *= friction;
                p.vz *= friction;

                // Non-linear expansion: faster expansion for softer look
                const growthRate = 1.0 + (p.life * 0.05);
                p.size *= growthRate;

                // Horizontal jitter (randomness on top of oscillation)
                p.vx += (Math.random() - 0.5) * 1.0;
                p.vz += (Math.random() - 0.5) * 1.0;

                // Slower decay for smoke
                p.life -= (p.type === 'SMOKE' ? 0.006 : 0.012);
            } else if (p.type === 'EMBER') {
                p.vy += 0.5;
                p.vx += (Math.random() - 0.5) * 1.0;
                p.life -= 0.01;
            } else {
                p.life -= 0.02;
                p.size *= 1.02;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        cameraX: number,
        cameraY: number,
        cameraZ: number,
        cameraDepth: number,
        width: number,
        height: number,
        roadWidth: number,
        viewX: number = 0,
        viewY: number = 0,
        cameraCar?: Car | null // Identifying the camera owner
    ): void {
        for (const p of this.particles) {

            // DYNAMIC HEIGHT LOGIC:
            // If this particle belongs to the car we are currently viewing from (cameraCar),
            // we must apply the "Fake 3D" UI offset (+1150) so it matches the floating sprite.
            // If it belongs to another car, we use its true World position.
            const isSelf = (cameraCar && p.owner === cameraCar);
            const renderY = isSelf ? p.worldY + 1150 : p.worldY;

            // Project world to screen
            const screen = project(
                { x: p.worldX, y: renderY, z: p.worldZ },
                cameraX, cameraY, cameraZ,
                cameraDepth, width, height, roadWidth
            );

            // Apply Viewport Offset
            screen.x += viewX;
            screen.y += viewY;

            // Don't draw if behind camera or too far
            if (p.worldZ < cameraZ || p.worldZ > cameraZ + 15000) continue;

            const size = p.size * (screen.w / roadWidth); // Scale size by perspective
            if (size < 0.5) continue;

            ctx.save();

            if (p.type === 'DEBRIS' || p.type === 'LEAF') {
                ctx.translate(screen.x, screen.y);
                if (p.angle !== undefined) ctx.rotate(p.angle);
                ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a * p.life * 0.8})`;
                ctx.fillRect(-size / 2, -size / 2, size, size);
            } else if (p.type === 'SPARK') {
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y);
                ctx.lineTo(screen.x - p.vx * (screen.w / roadWidth) * 2, screen.y - p.vy * (screen.w / roadWidth) * 2);
                ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${p.a * p.life})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (p.type === 'SMOKE') {
                // Opacity control: respect base alpha p.a, apply fade-in/out
                const fadeIn = Math.min(1.0, (2.5 - p.life) * 4);
                const alpha = p.a * Math.min(1.0, p.life * 0.5) * fadeIn; // Increased from 0.5/0.3 to 1.0/0.5

                // Size capping in screen space
                const cappedSize = Math.min(size, 200);

                const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, cappedSize);
                grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
                grad.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${alpha * 0.2})`); // Softer outer edge
                grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, cappedSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'FIRE') {
                const alpha = Math.min(0.8, p.life * 2);
                const cappedSize = Math.min(size, 100);

                const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, cappedSize);
                grad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
                grad.addColorStop(0.3, `rgba(${p.r},${p.g},${p.b},${alpha})`);
                grad.addColorStop(1, `rgba(255, 0, 0, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, cappedSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'EMBER' || p.type === 'FIREWORK') {
                ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a})`;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'WATER') {
                ctx.fillStyle = `rgba(100, 150, 255, ${p.a * 0.6})`;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'OIL') {
                ctx.fillStyle = `rgba(40, 20, 10, ${p.a * 0.8})`;
                ctx.beginPath();
                // Irregular blob for oil
                ctx.ellipse(screen.x, screen.y, size, size * 0.6, p.angle || 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${Math.min(0.8, p.life * 0.8)})`;
                ctx.fill();
            }

            ctx.restore();
        }
    }

    public spawnDamageParticles(
        worldX: number,
        worldY: number,
        worldZ: number,
        damage: number,
        carSpeed: number = 0,
        owner?: Car // <-- Added Owner
    ): void {
        // Start very subtle smoke at 5% damage
        if (damage < 5) return;

        // Normalize damage for scaling (0.0 to 1.0)
        const d = Math.min(1.0, damage / 100);

        // 1. PROBABILITY-BASED SPAWNING
        // Much lower chance at start (0.05) increasing to 0.9 at max damage
        const spawnChance = 0.05 + (d * 0.85);
        if (Math.random() > spawnChance) return;

        // 2. DENSITY SCALING
        // Very low density for a professional, subtle look
        const density = 1 + (d > 0.8 ? Math.floor((d - 0.8) * 2) : 0);

        for (let i = 0; i < density; i++) {
            // 3. COLOR & OPACITY (White -> Gray -> Dark Gray, Semi-transparent)
            let r = 255, g = 255, b = 255, a = 0.3;

            if (d < 0.3) {
                // 5-30%: White Smoke
                a = 0.2 + (d / 0.3) * 0.2; // 0.2 -> 0.4
            } else if (d < 0.6) {
                // 30-60%: Light Gray
                const ratio = (d - 0.3) / 0.3;
                const gray = Math.floor(220 - (ratio * 100)); // 220 -> 120
                r = g = b = gray;
                a = 0.4 + (ratio * 0.1); // 0.4 -> 0.5
            } else {
                // >60%: Dark Gray
                const ratio = (d - 0.6) / 0.4;
                const gray = Math.floor(120 - (ratio * 80)); // 120 -> 40
                r = g = b = gray;
                a = 0.4 + (ratio * 0.1); // 0.4 -> 0.5 (Max 0.5 for transparency)
            }

            // 4. CONTINUOUS SIZE SCALING
            const baseSize = 50 + (d * 150);
            const size = baseSize * (0.8 + Math.random() * 0.8);

            // Base velocity inheritance for Fire/Embers (inherit car speed)
            const carFrameSpeed = carSpeed * STEP;
            const vz = carFrameSpeed;

            // SMOKE PHYSICS
            // Inherit most of car speed so it sticks near the car initially, then drags back
            const particleVz = carFrameSpeed * (0.95 + Math.random() * 0.05);
            const spawnZ = worldZ + 400; // Spawn closer to camera projection plane

            this.particles.push({
                worldX: worldX + (Math.random() * 20 - 10), // Centralized width
                worldY: worldY + 50, // Engine height (Relative)
                worldZ: spawnZ,
                vx: (Math.random() * 2 - 1),
                vy: (Math.random() * 2 + 1), // Gentle upward float
                vz: particleVz,


                life: 1.2 + Math.random() * 1.5,
                size: size,
                r, g, b, a,
                type: 'SMOKE',
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.1,
                phase: Math.random() * Math.PI * 2,
                amplitude: 1.5 + Math.random() * 2.0, // Slightly reduced oscillation for better attachment
                owner: owner // <-- Tracking Owner
            });

            // 5. REALISTIC FIRE (Starts at 70% damage)
            if (d > 0.70) {
                const fireChance = (d - 0.7) * 0.8; // Up to ~24% chance
                if (Math.random() < fireChance) {
                    const fireG = Math.floor(200 - (d * 150));
                    this.particles.push({
                        worldX: worldX + (Math.random() * 20 - 10),
                        worldY: worldY + 50, // relative
                        worldZ: spawnZ,        // Matches Smoke Z-Depth (fixes projection height)
                        vx: (Math.random() * 3 - 1.5),
                        vy: (Math.random() * 5 + 3),
                        vz: vz + (Math.random() * 2 - 1),
                        life: 0.5 + Math.random() * 0.5,
                        size: size * 0.7,
                        r: 255, g: fireG, b: 0, a: 0.8,
                        type: 'FIRE',
                        phase: Math.random() * Math.PI * 2,
                        amplitude: 0.8 + Math.random() * 1.5,
                        owner: owner // <-- Tracking Owner
                    });
                }
            }
        }
    }

    public spawnCollisionParticles(
        worldX: number,
        worldY: number,
        worldZ: number,
        type: 'TREE' | 'BARREL' | 'TIRE' | 'DEBRIS' | 'SPARK' | 'BOULDER'
    ): void {
        const count = 15;
        let r = 100, g = 100, b = 100, a = 0.8;
        let particleType: Particle['type'] = 'DEBRIS';

        if (type === 'BARREL') {
            r = 185; g = 28; b = 28; // Red
        } else if (type === 'TIRE') {
            r = 30; g = 30; b = 30; // Black
        } else if (type === 'SPARK') {
            r = 255; g = 255; b = 0; // Yellow
            particleType = 'SPARK';
        } else if (type === 'TREE') {
            r = 20; g = 100; b = 20; // Green
            particleType = 'LEAF';
        } else if (type === 'BOULDER') {
            r = 120; g = 120; b = 120; // Gray
        }

        for (let i = 0; i < count; i++) {
            this.particles.push({
                worldX: worldX,
                worldY: worldY,
                worldZ: worldZ,
                vx: (Math.random() * 40 - 20),
                vy: (Math.random() * 30 + 10),
                vz: (Math.random() * 40 - 20),
                life: 1.0 + Math.random() * 0.5,
                size: Math.random() * 30 + 20,
                r, g, b, a,
                type: particleType,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.2
            });
        }
    }

    public spawnFireworks(
        worldX: number,
        worldY: number,
        worldZ: number
    ): void {
        const colors = [
            { r: 255, g: 50, b: 50 },   // Red
            { r: 50, g: 255, b: 50 },   // Green
            { r: 50, g: 100, b: 255 },  // Blue
            { r: 255, g: 255, b: 50 },  // Yellow
            { r: 255, g: 50, b: 255 }   // Magenta
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 15;
            this.particles.push({
                worldX,
                worldY,
                worldZ,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + 10,
                vz: (Math.random() - 0.5) * 10,
                life: 1.5 + Math.random() * 1.5,
                size: 15 + Math.random() * 15,
                r: color.r,
                g: color.g,
                b: color.b,
                a: 1.0,
                type: 'FIREWORK'
            });
        }
    }

    public spawnObstacleParticles(
        worldX: number,
        worldZ: number,
        type: 'PUDDLE' | 'OIL'
    ): void {
        const count = 12;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                worldX: worldX + (Math.random() * 100 - 50),
                worldY: 10,
                worldZ: worldZ,
                vx: (Math.random() * 20 - 10),
                vy: (Math.random() * 15 + 5),
                vz: (Math.random() * 10 - 5),
                life: 0.6 + Math.random() * 0.4,
                size: 10 + Math.random() * 20,
                r: 0, g: 0, b: 0, a: 1.0, // Colors handled in drawParticles
                type: type === 'PUDDLE' ? 'WATER' : 'OIL',
                angle: Math.random() * Math.PI * 2
            });
        }
    }
}
