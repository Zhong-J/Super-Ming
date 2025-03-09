import {
    levelThemes, createBackground, createPlatforms,
    createCoins, createEnemies, createPowerups,
    levelBricks
} from './levels.js';

import {
    player, camera, weaponTypes, screenFlash, particleSystem,
    backgroundLayers, checkCollision, getPlatformCollision, 
    hexToRgb, drawMountains, drawCloud, drawTree, projectileSystem, 
    brickSystem, brickTypes
} from './entities.js';

// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 600;

// Initialize loading message
const loadingMessage = document.createElement('div');
loadingMessage.className = 'loading-message';
loadingMessage.innerHTML = 'Loading game assets...';
document.body.appendChild(loadingMessage);

// Image loading system
const images = {
    player: new Image(),
    coin: new Image(),
    fox: new Image()
};

const imageSources = {
    player: 'images/player.png',
    coin: 'images/coin.png',
    fox: 'images/fox.png'
};

let loadedImages = 0;
const totalImages = Object.keys(images).length;
let gameStarted = false;

// Game state
export const gameState = {
    coinCount: 0,
    score: 0,
    platforms: [],
    coins: [],
    enemies: [],
    effects: [],
    powerups: [],
    chests: [], // Keep for weapons dropped from bricks
    enemiesHit: new Set(), // Track enemies hit in the same frame
    level: 1,
    maxLevel: 3,
    levelWidth: 3600,
    objective: '',
    requireCoins: 0,
    requireEnemies: 0,
    lastLevelMessage: null,
    deathCount: 0,
    startTime: Date.now()
};

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowUpHandled: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        if (e.code === 'ArrowUp' && !keys.ArrowUpHandled) {
            keys[e.code] = true;
        } else if (e.code !== 'ArrowUp') {
            keys[e.code] = true;
        }
    }
    if (e.code === 'KeyH') {
        const instructions = document.querySelector('.instructions');
        instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
    } else if (e.code === 'KeyL') {
        if (gameState.lastLevelMessage) {
            gameState.lastLevelMessage.style.display = 
                gameState.lastLevelMessage.style.display === 'none' ? 'block' : 'none';
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
        if (e.code === 'ArrowUp') {
            keys.ArrowUpHandled = false;
        }
    }
});

// Image loading functions
function retryLoadImages() {
    loadedImages = 0;
    loadingMessage.innerHTML = 'Retrying to load game assets...';
    loadingMessage.style.color = 'white';
    
    Object.entries(imageSources).forEach(([name, src]) => {
        images[name].onload = handleImageLoad;
        images[name].onerror = () => handleImageError(name);
        images[name].src = src + '?t=' + new Date().getTime();
    });
}

function handleImageLoad() {
    loadedImages++;
    loadingMessage.innerHTML = `Loading game assets... ${Math.floor((loadedImages / totalImages) * 100)}%`;
    
    if (loadedImages === totalImages) {
        loadingMessage.remove();
        startGame();
    }
}

function handleImageError(imageName) {
    loadingMessage.innerHTML = `
        Error loading ${imageName}.<br>
        Please check if the image exists in the images folder.<br><br>
        <button onclick="retryLoadImages()" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        ">Retry Loading</button>
    `;
    loadingMessage.style.color = 'red';
}

// Start loading images
Object.entries(imageSources).forEach(([name, src]) => {
    images[name].onload = handleImageLoad;
    images[name].onerror = () => handleImageError(name);
    images[name].src = src;
});

// Define core game functions globally first
window.resetLevel = function() {
    screenFlash.active = true;
    screenFlash.startTime = Date.now();
    player.x = 50;
    player.y = 300;
    player.velocityX = 0;
    player.velocityY = 0;
    player.weapon = null;
    player.isInvulnerable = true; // Make player temporarily invulnerable after respawn
    player.lastHitTime = Date.now();
    camera.x = 0;
    
    // Reset score and increment death count
    gameState.score = 0;
    gameState.deathCount++;
    
    // Reset flying and power-up states on death
    player.canFly = false;
    player.isFlying = false;
    player.state = 'normal';
    player.width = 50;
    player.height = 50;
    
    // First reset platforms and bricks
    gameState.platforms = createPlatforms(gameState.level, gameState.levelWidth);
    brickSystem.bricks = [];
    levelBricks[gameState.level].forEach(brickConfig => {
        brickSystem.createBrick(brickConfig.x, brickConfig.y, brickConfig.type);
    });
    
    // Then reset entities that depend on platforms
    gameState.enemies = createEnemies(gameState.level, gameState.platforms, gameState.levelWidth);
    gameState.coins = createCoins(gameState.level);
    gameState.powerups = createPowerups(gameState.level);
    gameState.chests = []; // Reset weapon drops array
    gameState.coinCount = 0;
    
    document.getElementById('coinCount').textContent = 0;
}

