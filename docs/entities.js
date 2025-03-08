import { levelThemes } from './levels.js';
import { gameState } from './core.js';

// Initialize player object
export const player = {
    x: 50,
    y: 300,
    width: 50,
    height: 50,
    speed: 5,
    jumpForce: 12,
    gravity: 0.6,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    canDoubleJump: false,
    facingRight: true,
    weapon: null,
    lastAttackTime: 0,
    attackCooldown: 500,
    canTripleJump: false,
    jumpsRemaining: 2,
    state: 'normal', // 'normal' or 'super' or 'flying'
    isInvulnerable: false,
    invulnerabilityTime: 2000,
    lastHitTime: 0,
    canFly: false,
    isFlying: false,
    flyingSpeed: -4 // Upward velocity when flying
};

// Camera system
export const camera = { x: 0, y: 0 };

// Brick system with texture patterns
export const brickTypes = {
    normal: {
        type: 'normal',
        hits: 1,
        baseColor: '#8B4513',
        patterns: ['solid', 'lined', 'brick']
    },
    hidden: {
        type: 'hidden',
        hits: 1,
        baseColor: 'rgba(139,69,19,0.3)',
        visible: false,
        patterns: ['solid'],
        dropType: 'random'
    },
    item: {
        type: 'item',
        hits: 1,
        baseColor: '#B86F3D',
        patterns: ['solid', 'lined', 'brick'],
        dropType: 'random'
    },
    weapon: {
        type: 'weapon',
        hits: 1,
        baseColor: '#C1946A',
        patterns: ['solid', 'lined', 'brick'],
        dropType: 'weapon'
    }
};

