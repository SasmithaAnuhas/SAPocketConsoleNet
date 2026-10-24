/**
 * KENNY ADVENTURE V1 - Complete Platformer Engine
 * Level 1: Sunny Meadow
 */

const CONFIG = {
    WIDTH: 1280,
    HEIGHT: 720,
    TILE_SIZE: 64,
    GRAVITY: 0.44,
    MAX_FALL_SPEED: 12.0,
    WALK_SPEED: 4.4,
    ACCEL: 0.35,
    FRICTION: 0.78,
    JUMP_FORCE: -11.4,
    SPRING_FORCE: -17.2,
    BOUNCE_FORCE: -8.0,
    ASSET_BASE: 'Assets/kenney_new-platformer-pack-1.1/'
};

// ==========================================
// 1. AUDIO SYSTEM (HTML5 Audio + Synth Fallback)
// ==========================================
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.audioClones = {};
        this.soundPaths = {
            'jump': 'Sounds/sfx_jump.ogg',
            'jump_high': 'Sounds/sfx_jump-high.ogg',
            'coin': 'Sounds/sfx_coin.ogg',
            'gem': 'Sounds/sfx_gem.ogg',
            'hurt': 'Sounds/sfx_hurt.ogg',
            'kill': 'Sounds/sfx_disappear.ogg',
            'bump': 'Sounds/sfx_bump.ogg'
        };
        this.initHTML5Audio();
    }

    initHTML5Audio() {
        Object.entries(this.soundPaths).forEach(([key, relPath]) => {
            this.audioClones[key] = [];
            for (let i = 0; i < 3; i++) {
                const a = new Audio();
                a.src = CONFIG.ASSET_BASE + relPath;
                a.preload = 'auto';
                this.audioClones[key].push(a);
            }
        });
    }

    initSynth() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(name) {
        if (this.muted) return;

        // 1. Try HTML5 Audio Pool
        const pool = this.audioClones[name];
        if (pool && pool.length > 0) {
            const audio = pool.find(a => a.paused || a.ended) || pool[0];
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(() => {
                    this.playSynth(name);
                });
                return;
            }
        }

        // 2. Synthesizer Fallback
        this.playSynth(name);
    }

    playSynth(name) {
        this.initSynth();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (name === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (name === 'jump_high') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.28);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (name === 'coin') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(987, now);
            osc.frequency.setValueAtTime(1318, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (name === 'gem') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.05);
            osc.frequency.setValueAtTime(784, now + 0.10);
            osc.frequency.setValueAtTime(1046, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (name === 'kill') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (name === 'hurt') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(70, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (name === 'bump') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(90, now + 0.08);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (name === 'victory') {
            const notes = [261.6, 329.6, 392.0, 523.2, 659.2, 783.9];
            notes.forEach((freq, idx) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.connect(g);
                g.connect(this.ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.25, now + idx * 0.08);
                g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.2);
            });
        }
    }
}

const sounds = new SoundSystem();

// ==========================================
// 2. ASSET MANAGER
// ==========================================
class AssetManager {
    constructor() {
        this.images = {};
    }

    load(imageMap) {
        Object.entries(imageMap).forEach(([key, path]) => {
            const img = new Image();
            img.src = CONFIG.ASSET_BASE + path;
            this.images[key] = img;
        });
    }

    get(key) {
        return this.images[key];
    }

    isReady(key) {
        const img = this.images[key];
        return img && img.complete && img.naturalWidth !== 0;
    }
}

