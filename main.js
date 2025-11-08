import { GameManager } from './GameManager.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { UPDATE_INTERVAL_MS } from './Constants.js';

const CANVAS_ID = 'game-canvas';
const BACKGROUND_URL = 'background.png';

let gameManager;
let lastTime = 0;

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const deltaTime = currentTime - lastTime;
    
    // Throttle updates to maintain a stable FPS target (60 FPS in this case)
    if (deltaTime >= UPDATE_INTERVAL_MS) {
        if (gameManager) {
            // Pass the throttled delta time
            gameManager.update(deltaTime);
        }
        lastTime = currentTime - (deltaTime % UPDATE_INTERVAL_MS);
    }
}

async function init() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }
    
    const inputManager = new InputManager();
    const renderer = new Renderer(canvas, BACKGROUND_URL);
    
    gameManager = new GameManager(inputManager, renderer);
    
    try {
        await gameManager.initialize();
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Failed to initialize game:", e);
    }
}

init();
