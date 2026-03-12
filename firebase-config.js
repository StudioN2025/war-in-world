const firebaseConfig = {
  apiKey: "AIzaSyB3oYDFrmgIVmGuHZq53lGqaBPP5HFLNFY",
  authDomain: "war-in-world-2026.firebaseapp.com",
  databaseURL: "https://war-in-world-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "war-in-world-2026",
  storageBucket: "war-in-world-2026.firebasestorage.app",
  messagingSenderId: "448448732377",
  appId: "1:448448732377:web:dccc775863ff80096172c8"
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