window.checkLevelCompletion = function() {
    const coinsCollected = gameState.coins.filter(coin => coin.collected).length;
    const enemiesDefeated = levelThemes[gameState.level].requireEnemies - gameState.enemies.length;
    
    if (coinsCollected >= gameState.requireCoins && enemiesDefeated >= gameState.requireEnemies) {
        if (gameState.level < gameState.maxLevel) {
            nextLevel();
        } else {
            showVictoryScreen();
        }
    }
}

// Game mechanics
function handleAttack() {
    if (!player.weapon) return;
    
    const now = Date.now();
    if (now - player.lastAttackTime < player.attackCooldown) return;

    const weapon = weaponTypes[player.weapon];
    const baseAngle = player.facingRight ? 0 : Math.PI;
    const halfSpread = (weapon.spread * Math.PI) / 180 / 2;
    
    for (let i = 0; i < weapon.projectiles; i++) {
        const angle = baseAngle + (Math.random() * weapon.spread - weapon.spread/2) * Math.PI / 180;
        projectileSystem.createProjectile(
            player.x + player.width/2,
            player.y + player.height/2,
            angle,
            weapon.speed,
            false // isEnemy = false
        );
    }
    
    particleSystem.emit(
        player.x + (player.facingRight ? player.width + 30 : -30),
        player.y + player.height/2,
        'attack',
        15
    );
    
    player.lastAttackTime = now;
}

function updateCamera() {
    const targetX = player.x - canvas.width / 3;
    camera.x += (targetX - camera.x) * 0.1;
    camera.x = Math.max(0, Math.min(camera.x, gameState.levelWidth - canvas.width));
}

function updatePlayer() {
    const maxSpeed = 8;
    if (keys.ArrowLeft) {
        player.velocityX = Math.max(player.velocityX - 1, -maxSpeed);
        player.facingRight = false;
    } else if (keys.ArrowRight) {
        player.velocityX = Math.min(player.velocityX + 1, maxSpeed);
        player.facingRight = true;
    } else {
        player.velocityX *= 0.8;
    }

    if (keys.Space) {
        handleAttack();
    }

    player.x += player.velocityX;
    
    // Flying mechanics
    if (player.canFly && keys.ArrowUp) {
        player.isFlying = true;
        player.velocityY = player.flyingSpeed;
        
        // Prevent flying too high (80px from top of screen)
        if (player.y < 80) {
            player.y = 80;
            player.velocityY = 0;
        }
        
        // Create flying particles
        if (Math.random() < 0.3) {
            particleSystem.emit(
                player.x + player.width/2,
                player.y + player.height,
                'wings',
                1
            );
        }
    } else if (!keys.ArrowUp) {
        player.isFlying = false;
    }
    
    // Normal gravity if not flying
    if (!player.isFlying) {
        player.velocityY = Math.min(player.velocityY + player.gravity, 12);
    }
    
    // Normal jump mechanics when not flying
    if (keys.ArrowUp && !keys.ArrowUpHandled && !player.isFlying) {
        if (!player.isJumping) {
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
            player.jumpsRemaining = 2;
            keys.ArrowUpHandled = true;
            particleSystem.emit(
                player.x + player.width/2,
                player.y + player.height,
                'jump',
                10
            );
        } else if (player.jumpsRemaining > 0) {
            player.velocityY = -player.jumpForce * 0.85;
            player.jumpsRemaining--;
            keys.ArrowUpHandled = true;
        }
    }

    player.y += player.velocityY;

    let onGround = false;
    
    // Check platform collisions
    for (const platform of gameState.platforms) {
        const collision = getPlatformCollision(player, platform);
        if (collision === 'bottom') {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            onGround = true;
            break;
        } else if (collision === 'top') {
            player.y = platform.y + platform.height;
            player.velocityY = 0;
            break;
        }
    }

    // Check brick collisions
    for (const brick of brickSystem.bricks) {
        if (brick.active) {
            const collision = getPlatformCollision(player, brick);
            if (collision === 'bottom') {
                player.y = brick.y - player.height;
                player.velocityY = 0;
                onGround = true;
                break;
            } else if (collision === 'top') {
                player.y = brick.y + brick.height;
                player.velocityY = 0;
                // Brick hit from below
                brickSystem.bump(brick, Date.now());
                break;
            }
        }
    }

    player.isJumping = !onGround;
    if (onGround) {
        player.jumpsRemaining = 2;
        player.isJumping = false;
    }

    player.x = Math.max(0, Math.min(player.x, gameState.levelWidth - player.width));
    
    // Handle falling off screen
    if (player.y > canvas.height) {
        if (player.state === 'super') {
            // If super, teleport back to last safe position instead of dying
            player.y = canvas.height - 100;
            player.velocityY = 0;
            if (handlePlayerHit()) {
                resetLevel();
            }
        } else {
            resetLevel();
        }
    }

    updateCamera();
}