export const brickSystem = {
    bricks: [],
    bumpedBricks: new Set(),
    bumpAnimationDuration: 200, // milliseconds

    createBrick(x, y, type) {
        const brickConfig = brickTypes[type];
        const brick = {
            x,
            y,
            width: 40,
            height: 40,
            type,
            hitsLeft: brickConfig.hits,
            color: brickConfig.baseColor,
            visible: brickConfig.hasOwnProperty('visible') ? brickConfig.visible : true,
            originalY: y,
            bumpOffset: 0,
            bumpTime: 0,
            active: true,
            pattern: brickConfig.patterns[Math.floor(Math.random() * brickConfig.patterns.length)]
        };
        this.bricks.push(brick);
        return brick;
    },

    generatePattern(ctx, brick, pattern) {
        const baseColor = brick.color || brick.baseColor;
        switch (pattern) {
            case 'solid':
                return this.generateSolidPattern(ctx, baseColor);
            case 'lined':
                return this.generateLinedPattern(ctx, baseColor);
            case 'brick':
                return this.generateBrickPattern(ctx, baseColor);
            default:
                return baseColor;
        }
    },

    generateSolidPattern(ctx, baseColor) {
        const pattern = ctx.createLinearGradient(0, 0, 40, 40);
        const rgb = hexToRgb(baseColor);
        pattern.addColorStop(0, `rgba(${rgb},1)`);
        pattern.addColorStop(0.5, `rgba(${rgb},0.85)`);
        pattern.addColorStop(1, `rgba(${rgb},0.95)`);
        return pattern;
    },

    generateLinedPattern(ctx, baseColor) {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 40;
        patternCanvas.height = 40;
        const pctx = patternCanvas.getContext('2d');

        // Base color
        pctx.fillStyle = baseColor;
        pctx.fillRect(0, 0, 40, 40);

        // Draw horizontal lines
        const rgb = hexToRgb(baseColor);
        pctx.fillStyle = `rgba(${rgb},0.7)`;
        for(let y = 0; y < 40; y += 8) {
            pctx.fillRect(0, y, 40, 2);
        }

        return ctx.createPattern(patternCanvas, 'repeat');
    },

    generateBrickPattern(ctx, baseColor) {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 40;
        patternCanvas.height = 40;
        const pctx = patternCanvas.getContext('2d');

        // Base color
        pctx.fillStyle = baseColor;
        pctx.fillRect(0, 0, 40, 40);

        // Draw brick pattern
        const rgb = hexToRgb(baseColor);
        pctx.fillStyle = `rgba(${rgb},0.8)`;
        pctx.fillRect(5, 5, 30, 30);
        pctx.fillStyle = `rgba(${rgb},0.6)`;
        pctx.fillRect(8, 8, 24, 24);

        return ctx.createPattern(patternCanvas, 'repeat');
    },

    update(currentTime) {
        this.bricks.forEach(brick => {
            if (this.bumpedBricks.has(brick)) {
                const elapsed = currentTime - brick.bumpTime;
                if (elapsed < this.bumpAnimationDuration) {
                    // Sinusoidal animation for smooth bump effect
                    const progress = elapsed / this.bumpAnimationDuration;
                    brick.bumpOffset = -Math.sin(progress * Math.PI) * 10;
                } else {
                    brick.bumpOffset = 0;
                    this.bumpedBricks.delete(brick);
                }
            }
        });
    },

    bump(brick, currentTime) {
        if (!this.bumpedBricks.has(brick)) {
            brick.bumpTime = currentTime;
            this.bumpedBricks.add(brick);
            brick.hitsLeft--;

            // Handle brick type specific effects
            if (brick.type === 'hidden') {
                brick.visible = true;
                brick.color = brickTypes.normal.color;
            }

            // Handle drops for bricks
            if (brick.hitsLeft >= 0) {
                if (brick.type === 'weapon') {
                    this.createWeaponDrop(brick);
                } else if (brick.type === 'item') {
                    // Item bricks always drop power-ups
                    this.createItemDrop(brick);
                } else if (brick.type === 'hidden') {
                    // Hidden bricks have 50% chance for coin, 50% for power-up
                    if (Math.random() < 0.5) {
                        this.createCoinDrop(brick);
                    } else {
                        this.createItemDrop(brick);
                    }
                }
            }

            // Remove brick if no hits left
            if (brick.hitsLeft <= 0) {
                brick.active = false;
            }

            particleSystem.emit(
                brick.x + brick.width/2,
                brick.y + brick.height/2,
                'brick',
                5
            );
        }
    },

    createCoinDrop(brick) {
        const coin = {
            x: brick.x + brick.width/2,
            y: brick.y,
            width: 20,
            height: 20,
            collected: false,
            velocityX: (Math.random() > 0.5 ? 1 : -1) * 2, // Slower horizontal speed (than player's max 8)
            velocityY: -4, // Reduced initial upward velocity
            gravity: 0.5,
            friction: 0.98 // Less friction to maintain movement longer
        };
        gameState.coins.push(coin);
    },

    createItemDrop(brick) {
        // When breaking a hidden brick, favor wings power-up
        const type = brick.type === 'hidden' ?
            'wings' : // Hidden bricks always drop wings
            (Math.random() > 0.3 ? 'wings' : 'mushroom'); // Item bricks 70% wings, 30% mushroom
        
        gameState.powerups.push({
            x: brick.x,
            y: brick.y,  // Spawn at brick position
            width: 40,
            height: 40,
            collected: false,
            type: type,
            velocityX: (Math.random() > 0.5 ? 1 : -1) * 2, // Slower horizontal speed
            velocityY: -4, // Reduced initial upward velocity
            gravity: 0.5,
            friction: 0.98 // Less friction to maintain movement longer
        });
    },

    createWeaponDrop(brick) {
        // Create a chest-like object that drops from brick
        const chest = {
            x: brick.x,
            y: brick.y,
            width: 40,
            height: 40,
            collected: false,
            weapon: 'scatter', // Currently only one weapon type
            velocityX: (Math.random() > 0.5 ? 1 : -1) * 2, // Slower horizontal speed
            velocityY: -4, // Reduced initial upward velocity
            gravity: 0.5,
            friction: 0.98 // Less friction to maintain movement longer
        };
        gameState.chests.push(chest);
    },

    draw(ctx, camera) {
        this.bricks.forEach(brick => {
            if (brick.active && (brick.visible || brick.type !== 'hidden')) {
                // Apply texture pattern
                ctx.save();
                ctx.translate(brick.x - camera.x, brick.y + brick.bumpOffset);
                
                // Draw with pattern
                ctx.fillStyle = this.generatePattern(ctx, brick, brick.pattern);
                ctx.fillRect(0, 0, brick.width, brick.height);

                // Add shine effect
                const shine = ctx.createLinearGradient(0, 0, 0, brick.height);
                shine.addColorStop(0, 'rgba(255,255,255,0.2)');
                shine.addColorStop(0.5, 'rgba(255,255,255,0)');
                shine.addColorStop(1, 'rgba(0,0,0,0.1)');
                ctx.fillStyle = shine;
                ctx.fillRect(0, 0, brick.width, brick.height);

                // Draw outline
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, brick.width, brick.height);
                
                ctx.restore();
            }
        });
    }
};

// Weapon and projectile system
export const weaponTypes = {
    scatter: {
        name: "Scatter Gun",
        projectiles: 5,
        spread: 45,
        speed: 10,
        cooldown: 500,
        sprite: "coin"
    },
    enemyGun: {
        name: "Enemy Gun",
        projectiles: 1,
        spread: 10,
        speed: 6,
        cooldown: 2000,
        sprite: "coin"
    }
};