const assets = new AssetManager();
assets.load({
    // Player
    'player_idle': 'Sprites/Characters/Default/character_green_idle.png',
    'player_walk_a': 'Sprites/Characters/Default/character_green_walk_a.png',
    'player_walk_b': 'Sprites/Characters/Default/character_green_walk_b.png',
    'player_jump': 'Sprites/Characters/Default/character_green_jump.png',
    'player_hit': 'Sprites/Characters/Default/character_green_hit.png',

    // Backgrounds
    'bg_sky': 'Sprites/Backgrounds/Default/background_solid_sky.png',
    'bg_hills': 'Sprites/Backgrounds/Default/background_color_hills.png',
    'bg_clouds': 'Sprites/Backgrounds/Default/background_clouds.png',

    // Terrain & Blocks
    'tile_grass_block': 'Sprites/Tiles/Default/terrain_grass_block.png',
    'tile_grass_center': 'Sprites/Tiles/Default/terrain_grass_block_center.png',
    'tile_grass_l': 'Sprites/Tiles/Default/terrain_grass_horizontal_left.png',
    'tile_grass_m': 'Sprites/Tiles/Default/terrain_grass_horizontal_middle.png',
    'tile_grass_r': 'Sprites/Tiles/Default/terrain_grass_horizontal_right.png',
    'tile_water': 'Sprites/Tiles/Default/water_top.png',
    'tile_spikes': 'Sprites/Tiles/Default/spikes.png',
    'tile_spring': 'Sprites/Tiles/Default/spring.png',
    'tile_spring_out': 'Sprites/Tiles/Default/spring_out.png',
    'block_coin': 'Sprites/Tiles/Default/block_coin.png',
    'block_empty': 'Sprites/Tiles/Default/block_empty.png',

    // Items & Collectibles
    'coin': 'Sprites/Tiles/Default/coin_gold.png',
    'coin_side': 'Sprites/Tiles/Default/coin_gold_side.png',
    'gem': 'Sprites/Tiles/Default/gem_blue.png',
    'heart': 'Sprites/Tiles/Default/heart.png',
    'hud_heart': 'Sprites/Tiles/Default/hud_heart.png',
    'hud_heart_empty': 'Sprites/Tiles/Default/hud_heart_empty.png',
    'flag_a': 'Sprites/Tiles/Default/flag_green_a.png',
    'flag_b': 'Sprites/Tiles/Default/flag_green_b.png',

    // Decor
    'sign_right': 'Sprites/Tiles/Default/sign_right.png',
    'sign_exit': 'Sprites/Tiles/Default/sign_exit.png',
    'bush': 'Sprites/Tiles/Default/bush.png',

    // Enemies
    'slime_walk_a': 'Sprites/Enemies/Default/slime_normal_walk_a.png',
    'slime_walk_b': 'Sprites/Enemies/Default/slime_normal_walk_b.png',
    'slime_flat': 'Sprites/Enemies/Default/slime_normal_flat.png',
    'bee_a': 'Sprites/Enemies/Default/bee_a.png',
    'bee_b': 'Sprites/Enemies/Default/bee_b.png'
});

// ==========================================
// 3. CANVAS & INPUT SETUP
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

const keys = {};
const justPressed = {};

window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) {
        justPressed[e.code] = true;
    }
    keys[e.code] = true;
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    justPressed[e.code] = false;
});

// Setup Mobile Touch Controls
function setupTouchControls() {
    const bindBtn = (id, keyName) => {
        const el = document.getElementById(id);
        if (!el) return;

        const onStart = (e) => {
            e.preventDefault();
            if (!keys[keyName]) justPressed[keyName] = true;
            keys[keyName] = true;
            el.classList.add('active');
        };

        const onEnd = (e) => {
            e.preventDefault();
            keys[keyName] = false;
            justPressed[keyName] = false;
            el.classList.remove('active');
        };

        el.addEventListener('touchstart', onStart, { passive: false });
        el.addEventListener('touchend', onEnd, { passive: false });
        el.addEventListener('touchcancel', onEnd, { passive: false });
        el.addEventListener('mousedown', onStart);
        el.addEventListener('mouseup', onEnd);
        el.addEventListener('mouseleave', onEnd);
    };

    bindBtn('btn-left', 'ArrowLeft');
    bindBtn('btn-right', 'ArrowRight');
    bindBtn('btn-jump', 'Space');
}

// ==========================================
// 4. LEVEL 1 MAP DEFINITION
// ==========================================
// 100 columns x 12 rows
const LEVEL_1_ASCII = [
/*  0 */ "....................................................................................................",
/*  1 */ "....................................................................................................",
/*  2 */ ".................................CGC.............................CHC................................",
/*  3 */ "................................[===]...........................[===]...............................",
/*  4 */ "................................................W...............G...........W.......................",
/*  5 */ ".......................CGC....................................[===]........CC...............CCF.....",
/*  6 */ ".............C........[===].....................?CC.........!.............[==].............#####....",
/*  7 */ ".......CCC..[?=].[==].........................[=====]...............[==].................#######....",
/*  8 */ "...P................S.............J...====..............S........J.........^^.....S....#########....",
/*  9 */ "######################################....##########################....############################",
/* 10 */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB~~~~BBBBBBBBBBBBBBBBBBBBBBBBBB~~~~BBBBBBBBBBBBBBBBBBBBBBBBBBBB",
/* 11 */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB~~~~BBBBBBBBBBBBBBBBBBBBBBBBBB~~~~BBBBBBBBBBBBBBBBBBBBBBBBBBBB"
];

