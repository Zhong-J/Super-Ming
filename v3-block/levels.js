// Level themes
export const levelThemes = {
    1: {
        name: "Forest Adventure",
        objective: "Break blocks for items, collect coins and defeat armed foxes",
        requireCoins: 5,  // Reduced from 8
        requireEnemies: 2,
        backgroundColor: ['#4B7BE5', '#235789'],
        platformColor: '#32CD32',
        coinGlow: '#FFD700',
        coinText: '#FFFFFF',
        enemyWarning: '#FF4444',
        effectColors: {
            coin: '#FFD700',
            enemy: '#FF4444',
            chest: '#FFA500',
            powerup: '#FF69B4'
        }
    },
    2: {
        name: "Desert Challenge",
        objective: "Break blocks for items, collect coins and defeat armed foxes",
        requireCoins: 5,  // Reduced from 12
        requireEnemies: 3,
        backgroundColor: ['#FFB74D', '#FF8C00'],
        platformColor: '#CD853F',
        coinGlow: '#FFD700',
        coinText: '#FFFFFF',
        enemyWarning: '#FF0000',
        effectColors: {
            coin: '#FFD700',
            enemy: '#FF0000',
            chest: '#FFA500',
            powerup: '#FF69B4'
        }
    },
    3: {
        name: "Mountain Peak",
        objective: "Break blocks for items, collect coins and defeat armed foxes",
        requireCoins: 5,  // Reduced from 15
        requireEnemies: 4,
        backgroundColor: ['#607D8B', '#34495E'],
        platformColor: '#4A6572',
        coinGlow: '#FFC125',
        coinText: '#FFFFFF',
        enemyWarning: '#FF3333',
        effectColors: {
            coin: '#FFC125',
            enemy: '#FF3333',
            chest: '#FFA500',
            powerup: '#FF69B4'
        }
    }
};

// Platform configuration
export const levelPlatforms = {
    1: [
        { x: 250, y: 450, width: 200, height: 30 },
        { x: 600, y: 380, width: 150, height: 30 },
        { x: 950, y: 320, width: 150, height: 30 },
        { x: 1300, y: 280, width: 200, height: 30 },
        { x: 1700, y: 330, width: 150, height: 30 },
        { x: 2100, y: 300, width: 150, height: 30 },
        { x: 2500, y: 250, width: 150, height: 30 },
        { x: 2900, y: 300, width: 200, height: 30 }
    ],
    2: [
        { x: 200, y: 450, width: 150, height: 30 },
        { x: 500, y: 380, width: 150, height: 30 },
        { x: 850, y: 320, width: 150, height: 30 },
        { x: 1200, y: 260, width: 150, height: 30 },
        { x: 1600, y: 300, width: 150, height: 30 },
        { x: 2000, y: 250, width: 150, height: 30 },
        { x: 2400, y: 280, width: 150, height: 30 },
        { x: 2800, y: 320, width: 150, height: 30 }
    ],
    3: [
        { x: 200, y: 500, width: 120, height: 30 },
        { x: 500, y: 430, width: 120, height: 30 },
        { x: 850, y: 370, width: 120, height: 30 },
        { x: 1200, y: 310, width: 120, height: 30 },
        { x: 1550, y: 250, width: 120, height: 30 },
        { x: 1900, y: 280, width: 120, height: 30 },
        { x: 2250, y: 320, width: 120, height: 30 },
        { x: 2600, y: 360, width: 120, height: 30 },
        { x: 2950, y: 400, width: 120, height: 30 }
    ]
};

// Brick placement configuration
export const levelBricks = {
    1: [
        // Level 1: More item/weapon bricks spread around
        { x: 400, y: 350, type: 'item' },  // Initial weapon brick
        { x: 600, y: 300, type: 'item' },    // First power-up
        { x: 900, y: 250, type: 'item' },  // Second weapon
        { x: 1200, y: 200, type: 'item' },   // Another power-up
        { x: 1500, y: 250, type: 'item' },   // Power-up near middle
        { x: 1800, y: 300, type: 'weapon' }, // Third weapon
        { x: 2100, y: 250, type: 'item' },   // Power-up near end
        { x: 2400, y: 200, type: 'weapon' }  // Final weapon
    ],
    2: [
        // Level 2: More challenging brick placements
        { x: 350, y: 350, type: 'item' },  // Starting weapon
        { x: 500, y: 300, type: 'item' },    // First power-up
        { x: 800, y: 250, type: 'item' },  // Second weapon
        { x: 1100, y: 200, type: 'item' },   // Power-up
        { x: 1400, y: 240, type: 'weapon' }, // Mid-level weapon
        { x: 1700, y: 280, type: 'item' },   // Power-up
        { x: 2000, y: 220, type: 'item' }, // Another weapon
        { x: 2300, y: 260, type: 'item' },   // Power-up near end
        { x: 2600, y: 300, type: 'weapon' }  // Final weapon
    ],
    3: [
        // Level 3: Most challenging layout
        { x: 300, y: 400, type: 'item' },  // Initial weapon
        { x: 500, y: 350, type: 'item' },    // First power-up
        { x: 800, y: 300, type: 'item' },  // Second weapon
        { x: 1100, y: 250, type: 'item' },   // Power-up
        { x: 1400, y: 200, type: 'weapon' }, // Mid weapon
        { x: 1700, y: 230, type: 'item' },   // Power-up
        { x: 2000, y: 260, type: 'weapon' }, // Late weapon
        { x: 2300, y: 290, type: 'item' },   // Power-up
        { x: 2600, y: 320, type: 'item' }, // Near-end weapon
        { x: 2900, y: 350, type: 'item' }    // Final power-up
    ]
};

