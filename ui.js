// ===================== УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ =====================

// DOM элементы
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

// Функции отображения уведомлений
function showError(message) {
    console.error('❌', message);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ac4e4e;
        color: white;
        padding: 15px 25px;
        border-radius: 60px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 80%;
        text-align: center;
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = '❌ ' + message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showSuccess(message) {
    console.log('✅', message);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #3f9e6b;
        color: white;
        padding: 15px 25px;
        border-radius: 60px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 80%;
        text-align: center;
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = '✅ ' + message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем анимации в стили
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    @keyframes slideUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Обновление UI пользователя
function updateUserUI(user) {
    if (user) {
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.color = '#9ac7e7';
        userEmailSpan.title = 'Авторизован';
    } else {
        userEmailSpan.textContent = 'не авторизован';
        userEmailSpan.style.color = '#ff9999';
        userEmailSpan.title = 'Нажмите "вход" для авторизации';
    }
}

// Управление модальным окном
function showAuthModal() {
    if (authModal) {
        authModal.classList.remove('hidden');
        loginEmail.value = '';
        loginPassword.value = '';
        loginEmail.focus();
    }
}

function hideAuthModal() {
    if (authModal) {
        authModal.classList.add('hidden');
    }
}

// Обновление интерфейса комнаты
function updateRoomUI(roomData) {
    if (!roomData || !roomData.players) {
        // Нет активной комнаты
        roomCodeDisplay.textContent = '----';
        peerCounter.textContent = '0 игроков';
        roomStatusIcon.textContent = '⚫';
        roomStatusIcon.title = 'Нет комнаты';
        
        playerListContainer.innerHTML = '<div class="player-item"><span>👤</span> <span>нет комнаты</span></div>';
        
        // Сбрасываем стили кнопок
        toggleRoomBtn.style.background = '#2c6480';
        toggleRoomBtn.style.boxShadow = '0 5px 0 #134256';
        return;
    }
    
    const { players, active, isHost: userIsHost, hostUid } = roomData;
    
    // Обновляем информацию о комнате
    roomCodeDisplay.textContent = currentRoomId || '----';
    peerCounter.textContent = `${players.length} игроков`;
    
    // Обновляем статус комнаты
    if (active) {
        roomStatusIcon.textContent = '🟢';
        roomStatusIcon.title = 'Комната активна';
    } else {
        roomStatusIcon.textContent = '🔴';
        roomStatusIcon.title = 'Комната остановлена хостом';
    }
    
    // Отрисовываем список игроков
    playerListContainer.innerHTML = '';
    
    if (players.length === 0) {
        playerListContainer.innerHTML = '<div class="player-item"><span>👤</span> <span>пусто</span></div>';
        return;
    }
    
    // Сортируем: текущий игрок первый, остальные по алфавиту
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.uid === currentUser?.uid) return -1;
        if (b.uid === currentUser?.uid) return 1;
        return (a.email || '').localeCompare(b.email || '');
    });
    
    sortedPlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        
        const isMe = player.uid === currentUser?.uid;
        const isHostPlayer = player.uid === hostUid;
        
        let playerName = player.email || 'Игрок';
        if (playerName.length > 20) {
            playerName = playerName.substring(0, 18) + '...';
        }
        
        div.innerHTML = `
            <span>${isMe ? '⭐' : '👤'}</span>
            <span style="flex:1; overflow: hidden; text-overflow: ellipsis;">${playerName} ${isMe ? '(вы)' : ''}</span>
            ${isHostPlayer ? '<span class="crown" title="Хост">👑</span>' : ''}
        `;
        
        div.title = player.email || 'Игрок';
        playerListContainer.appendChild(div);
    });
    
    // Обновляем кнопку переключения для хоста
    if (userIsHost) {
        toggleRoomBtn.style.background = active ? '#ac9f3f' : '#3f9e6b';
        toggleRoomBtn.style.boxShadow = active ? '0 5px 0 #6b4f1a' : '0 5px 0 #1a5f3a';
        toggleRoomBtn.title = active ? 'Нажмите чтобы выключить комнату' : 'Нажмите чтобы включить комнату';
    } else {
        toggleRoomBtn.style.background = '#2c6480';
        toggleRoomBtn.style.boxShadow = '0 5px 0 #134256';
        toggleRoomBtn.title = isHost ? '' : 'Только хост может переключать комнату';
    }
}

// Обработчик копирования кода
copyCodeBtn.addEventListener('click', () => {
    if (currentRoomId) {
        navigator.clipboard.writeText(currentRoomId)
            .then(() => {
                showSuccess('Код скопирован в буфер обмена!');
                
                // Визуальный эффект на кнопке
                copyCodeBtn.style.background = '#3f9e6b';
                setTimeout(() => {
                    copyCodeBtn.style.background = '#346f8c';
                }, 200);
            })
            .catch(() => {
                // Если не удалось скопировать, показываем код в alert
                alert('Код комнаты: ' + currentRoomId);
            });
    } else {
        showError('Нет активной комнаты');
    }
});

// Блокировка/разблокировка кнопок при загрузке
function setButtonsLoading(loading) {
    const buttons = [createRoomBtn, joinRoomBtn, loginSubmitBtn];
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = loading;
            btn.style.opacity = loading ? '0.5' : '1';
        }
    });
}

// Очистка полей ввода
function clearInputs() {
    if (joinCodeInput) joinCodeInput.value = '';
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
}

// Экспортируем функции для использования в других файлах
window.ui = {
    showError,
    showSuccess,
    updateUserUI,
    showAuthModal,
    hideAuthModal,
    updateRoomUI,
    setButtonsLoading,
    clearInputs
};