function updateEnemies() {
    gameState.enemies.forEach(enemy => {
    if (enemy.type === 'platform') {
            // 严格固定在平台上
            enemy.y = enemy.platformY; // 使用保存的平台Y坐标
            handlePlatformFoxBehavior(enemy);
        } else if (enemy.type === 'ground') {
            // 地面狐狸进行物理模拟
            enemy.velocityY += enemy.gravity;
            enemy.y += enemy.velocityY;
            
            // 地面碰撞检测
            let onSurface = handleEnemyCollisions(enemy);
            if (onSurface) {
                handleGroundFoxBehavior(enemy);
            }
        }
        
        // 武器攻击处理
        if (enemy.isArmed) {
            handleEnemyAttack(enemy);
        }

        // 检查与玩家的碰撞
        handlePlayerCollision(enemy);
    });
}

function handleEnemyCollisions(enemy) {
    // 平台狐狸不需要碰撞检测
    if (enemy.type === 'platform') {
        return true; // 总是返回true，表示在平台上
    }

    let onSurface = false;
    
    // 地面碰撞（仅适用于地面狐狸）
    if (enemy.y + enemy.height > 550) {
        enemy.y = 550 - enemy.height;
        enemy.velocityY = 0;
        onSurface = true;
    }

    // 平台碰撞（仅适用于地面狐狸）
    if (!onSurface) {
        for (const platform of [...gameState.platforms, ...brickSystem.bricks]) {
            if (platform.active && checkCollision(enemy, platform)) {
                const enemyBottom = enemy.y + enemy.height;
                const platformTop = platform.y;
                if (enemyBottom - platformTop < 20 && enemy.velocityY >= 0) {
                    enemy.y = platform.y - enemy.height;
                    enemy.velocityY = 0;
                    onSurface = true;
                    break;
                }
            }
        }
    }
    
    return onSurface;
}

function handleGroundFoxBehavior(enemy) {
    // 检查是否需要追击玩家
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceToPlayer < enemy.chaseRange) {
        enemy.isChasing = true;
        // 根据玩家位置调整方向和速度
        enemy.direction = dx > 0 ? 1 : -1;
        enemy.x += enemy.speed * 1.5 * enemy.direction; // 追击时速度提升
    } else {
        enemy.isChasing = false;
        // 正常巡逻
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x <= enemy.patrolStart || enemy.x + enemy.width >= enemy.patrolEnd) {
            enemy.direction *= -1;
        }
    }
}

function handlePlatformFoxBehavior(enemy) {
    // 计算下一个位置
    const nextX = enemy.x + enemy.speed * enemy.direction;

    // 检查是否会超出平台边界（使用平台的位置作为边界）
    const platformEdge = enemy.direction > 0 ?
        nextX + enemy.width + enemy.edgeDetectionRange >= enemy.patrolEnd :
        nextX - enemy.edgeDetectionRange <= enemy.patrolStart;

    if (platformEdge) {
        enemy.direction *= -1; // 改变方向
        // 转向动画效果
        particleSystem.emit(
            enemy.x + enemy.width/2,
            enemy.y + enemy.height,
            'enemy',
            3
        );
    } else {
        // 只有在不会超出边界时才更新位置
        enemy.x += enemy.speed * enemy.direction;
    }
    
    // 确保狐狸保持在平台上的固定高度
    enemy.y = enemy.platformY;
}

function handleEnemyAttack(enemy) {
    const now = Date.now();
    if (now - enemy.lastAttackTime >= enemy.attackCooldown) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const inRange = Math.abs(dx) < 400 && Math.abs(dy) < 200;
        
        if (inRange) {
            // 攻击预警效果
            particleSystem.emit(
                enemy.x + enemy.width/2,
                enemy.y + enemy.height/2,
                'attack',
                5
            );
            
            // Store shot info before timeout
            const shotInfo = {
                x: enemy.x + enemy.width/2,
                y: enemy.y + enemy.height/2,
                angle: Math.atan2(dy, dx),
                weapon: enemy.weapon
            };
            
            // 延迟发射子弹，给玩家反应时间
            setTimeout(() => {
                // Check if enemy still exists in game state
                if (gameState.enemies.includes(enemy) && enemy.isArmed) {
                    const weapon = weaponTypes[shotInfo.weapon];
                    projectileSystem.createProjectile(
                        shotInfo.x,
                        shotInfo.y,
                        shotInfo.angle + (Math.random() - 0.5) * (weapon.spread * Math.PI / 180),
                        weapon.speed,
                        true
                    );
                }
            }, 500);
            
            // 添加攻击动画效果
            addEffect(
                enemy.x + enemy.width/2,
                enemy.y,
                'enemy',
                '🔫'
            );
            
            enemy.lastAttackTime = now;
        }
    }
}

