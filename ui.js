// Элементы DOM
const userEmailSpan = document.getElementById('userEmail');
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinCodeInput = document.getElementById('joinCodeInput');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const toggleRoomBtn = document.getElementById('toggleRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const peerCounter = document.getElementById('peerCounter');
const roomStatusIcon = document.getElementById('roomStatusIcon');
const playerListContainer = document.getElementById('playerListContainer');

// Обновление UI пользователя
function updateUserUI(user) {
    if (user) {
        userEmailSpan.textContent = user.email;
    } else {
        userEmailSpan.textContent = 'не авторизован';
    }
}

// Показать/скрыть модалку
function showAuthModal() {
    authModal?.classList.remove('hidden');
}

function hideAuthModal() {
    authModal?.classList.add('hidden');
}

// Обновление интерфейса комнаты
function updateRoomUI(roomData) {
    if (!roomData) {
        roomCodeDisplay.textContent = '----';
        peerCounter.textContent = '0 игроков';
        roomStatusIcon.textContent = '⚫';
        playerListContainer.innerHTML = '<div class="player-item">👤 ожидание...</div>';
        return;
    }
    
    const { players, active, isHost: userIsHost } = roomData;
    
    roomCodeDisplay.textContent = currentRoomId || '----';
    peerCounter.textContent = `${players.length} игроков`;
    roomStatusIcon.textContent = active ? '🟢' : '🔴';
    
    // Отрисовка списка игроков
    playerListContainer.innerHTML = '';
    
    if (players.length === 0) {
        playerListContainer.innerHTML = '<div class="player-item">👤 пусто</div>';
        return;
    }
    
    // Сортируем: текущий игрок первый, затем по времени (упрощенно)
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.uid === currentUser?.uid) return -1;
        if (b.uid === currentUser?.uid) return 1;
        return 0;
    });
    
    sortedPlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        
        const isMe = player.uid === currentUser?.uid;
        const isHostPlayer = player.uid === roomData.hostUid;
        
        div.innerHTML = `
            <span>${isMe ? '⭐' : '👤'}</span>
            <span>${player.email} ${isMe ? '(вы)' : ''} ${isHostPlayer ? '👑' : ''}</span>
        `;
        
        playerListContainer.appendChild(div);
    });
    
    // Обновление кнопки переключения для хоста
    if (userIsHost) {
        toggleRoomBtn.style.background = active ? '#ac9f3f' : '#3f9e6b';
    }
}

// Копирование кода
copyCodeBtn.addEventListener('click', () => {
    if (currentRoomId) {
        navigator.clipboard?.writeText(currentRoomId);
    }
});