// ==========================================
// 5. TILEMAP & GAME OBJECTS
// ==========================================
class TileMap {
    constructor(grid) {
        this.grid = grid;
        this.rows = grid.length;
        this.cols = grid[0].length;
        this.width = this.cols * CONFIG.TILE_SIZE;
        this.height = this.rows * CONFIG.TILE_SIZE;
        this.bumpedBlocks = {}; // Animation for hit blocks: { "r,c": offset }
    }

    isSolid(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        const char = this.grid[row][col];
        return char === '#' || char === 'B' || char === '[' || char === '=' || char === ']' ||
               char === '?' || char === '!' || char === 'E';
    }

    isWater(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        return this.grid[row][col] === '~';
    }

    isSpikes(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        return this.grid[row][col] === '^';
    }

    isQuestionBlock(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        const char = this.grid[row][col];
        return char === '?' || char === '!';
    }

    hitBlock(col, row) {
        const char = this.grid[row][col];
        this.grid[row][col] = 'E';
        this.bumpedBlocks[`${row},${col}`] = 10;
        sounds.play('bump');

        const blockX = col * CONFIG.TILE_SIZE;
        const blockY = row * CONFIG.TILE_SIZE;

        if (char === '?') {
            // Spawn bouncing coin
            spawnPopCoin(blockX + 16, blockY - 20);
            gameStateData.score += 100;
            sounds.play('coin');
        } else if (char === '!') {
            // Spawn floating heart
            collectibles.push(new Collectible(blockX + 16, blockY - 32, 'heart'));
            sounds.play('gem');
        }
    }

    update() {
        Object.keys(this.bumpedBlocks).forEach(key => {
            if (this.bumpedBlocks[key] > 0) {
                this.bumpedBlocks[key] -= 1.5;
                if (this.bumpedBlocks[key] <= 0) {
                    delete this.bumpedBlocks[key];
                }
            }
        });
    }

