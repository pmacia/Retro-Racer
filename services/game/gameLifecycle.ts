/**
 * DEPRECATED: Logic moved to core/Game.ts
 */
import { Car, Segment } from '../../types';

export const startCountdown = (
    setCountdown: (val: number) => void,
    onStart: () => void
) => {
    return setInterval(() => { }, 1000);
};

export const handleFinishSequence = (
    player: Car,
    rival: Car | undefined,
    finishingSeqRef: React.MutableRefObject<{ active: boolean; startTime: number; resultProcessed: boolean }>,
    startTimeRef: React.MutableRefObject<number>,
    track: Segment[],
    laps: number,
    playerName: string,
    onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void
) => {
    return false;
};
