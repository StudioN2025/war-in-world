// ===================== ИГРОВАЯ ЛОГИКА =====================

// Константы игры
const GAME_CONSTANTS = {
    MONTH_DURATION: 60000, // 1 минута в миллисекундах
    START_YEAR: 2024,
    START_MONTH: 1, // Январь
    MAX_POPULATION: 1000000,
    BASE_GROWTH_RATE: 0.02, // 2% в месяц
    WAR_EXHAUSTION_DECAY: 0.05,
    PEACE_GROWTH_BONUS: 0.01
};

// Глобальное игровое состояние
let gameState = {
    year: GAME_CONSTANTS.START_YEAR,
    month: GAME_CONSTANTS.START_MONTH,
    players: {}, // uid -> данные игрока
    provinces: {}, // id провинции -> данные
    lastUpdate: Date.now(),
    gameActive: false,
    monthTimer: null
};

// Класс игрока
class Player {
    constructor(uid, email) {
        this.uid = uid;
        this.email = email;
        this.country = {
            name: `Страна ${email.split('@')[0]}`,
            color: this.generateRandomColor(),
            population: 10000,
            gold: 5000,
            manpower: 1000,
            provinces: [],
            technology: 1,
            stability: 0.8,
            warExhaustion: 0,
            allies: []
        };
        this.actions = [];
        this.lastActive = Date.now();
    }

    generateRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Класс провинции
class Province {
    constructor(id, name, owner = null) {
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.population = Math.floor(Math.random() * 10000) + 1000;
        this.resources = {
            gold: Math.floor(Math.random() * 100) + 20,
            food: Math.floor(Math.random() * 100) + 50,
            production: Math.floor(Math.random() * 50) + 10
        };
        this.buildings = [];
        this.army = 0;
        this.defense = 10;
    }
}

// Инициализация карты (пустая, как вы хотели)
function initializeMap() {
    // Создаем пустые провинции
    const provinceNames = [
        'Северная', 'Южная', 'Западная', 'Восточная',
        'Центральная', 'Прибрежная', 'Горная', 'Лесная',
        'Пустынная', 'Болотистая', 'Холмистая', 'Озёрная'
    ];
    
    provinceNames.forEach((name, index) => {
        const provinceId = `province_${index + 1}`;
        gameState.provinces[provinceId] = new Province(provinceId, name);
    });
    
    console.log('🗺️ Карта инициализирована, провинций:', Object.keys(gameState.provinces).length);
}

// Функция для прохождения месяца
async function advanceMonth() {
    if (!gameState.gameActive) return;
    
    console.log('📅 Месяц проходит...');
    
    // Обновляем месяц и год
    gameState.month++;
    if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year++;
    }
    
    // Обновляем всех игроков
    for (const uid in gameState.players) {
        const player = gameState.players[uid];
        
        // Рост населения
        const growth = player.country.population * GAME_CONSTANTS.BASE_GROWTH_RATE;
        player.country.population += Math.floor(growth);
        
        // Доход от провинций
        let income = 0;
        player.country.provinces.forEach(provId => {
            const province = gameState.provinces[provId];
            if (province) {
                income += province.resources.gold;
            }
        });
        player.country.gold += income;
        
        // Влияние стабильности
        player.country.gold *= player.country.stability;
        
        // Снижение военной усталости
        player.country.warExhaustion = Math.max(0, 
            player.country.warExhaustion - GAME_CONSTANTS.WAR_EXHAUSTION_DECAY);
        
        // Рост технологии
        if (player.country.gold > 1000) {
            player.country.technology += 0.01;
            player.country.gold -= 100;
        }
        
        // Обновляем время последней активности
        player.lastActive = Date.now();
    }
    
    gameState.lastUpdate = Date.now();
    
    // Отправляем обновление всем игрокам через P2P
    broadcastGameState();
    
    // Обновляем UI
    updateGameUI();
}

// Запуск игрового цикла
function startGameLoop() {
    if (gameState.monthTimer) {
        clearInterval(gameState.monthTimer);
    }
    
    gameState.gameActive = true;
    gameState.monthTimer = setInterval(advanceMonth, GAME_CONSTANTS.MONTH_DURATION);
    
    console.log('▶️ Игровой цикл запущен, месяц =', GAME_CONSTANTS.MONTH_DURATION / 1000, 'сек');
}

// Остановка игрового цикла
function stopGameLoop() {
    if (gameState.monthTimer) {
        clearInterval(gameState.monthTimer);
        gameState.monthTimer = null;
    }
    gameState.gameActive = false;
    console.log('⏸️ Игровой цикл остановлен');
}

// Добавление игрока в игру
function addPlayerToGame(uid, email) {
    if (!gameState.players[uid]) {
        gameState.players[uid] = new Player(uid, email);
        console.log('👤 Игрок добавлен в игру:', email);
        return true;
    }
    return false;
}

