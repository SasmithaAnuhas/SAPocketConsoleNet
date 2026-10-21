/**
 * KENNY ADVENTURE V1 - Game Logic Module
 * Level 1: Sunny Meadow (Single Camera Translation Fix)
 */

const CONFIG = {
    WIDTH: 1280,
    HEIGHT: 720,
    TILE_SIZE: 64,
    GRAVITY: 0.18, // Ultra-gentle low gravity for floaty high jumps
    ASSET_BASE: 'Assets/kenney_new-platformer-pack-1.1/'
};

// Synth Audio Engine Fallback
class SoundFx {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (this.muted || !this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.18);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'coin') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'gem') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.06);
            osc.frequency.setValueAtTime(783.99, now + 0.12);
            osc.frequency.setValueAtTime(1046.50, now + 0.18);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'hurt') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'kill') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'spring') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(580, now + 0.28);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'victory') {
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.connect(g);
                g.connect(this.ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.2, now + idx * 0.08);
                g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.2);
            });
        }
    }
}

const sfx = new SoundFx();

// Background Asset Loader
class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
    }

    loadImages(imageMap) {
        Object.entries(imageMap).forEach(([name, path]) => {
            const img = new Image();
            img.src = CONFIG.ASSET_BASE + path;
            this.images[name] = img;
        });
    }

    loadSounds(soundMap) {
        Object.entries(soundMap).forEach(([name, path]) => {
            const audio = new Audio();
            audio.src = CONFIG.ASSET_BASE + path;
            this.sounds[name] = audio;
        });
    }
}

const assets = new AssetLoader();

const IMAGE_ASSETS = {
    'player_idle': 'Sprites/Characters/Default/character_green_idle.png',
    'player_walk_a': 'Sprites/Characters/Default/character_green_walk_a.png',
    'player_walk_b': 'Sprites/Characters/Default/character_green_walk_b.png',
    'player_jump': 'Sprites/Characters/Default/character_green_jump.png',
    'player_hit': 'Sprites/Characters/Default/character_green_hit.png',
    
    'bg_sky': 'Sprites/Backgrounds/Default/background_solid_sky.png',
    'bg_hills': 'Sprites/Backgrounds/Default/background_color_hills.png',
    'bg_clouds': 'Sprites/Backgrounds/Default/background_clouds.png',
    
    'tile_grass_l': 'Sprites/Tiles/Default/terrain_grass_horizontal_left.png',
    'tile_grass_m': 'Sprites/Tiles/Default/terrain_grass_horizontal_middle.png',
    'tile_grass_r': 'Sprites/Tiles/Default/terrain_grass_horizontal_right.png',
    'tile_grass_block': 'Sprites/Tiles/Default/terrain_grass_block.png',
    'tile_spikes': 'Sprites/Tiles/Default/spikes.png',
    'tile_spring': 'Sprites/Tiles/Default/spring.png',
    'tile_spring_out': 'Sprites/Tiles/Default/spring_out.png',
    'tile_block_planks': 'Sprites/Tiles/Default/block_planks.png',
    'tile_block_coin': 'Sprites/Tiles/Default/block_coin.png',
    'tile_block_empty': 'Sprites/Tiles/Default/block_empty.png',

    'coin': 'Sprites/Tiles/Default/coin_gold.png',
    'coin_side': 'Sprites/Tiles/Default/coin_gold_side.png',
    'gem': 'Sprites/Tiles/Default/gem_blue.png',
    'heart': 'Sprites/Tiles/Default/heart.png',
    'heart_empty': 'Sprites/Tiles/Default/hud_heart_empty.png',
    'flag_a': 'Sprites/Tiles/Default/flag_green_a.png',
    'flag_b': 'Sprites/Tiles/Default/flag_green_b.png',
    'sign_right': 'Sprites/Tiles/Default/sign_right.png',
    'sign_exit': 'Sprites/Tiles/Default/sign_exit.png',
    'bush': 'Sprites/Tiles/Default/bush.png',
    'mushroom': 'Sprites/Tiles/Default/mushroom_red.png',
    
    'slime_walk_a': 'Sprites/Enemies/Default/slime_normal_walk_a.png',
    'slime_walk_b': 'Sprites/Enemies/Default/slime_normal_walk_b.png',
    'bee_a': 'Sprites/Enemies/Default/bee_a.png',
    'bee_b': 'Sprites/Enemies/Default/bee_b.png'
};