function handlePlayerCollision(enemy) {
    if (!checkCollision(player, enemy)) return;

    const playerBottom = player.y + player.height;
    const enemyTop = enemy.y;
    
    // Find all overlapping enemies at this position
    const overlappingEnemies = gameState.enemies.filter(otherEnemy =>
        Math.abs(otherEnemy.y - enemy.y) < 10 && // Similar height
        Math.abs(otherEnemy.x - enemy.x) < enemy.width && // Similar x position
        !gameState.enemiesHit.has(otherEnemy) // Not already processed
    );
    
    if (playerBottom - enemyTop < 20 && player.velocityY > 0) {
        // Player is jumping on enemies from above
        overlappingEnemies.forEach(hitEnemy => {
            if (!gameState.enemiesHit.has(hitEnemy)) {
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
            }
        });
        
        // Apply bounce based on enemy type
        const hitPlatformFox = overlappingEnemies.some(e => e.type === 'platform');
        player.velocityY = -player.jumpForce * (hitPlatformFox ? 1.2 : 1);
        
        checkLevelCompletion();
    } else if (!player.isInvulnerable) {
        // Any overlapping enemies can hurt the player
        if (window.handlePlayerHit()) {
            resetLevel();
        }
    }
}

// Drawing functions
function drawBackground() {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    backgroundLayers.farBg.elements.forEach(element => {
        if (element.type === 'mountains') {
            const scrollOffset = camera.x * element.scrollSpeed;
            for (let i = -1; i < canvas.width / 800 + 2; i++) {
                drawMountains(ctx, element, scrollOffset - i * 800);
            }
        }
    });
    
    backgroundLayers.midBg.elements.forEach(element => {
        if (element.type === 'clouds') {
            element.positions.forEach(cloud => {
                const scrollOffset = camera.x * element.scrollSpeed;
                const x = ((cloud.x - scrollOffset) % canvas.width + canvas.width) % canvas.width;
                drawCloud(ctx, x, cloud.y, cloud.size, element.color);
            });
        }
    });
    
    backgroundLayers.nearBg.elements.forEach(element => {
        if (element.type === 'trees') {
            element.positions.forEach(tree => {
                const scrollOffset = camera.x * element.scrollSpeed;
                const x = ((tree.x - scrollOffset) % 1200 + 1200) % 1200;
                drawTree(ctx, x, tree.y, tree.size, element.color);
            });
        }
    });
}

function drawPlatforms() {
    const theme = levelThemes[gameState.level];
    ctx.fillStyle = theme.platformColor;
    gameState.platforms.forEach(platform => {
        ctx.fillRect(platform.x - camera.x, platform.y, platform.width, platform.height);
    });
    
    // Draw bricks
    brickSystem.draw(ctx, camera);
}

