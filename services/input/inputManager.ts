/**
 * DEPRECATED: REPLACED BY core/engines/InputEngine.ts
 */

export const setupKeyboardHandlers = (handleKeyDown: (e: KeyboardEvent) => void, handleKeyUp: (e: KeyboardEvent) => void) => {
    return () => { };
};

export const getInputState = () => ({ left: false, right: false, up: false, down: false });
export const clearInput = () => { };
export const setTouchInput = (action: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => { };
