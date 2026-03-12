// ===================== УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ =====================
let currentUser = null;

// Слушатель состояния аутентификации
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        console.log('✅ Пользователь авторизован:', user.email);
        updateUserUI(user);
        hideAuthModal();
    } else {
        console.log('ℹ️ Пользователь не авторизован');
        updateUserUI(null);
    }
});

// Функция входа/регистрации
async function loginWithEmail(email, password) {
    try {
        if (!email || !password) {
            throw new Error('Введите email и пароль');
        }
        
        if (password.length < 6) {
            throw new Error('Пароль должен быть минимум 6 символов');
        }
        
        console.log('🔑 Попытка входа для:', email);
        
        // Пробуем войти
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Вход успешен');
            return userCredential.user;
        } catch (loginError) {
            console.log('❌ Ошибка входа:', loginError.code);
            
            // Если пользователь не найден - регистрируем
            if (loginError.code === 'auth/user-not-found') {
                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    console.log('✅ Регистрация успешна');
                    return userCredential.user;
                } catch (regError) {
                    console.error('❌ Ошибка регистрации:', regError.code);
                    
                    if (regError.code === 'auth/weak-password') {
                        throw new Error('Слишком простой пароль (минимум 6 символов)');
                    } else if (regError.code === 'auth/email-already-in-use') {
                        throw new Error('Этот email уже используется');
                    } else {
                        throw new Error('Ошибка регистрации: ' + regError.message);
                    }
                }
            } else if (loginError.code === 'auth/wrong-password') {
                throw new Error('Неверный пароль');
            } else if (loginError.code === 'auth/invalid-email') {
                throw new Error('Некорректный email');
            } else if (loginError.code === 'auth/too-many-requests') {
                throw new Error('Слишком много попыток. Попробуйте позже');
            } else if (loginError.code === 'auth/network-request-failed') {
                throw new Error('Ошибка сети. Проверьте подключение');
            } else {
                throw new Error('Ошибка: ' + loginError.message);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        throw error;
    }
}

// Выход из системы
async function logout() {
    try {
        if (currentRoomId && currentUser) {
            await db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}`).remove();
        }
        await auth.signOut();
        console.log('✅ Выход выполнен');
        window.location.reload();
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        showError('Ошибка выхода: ' + error.message);
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