const SOUND_ASSETS = {
    'sfx_jump': 'Sounds/sfx_jump.ogg',
    'sfx_coin': 'Sounds/sfx_coin.ogg',
    'sfx_hurt': 'Sounds/sfx_hurt.ogg',
    'sfx_kill': 'Sounds/sfx_disappear.ogg'
};

function playSound(name) {
    sfx.play(name.replace('sfx_', ''));
}

// Preload assets
assets.loadImages(IMAGE_ASSETS);
assets.loadSounds(SOUND_ASSETS);

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

// Input Handler
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

function setupTouchControls() {
    const bindBtn = (id, keyName) => {
        const el = document.getElementById(id);
        if (!el) return;
        const press = (e) => {
            e.preventDefault();
            if (!keys[keyName]) justPressed[keyName] = true;
            keys[keyName] = true;
        };
        const release = (e) => {
            e.preventDefault();
            keys[keyName] = false;
            justPressed[keyName] = false;
        };
        el.addEventListener('touchstart', press);
        el.addEventListener('touchend', release);
        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
    };
    bindBtn('btn-left', 'ArrowLeft');
    bindBtn('btn-right', 'ArrowRight');
    bindBtn('btn-jump', 'Space');
}

let gameState = 'MENU';
let player = null, camera = null, tileMap = null;
let enemies = [], particles = [], collectibles = [], decorObjects = [], springs = [];
let animTimerGlobal = 0;

class Entity {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.vx = 0; this.vy = 0;
    }
    get left() { return this.x; }
    get right() { return this.x + this.w; }
    get top() { return this.y; }
    get bottom() { return this.y + this.h; }
    get midX() { return this.x + this.w / 2; }
    get midY() { return this.y + this.h / 2; }
    
    intersects(other) {
        return this.right > other.left && this.left < other.right &&
               this.bottom > other.top && this.top < other.bottom;
    }
}

class Camera {
    constructor() {
        this.x = 0; this.y = 0;
        this.lerp = 0.08;
    }
    follow(target, worldW, worldH) {
        const targetX = target.x - CONFIG.WIDTH / 2 + target.w / 2;
        const targetY = target.y - CONFIG.HEIGHT / 2 + target.h / 2;
        this.x += (targetX - this.x) * this.lerp;
        this.y += (targetY - this.y) * this.lerp;
        this.x = Math.max(0, Math.min(this.x, worldW - CONFIG.WIDTH));
        this.y = Math.max(0, Math.min(this.y, worldH - CONFIG.HEIGHT));
    }
}

class TileMap {
    constructor(grid) {
        this.grid = grid;
        this.rows = grid.length;
        this.cols = grid[0].length;
        this.width = this.cols * CONFIG.TILE_SIZE;
        this.height = this.rows * CONFIG.TILE_SIZE;
    }

    isSolidTile(char) {
        return char === '#' || char === '[' || char === ']' || char === 'B' || char === 'P' || char === '?';
    }

    isSolid(x, y) {
        const c = Math.floor(x / CONFIG.TILE_SIZE);
        const r = Math.floor(y / CONFIG.TILE_SIZE);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        return this.isSolidTile(this.grid[r][c]);
    }