// Level functions
export function createBackground(ctx, canvas, level) {
    const theme = levelThemes[level];
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.backgroundColor[0]);
    gradient.addColorStop(1, theme.backgroundColor[1]);
    return gradient;
}

export function createPlatforms(level, levelWidth) {
    const baseGround = [
        { x: 0, y: 550, width: levelWidth, height: 50 }
    ];
    return [...baseGround, ...levelPlatforms[level]];
}

// Helper function to check if a position is too close to other items
function isTooClose(pos, items, minDistance) {
    return items.some(item => {
        const dx = pos.x - item.x;
        const dy = pos.y - item.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
}

// Helper function to find a valid position for an item
function findValidPosition(platform, existingItems, minDistance = 200) {
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
        // Try placing on ground (20% chance)
        if (Math.random() < 0.2) {
            const x = Math.random() * 3000; // Level width is 3600
            const y = 510; // Just above ground
            const groundPos = { x, y };
            
            if (!isTooClose(groundPos, existingItems, minDistance)) {
                return groundPos;
            }
        }
        
        // Try placing on platform (40% chance)
        if (Math.random() < 0.4) {
            const x = platform.x + Math.random() * (platform.width - 40);
            const y = platform.y - 60;
            const platformPos = { x, y };
            
            if (!isTooClose(platformPos, existingItems, minDistance)) {
                return platformPos;
            }
        }
        
        // Try placing in air (40% chance)
        const x = platform.x + Math.random() * (platform.width - 40);
        const y = platform.y - 100 - Math.random() * 100;
        const airPos = { x, y };
        
        if (!isTooClose(airPos, existingItems, minDistance)) {
            return airPos;
        }
        
        attempts++;
    }
    
    // If no valid position found, return a position at the end of platform
    return {
        x: platform.x + platform.width - 40,
        y: platform.y - 60
    };
}

export function createCoins(level) {
    const coins = [];
    const platforms = levelPlatforms[level];
    const numCoins = levelThemes[level].requireCoins;
    
    for (let i = 0; i < numCoins; i++) {
        const platformIndex = Math.floor((i / numCoins) * platforms.length);
        const platform = platforms[platformIndex];
        
        const pos = findValidPosition(platform, coins);
        coins.push({
            x: pos.x,
            y: pos.y,
            width: 40,
            height: 40,
            collected: false
        });
    }
    return coins;
}

export function createPowerups(level) {
    // Power-ups are now only obtained through breaking brick blocks
    return [];
}

export function createEnemies(level, platforms, levelWidth) {
    const enemies = [];
    // 获取除了地面以外的所有平台
    const levelPlatformsArray = platforms.slice(1);
    const baseNumEnemies = levelThemes[level].requireEnemies;
    
    // 创建地面巡逻狐狸
    const groundEnemies = Math.floor(baseNumEnemies * 2.5);
    for (let i = 0; i < groundEnemies; i++) {
        const isArmed = Math.random() < 0.4;
        const enemy = {
            x: 200 + Math.random() * (levelWidth - 400),
            y: 510, // 地面高度
            width: 40,
            height: 40,
            speed: 3 + level * 0.5, // 地面狐狸速度更快
            direction: Math.random() < 0.5 ? 1 : -1,
            patrolStart: 0,
            patrolEnd: levelWidth,
            isArmed: isArmed,
            type: 'ground',
            lastAttackTime: 0,
            attackCooldown: 2000,
            weapon: 'enemyGun',
            velocityY: 0,
            gravity: 0.5,
            chaseRange: 300, // 追击范围
            isChasing: false
        };
        enemies.push(enemy);
    }
    
    // 创建平台上的狐狸 - 每个平台都有狐狸（地面已经被slice排除）
    levelPlatformsArray.forEach((platform, platformIndex) => {
        // 为了避免太多狐狸，每个平台50%的几率生成1个狐狸
        const numFoxes = Math.random() < 0.5 ? 1 : 0;
        for (let i = 0; i < numFoxes; i++) {
            const isArmed = Math.random() < 0.3; // 30% 几率是武装狐狸
            const spawnX = platform.x + (platform.width * (i + 1)) / (numFoxes + 1); // 平均分布在平台上
            
            const y = platform.y - 40; // 计算在平台上方40像素的位置
            const enemy = {
                x: spawnX,
                y: y,
                width: 40,
                height: 40,
                speed: 2 + level * 0.3,
                direction: Math.random() < 0.5 ? 1 : -1,
                patrolStart: platform.x + 20,
                patrolEnd: platform.x + platform.width - 60,
                isArmed: isArmed,
                type: 'platform',
                lastAttackTime: 0,
                attackCooldown: 2000,
                weapon: 'enemyGun',
                edgeDetectionRange: 30,
                platformY: y, // 使用固定的Y坐标保持在平台上
                platform: platform // 保存对平台的引用
            };
            enemies.push(enemy);
        }
    });

    return enemies;
}

// Removed createChests function as weapons now come from bricks