    draw(ctx, camX, camY) {
        const startCol = Math.max(0, Math.floor(camX / CONFIG.TILE_SIZE));
        const endCol = Math.min(this.cols, startCol + Math.ceil(CONFIG.WIDTH / CONFIG.TILE_SIZE) + 2);

        for (let r = 0; r < this.rows; r++) {
            for (let c = startCol; c < endCol; c++) {
                const char = this.grid[r][c];
                if (char === '.') continue;

                let imgKey = null;
                if (char === '#') imgKey = 'tile_grass_block';
                else if (char === 'B') imgKey = 'tile_grass_center';
                else if (char === '[') imgKey = 'tile_grass_l';
                else if (char === '=') imgKey = 'tile_grass_m';
                else if (char === ']') imgKey = 'tile_grass_r';
                else if (char === '?' || char === '!') imgKey = 'block_coin';
                else if (char === 'E') imgKey = 'block_empty';
                else if (char === '~') imgKey = 'tile_water';
                else if (char === '^') imgKey = 'tile_spikes';

                const bump = this.bumpedBlocks[`${r},${c}`] || 0;
                const px = c * CONFIG.TILE_SIZE;
                const py = r * CONFIG.TILE_SIZE - bump;

                if (imgKey && assets.isReady(imgKey)) {
                    ctx.drawImage(assets.get(imgKey), px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else if (char === '#' || char === 'B' || char === '[' || char === '=' || char === ']') {
                    ctx.fillStyle = '#40d17a';
                    ctx.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else if (char === '~') {
                    ctx.fillStyle = '#00a8ff';
                    ctx.fillRect(px, py + 16, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE - 16);
                } else if (char === '^') {
                    ctx.fillStyle = '#ff4757';
                    ctx.fillRect(px + 12, py + 34, 40, 30);
                }
            }
        }
    }
}

// Particle Class
class Particle {
    constructor(x, y, color, vx, vy, life, size = 4) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Collectible Class (Coin, Gem, Heart, Flag)
class Collectible {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.type = type;
        this.w = 32;
        this.h = 32;
        this.collected = false;

        if (type === 'flag') {
            this.w = 48;
            this.h = 64;
        }
    }

    update(animTick) {
        if (this.type !== 'flag') {
            // Smooth float bobbing
            this.y = this.startY + Math.sin(animTick * 0.08 + this.x) * 4;
        }
    }

    draw(ctx, animTick) {
        if (this.collected) return;

        if (this.type === 'coin') {
            const isFront = (Math.floor(animTick / 14) % 2) === 0;
            const key = isFront ? 'coin' : 'coin_side';
            if (assets.isReady(key)) {
                ctx.drawImage(assets.get(key), this.x, this.y, 32, 32);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 16, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'gem') {
            if (assets.isReady('gem')) {
                ctx.drawImage(assets.get('gem'), this.x, this.y, 32, 32);
            } else {
                ctx.fillStyle = '#00d2ff';
                ctx.fillRect(this.x + 4, this.y + 4, 24, 24);
            }
        } else if (this.type === 'heart') {
            if (assets.isReady('heart')) {
                ctx.drawImage(assets.get('heart'), this.x, this.y, 32, 32);
            } else {
                ctx.fillStyle = '#ff4757';
                ctx.fillRect(this.x + 4, this.y + 4, 24, 24);
            }
        } else if (this.type === 'flag') {
            const isA = (Math.floor(animTick / 18) % 2) === 0;
            const key = isA ? 'flag_a' : 'flag_b';
            if (assets.isReady(key)) {
                ctx.drawImage(assets.get(key), this.x, this.y, 64, 64);
            } else {
                ctx.fillStyle = '#40d17a';
                ctx.fillRect(this.x + 8, this.y, 48, 64);
            }
        }
    }
}

// Spring Pad
class SpringPad {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 56;
        this.h = 32;
        this.activeTimer = 0;
    }

    trigger() {
        this.activeTimer = 14;
        sounds.play('jump_high');
    }

    update() {
        if (this.activeTimer > 0) this.activeTimer--;
    }

    draw(ctx) {
        const key = this.activeTimer > 0 ? 'tile_spring_out' : 'tile_spring';
        if (assets.isReady(key)) {
            ctx.drawImage(assets.get(key), this.x, this.y, 64, 64);
        } else {
            ctx.fillStyle = this.activeTimer > 0 ? '#3ea6ff' : '#65b8ff';
            ctx.fillRect(this.x + 4, this.y + 16, 56, 32);
        }
    }
}

// Enemy Slime (Ground Patrol)
class SlimeEnemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 46;
        this.h = 36;
        this.startX = x;
        this.range = 140;
        this.speed = 1.4;
        this.facing = 1;
        this.dead = false;
        this.flatTimer = 0;
    }

    update(tileMap) {
        if (this.dead) {
            if (this.flatTimer > 0) this.flatTimer--;
            return;
        }

        this.x += this.speed * this.facing;

        // Turn around on wall hit or platform edge
        const nextX = this.facing > 0 ? this.x + this.w + 4 : this.x - 4;
        const groundCheckX = this.facing > 0 ? this.x + this.w : this.x;
        const currentTileCol = Math.floor(nextX / CONFIG.TILE_SIZE);
        const currentTileRow = Math.floor((this.y + this.h / 2) / CONFIG.TILE_SIZE);
        const groundTileRow = Math.floor((this.y + this.h + 4) / CONFIG.TILE_SIZE);

        if (Math.abs(this.x - this.startX) > this.range ||
            tileMap.isSolid(currentTileCol, currentTileRow) ||
            !tileMap.isSolid(Math.floor(groundCheckX / CONFIG.TILE_SIZE), groundTileRow)) {
            this.facing *= -1;
        }
    }

    stomp() {
        this.dead = true;
        this.flatTimer = 25;
        sounds.play('kill');
    }

    draw(ctx, animTick) {
        if (this.dead && this.flatTimer <= 0) return;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(-this.facing, 1);

        if (this.dead) {
            if (assets.isReady('slime_flat')) {
                ctx.drawImage(assets.get('slime_flat'), -32, -18, 64, 40);
            } else {
                ctx.fillStyle = '#40d17a';
                ctx.fillRect(-24, 0, 48, 16);
            }
        } else {
            const isWalkA = (Math.floor(animTick / 15) % 2) === 0;
            const key = isWalkA ? 'slime_walk_a' : 'slime_walk_b';
            if (assets.isReady(key)) {
                ctx.drawImage(assets.get(key), -32, -44, 64, 64);
            } else {
                ctx.fillStyle = '#40d17a';
                ctx.fillRect(-23, -18, 46, 36);
            }
        }

        ctx.restore();
    }
}

// Enemy Bee (High Flying Patrol)
class BeeEnemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.w = 44;
        this.h = 44;
        this.startX = x;
        this.range = 160;
        this.speed = 1.4;
        this.facing = 1;
        this.dead = false;
        this.timer = Math.random() * 10;
    }

    update() {
        if (this.dead) return;

        this.x += this.speed * this.facing;
        this.timer += 0.04;
        this.y = this.startY + Math.sin(this.timer) * 22;

        if (Math.abs(this.x - this.startX) > this.range) {
            this.facing *= -1;
        }
    }

    stomp() {
        this.dead = true;
        sounds.play('kill');
    }

    draw(ctx, animTick) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(-this.facing, 1);

        const isA = (Math.floor(animTick / 10) % 2) === 0;
        const key = isA ? 'bee_a' : 'bee_b';
        if (assets.isReady(key)) {
            ctx.drawImage(assets.get(key), -32, -32, 64, 64);
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-22, -22, 44, 44);
        }

        ctx.restore();
    }
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 50;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.facing = 1; // 1 = right, -1 = left
        this.state = 'idle';
        this.animTimer = 0;
        this.animFrame = 0;

        // Platforming Grace Timers
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.invincibleTimer = 0;
    }

    update(tileMap) {
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        // 1. Horizontal Input & Acceleration
        let targetVx = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) {
            targetVx = -CONFIG.WALK_SPEED;
            this.facing = -1;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            targetVx = CONFIG.WALK_SPEED;
            this.facing = 1;
        }

        // Acceleration & Deceleration
        if (targetVx !== 0) {
            this.vx += (targetVx - this.vx) * CONFIG.ACCEL;
        } else {
            this.vx *= CONFIG.FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Apply Horizontal Movement
        this.x += this.vx;
        this.handleHorizontalCollision(tileMap);

        // 2. Coyote Time & Jump Buffering
        if (this.grounded) {
            this.coyoteTimer = 7;
        } else if (this.coyoteTimer > 0) {
            this.coyoteTimer--;
        }

        if (justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space']) {
            this.jumpBufferTimer = 7;
            justPressed['ArrowUp'] = false;
            justPressed['KeyW'] = false;
            justPressed['Space'] = false;
        } else if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer--;
        }

        // Jump Execution
        if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            this.vy = CONFIG.JUMP_FORCE;
            this.grounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            sounds.play('jump');

            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(this.x + this.w / 2, this.y + this.h, '#ffffff', (Math.random() - 0.5) * 4, -Math.random() * 2, 16));
            }
        }

        // Variable Jump Height: release jump early to cut upward velocity
        if (this.vy < -3.0 && !(keys['ArrowUp'] || keys['KeyW'] || keys['Space'])) {
            this.vy *= 0.5;
        }

        // Apply Gravity
        this.vy = Math.min(CONFIG.MAX_FALL_SPEED, this.vy + CONFIG.GRAVITY);
        this.y += this.vy;
        this.handleVerticalCollision(tileMap);

        // 3. Tile Hazard Checks (Water Pit & Spikes)
        this.checkTileHazards(tileMap);

        // 4. Animation State
        this.updateAnimation();

        // 5. Pit Fall Check
        if (this.y > tileMap.height + 60) {
            this.die();
        }
    }

    handleHorizontalCollision(tileMap) {
        const topTile = Math.floor((this.y + 2) / CONFIG.TILE_SIZE);
        const bottomTile = Math.floor((this.y + this.h - 2) / CONFIG.TILE_SIZE);

        if (this.vx > 0) {
            const rightCol = Math.floor((this.x + this.w) / CONFIG.TILE_SIZE);
            for (let r = topTile; r <= bottomTile; r++) {
                if (tileMap.isSolid(rightCol, r)) {
                    this.x = rightCol * CONFIG.TILE_SIZE - this.w;
                    this.vx = 0;
                    break;
                }
            }
        } else if (this.vx < 0) {
            const leftCol = Math.floor(this.x / CONFIG.TILE_SIZE);
            for (let r = topTile; r <= bottomTile; r++) {
                if (tileMap.isSolid(leftCol, r)) {
                    this.x = (leftCol + 1) * CONFIG.TILE_SIZE;
                    this.vx = 0;
                    break;
                }
            }
        }
    }

    handleVerticalCollision(tileMap) {
        this.grounded = false;
        const leftCol = Math.floor((this.x + 3) / CONFIG.TILE_SIZE);
        const rightCol = Math.floor((this.x + this.w - 3) / CONFIG.TILE_SIZE);

        if (this.vy > 0) {
            // Falling / Landing
            const bottomRow = Math.floor((this.y + this.h) / CONFIG.TILE_SIZE);
            for (let c = leftCol; c <= rightCol; c++) {
                if (tileMap.isSolid(c, bottomRow)) {
                    this.y = bottomRow * CONFIG.TILE_SIZE - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    break;
                }
            }
        } else if (this.vy < 0) {
            // Rising / Hitting Ceiling
            const topRow = Math.floor(this.y / CONFIG.TILE_SIZE);
            for (let c = leftCol; c <= rightCol; c++) {
                if (tileMap.isSolid(c, topRow)) {
                    if (tileMap.isQuestionBlock(c, topRow)) {
                        tileMap.hitBlock(c, topRow);
                    }
                    this.y = (topRow + 1) * CONFIG.TILE_SIZE;
                    this.vy = 0;
                    break;
                }
            }
        }
    }

    checkTileHazards(tileMap) {
        const centerCol = Math.floor((this.x + this.w / 2) / CONFIG.TILE_SIZE);
        const bottomRow = Math.floor((this.y + this.h) / CONFIG.TILE_SIZE);
        const midRow = Math.floor((this.y + this.h / 2) / CONFIG.TILE_SIZE);

        if (tileMap.isWater(centerCol, bottomRow) || tileMap.isWater(centerCol, midRow)) {
            this.die();
        } else if (tileMap.isSpikes(centerCol, bottomRow) || tileMap.isSpikes(centerCol, midRow)) {
            this.takeDamage();
        }
    }

    takeDamage() {
        if (this.invincibleTimer > 0) return;
        gameStateData.health--;
        this.invincibleTimer = 60;
        this.vy = -6;
        this.vx = this.facing * -4;
        sounds.play('hurt');
        updateHUD();

        if (gameStateData.health <= 0) {
            this.die();
        }
    }

    die() {
        if (currentGameState === 'GAMEOVER') return;
        currentGameState = 'GAMEOVER';
        sounds.play('hurt');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('touch-controls').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'block';
    }

    updateAnimation() {
        if (!this.grounded) {
            this.state = 'jump';
        } else if (Math.abs(this.vx) > 0.4) {
            this.state = 'walk';
            this.animTimer++;
            if (this.animTimer > 8) {
                this.animFrame = (this.animFrame + 1) % 2;
                this.animTimer = 0;
            }
        } else {
            this.state = 'idle';
        }
    }

    draw(ctx) {
        // Flicker on invincibility
        if (this.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

        let imgKey = 'player_idle';
        if (this.invincibleTimer > 40) imgKey = 'player_hit';
        else if (this.state === 'walk') imgKey = this.animFrame === 0 ? 'player_walk_a' : 'player_walk_b';
        else if (this.state === 'jump') imgKey = 'player_jump';

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(this.facing, 1);

        if (assets.isReady(imgKey)) {
            // Pixel-perfect sprite centering
            ctx.drawImage(assets.get(imgKey), -32, -39, 64, 64);
        } else {
            ctx.fillStyle = '#3ea6ff';
            ctx.fillRect(-20, -25, 40, 50);
        }

        ctx.restore();
    }
}