    draw(ctx, camX, camY) {
        const startCol = Math.max(0, Math.floor(camX / CONFIG.TILE_SIZE));
        const endCol = Math.min(this.cols, startCol + Math.ceil(CONFIG.WIDTH / CONFIG.TILE_SIZE) + 2);
        const startRow = Math.max(0, Math.floor(camY / CONFIG.TILE_SIZE));
        const endRow = Math.min(this.rows, startRow + Math.ceil(CONFIG.HEIGHT / CONFIG.TILE_SIZE) + 2);

        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const char = this.grid[r][c];
                let img = null;
                if (char === '#') img = assets.images['tile_grass_m'];
                else if (char === '[') img = assets.images['tile_grass_l'];
                else if (char === ']') img = assets.images['tile_grass_r'];
                else if (char === 'B') img = assets.images['tile_grass_block'];
                else if (char === 'P') img = assets.images['tile_block_planks'];
                else if (char === '?') img = assets.images['tile_block_coin'];
                else if (char === 'E') img = assets.images['tile_block_empty'];
                else if (char === '^') img = assets.images['tile_spikes'];
                
                const posX = c * CONFIG.TILE_SIZE;
                const posY = r * CONFIG.TILE_SIZE;

                if (img && img.complete && img.naturalWidth !== 0) {
                    ctx.drawImage(img, posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else if (img) {
                    ctx.fillStyle = char === '#' ? '#40d17a' : '#223044';
                    ctx.fillRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
        }
    }
}

class Particle {
    constructor(x, y, color, vx, vy, life) {
        this.x = x; this.y = y; this.color = color;
        this.vx = vx; this.vy = vy; this.life = life; this.maxLife = life;
        this.size = Math.random() * 5 + 3;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.15;
        this.life--;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class EnemySlime extends Entity {
    constructor(x, y) {
        super(x, y, 48, 36);
        this.startX = x;
        this.range = 160;
        this.speed = 1.2;
        this.facing = 1;
        this.animTimer = 0;
        this.animFrame = 0;
        this.dead = false;
    }
    update(tileMap) {
        if (this.dead) return;
        this.x += this.speed * this.facing;
        if (Math.abs(this.x - this.startX) > this.range || tileMap.isSolid(this.facing > 0 ? this.right : this.left, this.midY)) {
            this.facing *= -1;
        }
        this.animTimer++;
        if (this.animTimer > 15) {
            this.animFrame = (this.animFrame + 1) % 2;
            this.animTimer = 0;
        }
    }
    draw(ctx) {
        if (this.dead) return;
        const img = this.animFrame === 0 ? assets.images['slime_walk_a'] : assets.images['slime_walk_b'];
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(-this.facing, 1);
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -32, -32, 64, 64);
        } else {
            ctx.fillStyle = '#40d17a';
            ctx.fillRect(-24, -18, 48, 36);
        }
        ctx.restore();
    }
}

class EnemyBee extends Entity {
    constructor(x, y) {
        super(x, y, 44, 44);
        this.startX = x;
        this.startY = y;
        this.range = 200;
        this.speed = 1.5;
        this.facing = 1;
        this.animTimer = 0;
        this.animFrame = 0;
        this.dead = false;
        this.sineTimer = Math.random() * 10;
    }
    update() {
        if (this.dead) return;
        this.x += this.speed * this.facing;
        this.sineTimer += 0.04;
        this.y = this.startY + Math.sin(this.sineTimer) * 25;
        if (Math.abs(this.x - this.startX) > this.range) {
            this.facing *= -1;
        }
        this.animTimer++;
        if (this.animTimer > 10) {
            this.animFrame = (this.animFrame + 1) % 2;
            this.animTimer = 0;
        }
    }
    draw(ctx) {
        if (this.dead) return;
        const img = this.animFrame === 0 ? assets.images['bee_a'] : assets.images['bee_b'];
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(-this.facing, 1);
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -32, -32, 64, 64);
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-22, -22, 44, 44);
        }
        ctx.restore();
    }
}