// Удаление игрока из игры
function removePlayerFromGame(uid) {
    if (gameState.players[uid]) {
        // Возвращаем провинции в нейтральное состояние
        const player = gameState.players[uid];
        player.country.provinces.forEach(provId => {
            if (gameState.provinces[provId]) {
                gameState.provinces[provId].owner = null;
            }
        });
        
        delete gameState.players[uid];
        console.log('👤 Игрок удален из игры:', uid);
        return true;
    }
    return false;
}

// Захват провинции
function captureProvince(attackerUid, provinceId) {
    if (!gameState.gameActive) {
        throw new Error('Игра не активна');
    }
    
    const attacker = gameState.players[attackerUid];
    const province = gameState.provinces[provinceId];
    
    if (!attacker || !province) {
        throw new Error('Игрок или провинция не найдены');
    }
    
    // Проверяем, может ли атаковать
    if (attacker.country.manpower < 100) {
        throw new Error('Недостаточно людей');
    }
    
    // Если провинция принадлежит кому-то
    if (province.owner && province.owner !== attackerUid) {
        const defender = gameState.players[province.owner];
        if (defender) {
            // Простая боевая механика
            const attackPower = attacker.country.technology * attacker.country.manpower;
            const defensePower = defender.country.technology * province.defense;
            
            if (attackPower > defensePower) {
                // Атака успешна
                defender.country.provinces = defender.country.provinces.filter(p => p !== provinceId);
                defender.country.warExhaustion += 0.1;
                
                attacker.country.provinces.push(provinceId);
                attacker.country.manpower -= 100;
                province.owner = attackerUid;
                
                console.log('⚔️ Захват провинции успешен:', province.name);
                return { success: true, message: 'Провинция захвачена!' };
            } else {
                // Атака отбита
                attacker.country.manpower -= 50;
                attacker.country.warExhaustion += 0.05;
                console.log('⚔️ Атака отбита:', province.name);
                return { success: false, message: 'Атака отбита!' };
            }
        }
    }
    
    // Ничейная провинция
    if (!province.owner) {
        if (attacker.country.manpower >= 50) {
            attacker.country.provinces.push(provinceId);
            attacker.country.manpower -= 50;
            province.owner = attackerUid;
            console.log('🏞️ Колонизация провинции:', province.name);
            return { success: true, message: 'Провинция колонизирована!' };
        }
    }
    
    return { success: false, message: 'Невозможно захватить' };
}

// Отправка игрового состояния через P2P
function broadcastGameState() {
    if (isHost && dataChannels.size > 0) {
        const state = {
            type: 'GAME_STATE',
            year: gameState.year,
            month: gameState.month,
            players: gameState.players,
            provinces: gameState.provinces,
            timestamp: Date.now()
        };
        
        dataChannels.forEach((channel, uid) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(state));
            }
        });
    }
}

// Синхронизация игрового состояния от хоста
function syncGameStateFromHost(data) {
    if (!isHost) { // Только клиенты принимают состояние от хоста
        gameState.year = data.year;
        gameState.month = data.month;
        gameState.players = data.players;
        gameState.provinces = data.provinces;
        gameState.lastUpdate = data.timestamp;
        
        updateGameUI();
        console.log('🔄 Игровое состояние синхронизировано');
    }
}

// Обновление игрового UI
function updateGameUI() {
    // Обновляем дату
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Окторябрь', 'Ноябрь', 'Декабрь'
        ];
        dateElement.textContent = `${monthNames[gameState.month - 1]} ${gameState.year}`;
    }
    
    // Обновляем информацию о текущем игроке
    if (currentUser && gameState.players[currentUser.uid]) {
        const player = gameState.players[currentUser.uid];
        
        const elements = {
            'countryName': player.country.name,
            'countryPopulation': player.country.population.toLocaleString(),
            'countryGold': player.country.gold.toFixed(0),
            'countryManpower': player.country.manpower.toLocaleString(),
            'countryTech': player.country.technology.toFixed(2),
            'countryStability': (player.country.stability * 100).toFixed(0) + '%',
            'countryWarExhaustion': (player.country.warExhaustion * 100).toFixed(0) + '%',
            'provinceCount': player.country.provinces.length
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    }
}

// Инициализация игры
function initializeGame() {
    initializeMap();
    console.log('🎮 Игра инициализирована');
}

// Экспортируем функции и переменные
window.game = {
    state: gameState,
    constants: GAME_CONSTANTS,
    initializeMap,
    startGameLoop,
    stopGameLoop,
    addPlayerToGame,
    removePlayerFromGame,
    captureProvince,
    broadcastGameState,
    syncGameStateFromHost,
    updateGameUI,
    initializeGame
};
