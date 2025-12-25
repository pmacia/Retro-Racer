export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    view1: boolean;
    view2: boolean;
    view3: boolean;
    view4: boolean;
}

export class InputEngine {
    private inputState: InputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        view1: false,
        view2: false,
        view3: false,
        view4: false
    };

    private onKeyPress?: (e: KeyboardEvent) => void;
    private boundKeyDownHandler: (e: KeyboardEvent) => void;
    private boundKeyUpHandler: (e: KeyboardEvent) => void;

    constructor() {
        this.boundKeyDownHandler = this.handleKeyDown.bind(this);
        this.boundKeyUpHandler = this.handleKeyUp.bind(this);
    }

    public setupListeners(onKeyPress?: (e: KeyboardEvent) => void): void {
        this.onKeyPress = onKeyPress;
        window.addEventListener('keydown', this.boundKeyDownHandler);
        window.addEventListener('keyup', this.boundKeyUpHandler);
    }

    public cleanup(): void {
        window.removeEventListener('keydown', this.boundKeyDownHandler);
        window.removeEventListener('keyup', this.boundKeyUpHandler);
    }

    public getState(): InputState {
        return this.inputState;
    }

    public clear(): void {
        this.inputState.left = false;
        this.inputState.right = false;
        this.inputState.up = false;
        this.inputState.down = false;
        this.inputState.view1 = false;
        this.inputState.view2 = false;
        this.inputState.view3 = false;
        this.inputState.view4 = false;
    }

    public setTouchInput(action: 'up' | 'down' | 'left' | 'right', isPressed: boolean): void {
        this.inputState[action] = isPressed;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        this.handleKeyboardInput(e, true);
        this.onKeyPress?.(e);
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.handleKeyboardInput(e, false);
    }

    private handleKeyboardInput(e: KeyboardEvent, isDown: boolean): void {
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.inputState.left = isDown;
        if (['ArrowRight', 'd', 'D'].includes(e.key)) this.inputState.right = isDown;
        if (['ArrowUp', 'w', 'W'].includes(e.key)) this.inputState.up = isDown;
        if (['ArrowDown', 's', 'S'].includes(e.key)) this.inputState.down = isDown;
        if (e.key === '1') this.inputState.view1 = isDown;
        if (e.key === '2') this.inputState.view2 = isDown;
        if (e.key === '3') this.inputState.view3 = isDown;
        if (e.key === '4') this.inputState.view4 = isDown;
    }
}