function drawPlayer() {
    ctx.save();
    
    // Flash effect during invulnerability - more pronounced flash when hit
    if (player.isInvulnerable) {
        const timeSinceHit = Date.now() - player.lastHitTime;
        if (timeSinceHit < 500) {
            // Strong flash in the first 500ms (when just hit)
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 50) * 0.7;
        } else {
            // Normal invulnerability flash
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
        }
    }

    if (player.facingRight) {
        ctx.drawImage(images.player, 
                     player.x - camera.x, 
                     player.y, 
                     player.width, 
                     player.height);
    } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(images.player, 
                     -(player.x - camera.x + player.width), 
                     player.y, 
                     player.width, 
                     player.height);
        ctx.restore();
    }
    
    if (player.weapon) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${weaponTypes[player.weapon].name} equipped`, 
                    player.x - camera.x + player.width/2, 
                    player.y - 20);
        
        const cooldownProgress = Math.min(1, (Date.now() - player.lastAttackTime) / player.attackCooldown);
        if (cooldownProgress < 1) {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(player.x - camera.x, player.y - 15, player.width * cooldownProgress, 3);
        }
    }
    
    ctx.restore();
}

function drawChests() {
    const theme = levelThemes[gameState.level];
    const bobAmount = Math.sin(Date.now() / 200) * 5;
    
    gameState.chests.forEach(chest => {
        if (!chest.collected) {
            // Only bob if not moving
            const chestY = chest.y + (!chest.hasOwnProperty('velocityY') ? bobAmount : 0);
            
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = theme.effectColors.chest;
            ctx.beginPath();
            ctx.arc(chest.x - camera.x + chest.width/2,
                   chestY + chest.height/2,
                   chest.width/1.5 + 5,
                   0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            ctx.save();
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚔️',
                        chest.x - camera.x + chest.width/2,
                        chestY + chest.height/1.2);
            ctx.font = '12px Arial';
            ctx.fillStyle = theme.coinText;
            ctx.fillText(`${weaponTypes[chest.weapon].name}`,
                        chest.x - camera.x + chest.width/2,
                        chestY - 10);
            ctx.restore();
        }
    });
}

function drawPowerups() {
    const theme = levelThemes[gameState.level];
    const bobAmount = Math.sin(Date.now() / 200) * 5;
    const glowAmount = Math.abs(Math.sin(Date.now() / 500));
    
    gameState.powerups.forEach(powerup => {
        if (!powerup.collected) {
            // Only bob if not moving
            const powerupY = powerup.y + (!powerup.hasOwnProperty('velocityY') ? bobAmount : 0);
            
            ctx.save();
            ctx.globalAlpha = 0.3 * glowAmount;
            ctx.fillStyle = theme.effectColors.powerup;
            ctx.beginPath();
            ctx.arc(powerup.x - camera.x + powerup.width/2,
                   powerupY + powerup.height/2,
                   powerup.width/1.5 + 5 * glowAmount,
                   0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            ctx.save();
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            
            // Use different emoji and text based on power-up type
            const powerupEmoji = powerup.type === 'wings' ? '👼' : '🍄';
            const powerupText = powerup.type === 'wings' ? 'Wings!' : 'Super Size!';
            
            ctx.fillText(powerupEmoji,
                        powerup.x - camera.x + powerup.width/2,
                        powerupY + powerup.height/1.2);
            ctx.font = '12px Arial';
            ctx.fillStyle = theme.coinText;
            ctx.fillText(powerupText,
                        powerup.x - camera.x + powerup.width/2,
                        powerupY - 10);
            ctx.restore();
        }
    });
}

function drawCoins() {
    const theme = levelThemes[gameState.level];
    const bobAmount = Math.sin(Date.now() / 200) * 5;
    const glowAmount = Math.abs(Math.sin(Date.now() / 500));
    
    gameState.coins.forEach(coin => {
        if (!coin.collected) {
            const coinY = coin.y + bobAmount;
            
            ctx.save();
            ctx.globalAlpha = 0.3 * glowAmount;
            ctx.fillStyle = theme.coinGlow;
            ctx.beginPath();
            ctx.arc(coin.x - camera.x + coin.width/2, 
                   coinY + coin.height/2, 
                   coin.width/1.5 + 5 * glowAmount, 
                   0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            ctx.drawImage(images.coin, 
                coin.x - camera.x, 
                coinY, 
                coin.width, 
                coin.height
            );
            
            ctx.save();
            ctx.font = '12px Arial';
            ctx.fillStyle = theme.coinText;
            ctx.textAlign = 'center';
            ctx.fillText('💰 Collect!', 
                        coin.x - camera.x + coin.width/2, 
                        coinY - 10);
            ctx.restore();
        }
    });
}

function drawEnemies() {
    const theme = levelThemes[gameState.level];
    gameState.enemies.forEach(enemy => {
        ctx.save();
        
        // 绘制巡逻路径
        if (enemy.type === 'platform') {
            ctx.strokeStyle = `rgba(${hexToRgb(theme.enemyWarning)},${0.5 + Math.sin(Date.now() / 200) * 0.2})`;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(enemy.patrolStart - camera.x, enemy.platform.y);
            ctx.lineTo(enemy.patrolEnd - camera.x, enemy.platform.y);
            ctx.stroke();
        }
        
        // 追击状态特效
        if (enemy.type === 'ground' && enemy.isChasing) {
            ctx.shadowColor = theme.enemyWarning;
            ctx.shadowBlur = 10;
            
            // 追击警告线
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const angle = Math.atan2(dy, dx);
            ctx.strokeStyle = `rgba(${hexToRgb(theme.enemyWarning)},0.3)`;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(enemy.x - camera.x + enemy.width/2, enemy.y + enemy.height/2);
            ctx.lineTo(
                enemy.x - camera.x + enemy.width/2 + Math.cos(angle) * 100,
                enemy.y + enemy.height/2 + Math.sin(angle) * 100
            );
            ctx.stroke();
        }
        
        // 绘制狐狸主体（根据方向翻转）
        if (enemy.direction > 0) {
            ctx.drawImage(images.fox,
                enemy.x - camera.x,
                enemy.y,
                enemy.width,
                enemy.height
            );
        } else {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(images.fox,
                -(enemy.x - camera.x + enemy.width),
                enemy.y,
                enemy.width,
                enemy.height
            );
            ctx.restore();
        }
        
        // 武器和攻击状态显示
        if (enemy.isArmed) {
            // 武器图标和冷却条背景
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            
            // 添加发光效果
            ctx.shadowColor = theme.enemyWarning;
            ctx.shadowBlur = 5;
            ctx.fillStyle = theme.enemyWarning;
            ctx.fillText('🔫',
                enemy.x - camera.x + enemy.width/2,
                enemy.y - 15
            );
            
            // 攻击冷却条
            const cooldownProgress = Math.min(1, (Date.now() - enemy.lastAttackTime) / enemy.attackCooldown);
            if (cooldownProgress < 1) {
                ctx.shadowBlur = 0; // 移除阴影效果
                // 冷却背景
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(
                    enemy.x - camera.x,
                    enemy.y - 25,
                    enemy.width,
                    3
                );
                
                // 冷却进度
                const gradient = ctx.createLinearGradient(
                    enemy.x - camera.x,
                    enemy.y - 25,
                    enemy.x - camera.x + enemy.width * cooldownProgress,
                    enemy.y - 25
                );
                gradient.addColorStop(0, `rgba(${hexToRgb(theme.enemyWarning)},0.8)`);
                gradient.addColorStop(1, `rgba(${hexToRgb(theme.enemyWarning)},0.4)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(
                    enemy.x - camera.x,
                    enemy.y - 25,
                    enemy.width * cooldownProgress,
                    3
                );
            }
        }
        
        // 显示敌人类型和状态
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 2;
        ctx.fillText(
            enemy.type === 'ground' ?
                (enemy.isChasing ? '😈' : '🦊') :
                '🦊',
            enemy.x - camera.x + enemy.width/2,
            enemy.y - 30
        );
        
        ctx.restore();
        
        // 添加脚下的阴影
        ctx.save();
        const gradient = ctx.createRadialGradient(
            enemy.x - camera.x + enemy.width/2,
            enemy.y + enemy.height,
            0,
            enemy.x - camera.x + enemy.width/2,
            enemy.y + enemy.height,
            20
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(
            enemy.x - camera.x + enemy.width/2,
            enemy.y + enemy.height,
            enemy.width/2,
            10,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    });
}

