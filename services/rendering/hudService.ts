import { Car } from '../../types';

export const updateHUD = (
    cameraCar: Car,
    startTime: number,
    laps: number,
    activeView: number,
    cars: Car[],
    refs: {
        speed: React.RefObject<HTMLSpanElement>;
        time: React.RefObject<HTMLSpanElement>;
        lap: React.RefObject<HTMLSpanElement>;
        damage: React.RefObject<HTMLDivElement>;
        rivalDamage: React.RefObject<HTMLDivElement>;
        controlBadge: React.RefObject<HTMLSpanElement>;
    }
) => {
    if (refs.speed.current) refs.speed.current.innerText = `${Math.floor(cameraCar.speed / 100)}`;

    if (refs.time.current) {
        const t = (Date.now() - startTime) / 1000;
        refs.time.current.innerText = t.toFixed(2);
    }

    if (refs.lap.current) refs.lap.current.innerText = `${cameraCar.lap}/${laps}`;

    const p1 = cars[0];
    const p2 = cars[1];

    // Update Control Badge (AI vs USER)
    if (refs.controlBadge.current && p2) {
        const isManual = p2.isManualControl;
        refs.controlBadge.current.innerText = isManual ? 'USER' : 'AI';
        refs.controlBadge.current.className = `text-[10px] font-bold px-2 py-0.5 rounded ${isManual ? 'bg-blue-500/80 text-white' : 'bg-gray-700/80 text-gray-300'}`;
    }

    if (refs.damage.current) {
        const targetCar = (activeView === 2) ? p1 : cameraCar;
        if (targetCar) {
            const pct = Math.min(100, targetCar.damage);
            refs.damage.current.style.width = `${pct}%`;
            if (pct > 90) refs.damage.current.style.backgroundColor = '#ef4444';
            else if (pct > 50) refs.damage.current.style.backgroundColor = '#f97316';
            else refs.damage.current.style.backgroundColor = '#22c55e';
        }
    }

    if (activeView === 2 && refs.rivalDamage.current && p2) {
        const pct = Math.min(100, p2.damage);
        refs.rivalDamage.current.style.width = `${pct}%`;
        if (pct > 90) refs.rivalDamage.current.style.backgroundColor = '#ef4444';
        else if (pct > 50) refs.rivalDamage.current.style.backgroundColor = '#f97316';
        else refs.rivalDamage.current.style.backgroundColor = '#22c55e';
    }
};
