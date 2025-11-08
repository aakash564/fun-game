import { GAME_WIDTH, GAME_HEIGHT, PLAYER_SIZE, COMET_SIZE } from './Constants.js';

export class Renderer {
    constructor(canvas, backgroundUrl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        this.backgroundUrl = backgroundUrl;
        this.loaded = false;

        this.bgImage = new Image();
        this.bgImage.onload = () => {
            this.loaded = true;
        }
        this.bgImage.src = backgroundUrl;
    }

    drawBackground() {
        if (this.loaded) {
            this.ctx.drawImage(this.bgImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        } else {
            this.ctx.fillStyle = '#000011';
            this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    }

    render(players, comets) {
        this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.drawBackground();

        // 1. Draw Comets
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'; // Yellowish comets
        Object.values(comets).forEach(comet => {
            this.ctx.beginPath();
            this.ctx.arc(comet.x, comet.y, COMET_SIZE, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 2. Draw Players
        Object.values(players).forEach(player => {
            if (player.x !== undefined && player.y !== undefined) {
                // Draw spaceship (simple circle)
                this.ctx.fillStyle = player.color || '#FFFFFF';
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw outline (A contrasting glow effect)
                this.ctx.strokeStyle = player.color || '#FFFFFF';
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = player.color || '#FFFFFF';
                this.ctx.stroke();
                this.ctx.shadowBlur = 0; // Reset shadow

                // Draw name and score
                this.ctx.fillStyle = '#FFF';
                this.ctx.textAlign = 'center';
                this.ctx.font = 'bold 12px Arial';

                const name = player.username || 'Anon';
                const score = player.score || 0;

                this.ctx.fillText(name, player.x, player.y - PLAYER_SIZE - 5);
                this.ctx.font = '10px Arial';
                this.ctx.fillText(`(${score})`, player.x, player.y + PLAYER_SIZE + 15);
            }
        });
    }
}
