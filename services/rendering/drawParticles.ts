/**
 * Draw Particles
 * Renders particle effects (smoke, fire, debris, sparks, fireworks)
 */

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
    type: 'SMOKE' | 'FIRE' | 'DEBRIS' | 'SPARK' | 'LEAF' | 'FIREWORK';
}

/**
 * Update all particles (physics)
 */
export function updateParticles(particles: Particle[]): void {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'DEBRIS' || p.type === 'LEAF') {
            p.vy += 0.5; // Gravity
            p.life -= 0.03;
        } else if (p.type === 'SPARK') {
            p.vy += 0.2;
            p.life -= 0.05;
        } else if (p.type === 'FIREWORK') {
            p.vy += 0.1;
            p.life -= 0.02;
        } else {
            p.life -= 0.02;
            p.size *= 1.02; // Expand
        }

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/**
 * Draw all particles
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
        ctx.beginPath();

        if (p.type === 'DEBRIS' || p.type === 'LEAF') {
            ctx.rect(p.x, p.y, p.size, p.size);
        } else if (p.type === 'SPARK') {
            // Draw as a streak
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            ctx.strokeStyle = `rgba(255,255,0,${p.life})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            continue;
        } else {
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }

        if (p.type === 'FIRE') {
            ctx.fillStyle = `${p.color}${p.life})`;
        } else if (p.type === 'FIREWORK') {
            ctx.fillStyle = `${p.color}${p.life})`;
        } else {
            ctx.fillStyle = `${p.color}${p.life * 0.8})`;
        }

        ctx.fill();
    }
}

/**
 * Spawn damage particles (smoke/fire based on damage level)
 */
export function spawnDamageParticles(
    particles: Particle[],
    x: number,
    y: number,
    damage: number,
    scale: number
): void {
    if (damage < 20) return;

    let chance = 0.1;
    if (damage > 50) chance = 0.3;
    if (damage > 90) chance = 0.8;
    if (Math.random() > chance) return;

    const isCritical = damage > 90;
    const isHigh = damage > 60;

    particles.push({
        x: x + (Math.random() * 20 - 10) * scale,
        y: y - (10 * scale),
        vx: (Math.random() * 2 - 1) * scale,
        vy: -(Math.random() * 3 + 1) * scale,
        life: 1.0,
        size: (Math.random() * 10 + 5) * scale,
        color: isHigh ? 'rgba(20,20,20,' : 'rgba(150,150,150,',
        type: 'SMOKE'
    });

    if (isCritical && Math.random() > 0.5) {
        particles.push({
            x: x + (Math.random() * 15 - 7.5) * scale,
            y: y - (10 * scale),
            vx: (Math.random() * 1 - 0.5) * scale,
            vy: -(Math.random() * 2 + 0.5) * scale,
            life: 0.5,
            size: (Math.random() * 8 + 4) * scale,
            color: 'rgba(255,' + Math.floor(Math.random() * 150) + ',0,',
            type: 'FIRE'
        });
    }
}

/**
 * Spawn collision particles (debris/sparks)
 */
export function spawnCollisionParticles(
    particles: Particle[],
    x: number,
    y: number,
    type: 'TREE' | 'BARREL' | 'TIRE' | 'DEBRIS' | 'SPARK'
): void {
    const count = 10;
    let color = 'rgba(100,100,100,';
    let particleType: Particle['type'] = 'DEBRIS';

    if (type === 'BARREL') {
        color = 'rgba(185,28,28,';
    } else if (type === 'TIRE') {
        color = 'rgba(30,30,30,';
    } else if (type === 'SPARK') {
        color = 'rgba(255,255,0,';
        particleType = 'SPARK';
    } else if (type === 'TREE') {
        color = 'rgba(20,100,20,';
        particleType = 'LEAF';
    }

    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() * 10 - 5) * (particleType === 'SPARK' ? 2 : 1),
            vy: -(Math.random() * 10 + 5),
            life: 1.0,
            size: Math.random() * 5 + 3,
            color: color,
            type: particleType
        });
    }
}

/**
 * Spawn fireworks (for victory)
 */
export function spawnFireworks(
    particles: Particle[],
    width: number,
    height: number
): void {
    const x = Math.random() * width;
    const y = Math.random() * (height / 2);
    const color = `rgba(${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},`;

    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.5,
            size: Math.random() * 4 + 2,
            color: color,
            type: 'FIREWORK'
        });
    }
}
