// Главный файл инициализации
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра загружается...');
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Авторизация
    authBtn.addEventListener('click', showAuthModal);
    
    loginSubmitBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            showError('Введите email и пароль');
            return;
        }
        
        try {
            // Показываем индикатор загрузки
            loginSubmitBtn.textContent = '⏳ Загрузка...';
            loginSubmitBtn.disabled = true;
            
            await loginWithEmail(email, password);
            showSuccess('Вход выполнен!');
            hideAuthModal();
        } catch (error) {
            showError(error.message);
        } finally {
            loginSubmitBtn.textContent = '📧 войти';
            loginSubmitBtn.disabled = false;
        }
    });
    
    logoutBtn.addEventListener('click', async () => {
        try {
            await logout();
        } catch (error) {
            showError('Ошибка выхода: ' + error.message);
        }
    });
    
    // Создание комнаты
    createRoomBtn.addEventListener('click', async () => {
        try {
            if (!currentUser) {
                showAuthModal();
                return;
            }
            
            createRoomBtn.textContent = '⏳ Создание...';
            createRoomBtn.disabled = true;
            
            const roomId = await createRoom();
            currentRoomId = roomId;
            
            console.log('✅ Комната создана:', roomId);
            showSuccess('Комната создана! Код: ' + roomId);
            
            // Подписка на обновления
            subscribeToRoom(roomId, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    // Инициализация P2P
                    if (data.isHost) {
                        const peerUids = data.players.map(p => p.uid).filter(uid => uid !== currentUser?.uid);
                        if (peerUids.length > 0) {
                            initAsHost(peerUids);
                        }
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host && host.uid !== currentUser?.uid) {
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
                },
                onPlayerRemoved: () => {
                    console.log('ℹ️ Вы удалены из комнаты');
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
        } catch (error) {
            showError(error.message);
        } finally {
            createRoomBtn.textContent = '➕ создать';
            createRoomBtn.disabled = false;
        }
    });
    
    // Присоединение к комнате
    joinRoomBtn.addEventListener('click', async () => {
        const code = joinCodeInput.value.trim().toUpperCase();
        if (!code) {
            showError('Введите код комнаты');
            return;
        }
        
        if (code.length !== 6) {
            showError('Код должен быть 6 символов');
            return;
        }
        
        try {
            if (!currentUser) {
                showAuthModal();
                return;
            }
            
            joinRoomBtn.textContent = '⏳...';
            joinRoomBtn.disabled = true;
            
            await joinRoom(code);
            currentRoomId = code;
            
            console.log('✅ Присоединились к комнате:', code);
            showSuccess('Присоединение выполнено!');
            
            subscribeToRoom(code, {
                onUpdate: (data) => {
                    roomPlayers = data.players;
                    updateRoomUI(data);
                    
                    if (data.isHost) {
                        const peerUids = data.players.map(p => p.uid).filter(uid => uid !== currentUser?.uid);
                        if (peerUids.length > 0) {
                            initAsHost(peerUids);
                        }
                    } else {
                        const host = data.players.find(p => p.uid === data.hostUid);
                        if (host && host.uid !== currentUser?.uid) {
                            initAsClient(host.uid);
                        }
                    }
                },
                onRoomDeleted: () => {
                    console.log('ℹ️ Комната удалена');
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                },
                onPlayerRemoved: () => {
                    console.log('ℹ️ Вы удалены из комнаты');
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
        } catch (error) {
            showError(error.message);
        } finally {
            joinRoomBtn.textContent = 'вход';
            joinRoomBtn.disabled = false;
        }
    });
    
    // Переключение активности комнаты
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
            
            await toggleRoomActive();
            showSuccess(`Комната ${!roomActive ? 'выключена' : 'включена'}`);
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
            
            await leaveRoom();
            currentRoomId = null;
            isHost = false;
            updateRoomUI(null);
            closeAllConnections();
            showSuccess('Вы вышли из комнаты');
        } catch (error) {
            showError('Ошибка при выходе: ' + error.message);
        }
    });
}

// Периодический пинг для отслеживания активности
setInterval(() => {
    if (currentUser && currentRoomId) {
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ping`)
            .set(Date.now())
            .catch(err => console.log('Пинг не удался:', err));
    }
}, 15000);

// Favicon fix - добавляем в head index.html
const faviconFix = document.createElement('link');
faviconFix.rel = 'icon';
faviconFix.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌍</text></svg>';
document.head.appendChild(faviconFix);
