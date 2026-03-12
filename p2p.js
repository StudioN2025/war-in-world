// ===================== P2P СОЕДИНЕНИЯ (STAR АРХИТЕКТУРА) =====================
let peerConnections = new Map();
let dataChannels = new Map();

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function closeAllConnections() {
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    dataChannels.clear();
    console.log('🔌 Все P2P соединения закрыты');
}

async function initAsHost(peerUids) {
    closeAllConnections();
    console.log('🎮 Инициализация как хост, пиры:', peerUids);
    
    for (const peerUid of peerUids) {
        if (peerUid === currentUser?.uid) continue;
        
        try {
            const pc = new RTCPeerConnection(iceServers);
            peerConnections.set(peerUid, pc);
            
            const channel = pc.createDataChannel('gameChannel');
            setupDataChannel(channel, peerUid);
            dataChannels.set(peerUid, channel);
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    db.ref(`signaling/${currentRoomId}/ice/${peerUid}`).push({
                        candidate: event.candidate,
                        from: currentUser.uid
                    });
                }
            };
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            await db.ref(`signaling/${currentRoomId}/offers/${peerUid}`).set({
                offer: offer,
                from: currentUser.uid
            });
            
            console.log(`📡 Оффер отправлен пиру ${peerUid}`);
        } catch (error) {
            console.error(`❌ Ошибка подключения к пиру ${peerUid}:`, error);
        }
    }
}

async function initAsClient(hostUid) {
    closeAllConnections();
    console.log('🎮 Инициализация как клиент, хост:', hostUid);
    
    try {
        const pc = new RTCPeerConnection(iceServers);
        peerConnections.set(hostUid, pc);
        
        pc.ondatachannel = (event) => {
            console.log('📡 Получен канал от хоста');
            setupDataChannel(event.channel, hostUid);
            dataChannels.set(hostUid, event.channel);
        };
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                db.ref(`signaling/${currentRoomId}/ice/${hostUid}`).push({
                    candidate: event.candidate,
                    from: currentUser.uid
                });
            }
        };
        
        // Подписка на оффер от хоста
        const offerRef = db.ref(`signaling/${currentRoomId}/offers/${hostUid}`);
        offerRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (data && data.from !== currentUser?.uid) {
                console.log('📨 Получен оффер от хоста');
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await db.ref(`signaling/${currentRoomId}/answers/${currentUser.uid}`).set({
                    answer: answer,
                    from: currentUser.uid
                });
            }
        });
        
        // Подписка на ICE кандидаты
        const iceRef = db.ref(`signaling/${currentRoomId}/ice/${hostUid}`);
        iceRef.on('child_added', async (snapshot) => {
            const data = snapshot.val();
            if (data && data.from !== currentUser?.uid) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error('❌ Ошибка добавления ICE кандидата', e);
                }
            }
        });
    } catch (error) {
        console.error('❌ Ошибка инициализации клиента:', error);
    }
}

function setupDataChannel(channel, peerUid) {
    channel.onopen = () => {
        console.log(`✅ Канал с ${peerUid} открыт`);
        // Отправляем приветственное сообщение
        channel.send(JSON.stringify({
            type: 'HELLO',
            from: currentUser?.email,
            time: Date.now()
        }));
    };
    
    channel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('💬 Получено сообщение:', message.type);
            
            switch (message.type) {
                case 'HELLO':
                    console.log(`👋 Приветствие от ${message.from}`);
                    break;
                    
                case 'CHAT':
                    showSuccess(`💬 ${message.from}: ${message.text}`);
                    break;
                    
                case 'GAME_STATE':
                    // Синхронизация игрового состояния от хоста
                    if (!isHost) {
                        game.syncGameStateFromHost(message);
                    }
                    break;
                    
                case 'PLAYER_ACTION':
                    // Действие игрока (захват, постройка и т.д.)
                    handlePlayerAction(peerUid, message.action);
                    break;
                    
                case 'START_GAME':
                    if (!isHost) {
                        console.log('🎮 Хост запустил игру');
                        game.startGameLoop();
                    }
                    break;
                    
                case 'STOP_GAME':
                    if (!isHost) {
                        console.log('⏸️ Хост остановил игру');
                        game.stopGameLoop();
                    }
                    break;
            }
        } catch (e) {
            console.error('❌ Ошибка обработки сообщения:', e);
        }
    };
    
    channel.onclose = () => {
        console.log(`🔌 Канал с ${peerUid} закрыт`);
    };
    
    channel.onerror = (error) => {
        console.error(`❌ Ошибка канала с ${peerUid}:`, error);
    };
}

// Обработка действий игрока
function handlePlayerAction(peerUid, action) {
    console.log('🎮 Действие от игрока:', action);
    
    if (action.type === 'CAPTURE') {
        const result = game.captureProvince(peerUid, action.provinceId);
        
        // Отправляем результат обратно
        const channel = dataChannels.get(peerUid);
        if (channel?.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'ACTION_RESULT',
                action: action.type,
                result: result,
                provinceId: action.provinceId
            }));
        }
        
        // Рассылаем обновленное состояние всем
        if (isHost) {
            game.broadcastGameState();
        }
    }
}

// Отправка действия на хост
function sendPlayerAction(action) {
    if (!isHost && dataChannels.size > 0) {
        // Отправляем действие хосту
        const hostChannel = Array.from(dataChannels.values())[0];
        if (hostChannel?.readyState === 'open') {
            hostChannel.send(JSON.stringify({
                type: 'PLAYER_ACTION',
                action: action
            }));
        }
    } else if (isHost) {
        // Если мы хост, обрабатываем локально
        handlePlayerAction(currentUser.uid, action);
    }
}