// Camera Tracker
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    update(player, levelW, levelH) {
        // Target centers player at 35% from left
        const targetX = player.x - CONFIG.WIDTH * 0.35;
        this.x += (targetX - this.x) * 0.10;
        this.x = Math.max(0, Math.min(this.x, levelW - CONFIG.WIDTH));

        // Soft vertical tracking for high cloud jumps
        const targetY = player.y - CONFIG.HEIGHT * 0.65;
        this.y += (targetY - this.y) * 0.08;
        this.y = Math.max(0, Math.min(this.y, levelH - CONFIG.HEIGHT));
    }
}

// ==========================================
// 6. GAME STATE & CONTROLLER
// ==========================================
let currentGameState = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
let gameStateData = {
    health: 3,
    score: 0,
    gems: 0
};

let tileMap = null;
let player = null;
let camera = null;
let enemies = [];
let collectibles = [];
let springs = [];
let particles = [];
let animTick = 0;

function spawnPopCoin(x, y) {
    collectibles.push(new Collectible(x, y, 'coin'));
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x + 16, y + 16, '#ffd700', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 20));
    }
}

function initLevel() {
    const grid = LEVEL_1_ASCII.map(r => r.split(''));
    tileMap = new TileMap(grid);
    camera = new Camera();
    enemies = [];
    collectibles = [];
    springs = [];
    particles = [];

    gameStateData.health = 3;
    gameStateData.score = 0;
    gameStateData.gems = 0;

    let startX = CONFIG.TILE_SIZE * 3;
    let startY = CONFIG.TILE_SIZE * 8;

    for (let r = 0; r < tileMap.rows; r++) {
        for (let c = 0; c < tileMap.cols; c++) {
            const char = grid[r][c];
            const px = c * CONFIG.TILE_SIZE;
            const py = r * CONFIG.TILE_SIZE;

            if (char === 'P') {
                startX = px + 12;
                startY = py + 14;
                grid[r][c] = '.';
            } else if (char === 'S') {
                enemies.push(new SlimeEnemy(px + 8, py + 28));
                grid[r][c] = '.';
            } else if (char === 'W') {
                enemies.push(new BeeEnemy(px + 10, py + 10));
                grid[r][c] = '.';
            } else if (char === 'J') {
                springs.push(new SpringPad(px, py));
                grid[r][c] = '.';
            } else if (char === 'C') {
                collectibles.push(new Collectible(px + 16, py + 16, 'coin'));
                grid[r][c] = '.';
            } else if (char === 'G') {
                collectibles.push(new Collectible(px + 16, py + 16, 'gem'));
                grid[r][c] = '.';
            } else if (char === 'H') {
                collectibles.push(new Collectible(px + 16, py + 16, 'heart'));
                grid[r][c] = '.';
            } else if (char === 'F') {
                collectibles.push(new Collectible(px, py, 'flag'));
                grid[r][c] = '.';
            }
        }
    }

    player = new Player(startX, startY);
    updateHUD();
}