export const projectileSystem = {
    projectiles: [],
    
    createProjectile(x, y, angle, speed, isEnemy = false) {
        this.projectiles.push({
            x,
            y,
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed,
            size: isEnemy ? 8 : 5, // Larger size for enemy projectiles
            active: true,
            isEnemy: isEnemy,
            color: isEnemy ? '#FF4444' : '#FFD700'
        });
    },
    
    update() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.velocityX;
            p.y += p.velocityY;
            
            if (p.isEnemy) {
                // Enemy projectiles check collision with player
                if (p.active && checkCollision(
                    {x: p.x - p.size, y: p.y - p.size, width: p.size * 2, height: p.size * 2},
                    player
                )) {
                    p.active = false;
                    if (!player.isInvulnerable) {
                        if (window.handlePlayerHit()) {
                            window.resetLevel();
                        }
                    }
                }
            } else {
                // Player projectiles check collision with enemies
                gameState.enemies.forEach(enemy => {
                    if (p.active && checkCollision(
                        {x: p.x - p.size, y: p.y - p.size, width: p.size * 2, height: p.size * 2},
                        enemy
                    )) {
                        p.active = false;
                        const index = gameState.enemies.indexOf(enemy);
                        if (index !== -1) {
                            gameState.enemies.splice(index, 1);
                            gameState.score += enemy.isArmed ? 200 : 100;
                            particleSystem.emit(
                                enemy.x + enemy.width/2,
                                enemy.y + enemy.height/2,
                                'enemy',
                                20
                            );
                            window.checkLevelCompletion();
                        }
                    }
                });
            }
            
            // Remove projectiles that are off screen or hit something
            if (!p.active || p.x < 0 || p.x > gameState.levelWidth || p.y < 0 || p.y > 600) {
                this.projectiles.splice(i, 1);
            }
        }
    },
    
    draw(ctx, camera) {
        ctx.save();
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add trail effect
            const trailColor = p.isEnemy ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 215, 0, 0.3)';
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x - camera.x, p.y);
            ctx.lineTo(p.x - camera.x - p.velocityX * 2, p.y - p.velocityY * 2);
            ctx.stroke();
        });
        ctx.restore();
    }
};

// Screen flash system
export const screenFlash = {
    active: false,
    duration: 1000,
    startTime: 0,
    color: 'rgba(255, 0, 0, 0.3)'
};