function drawEffects() {
    ctx.textAlign = 'center';
    ctx.font = '24px Arial';
    
    for (let i = gameState.effects.length - 1; i >= 0; i--) {
        const effect = gameState.effects[i];
        ctx.fillStyle = `rgba(${hexToRgb(effect.color)},${effect.alpha})`;
        ctx.fillText(effect.text, effect.x, effect.y);
        
        effect.y -= 1;
        effect.alpha -= 1/30;
        effect.life--;
        
        if (effect.life <= 0) {
            gameState.effects.splice(i, 1);
        }
    }
}

function drawObjective() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    const objective = `Objective: ${gameState.objective}`;
    ctx.fillText(objective, 10, 40);
}

// Game state management
function addEffect(x, y, type, text) {
    const theme = levelThemes[gameState.level];
    const color = type === 'coin' ? theme.effectColors.coin : 
                 type === 'enemy' ? theme.effectColors.enemy :
                 type === 'powerup' ? theme.effectColors.powerup :
                 theme.effectColors.chest;
    
    gameState.effects.push({
        x: x - camera.x,
        y,
        color,
        text,
        alpha: 1,
        life: 30
    });
}

function checkPowerups() {
    gameState.powerups.forEach(powerup => {
        if (!powerup.collected && checkCollision(player, powerup)) {
            powerup.collected = true;
            if (powerup.type === 'mushroom') {
                // Always make player super regardless of current state
                player.state = 'super';
                player.width = 70;
                player.height = 70;
                addEffect(powerup.x + powerup.width/2, powerup.y, 'powerup', 'Super Size!');
                
                // Add growth effect
                particleSystem.emit(
                    powerup.x + powerup.width/2,
                    powerup.y + powerup.height/2,
                    'powerup',
                    15
                );
            } else if (powerup.type === 'wings') {
                player.canFly = true;
                player.state = 'flying';
                addEffect(powerup.x + powerup.width/2, powerup.y, 'powerup', 'Wings Power!');
            }
            particleSystem.emit(
                powerup.x + powerup.width/2,
                powerup.y + powerup.height/2,
                'collect',
                20
            );
        }
    });
}

