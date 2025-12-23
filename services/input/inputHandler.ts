import { initAudio } from '../audio/audioEngine';

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export const createInputHandler = (
    inputRef: React.MutableRefObject<InputState>,
    cameraViewRef: React.MutableRefObject<number>,
    setActiveView: (view: number) => void,
    isFinishing: () => boolean
) => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
        if (isFinishing()) return;

        if (['ArrowLeft', 'a', 'A'].includes(e.key)) inputRef.current.left = isDown;
        if (['ArrowRight', 'd', 'D'].includes(e.key)) inputRef.current.right = isDown;
        if (['ArrowUp', 'w', 'W'].includes(e.key)) inputRef.current.up = isDown;
        if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.down = isDown;

        if (isDown) {
            if (e.key === '1' || (e.altKey && e.key === '1')) { cameraViewRef.current = 0; setActiveView(0); }
            if (e.key === '2' || (e.altKey && e.key === '2')) { cameraViewRef.current = 1; setActiveView(1); }
            if (e.key === '3' || (e.altKey && e.key === '3')) { cameraViewRef.current = 2; setActiveView(2); }
            initAudio();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const handleKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    const handleTouchInput = (action: keyof InputState, isPressed: boolean) => {
        if (isFinishing()) return;
        inputRef.current[action] = isPressed;
        initAudio();
    };

    return {
        handleKeyDown,
        handleKeyUp,
        handleTouchInput
    };
};