// Player Physics
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 38, 56);
        this.speed = 2.5;
        this.jumpPower = -8.2;
        this.grounded = false;
        this.facing = 1;
        this.state = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this.health = 3;
        this.score = 0;
        this.gems = 0;
        this.invincible = 0;
    }

    update(tileMap, enemies, particles, collectibles, springs) {
        if (this.invincible > 0) this.invincible--;

        // Horizontal Movement
        let targetVx = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) { targetVx = -this.speed; this.facing = -1; }
        else if (keys['ArrowRight'] || keys['KeyD']) { targetVx = this.speed; this.facing = 1; }
        
        this.vx += (targetVx - this.vx) * 0.15;
        this.x += this.vx;
        this.handleCollision(tileMap, true);

        // Single-Press Jump Execution
        const isJumpRequested = justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space'];
        if (isJumpRequested && this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
            justPressed['ArrowUp'] = false;
            justPressed['KeyW'] = false;
            justPressed['Space'] = false;
            
            playSound('sfx_jump');
            for(let i = 0; i < 5; i++) {
                particles.push(new Particle(this.midX, this.bottom, '#ffffff', (Math.random()-0.5)*4, -Math.random()*2, 16));
            }
        }

        // Variable Jump Height
        if (this.vy < -2.0 && !(keys['ArrowUp'] || keys['KeyW'] || keys['Space'])) {
            this.vy += 0.35;
        }

        // Low Gravity Integration
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
        this.handleCollision(tileMap, false);

        // Spring Launch
        springs.forEach(s => {
            if (this.intersects(s)) {
                this.vy = -12.0;
                s.active = 12;
                playSound('sfx_spring');
                for(let i=0; i<8; i++) particles.push(new Particle(s.midX, s.top, '#3ea6ff', (Math.random()-0.5)*6, -Math.random()*4, 22));
            }
        });

        // Collectibles & Enemy Combat
        this.checkInteractions(tileMap, enemies, particles, collectibles);
        this.updateAnimation();

        // Pit Fall Death
        if (this.y > tileMap.height + 100) {
            this.die();
        }
    }

    handleCollision(tileMap, horizontal) {
        const steps = 4;
        if (horizontal) {
            for (let i = 0; i < steps; i++) {
                const yCheck = (this.y + 6) + ((this.h - 12) * i) / (steps - 1);
                if (this.vx > 0 && tileMap.isSolid(this.right, yCheck)) {
                    this.x = Math.floor(this.right / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.w;
                    this.vx = 0; break;
                } else if (this.vx < 0 && tileMap.isSolid(this.left, yCheck)) {
                    this.x = Math.ceil(this.left / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE;
                    this.vx = 0; break;
                }
            }
        } else {
            this.grounded = false;

            if (this.vy > 0) {
                for (let i = 0; i < steps; i++) {
                    const xCheck = (this.x + 4) + ((this.w - 8) * i) / (steps - 1);
                    if (tileMap.isSolid(xCheck, this.bottom)) {
                        this.y = Math.floor(this.bottom / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.h;
                        this.vy = 0;
                        this.grounded = true;
                        break;
                    }
                }
            } else if (this.vy < 0) {
                const leftCornerSolid = tileMap.isSolid(this.left + 6, this.top);
                const rightCornerSolid = tileMap.isSolid(this.right - 6, this.top);

                if (leftCornerSolid && !rightCornerSolid) {
                    this.x += 5;
                } else if (!leftCornerSolid && rightCornerSolid) {
                    this.x -= 5;
                } else if (leftCornerSolid && rightCornerSolid) {
                    const r = Math.floor(this.top / CONFIG.TILE_SIZE);
                    const c = Math.floor(this.midX / CONFIG.TILE_SIZE);
                    if (tileMap.grid[r] && tileMap.grid[r][c] === '?') {
                        tileMap.grid[r][c] = 'E';
                        this.score += 200;
                        playSound('sfx_coin');
                        for(let k=0; k<6; k++) particles.push(new Particle(c*CONFIG.TILE_SIZE+32, r*CONFIG.TILE_SIZE, '#ffd700', (Math.random()-0.5)*4, -Math.random()*4, 25));
                    }
                    this.y = Math.ceil(this.top / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE;
                    this.vy = 0;
                }
            }
        }
    }

    checkInteractions(tileMap, enemies, particles, collectibles) {
        const r = Math.floor(this.midY / CONFIG.TILE_SIZE);
        const c = Math.floor(this.midX / CONFIG.TILE_SIZE);
        if (r >= 0 && r < tileMap.rows && c >= 0 && c < tileMap.cols) {
            const tile = tileMap.grid[r][c];
            if (tile === '^') this.takeDamage();
        }

        for (let i = collectibles.length - 1; i >= 0; i--) {
            const item = collectibles[i];
            if (this.intersects(item)) {
                if (item.type === 'coin') {
                    this.score += 100;
                    playSound('sfx_coin');
                    for(let k=0; k<5; k++) particles.push(new Particle(item.midX, item.midY, '#ffd700', (Math.random()-0.5)*4, (Math.random()-0.5)*4, 20));
                } else if (item.type === 'gem') {
                    this.gems += 1;
                    this.score += 500;
                    playSound('sfx_gem');
                    for(let k=0; k<10; k++) particles.push(new Particle(item.midX, item.midY, '#00d2ff', (Math.random()-0.5)*6, (Math.random()-0.5)*6, 25));
                } else if (item.type === 'heart') {
                    this.health = Math.min(3, this.health + 1);
                    playSound('sfx_coin');
                    for(let k=0; k<8; k++) particles.push(new Particle(item.midX, item.midY, '#e85b5b', (Math.random()-0.5)*4, (Math.random()-0.5)*4, 20));
                } else if (item.type === 'flag') {
                    triggerVictory();
                    return;
                }
                collectibles.splice(i, 1);
            }
        }

        enemies.forEach(e => {
            if (e.dead) return;
            if (this.intersects(e)) {
                if (this.vy > 0 && this.bottom < e.top + 26) {
                    e.dead = true;
                    this.vy = -6;
                    this.score += 300;
                    playSound('sfx_kill');
                    const color = e instanceof EnemySlime ? '#40d17a' : '#ffd700';
                    for(let k=0; k<12; k++) particles.push(new Particle(e.midX, e.midY, color, (Math.random()-0.5)*7, (Math.random()-0.5)*7, 25));
                } else {
                    this.takeDamage();
                }
            }
        });
    }

    takeDamage() {
        if (this.invincible > 0) return;
        this.health--;
        this.invincible = 60;
        this.vy = -5;
        this.vx = this.facing * -3;
        playSound('sfx_hurt');
        updateHUD();
        if (this.health <= 0) this.die();
    }

    die() {
        if (gameState === 'GAMEOVER') return;
        gameState = 'GAMEOVER';
        playSound('sfx_hurt');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('touch-controls').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'block';
    }

    updateAnimation() {
        if (!this.grounded) this.state = 'jump';
        else if (Math.abs(this.vx) > 0.5) {
            this.state = 'walk';
            this.animTimer++;
            if (this.animTimer > 8) {
                this.animFrame = (this.animFrame + 1) % 2;
                this.animTimer = 0;
            }
        } else this.state = 'idle';
    }

    draw(ctx) {
        let img = assets.images['player_idle'];
        if (this.invincible > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
        
        if (this.state === 'walk') img = this.animFrame === 0 ? assets.images['player_walk_a'] : assets.images['player_walk_b'];
        else if (this.state === 'jump') img = assets.images['player_jump'];

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.scale(this.facing, 1);
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -32, -34, 64, 64);
        } else {
            ctx.fillStyle = '#3ea6ff';
            ctx.fillRect(-19, -28, 38, 56);
        }
        ctx.restore();
    }
}

// Level Design Data - 100 Tiles Wide
const LEVEL_1_MAP = [
    "                                                                                                    ",
    "                                                                                                    ",
    "                                                                                                    ",
    "                                                  C C C                                             ",
    "                                                [#######]                                           ",
    "                                    C G C                     C C C G C                             ",
    "                                  [#######]                 [###########]                           ",
    "             C ? C       C C                                              C G C                     ",
    "          [#########]  [#####]        S              S                  [#######]       F           ",
    "      P                      ^   [#########]      [#####]      ^                      [###]         ",
    "    [###]         S       [#####]            B B           [#######]       S        [#######]       ",
    "####################################################################################################",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
];

function initLevel() {
    const grid = LEVEL_1_MAP.map(r => r.split(''));
    tileMap = new TileMap(grid);
    enemies = [];
    particles = [];
    collectibles = [];
    decorObjects = [];
    springs = [];
    camera = new Camera();

    let startX = CONFIG.TILE_SIZE * 3;
    let startY = CONFIG.TILE_SIZE * 8;

    for (let r = 0; r < tileMap.rows; r++) {
        for (let c = 0; c < tileMap.cols; c++) {
            const tile = grid[r][c];
            const px = c * CONFIG.TILE_SIZE;
            const py = r * CONFIG.TILE_SIZE;

            if (tile === 'P') {
                startX = px; startY = py - 10;
                grid[r][c] = ' ';
            } else if (tile === 'S') {
                enemies.push(new EnemySlime(px, py + 28));
                grid[r][c] = ' ';
            } else if (tile === 'B') {
                enemies.push(new EnemyBee(px, py - 40));
                grid[r][c] = ' ';
            } else if (tile === 'C') {
                collectibles.push({ type: 'coin', x: px + 16, y: py + 16, w: 32, h: 32, left: px+16, right: px+48, top: py+16, bottom: py+48, midX: px+32, midY: py+32 });
                grid[r][c] = ' ';
            } else if (tile === 'G') {
                collectibles.push({ type: 'gem', x: px + 16, y: py + 16, w: 32, h: 32, left: px+16, right: px+48, top: py+16, bottom: py+48, midX: px+32, midY: py+32 });
                grid[r][c] = ' ';
            } else if (tile === 'F') {
                collectibles.push({ type: 'flag', x: px + 12, y: py - 32, w: 40, h: 96, left: px+12, right: px+52, top: py-32, bottom: py+64, midX: px+32, midY: py+16 });
                grid[r][c] = ' ';
            }
        }
    }

    springs.push({ x: CONFIG.TILE_SIZE * 26, y: CONFIG.TILE_SIZE * 9, w: 48, h: 48, left: CONFIG.TILE_SIZE*26, right: CONFIG.TILE_SIZE*26+48, top: CONFIG.TILE_SIZE*9, bottom: CONFIG.TILE_SIZE*9+48, midX: CONFIG.TILE_SIZE*26+24, active: 0 });
    springs.push({ x: CONFIG.TILE_SIZE * 62, y: CONFIG.TILE_SIZE * 9, w: 48, h: 48, left: CONFIG.TILE_SIZE*62, right: CONFIG.TILE_SIZE*62+48, top: CONFIG.TILE_SIZE*9, bottom: CONFIG.TILE_SIZE*9+48, midX: CONFIG.TILE_SIZE*62+24, active: 0 });

    decorObjects.push({ img: 'sign_right', x: CONFIG.TILE_SIZE * 4, y: CONFIG.TILE_SIZE * 10 });
    decorObjects.push({ img: 'bush', x: CONFIG.TILE_SIZE * 12, y: CONFIG.TILE_SIZE * 10 });
    decorObjects.push({ img: 'bush', x: CONFIG.TILE_SIZE * 45, y: CONFIG.TILE_SIZE * 10 });
    decorObjects.push({ img: 'sign_exit', x: CONFIG.TILE_SIZE * 90, y: CONFIG.TILE_SIZE * 10 });

    player = new Player(startX, startY);
    updateHUD();
}

function updateHUD() {
    const heartsContainer = document.getElementById('hearts-container');
    if (!heartsContainer) return;
    heartsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const img = document.createElement('img');
        img.className = 'hud-icon';
        img.src = CONFIG.ASSET_BASE + (i < player.health ? 'Sprites/Tiles/Default/heart.png' : 'Sprites/Tiles/Default/hud_heart_empty.png');
        heartsContainer.appendChild(img);
    }
    const scoreText = document.getElementById('score-text');
    const gemsText = document.getElementById('gems-text');
    if (scoreText) scoreText.innerText = player.score;
    if (gemsText) gemsText.innerText = player.gems;
}

function togglePause() {
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        document.getElementById('pause-menu').style.display = 'block';
    } else {
        gameState = 'PLAYING';
        document.getElementById('pause-menu').style.display = 'none';
    }
}

