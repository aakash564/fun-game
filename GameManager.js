import {
    GAME_WIDTH,
    GAME_HEIGHT,
    PLAYER_SIZE,
    PLAYER_SPEED,
    COMET_SIZE,
    MAX_COMETS,
    INITIAL_SCORE,
    SCORE_PER_COMET
} from './Constants.js';

const room = new WebsimSocket(); // Available globally

function generateCometId() {
    return 'comet-' + Date.now() + Math.floor(Math.random() * 100000);
}

export class GameManager {
    constructor(inputManager, renderer) {
        this.inputManager = inputManager;
        this.renderer = renderer;
        this.initialized = false;
        this.localPlayerId = null;
        this.playerColor = this.generateRandomColor();

        this.initialPresence = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            score: INITIAL_SCORE,
            color: this.playerColor,
            username: 'Loading...'
        };
    }

    generateRandomColor() {
        const colors = ['#FF6347', '#4682B4', '#3CB371', '#FFD700', '#DA70D6', '#00FFFF'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async initialize() {
        console.log("Initializing Websim connection...");
        await room.initialize();
        this.localPlayerId = room.clientId;

        // 1. Setup Initial Presence (using the current user info)
        const peerInfo = room.peers[this.localPlayerId];
        this.initialPresence.username = peerInfo.username;

        // Ensure player position is slightly randomized on spawn if room state exists
        if (room.roomState.comets) {
             this.initialPresence.x = Math.random() * GAME_WIDTH;
             this.initialPresence.y = Math.random() * GAME_HEIGHT;
        }

        room.updatePresence(this.initialPresence);

        // 2. Setup Subscriptions
        room.subscribePresence(this.handlePresenceUpdate.bind(this));

        // 3. Game specific initialization (e.g., spawning initial comets if room state is empty)
        if (!room.roomState.comets || Object.keys(room.roomState.comets).length === 0) {
            console.log("Room state is empty. Initializing map state.");
            this.spawnInitialComets();
        }

        this.initialized = true;
        console.log("Game initialized.");
    }

    spawnInitialComets() {
        const comets = {};
        for (let i = 0; i < MAX_COMETS; i++) {
            const id = generateCometId();
            comets[id] = this.generateNewComet(id);
        }
        room.updateRoomState({ comets });
    }

    generateNewComet(id) {
        return {
            id: id,
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
        };
    }

    handlePresenceUpdate() {
        // Presence state is automatically updated in room.presence
        this.updateLeaderboard();
    }

    // We don't need handlePresenceUpdateRequests or handleEvent yet, as score is locally managed and broadcast via updatePresence.
    // They are available for future expansions like combat or specific interactions.

    updateLeaderboard() {
        const leaderboardDiv = document.getElementById('leaderboard');
        let html = '<h3>Leaderboard</h3>';

        const sortedPlayers = Object.values(room.presence)
            .filter(p => p.x !== undefined) // Only show initialized players
            .map(p => {
                const peer = room.peers[p.id] || { username: 'Disconnected' };
                return {
                    username: p.username || peer.username || 'Anon',
                    score: p.score || 0,
                    color: p.color || '#FFF'
                };
            })
            .sort((a, b) => b.score - a.score);

        sortedPlayers.forEach(p => {
            html += `<div class="leaderboard-entry">
                        <span style="color: ${p.color};">${p.username}</span>
                        <span>${p.score}</span>
                     </div>`;
        });

        leaderboardDiv.innerHTML = html;

        // Update local score display separately
        const localPlayer = room.presence[this.localPlayerId];
        if (localPlayer) {
            document.getElementById('score-display').innerText = `Score: ${localPlayer.score}`;
        }
    }

    update(deltaTime) {
        if (!this.initialized) return;

        this.handleMovement(deltaTime);
        this.handleCollisions();

        // 4. Render
        this.renderer.render(room.presence, room.roomState.comets || {});
    }

    handleMovement(deltaTime) {
        const inputVector = this.inputManager.getMovementVector();
        const localPlayer = room.presence[this.localPlayerId];

        if (!localPlayer || (inputVector.x === 0 && inputVector.y === 0)) {
            return;
        }

        // We use deltaTime conceptually, but since speed is constant and updates are rate-limited, 
        // we can simplify the movement calculation based on input direction.

        let newX = localPlayer.x + inputVector.x * PLAYER_SPEED;
        let newY = localPlayer.y + inputVector.y * PLAYER_SPEED;

        // Clamp movement to boundaries
        newX = Math.max(PLAYER_SIZE, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
        newY = Math.max(PLAYER_SIZE, Math.min(GAME_HEIGHT - PLAYER_SIZE, newY));

        room.updatePresence({ x: newX, y: newY });
    }

    handleCollisions() {
        const localPlayer = room.presence[this.localPlayerId];
        // Ensure player state is fully initialized
        if (!localPlayer || localPlayer.x === undefined || localPlayer.y === undefined) return;

        const comets = room.roomState.comets || {};
        const cometsToCollect = [];

        // Identify which comets *this* client should attempt to collect
        Object.entries(comets).forEach(([id, comet]) => {
            if (this.isColliding(localPlayer, comet)) {
                cometsToCollect.push(id);
            }
        });

        if (cometsToCollect.length === 0) return;

        let scoreIncrease = 0;
        let updatedComets = {};

        // Atomically try to update Room State (delete collected comets and spawn replacements)
        // Since Websim handles partial updates and conflicts internally, we submit our intended changes.
        cometsToCollect.forEach(id => {
            // Mark for deletion
            updatedComets[id] = null; 
            scoreIncrease += SCORE_PER_COMET;

            // Spawn replacement
            const newId = generateCometId();
            updatedComets[newId] = this.generateNewComet(newId);
        });

        // Send aggregated Room State update (deletions and replacements)
        room.updateRoomState({ comets: updatedComets });

        // Update Player Presence (Score) based on how many comets we successfully tried to grab
        // Note: Score updates might lag slightly if another client collects the comet simultaneously,
        // but the eventual state will be consistent.
        if (scoreIncrease > 0) {
            room.updatePresence({ 
                score: (localPlayer.score || 0) + scoreIncrease 
            });
        }
    }

    isColliding(player, comet) {
        const dx = player.x - comet.x;
        const dy = player.y - comet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Collision if distance is less than sum of radii
        return distance < PLAYER_SIZE + COMET_SIZE;
    }
}
