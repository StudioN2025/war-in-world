// ===================== ГЛАВНЫЙ ФАЙЛ =====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Игра загружается...');
    setupEventListeners();
    testConnection();
});

// Тест подключения к Firebase
function testConnection() {
    setTimeout(() => {
        const connectedRef = db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                console.log('✅ Подключение к базе данных установлено');
            } else {
                console.log('❌ Нет подключения к базе данных');
            }
        });
    }, 2000);
}

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
            loginSubmitBtn.textContent = '⏳...';
            loginSubmitBtn.disabled = true;
            
            await loginWithEmail(email, password);
            
            loginEmail.value = '';
            loginPassword.value = '';
            hideAuthModal();
            showSuccess('Вход выполнен!');
        } catch (error) {
            showError(error.message);
        } finally {
            loginSubmitBtn.textContent = '📧 войти / регистрация';
            loginSubmitBtn.disabled = false;
        }
    });
    
    logoutBtn.addEventListener('click', logout);
    
    // Создание комнаты
    createRoomBtn.addEventListener('click', async () => {
        try {
            if (!currentUser) {
                showAuthModal();
                return;
            }
            
            createRoomBtn.textContent = '⏳...';
            createRoomBtn.disabled = true;
            
            const roomId = await createRoom();
            currentRoomId = roomId;
            
            subscribeToRoom(roomId, {
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
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                },
                onPlayerRemoved: () => {
                    currentRoomId = null;
                    isHost = false;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
            
            showSuccess('Комната создана! Код: ' + roomId);
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
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                },
                onPlayerRemoved: () => {
                    currentRoomId = null;
                    updateRoomUI(null);
                    closeAllConnections();
                }
            });
            
            showSuccess('Присоединение выполнено!');
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
    
    // Копирование кода
    copyCodeBtn.addEventListener('click', () => {
        if (currentRoomId) {
            navigator.clipboard?.writeText(currentRoomId)
                .then(() => showSuccess('Код скопирован!'))
                .catch(() => alert('Код: ' + currentRoomId));
        }
    });
}

// Пинг для отслеживания активности
setInterval(() => {
    if (currentUser && currentRoomId) {
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ping`)
            .set(Date.now())
            .catch(() => {});
    }
}, 15000);