// Particle system
export const particleSystem = {
    particles: [],
    
    createParticle(x, y, type) {
        const particle = {
            x, y,
            size: type === 'jump' ? 5 : 3,
            speedX: (Math.random() - 0.5) * 6,
            speedY: type === 'jump' ? -Math.random() * 4 - 2 : (Math.random() - 0.5) * 6,
            life: 30,
            alpha: 1,
            color: type === 'jump' ? '#ffffff' :
                   type === 'attack' ? '#ff0000' :
                   type === 'brick' ? '#8B4513' :
                   type === 'collect' ? '#ffd700' :
                   type === 'wings' ? '#87CEEB' : '#ffffff'
        };
        this.particles.push(particle);
    },
    
    emit(x, y, type, count) {
        for (let i = 0; i < count; i++) {
            this.createParticle(x, y, type);
        }
    },
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.speedY += 0.1;
            p.life--;
            p.alpha = p.life / 30;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },
    
    draw(ctx, camera) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(${hexToRgb(p.color)},${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
};

export function handlePlayerCollision(enemy) {
    if (!checkCollision(player, enemy)) return;

    const playerBottom = player.y + player.height;
    const enemyTop = enemy.y;
    if (playerBottom - enemyTop < 20 && player.velocityY > 0) {
        // Find all overlapping enemies
        const overlappingEnemies = gameState.enemies.filter(otherEnemy =>
            !gameState.enemiesHit.has(otherEnemy) &&
            Math.abs(otherEnemy.y - enemy.y) < 10 &&
            checkCollision(player, otherEnemy)
        );
        
        // Handle all overlapping enemies
        overlappingEnemies.forEach(hitEnemy => {
            gameState.enemiesHit.add(hitEnemy);
            const index = gameState.enemies.indexOf(hitEnemy);
            if (index !== -1) {
                gameState.enemies.splice(index, 1);
                let score = hitEnemy.type === 'platform' ?
                    (hitEnemy.isArmed ? 250 : 150) :
                    (hitEnemy.isArmed ? 200 : 100);
                gameState.score += score;
                
                addEffect(hitEnemy.x + hitEnemy.width/2, hitEnemy.y, 'enemy', `+${score}`);
                particleSystem.emit(
                    hitEnemy.x + hitEnemy.width/2,
                    hitEnemy.y + hitEnemy.height/2,
                    'enemy',
                    hitEnemy.type === 'platform' ? 25 : 20
                );
            }
        });
        
        // Apply bounce based on enemy type
        const hitPlatformFox = overlappingEnemies.some(e => e.type === 'platform');
        player.velocityY = -player.jumpForce * (hitPlatformFox ? 1.2 : 1);
        
        checkLevelCompletion();
    } else if (!player.isInvulnerable) {
        if (window.handlePlayerHit()) {
            window.resetLevel();
        }
    }
}

// Attack animation system
export const attackAnimations = {
    animations: [],
    
    createSlash(x, y, facingRight) {
        const slash = {
            x, y,
            width: 60,
            height: 40,
            frame: 0,
            maxFrames: 5,
            facingRight,
            alpha: 1
        };
        this.animations.push(slash);
    },
    
    update() {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.frame++;
            anim.alpha = 1 - (anim.frame / anim.maxFrames);
            
            if (anim.frame >= anim.maxFrames) {
                this.animations.splice(i, 1);
            }
        }
    },
    
    draw(ctx, camera) {
        ctx.save();
        this.animations.forEach(slash => {
            const gradient = ctx.createLinearGradient(
                slash.x - camera.x,
                slash.y,
                slash.x - camera.x + (slash.facingRight ? slash.width : -slash.width),
                slash.y
            );
            
            gradient.addColorStop(0, `rgba(255,255,255,${slash.alpha})`);
            gradient.addColorStop(0.5, `rgba(255,200,0,${slash.alpha})`);
            gradient.addColorStop(1, `rgba(255,0,0,${slash.alpha})`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(
                slash.x - camera.x + (slash.facingRight ? slash.width/2 : -slash.width/2),
                slash.y + slash.height/2,
                slash.width/2,
                slash.height/2,
                slash.facingRight ? -0.5 : 0.5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
        ctx.restore();
    }
};

// Background layers system
export const backgroundLayers = {
    farBg: {
        elements: [
            {
                type: 'mountains',
                points: [[0,200], [100,150], [200,180], [300,140], [400,170], [500,130]],
                color: '#1a2742',
                scrollSpeed: 0.1
            }
        ]
    },
    midBg: {
        elements: [
            {
                type: 'clouds',
                positions: [
                    {x: 100, y: 100, size: 40},
                    {x: 300, y: 150, size: 60},
                    {x: 600, y: 80, size: 50}
                ],
                color: 'rgba(255,255,255,0.4)',
                scrollSpeed: 0.3
            }
        ]
    },
    nearBg: {
        elements: [
            {
                type: 'trees',
                positions: [
                    {x: 200, y: 550, size: 80},
                    {x: 500, y: 550, size: 70},
                    {x: 800, y: 550, size: 90}
                ],
                color: '#2d4b1c',
                scrollSpeed: 0.6
            }
        ]
    }
};

// Collision detection
export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function getPlatformCollision(player, platform) {
    if (!checkCollision(player, platform)) return null;

    const playerBottom = player.y + player.height;
    const playerTop = player.y;
    const platformTop = platform.y;
    const platformBottom = platform.y + platform.height;
    
    if (playerBottom - platformTop < player.height/2 && player.velocityY >= 0) {
        return 'bottom';
    }
    
    if (platformBottom - playerTop < player.height/2 && player.velocityY < 0) {
        return 'top';
    }
    
    return null;
}

// Utility function
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : 
        '255,255,255';
}

// Background rendering functions
export function drawMountains(ctx, mountains, scrollOffset) {
    ctx.beginPath();
    ctx.moveTo(mountains.points[0][0] - scrollOffset, ctx.canvas.height);
    mountains.points.forEach(point => {
        ctx.lineTo(point[0] - scrollOffset, point[1]);
    });
    ctx.lineTo(mountains.points[mountains.points.length-1][0] - scrollOffset, ctx.canvas.height);
    ctx.fillStyle = mountains.color;
    ctx.fill();
}

export function drawCloud(ctx, x, y, size, color) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size*0.6, y - size*0.1, size*0.7, 0, Math.PI * 2);
    ctx.arc(x - size*0.6, y - size*0.1, size*0.7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

export function drawTree(ctx, x, y, size, color) {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(x - size/8, y - size/2, size/4, size/2);
    
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size/2, y - size/2);
    ctx.lineTo(x - size/2, y - size/2);
    ctx.fillStyle = color;
    ctx.fill();
}
