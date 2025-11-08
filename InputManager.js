import nipplejs from 'nipplejs';
import { GAME_HEIGHT, GAME_WIDTH } from './Constants.js';

export class InputManager {
    constructor() {
        this.input = { x: 0, y: 0 };
        this.keyboardState = { w: false, a: false, s: false, d: false };
        this.joystickActive = false;
        this.setupKeyboard();
        this.setupJoystick();
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => this.handleKey(e.key, true));
        document.addEventListener('keyup', (e) => this.handleKey(e.key, false));
    }

    handleKey(key, isDown) {
        key = key.toLowerCase();
        if (key in this.keyboardState) {
            this.keyboardState[key] = isDown;
            this.updateInputFromKeyboard();
        }
    }

    updateInputFromKeyboard() {
        let x = 0;
        let y = 0;
        if (this.keyboardState.a) x -= 1;
        if (this.keyboardState.d) x += 1;
        if (this.keyboardState.w) y -= 1;
        if (this.keyboardState.s) y += 1;

        if (x !== 0 || y !== 0) {
            const magnitude = Math.sqrt(x * x + y * y);
            this.input.x = x / magnitude;
            this.input.y = y / magnitude;
        } else if (!this.joystickActive) {
            this.input.x = 0;
            this.input.y = 0;
        }
    }
    
    setupJoystick() {
        const zone = document.getElementById('mobile-controls');
        if (!zone) return;

        const manager = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'cyan'
        });

        manager.on('move', (evt, data) => {
            this.joystickActive = true;
            const force = data.force;
            if (force > 0.1) {
                // Normalize force direction to unit vector
                this.input.x = data.vector.x;
                this.input.y = data.vector.y * -1; // Y axis inversion required for standard canvas coordinates
            } else {
                this.input.x = 0;
                this.input.y = 0;
            }
        }).on('end', () => {
            this.joystickActive = false;
            // If keys aren't pressed, stop movement
            this.updateInputFromKeyboard();
        });
    }

    getMovementVector() {
        return this.input;
    }
}
