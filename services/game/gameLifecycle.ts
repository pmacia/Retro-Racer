import { playSound } from '../audio/soundEffects';
import { startEngine, stopEngine, initAudio } from '../audio/audioEngine';
import { spawnFireworks } from '../rendering/drawParticles';
import { Car, Segment } from '../../types';
import { SEGMENT_LENGTH, ROAD_WIDTH } from '../../constants';

export const startCountdown = (
    setCountdown: (val: number) => void,
    onStart: () => void
) => {
    let count = 3;
    setCountdown(count);
    playSound('REV');
    initAudio();

    const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count > 0) {
            playSound('REV');
        } else if (count === 0) {
            playSound('GO');
            clearInterval(interval);
            onStart();
            startEngine();
        }
    }, 1000);
    return interval;
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
    const playerDead = player.exploded;

    if (!finishingSeqRef.current.active) {
        finishingSeqRef.current.active = true;
        finishingSeqRef.current.startTime = Date.now();
        stopEngine();

        if (playerDead) {
            playSound('EXPLOSION');
            setTimeout(() => playSound('DEFEAT'), 1000);
        } else if (player.finished) {
            const rank = player.finished && (rival && (!rival.finished || (rival.lapTime > player.lapTime))) ? 1 : 2;
            if (rank === 1) playSound('VICTORY');
            else playSound('DEFEAT');
        } else {
            playSound('DEFEAT');
        }
    }

    const timeSinceFinish = Date.now() - finishingSeqRef.current.startTime;
    if (player.finished && !playerDead) {
        // Spawn fireworks with a wide distribution to fill the screen
        if (Math.random() < 0.08) {
            const cameraX = player.offset * ROAD_WIDTH;
            const x = cameraX + (Math.random() - 0.5) * 6000; // Wide spread centered on camera
            const y = 500 + Math.random() * 1500;   // High in the sky
            const z = player.z + 1000 + Math.random() * 3000; // Ahead of player
            spawnFireworks(x, y, z);
        }
    }

    if (timeSinceFinish > 3500 && !finishingSeqRef.current.resultProcessed) {
        finishingSeqRef.current.resultProcessed = true;
        const totalTime = (Date.now() - startTimeRef.current) / 1000;
        const totalDistance = track.length * SEGMENT_LENGTH * laps;
        let rank = 2;
        let winnerName = 'CPU';

        if (playerDead) {
            rank = 2; winnerName = 'CRASHED';
        } else if (player.finished) {
            if (rival && rival.finished && rival.lapTime < player.lapTime) {
                rank = 2; winnerName = rival.name;
            } else {
                rank = 1; winnerName = playerName;
            }
        }
        onFinish(totalTime, totalDistance, rank, winnerName);
        return true;
    }
    return false;
};
