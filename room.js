// Состояние комнаты
let currentRoomId = null;
let isHost = false;
let roomActive = false;
let roomPlayers = [];

// Генерация кода комнаты
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Создание комнаты
async function createRoom() {
    if (!currentUser) {
        throw new Error('Требуется авторизация');
    }
    
    const roomId = generateRoomCode();
    const roomRef = db.ref(`rooms/${roomId}`);
    
    const snapshot = await roomRef.once('value');
    if (snapshot.exists()) {
        return createRoom(); // повтор при коллизии
    }
    
    await roomRef.set({
        host: currentUser.uid,
        active: true,
        createdAt: Date.now(),
        players: {
            [currentUser.uid]: {
                email: currentUser.email,
                joinedAt: Date.now()
            }
        }
    });
    
    return roomId;
}

// Присоединение к комнате
async function joinRoom(roomId) {
    if (!currentUser) {
        throw new Error('Требуется авторизация');
    }
    
    const roomRef = db.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) {
        throw new Error('Комната не найдена');
    }
    
    const room = snapshot.val();
    if (!room.active) {
        throw new Error('Комната отключена хостом');
    }
    
    await roomRef.child('players').child(currentUser.uid).set({
        email: currentUser.email,
        joinedAt: Date.now()
    });
    
    return roomId;
}

// Выход из комнаты
async function leaveRoom() {
    if (!currentRoomId || !currentUser) return;
    
    await db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}`).remove();
    currentRoomId = null;
    isHost = false;
}

// Переключение активности комнаты (только хост)
async function toggleRoomActive() {
    if (!currentRoomId || !isHost) {
        throw new Error('Только хост может переключать комнату');
    }
    
    await db.ref(`rooms/${currentRoomId}/active`).set(!roomActive);
}

// Подписка на обновления комнаты
function subscribeToRoom(roomId, callbacks) {
    const roomRef = db.ref(`rooms/${roomId}`);
    
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            callbacks.onRoomDeleted?.();
            return;
        }
        
        // Проверка наличия игрока
        if (!data.players?.[currentUser?.uid]) {
            callbacks.onPlayerRemoved?.();
            return;
        }
        
        // Обновление игроков
        const players = Object.entries(data.players || {}).map(([uid, info]) => ({
            uid,
            email: info.email
        }));
        
        // Проверка хоста
        if (!data.host || !data.players[data.host]) {
            // Выбираем нового хоста
            const playersArray = Object.entries(data.players || {});
            if (playersArray.length > 0) {
                playersArray.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
                db.ref(`rooms/${roomId}/host`).set(playersArray[0][0]);
            }
        }
        
        roomActive = data.active || false;
        isHost = data.host === currentUser?.uid;
        
        callbacks.onUpdate?.({
            players,
            active: roomActive,
            isHost,
            hostUid: data.host
        });
    });
    
    return () => roomRef.off('value');
}
