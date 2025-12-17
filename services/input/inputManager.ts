/**
 * Input Manager
 * Handles keyboard and touch input for game controls
 */

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

const inputState: InputState = {
    left: false,
    right: false,
    up: false,
    down: false
};

/**
 * Get the current input state
 */
export function getInputState(): InputState {
    return inputState;
}

/**
 * Clear all inputs (useful when game is paused or finished)
 */
export function clearInput(): void {
    inputState.left = false;
    inputState.right = false;
    inputState.up = false;
    inputState.down = false;
}

/**
 * Handle keyboard input
 */
function handleKeyboardInput(e: KeyboardEvent, isDown: boolean): void {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) inputState.left = isDown;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) inputState.right = isDown;
    if (['ArrowUp', 'w', 'W'].includes(e.key)) inputState.up = isDown;
    if (['ArrowDown', 's', 'S'].includes(e.key)) inputState.down = isDown;
}

/**
 * Handle touch/pointer input
 */
export function setTouchInput(action: 'up' | 'down' | 'left' | 'right', isPressed: boolean): void {
    inputState[action] = isPressed;
}

/**
 * Setup keyboard event listeners
 * Returns a cleanup function to remove the listeners
 */
export function setupKeyboardHandlers(
    onKeyPress?: (e: KeyboardEvent) => void
): () => void {
    const keyDownHandler = (e: KeyboardEvent) => {
        handleKeyboardInput(e, true);
        onKeyPress?.(e);
    };

    const keyUpHandler = (e: KeyboardEvent) => {
        handleKeyboardInput(e, false);
    };

    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);

    return () => {
        window.removeEventListener('keydown', keyDownHandler);
        window.removeEventListener('keyup', keyUpHandler);
    };
}