function updateHUD() {
    const container = document.getElementById('hearts-container');
    if (container) {
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const img = document.createElement('img');
            img.className = 'hud-icon';
            img.src = CONFIG.ASSET_BASE + (i < gameStateData.health ? 'Sprites/Tiles/Default/heart.png' : 'Sprites/Tiles/Default/hud_heart_empty.png');
            container.appendChild(img);
        }
    }
    const scoreEl = document.getElementById('score-text');
    const gemsEl = document.getElementById('gems-text');
    if (scoreEl) scoreEl.innerText = gameStateData.score;
    if (gemsEl) gemsEl.innerText = gameStateData.gems;
}

function togglePause() {
    if (currentGameState !== 'PLAYING' && currentGameState !== 'PAUSED') return;
    if (currentGameState === 'PLAYING') {
        currentGameState = 'PAUSED';
        document.getElementById('pause-menu').style.display = 'block';
    } else {
        currentGameState = 'PLAYING';
        document.getElementById('pause-menu').style.display = 'none';
    }
}

function triggerVictory() {
    if (currentGameState === 'VICTORY') return;
    currentGameState = 'VICTORY';
    sounds.play('victory');
    document.getElementById('final-score').innerText = gameStateData.score;
    document.getElementById('hud').style.display = 'none';
    document.getElementById('touch-controls').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'block';

    for (let i = 0; i < 70; i++) {
        particles.push(new Particle(
            player.x + 20,
            player.y - 40,
            ['#3ea6ff', '#ffd700', '#40d17a', '#ff4757', '#00d2ff'][i % 5],
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            60,
            Math.random() * 6 + 4
        ));
    }
}

