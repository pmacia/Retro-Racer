/**
 * DEPRECATED: REPLACED BY core/engines/ParticleEngine.ts
 */

export const updateParticles = () => { };
export const drawParticles = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number, width: number, height: number, roadWidth: number) => { };
export const spawnCollisionParticles = (x: number, y: number, z: number, type: 'TREE' | 'BOULDER' | 'BARREL' | 'TIRE' | 'SPARK' | 'DEBRIS') => { };
export const spawnDamageParticles = (x: number, y: number, z: number, damage: number, speed: number) => { };
export const spawnObstacleParticles = (x: number, z: number, type: 'PUDDLE' | 'OIL') => { };
export const spawnFireworks = (x: number, y: number, z: number) => { };
export const clearParticles = () => { };
