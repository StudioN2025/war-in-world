// Состояние авторизации
let currentUser = null;
let authInitialized = false;

// Наблюдатель за состоянием
auth.onAuthStateChanged(user => {
    currentUser = user;
    authInitialized = true;
    updateUserUI(user);
    
    if (user) {
        console.log('✅ Пользователь авторизован:', user.email);
        hideAuthModal();
    } else {
        console.log('ℹ️ Пользователь не авторизован');
        // Не показываем модалку автоматически при загрузке
        if (authInitialized) {
            // Показываем только если прошла инициализация
        }
    }
});

// Вход/регистрация
async function loginWithEmail(email, password) {
    try {
        // Проверка на пустые поля
        if (!email || !password) {
            throw new Error('Введите email и пароль');
        }
        
        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Некорректный email');
        }
        
        console.log('Попытка входа для:', email);
        
        try {
            // Сначала пробуем войти
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Успешный вход:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.log('Ошибка входа:', error.code);
            
            if (error.code === 'auth/user-not-found') {
                // Пользователь не найден - регистрируем
                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    console.log('✅ Успешная регистрация:', userCredential.user.email);
                    return userCredential.user;
                } catch (regError) {
                    console.error('Ошибка регистрации:', regError.code);
                    
                    if (regError.code === 'auth/weak-password') {
                        throw new Error('Слишком простой пароль (минимум 6 символов)');
                    } else if (regError.code === 'auth/email-already-in-use') {
                        throw new Error('Email уже используется');
                    } else if (regError.code === 'auth/invalid-email') {
                        throw new Error('Некорректный email');
                    } else {
                        throw new Error('Ошибка регистрации: ' + regError.message);
                    }
                }
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Неверный пароль');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Некорректный email');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Слишком много попыток. Попробуйте позже');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Ошибка сети. Проверьте подключение');
            } else {
                throw new Error('Ошибка: ' + error.message);
            }
        }
    } catch (error) {
        throw error;
    }
}

// Выход
async function logout() {
    try {
        // Очистка комнаты перед выходом
        if (currentRoomId && currentUser) {
            await db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}`).remove();
        }
        await auth.signOut();
        console.log('✅ Выход выполнен');
        window.location.reload();
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
    }
}

// Получение текущего пользователя
function getCurrentUser() {
    return currentUser;
}

// Проверка авторизации
function requireAuth() {
    if (!currentUser) {
        showAuthModal();
        throw new Error('Требуется авторизация');
    }
    return currentUser;
}