function resetGame() {
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('touch-controls').style.display = 'flex';
    }
    initLevel();
    currentGameState = 'PLAYING';
}

function startGame() {
    sounds.initSynth();
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('touch-controls').style.display = 'flex';
    }
    initLevel();
    currentGameState = 'PLAYING';
}

// ==========================================
// 7. MAIN GAME LOOP
// ==========================================
function gameLoop() {
    animTick++;
    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // 1. UPDATE
    if (currentGameState === 'PLAYING') {
        player.update(tileMap);
        tileMap.update();
        camera.update(player, tileMap.width, tileMap.height);

        // Update Springs & Interactions
        springs.forEach(s => {
            s.update();
            if (player.vy > 0 &&
                player.x + player.w > s.x + 6 && player.x < s.x + s.w - 6 &&
                player.y + player.h >= s.y + 12 && player.y + player.h <= s.y + 40) {
                player.vy = CONFIG.SPRING_FORCE;
                s.trigger();
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(s.x + 28, s.y + 20, '#3ea6ff', (Math.random() - 0.5) * 6, -Math.random() * 4, 20));
                }
            }
        });

        // Update Enemies & Combat
        enemies.forEach(e => {
            e.update(tileMap);
            if (e.dead) return;

            // Check AABB Overlap
            if (player.x + player.w > e.x && player.x < e.x + e.w &&
                player.y + player.h > e.y && player.y < e.y + e.h) {
                // Stomp Kill: player is falling and feet hit top half of enemy
                if (player.vy > 0 && player.y + player.h <= e.y + e.h * 0.65 + 8) {
                    e.stomp();
                    player.vy = CONFIG.BOUNCE_FORCE;
                    gameStateData.score += 300;
                    updateHUD();
                    const color = e instanceof SlimeEnemy ? '#40d17a' : '#ffd700';
                    for (let i = 0; i < 14; i++) {
                        particles.push(new Particle(e.x + e.w / 2, e.y + e.h / 2, color, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 25));
                    }
                } else {
                    player.takeDamage();
                }
            }
        });

        // Update Collectibles
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const item = collectibles[i];
            item.update(animTick);

            if (!item.collected &&
                player.x + player.w > item.x && player.x < item.x + item.w &&
                player.y + player.h > item.y && player.y < item.y + item.h) {

                if (item.type === 'coin') {
                    item.collected = true;
                    gameStateData.score += 100;
                    sounds.play('coin');
                    for (let p = 0; p < 6; p++) {
                        particles.push(new Particle(item.x + 16, item.y + 16, '#ffd700', (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 18));
                    }
                    collectibles.splice(i, 1);
                } else if (item.type === 'gem') {
                    item.collected = true;
                    gameStateData.gems += 1;
                    gameStateData.score += 500;
                    sounds.play('gem');
                    for (let p = 0; p < 12; p++) {
                        particles.push(new Particle(item.x + 16, item.y + 16, '#00d2ff', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 22));
                    }
                    collectibles.splice(i, 1);
                } else if (item.type === 'heart') {
                    item.collected = true;
                    gameStateData.health = Math.min(3, gameStateData.health + 1);
                    sounds.play('gem');
                    for (let p = 0; p < 8; p++) {
                        particles.push(new Particle(item.x + 16, item.y + 16, '#ff4757', (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 20));
                    }
                    collectibles.splice(i, 1);
                } else if (item.type === 'flag') {
                    triggerVictory();
                    return;
                }
                updateHUD();
            }
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
    }

    // 2. RENDER PARALLAX BACKGROUND
    // Sky Fill
    ctx.fillStyle = '#bbf3f9';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Clouds Parallax
    if (assets.isReady('bg_clouds')) {
        const cloudImg = assets.get('bg_clouds');
        const cW = 384;
        const cH = 256;
        const startX = -Math.floor((camera.x * 0.12) % cW);
        for (let x = startX - cW; x < CONFIG.WIDTH + cW; x += cW) {
            ctx.drawImage(cloudImg, x, 50, cW, cH);
        }
    }

    // Hills Parallax
    if (assets.isReady('bg_hills')) {
        const hillsImg = assets.get('bg_hills');
        const hW = 384;
        const hH = 320;
        const startX = -Math.floor((camera.x * 0.32) % hW);
        for (let x = startX - hW; x < CONFIG.WIDTH + hW; x += hW) {
            ctx.drawImage(hillsImg, x, CONFIG.HEIGHT - hH - 30, hW, hH);
        }
    }

    // 3. RENDER WORLD (Pixel-Locked Camera)
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // Signposts
    if (assets.isReady('sign_right')) {
        ctx.drawImage(assets.get('sign_right'), CONFIG.TILE_SIZE * 4, CONFIG.TILE_SIZE * 8, 64, 64);
    }
    if (assets.isReady('sign_exit')) {
        ctx.drawImage(assets.get('sign_exit'), CONFIG.TILE_SIZE * 90, CONFIG.TILE_SIZE * 6, 64, 64);
    }
    if (assets.isReady('bush')) {
        ctx.drawImage(assets.get('bush'), CONFIG.TILE_SIZE * 16, CONFIG.TILE_SIZE * 8, 64, 64);
        ctx.drawImage(assets.get('bush'), CONFIG.TILE_SIZE * 52, CONFIG.TILE_SIZE * 6, 64, 64);
    }

    // Spring Pads
    springs.forEach(s => s.draw(ctx));

    // Level Tiles
    tileMap.draw(ctx, camera.x, camera.y);

    // Collectibles & Flag
    collectibles.forEach(item => item.draw(ctx, animTick));

    // Enemies
    enemies.forEach(e => e.draw(ctx, animTick));

    // Particles
    particles.forEach(p => p.draw(ctx));

    // Player
    if (player) player.draw(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. EVENT BINDINGS & BOOTSTRAP
// ==========================================
function bindButtons() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.onclick = startGame;

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.onclick = togglePause;

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.onclick = togglePause;

    const restartBtn = document.getElementById('restart-btn-pause');
    if (restartBtn) restartBtn.onclick = resetGame;

    const replayBtn = document.getElementById('replay-btn');
    if (replayBtn) replayBtn.onclick = resetGame;

    const tryagainBtn = document.getElementById('tryagain-btn');
    if (tryagainBtn) tryagainBtn.onclick = resetGame;

    const audioToggle = document.getElementById('audio-toggle-btn');
    if (audioToggle) {
        audioToggle.onclick = (e) => {
            sounds.muted = !sounds.muted;
            e.target.innerText = `🔊 Sound: ${sounds.muted ? 'OFF' : 'ON'}`;
        };
    }
}

// Bootstrap
initLevel();
setupTouchControls();
bindButtons();
gameLoop();