function checkChests() {
    gameState.chests.forEach(chest => {
        if (!chest.collected && checkCollision(player, chest)) {
            chest.collected = true;
            player.weapon = chest.weapon;
            player.attackCooldown = weaponTypes[chest.weapon].cooldown;
            addEffect(chest.x + chest.width/2, chest.y, 'chest', `Got ${weaponTypes[chest.weapon].name}!`);
            particleSystem.emit(
                chest.x + chest.width/2,
                chest.y + chest.height/2,
                'collect',
                20
            );
        }
    });
}

function checkCoins() {
    gameState.coins.forEach(coin => {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            gameState.score += 50;
            document.getElementById('coinCount').textContent = ++gameState.coinCount;
            document.getElementById('scoreCount').textContent = gameState.score;
            addEffect(coin.x + coin.width/2, coin.y, 'coin', '+50');
            checkLevelCompletion();
            particleSystem.emit(
                coin.x + coin.width/2,
                coin.y + coin.height/2,
                'collect',
                20
            );
        }
    });
    
    // Update physics for falling items
    const updateFallingItem = (item) => {
        if (item.hasOwnProperty('velocityY')) {
            // Update horizontal movement first
            if (item.hasOwnProperty('velocityX')) {
                item.x += item.velocityX;
            }

            // Handle wall collisions and bouncing
            if (item.x <= 0) {
                item.x = 0;
                item.velocityX = Math.abs(item.velocityX * 0.8); // Bounce with speed reduction
            } else if (item.x >= gameState.levelWidth - item.width) {
                item.x = gameState.levelWidth - item.width;
                item.velocityX = -Math.abs(item.velocityX * 0.8); // Bounce with speed reduction
            }

            // Update vertical movement
            item.velocityY += item.gravity;
            item.y += item.velocityY;

            // Check top screen boundary
            if (item.y < 0) {
                item.y = 0;
                item.velocityY = Math.abs(item.velocityY * 0.5); // Bounce down with reduced speed
            }

            // Check ground collision (ground is at y=550)
            if (item.y + item.height > 550) {
                item.y = 550 - item.height;
                item.velocityY = 0;
                if (item.hasOwnProperty('velocityX')) {
                    // Apply less friction to keep movement going
                    item.velocityX *= 0.98;
                    // Maintain minimum horizontal speed
                    if (Math.abs(item.velocityX) < 1.5) {
                        item.velocityX = item.velocityX > 0 ? 1.5 : -1.5;
                    }
                }
            } else {
                // Check platform collisions if not on ground
                let onPlatform = false;
                for (const platform of [...gameState.platforms, ...brickSystem.bricks]) {
                    if (platform.active && checkCollision(item, platform)) {
                        item.y = platform.y - item.height;
                        item.velocityY = 0;
                        onPlatform = true;
                        if (item.hasOwnProperty('velocityX')) {
                            // Apply less friction to keep movement going
                            item.velocityX *= 0.98;
                            // Maintain minimum horizontal speed
                            if (Math.abs(item.velocityX) < 1.5) {
                                item.velocityX = item.velocityX > 0 ? 1.5 : -1.5;
                            }
                        }
                        break;
                    }
                }
            }
        }
    };

    // Update all falling items physics
    gameState.coins.forEach(updateFallingItem);
    gameState.powerups.forEach(updateFallingItem);
    gameState.chests.forEach(updateFallingItem);
}


function initLevel(level) {
    const theme = levelThemes[level];
    gameState.objective = theme.objective;
    gameState.requireCoins = theme.requireCoins;
    gameState.requireEnemies = theme.requireEnemies;
    // First initialize platforms and bricks
    gameState.platforms = createPlatforms(level, gameState.levelWidth);
    
    // Initialize bricks
    brickSystem.bricks = [];
    levelBricks[level].forEach(brickConfig => {
        brickSystem.createBrick(brickConfig.x, brickConfig.y, brickConfig.type);
    });
    
    // Then initialize entities that depend on platforms
    gameState.enemies = createEnemies(level, gameState.platforms, gameState.levelWidth);
    gameState.coins = createCoins(level);
    gameState.powerups = createPowerups(level);
    gameState.chests = []; // Initialize empty array for weapon drops
    
    player.weapon = null;
    // Don't reset player state (keep super state if they have it)
    player.isInvulnerable = true; // Brief invulnerability when level starts
    player.lastHitTime = Date.now();
    player.canFly = false;
    player.isFlying = false;
    
    bg = createBackground(ctx, canvas, level);
    
    document.querySelector('.instructions h2').textContent = `Level ${level}: ${theme.name}`;
}


