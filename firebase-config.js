const firebaseConfig = {
  apiKey: "AIzaSyD7QFLrEYgrVBHnBYmC5KFX_AcVjGiUcHQ",
  authDomain: "war-in-worls-2026.firebaseapp.com",
  databaseURL: "https://war-in-worls-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "war-in-worls-2026",
  storageBucket: "war-in-worls-2026.firebasestorage.app",
  messagingSenderId: "1069752017417",
  appId: "1:1069752017417:web:a5741722acd64da9ed8ed8"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Глобальные ссылки
const auth = firebase.auth();
const db = firebase.database();

// Экспорт для использования в других файлах
window.firebaseApp = firebase;
window.auth = auth;
window.db = db;
