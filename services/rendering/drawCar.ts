/**
 * Draw Car
 * Renders a 2.5D pseudo-3D car sprite
 */

/**
 * Draw a car at the specified position with given dimensions and color
 * @param ctx Canvas context
 * @param x X position (center)
 * @param y Y position (bottom of car)
 * @param w Width of the car
 * @param h Height of the car
 * @param color Body color of the car
 * @param angle Rotation angle (default 0)
 */
export function drawCar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    angle: number = 0
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.05, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    const wheelW = w * 0.13;
    const wheelH = h * 0.35;
    const wheelY = -wheelH * 0.85;
    const wheelOffsetX = w * 0.4;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-wheelOffsetX - wheelW, wheelY, wheelW, wheelH);
    ctx.fillRect(wheelOffsetX, wheelY, wheelW, wheelH);

    // Car body
    const bodyH = h * 0.6;
    const bodyY = -bodyH * 1.1;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-w / 2, bodyY, w, bodyH, w * 0.08);
    } else {
        ctx.rect(-w / 2, bodyY, w, bodyH);
    }
    ctx.fill();

    // Cabin/windshield
    const cabinW = w * 0.65;
    const cabinH = h * 0.35;
    const cabinY = bodyY - cabinH * 0.9;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-cabinW / 2, cabinY, cabinW, cabinH, [w * 0.1, w * 0.1, 0, 0]);
    } else {
        ctx.rect(-cabinW / 2, cabinY, cabinW, cabinH);
    }
    ctx.fill();

    // Tail lights
    const lightW = w * 0.16;
    const lightH = h * 0.15;
    const lightY = bodyY + bodyH * 0.3;
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(-w * 0.4, lightY, lightW, lightH);
    ctx.fillRect(w * 0.4 - lightW, lightY, lightW, lightH);

    // Windshield reflection
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2, w * 0.02);
    } else {
        ctx.rect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2);
    }
    ctx.fill();

    ctx.restore();
}