function nextLevel() {
    // Save only mushroom state before level change
    const wasSuper = player.state === 'super';
    
    gameState.level++;
    player.x = 50;
    player.y = 300;
    player.velocityX = 0;
    player.velocityY = 0;
    player.weapon = null;
    player.isInvulnerable = false;
    camera.x = 0;
    
    // Reset flying abilities
    player.canFly = false;
    player.isFlying = false;
    
    // Restore only mushroom power-up state
    if (wasSuper) {
        player.state = 'super';
        player.width = 70;
        player.height = 70;
    } else {
        player.state = 'normal';
        player.width = 50;
        player.height = 50;
    }
    initLevel(gameState.level);
    document.getElementById('levelDisplay').textContent = gameState.level;
}

function showVictoryScreen() {
    const victoryScreen = document.createElement('div');
    victoryScreen.className = 'victory-screen';
    const completionTime = Math.floor((Date.now() - gameState.startTime) / 1000); // Convert to seconds
    const minutes = Math.floor(completionTime / 60);
    const seconds = completionTime % 60;
    victoryScreen.innerHTML = `
        <h1>Congratulations!</h1>
        <p>You've completed all levels!</p>
        <p>Final Score: ${gameState.score}</p>
        <p>Completion Time: ${minutes}m ${seconds}s</p>
        <p>Total Deaths: ${gameState.deathCount}</p>
        <button onclick="location.reload()">Play Again</button>
    `;
    document.body.appendChild(victoryScreen);
}

// Game loop
let bg;  // Background gradient

// Helper functions for player hits and overlapping enemies
window.handlePlayerHit = function() {
    if (player.state === 'super') {
        // If super, shrink instead of dying
        player.state = 'normal';
        player.width = 50;
        player.height = 50;
        player.isInvulnerable = true;
        player.lastHitTime = Date.now();
        
        // Add shrinking effect
        particleSystem.emit(
            player.x + player.width/2,
            player.y + player.height/2,
            'powerup',
            15
        );
        
        addEffect(player.x + player.width/2, player.y, 'powerup', 'Shrunk!');
        
        return false; // Don't reset level
    }
    
    return true; // Reset level
}

window.getOverlappingEnemies = function(enemy) {
    // Find all enemies that overlap with the given enemy and are at similar height
    return gameState.enemies.filter(otherEnemy =>
        otherEnemy !== enemy &&
        !gameState.enemiesHit.has(otherEnemy) &&
        checkCollision(otherEnemy, enemy) &&
        Math.abs(otherEnemy.y - enemy.y) < 10
    );
}

window.handleEnemyDefeat = function(enemy) {
    if (gameState.enemiesHit.has(enemy)) return;
    
    // Get all overlapping enemies to defeat together
    const enemies = [enemy, ...getOverlappingEnemies(enemy)];
    
    enemies.forEach(e => {
        gameState.enemiesHit.add(e);
        const index = gameState.enemies.indexOf(e);
        if (index !== -1) {
            gameState.enemies.splice(index, 1);
            let score = e.type === 'platform' ?
                (e.isArmed ? 250 : 150) :
                (e.isArmed ? 200 : 100);
            gameState.score += score;
            
            addEffect(e.x + e.width/2, e.y, 'enemy', `+${score}`);
            particleSystem.emit(
                e.x + e.width/2,
                e.y + e.height/2,
                'enemy',
                e.type === 'platform' ? 25 : 20
            );
        }
    });
    
    // Return if any of the defeated enemies was a platform fox
    return enemies.some(e => e.type === 'platform');
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        initLevel(gameState.level);
        gameLoop();
    }
}

function gameLoop() {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawPlatforms();
    drawCoins();
    drawChests();
    drawPowerups();
    drawEnemies();
    drawPlayer();
    drawEffects();
    drawObjective();
    
    particleSystem.update();
    particleSystem.draw(ctx, camera);
    
    projectileSystem.update();
    projectileSystem.draw(ctx, camera);
    
    // Clear enemies hit set at start of frame
    gameState.enemiesHit.clear();
    
    updatePlayer();
    updateEnemies();
    checkCoins();
    checkChests();
    checkPowerups();
    
    // Update brick animations
    brickSystem.update(Date.now());
    
    // Update invulnerability
    if (player.isInvulnerable && Date.now() - player.lastHitTime > player.invulnerabilityTime) {
        player.isInvulnerable = false;
    }
    
    if (screenFlash.active) {
        const elapsed = Date.now() - screenFlash.startTime;
        if (elapsed < screenFlash.duration) {
            const alpha = 0.3 * (1 - elapsed / screenFlash.duration);
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            screenFlash.active = false;
        }
    }
    
    requestAnimationFrame(gameLoop);
}