function triggerVictory() {
    if (gameState === 'VICTORY') return;
    gameState = 'VICTORY';
    playSound('sfx_victory');
    document.getElementById('final-score').innerText = player.score;
    document.getElementById('hud').style.display = 'none';
    document.getElementById('touch-controls').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'block';
    for (let i = 0; i < 60; i++) {
        particles.push(new Particle(player.midX, player.midY - 100, ['#3ea6ff', '#ffd700', '#40d17a', '#ff4757'][i%4], (Math.random()-0.5)*12, (Math.random()-0.5)*12, 60));
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
    gameState = 'PLAYING';
}

function gameLoop() {
    animTimerGlobal++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        player.update(tileMap, enemies, particles, collectibles, springs);
        enemies.forEach(e => e.update(tileMap));
        particles.forEach((p, i) => { p.update(); if (p.life <= 0) particles.splice(i, 1); });
        camera.follow(player, tileMap.width, tileMap.height);
        updateHUD();
    }

    // Parallax Background
    const layers = [
        { img: 'bg_sky', s: 0.05 },
        { img: 'bg_clouds', s: 0.15 },
        { img: 'bg_hills', s: 0.3 }
    ];
    layers.forEach(l => {
        const img = assets.images[l.img];
        if (img && img.complete && img.naturalWidth !== 0) {
            const offsetX = -(camera.x * l.s) % CONFIG.WIDTH;
            ctx.drawImage(img, offsetX, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
            ctx.drawImage(img, offsetX + CONFIG.WIDTH, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
    });

    // World Rendering Context (SINGLE Camera Matrix Translation)
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    decorObjects.forEach(d => {
        const img = assets.images[d.img];
        if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, d.x, d.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    });

    springs.forEach(s => {
        const img = s.active > 0 ? assets.images['tile_spring_out'] : assets.images['tile_spring'];
        if (s.active > 0) s.active--;
        if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, s.x, s.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    });

    if (tileMap) tileMap.draw(ctx, camera.x, camera.y);

    collectibles.forEach(item => {
        if (item.type === 'coin') {
            const bob = Math.sin(animTimerGlobal * 0.1) * 4;
            const img = (Math.floor(animTimerGlobal / 15) % 2 === 0) ? assets.images['coin'] : assets.images['coin_side'];
            if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, item.x, item.y + bob, 32, 32);
        } else if (item.type === 'gem') {
            const bob = Math.sin(animTimerGlobal * 0.12) * 5;
            const img = assets.images['gem'];
            if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, item.x, item.y + bob, 32, 32);
        } else if (item.type === 'flag') {
            const img = (Math.floor(animTimerGlobal / 20) % 2 === 0) ? assets.images['flag_a'] : assets.images['flag_b'];
            if (img && img.complete && img.naturalWidth !== 0) ctx.drawImage(img, item.x, item.y, 64, 64);
        }
    });

    enemies.forEach(e => e.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    if (player) player.draw(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Global Start Function
function startGameNow() {
    sfx.init();
    const mainMenu = document.getElementById('main-menu');
    const hud = document.getElementById('hud');
    if (mainMenu) mainMenu.style.display = 'none';
    if (hud) hud.style.display = 'flex';
    initLevel();
    gameState = 'PLAYING';
}

function bindEvents() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.onclick = startGameNow;

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
            sfx.muted = !sfx.muted;
            e.target.innerText = `🔊 Sound: ${sfx.muted ? 'OFF' : 'ON'}`;
        };
    }
}

initLevel();
setupTouchControls();
bindEvents();
gameLoop();
