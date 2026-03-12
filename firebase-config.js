// ===================== КОНФИГУРАЦИЯ FIREBASE =====================
// ВАЖНО: Замените эти данные на свои из консоли Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB7kxK1lF3kXUzLm_5oHk-z7zX9Q8vW2jM",  // Ваш API ключ
    authDomain: "country-p2p-star.firebaseapp.com",     // Ваш authDomain
    databaseURL: "https://country-p2p-star-default-rtdb.firebaseio.com", // Ваш databaseURL
    projectId: "country-p2p-star",                       // Ваш projectId
    storageBucket: "country-p2p-star.appspot.com",       // Ваш storageBucket
    messagingSenderId: "109876543210",                   // Ваш messagingSenderId
    appId: "1:109876543210:web:abc123def456"            // Ваш appId
};

// Инициализация Firebase
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase инициализирован');
        console.log('📁 Project:', firebaseConfig.projectId);
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        alert('Ошибка подключения к Firebase. Проверьте конфигурацию.');
    }
} else {
    firebase.app();
    console.log('ℹ️ Firebase уже инициализирован');
}

// Глобальные ссылки
const auth = firebase.auth();
const db = firebase.database();

// Настройка persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Persistence настроен'))
    .catch(error => console.error('❌ Ошибка persistence:', error));
