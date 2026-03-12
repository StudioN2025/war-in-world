// ===================== ГЛАВНЫЙ ФАЙЛ =====================

// Глобальные переменные (объявлены в других файлах, но здесь используем)
// currentUser, currentRoomId, isHost, roomActive, roomPlayers - из auth.js и room.js
// closeAllConnections, initAsHost, initAsClient - из p2p.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра загружается...');
    initializeApp();
    setupEventListeners();
    testConnection();
});

// Инициализация приложения
function initializeApp() {
    // Показываем приветственное сообщение
    setTimeout(() => {
        if (!currentUser) {
            console.log('ℹ️ Для игры требуется авторизация');
        }
    }, 2000);
}

// Тест подключения к Firebase
function testConnection() {
    console.log('🔍 Проверка подключения...');
    
    // Проверка базы данных
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            console.log('✅ Подключение к базе данных установлено');
            showSuccess('Подключение к серверу установлено');
        } else {
            console.log('❌ Нет подключения к базе данных');
            showError('Нет подключения к серверу. Проверьте интернет');
        }
    });
    
    // Проверка аутентификации
    setTimeout(() => {
        if (auth) {
            console.log('🔐 Auth доступен');
        }
    }, 1000);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // ===== АВТОРИЗАЦИЯ =====
    authBtn.addEventListener('click', showAuthModal);
    
    loginSubmitBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            showError('Введите email и пароль');
            return;
        }
        
        try {
            setButtonsLoading(true);
            loginSubmitBtn.textContent = '⏳ Подождите...';
            
            await loginWithEmail(email, password);
            
            loginEmail.value = '';
            loginPassword.value = '';
            hideAuthModal();
            showSuccess('Вход выполнен!');
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonsLoading(false);
            loginSubmitBtn.textContent = '📧 войти / регистрация';
        }
    });
    
    logoutBtn.addEventListener('click', async () => {
        try {
            await logout();
        } catch (error) {
            showError('Ошибка выхода: ' + error.message);
        }
    });
    
    // ===== УПРАВЛЕНИЕ КОМНАТОЙ =====
    
    // Создание комнаты
    createRoomBtn.addEventListener('click', async () => {
        try {
            if (!currentUser) {
                showAuthModal();
                return;
            }
            
            setButtonsLoading(true);
            createRoomBtn.textContent = '⏳ Создание...';
            
            const roomId = await createRoom();
            currentRoomId = roomId;
            
            console.log('✅ Комната создана:', roomId);
            showSuccess('Комната создана! Код: ' + roomId);
            
            // Подписываемся на обновления комнаты
            subscribeToRoom(roomId, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    // Инициализация P2P соединений
                    if (data.isHost) {
                        const peerUids = data.players
                            .map(p => p.uid)
                            .filter(uid => uid !== currentUser?.uid);
                        
                        if (peerUids.length > 0) {
                            console.log('🎮 Инициализация как хост для', peerUids.length, 'пиров');
                            initAsHost(peerUids);
                        }
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host && host.uid !== currentUser?.uid) {
                            console.log('🎮 Инициализация как клиент для хоста', host.email);
                            initAsClient(host.uid);
                        }
                    }
                },
                
                onRoomDeleted: () => {
                    console.log('ℹ️ Комната удалена');
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                    showError('Комната была удалена');
                },
                
                onPlayerRemoved: () => {
                    console.log('ℹ️ Вы удалены из комнаты');
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                    showError('Вы были удалены из комнаты');
                }
            });
            
            // Очищаем поле ввода кода
            joinCodeInput.value = '';
            
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonsLoading(false);
            createRoomBtn.textContent = '➕ создать';
        }
    });
    
    // Присоединение к комнате
    joinRoomBtn.addEventListener('click', async () => {
        const code = joinCodeInput.value.trim().toUpperCase();
        
        if (!code) {
            showError('Введите код комнаты');
            joinCodeInput.focus();
            return;
        }
        
        if (code.length !== 6) {
            showError('Код должен быть 6 символов (буквы и цифры)');
            joinCodeInput.focus();
            return;
        }
        
        try {
            if (!currentUser) {
                showAuthModal();
                return;
            }
            
            setButtonsLoading(true);
            joinRoomBtn.textContent = '⏳ Подключение...';
            
            await joinRoom(code);
            currentRoomId = code;
            
            console.log('✅ Присоединились к комнате:', code);
            showSuccess('Присоединение выполнено!');
            
            // Подписываемся на обновления комнаты
            subscribeToRoom(code, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    if (data.isHost) {
                        const peerUids = data.players
                            .map(p => p.uid)
                            .filter(uid => uid !== currentUser?.uid);
                        
                        if (peerUids.length > 0) {
                            console.log('🎮 Инициализация как хост для', peerUids.length, 'пиров');
                            initAsHost(peerUids);
                        }
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host && host.uid !== currentUser?.uid) {
                            console.log('🎮 Инициализация как клиент для хоста', host.email);
                            initAsClient(host.uid);
                        }
                    }
                },
                
                onRoomDeleted: () => {
                    console.log('ℹ️ Комната удалена');
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                    showError('Комната была удалена');
                },
                
                onPlayerRemoved: () => {
                    console.log('ℹ️ Вы удалены из комнаты');
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                    showError('Вы были удалены из комнаты');
                }
            });
            
        } catch (error) {
            showError(error.message);
        } finally {
            setButtonsLoading(false);
            joinRoomBtn.textContent = 'вход';
        }
    });
    
    // Переключение активности комнаты (только для хоста)
    toggleRoomBtn.addEventListener('click', async () => {
        try {
            if (!currentRoomId) {
                showError('Вы не в комнате');
                return;
            }
            
            if (!isHost) {
                showError('Только хост может переключать комнату');
                return;
            }
            
            const newState = !roomActive;
            await toggleRoomActive();
            
            showSuccess(`Комната ${newState ? 'включена' : 'выключена'}`);
            
        } catch (error) {
            showError(error.message);
        }
    });
    
    // Выход из комнаты
    leaveRoomBtn.addEventListener('click', async () => {
        try {
            if (!currentRoomId) {
                showError('Вы не в комнате');
                return;
            }
            
            setButtonsLoading(true);
            leaveRoomBtn.textContent = '⏳ Выход...';
            
            await leaveRoom();
            
            currentRoomId = null;
            isHost = false;
            updateRoomUI(null);
            closeAllConnections();
            
            showSuccess('Вы вышли из комнаты');
            
        } catch (error) {
            showError('Ошибка при выходе: ' + error.message);
        } finally {
            setButtonsLoading(false);
            leaveRoomBtn.textContent = '🚪 выйти';
        }
    });
    
    // Обработка нажатия Enter в поле ввода кода
    joinCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
    
    // Обработка нажатия Enter в полях авторизации
    loginEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginPassword.focus();
        }
    });
    
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginSubmitBtn.click();
        }
    });
    
    // Закрытие модалки по клику вне её
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            hideAuthModal();
        }
    });
}

// Пинг для отслеживания активности (каждые 15 секунд)
setInterval(() => {
    if (currentUser && currentRoomId) {
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ping`)
            .set(Date.now())
            .then(() => console.log('📡 Пинг отправлен'))
            .catch(err => console.log('⚠️ Пинг не удался:', err.message));
    }
}, 15000);

// Обработка ошибок сети
window.addEventListener('online', () => {
    console.log('🌐 Соединение восстановлено');
    showSuccess('Соединение восстановлено');
});

window.addEventListener('offline', () => {
    console.log('🌐 Соединение потеряно');
    showError('Потеряно соединение с интернетом');
});

// Предотвращение случайного закрытия страницы
window.addEventListener('beforeunload', (e) => {
    if (currentRoomId && isHost) {
        // Если хост закрывает страницу, предупреждаем
        e.preventDefault();
        e.returnValue = 'Вы хост комнаты. Выход может прервать игру других игроков.';
    }
});

// Экспортируем функции
window.main = {
    initializeApp,
    testConnection,
    setupEventListeners
};
