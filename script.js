// ====================================================================
// !!! ⚠️ ШАГ 1: ВСТАВЬТЕ СВОИ ДАННЫЕ ИЗ КОНСОЛИ FIREBASE ЗДЕСЬ !!!
// ====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCUa28ZFrggXwp2Ct5-x-wN4Fq5xe5Z2vQ",
  authDomain: "diosprod-a3348.firebaseapp.com",
  projectId: "diosprod-a3348",
  storageBucket: "diosprod-a3348.firebasestorage.app",
  messagingSenderId: "760350682170",
  appId: "1:760350682170:web:bcbd181b62aa784f815903",
};
// ====================================================================

// --- Инициализация Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- Элементы DOM ---
const splashScreen = document.getElementById('splash-screen');
const profileSetup = document.getElementById('profile-setup');
const profileForm = document.getElementById('profile-form');
const chatScreen = document.getElementById('chat-screen');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const currentUserInfo = document.getElementById('current-user-info');
const logoutButton = document.getElementById('logout-button');

// --- Глобальные переменные профиля ---
let currentUser = null;
let currentProfile = null;


// ====================================================================
// ЛОГИКА ПРОФИЛЯ И АУТЕНТИФИКАЦИИ
// ====================================================================

/**
 * 1. Создает или загружает профиль пользователя в Firestore.
 * @param {string} uid - ID пользователя Firebase Auth
 * @param {string} username - Желаемое имя
 * @param {string} avatarColor - Желаемый цвет
 */
async function createOrUpdateProfile(uid, username, avatarColor) {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();

    if (doc.exists) {
        // Если профиль существует, просто загружаем его
        currentProfile = doc.data();
    } else {
        // Если профиля нет (первый вход), создаем его
        currentProfile = {
            uid: uid,
            username: username,
            avatarColor: avatarColor,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await userRef.set(currentProfile);
    }
    return currentProfile;
}

/**
 * Обработчик формы создания профиля
 */
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username-input').value.trim();
    const avatarColor = document.getElementById('avatar-color-input').value;

    if (!username) return alert("Введите имя пользователя!");

    try {
        // 1. Анонимная аутентификация, если еще не авторизованы
        if (!auth.currentUser) {
            await auth.signInAnonymously();
        }

        // 2. Текущий пользователь должен быть установлен слушателем auth.onAuthStateChanged
        const uid = auth.currentUser.uid;
        
        // 3. Создаем профиль в Firestore
        await createOrUpdateProfile(uid, username, avatarColor);

        // 4. Переходим к чату
        profileSetup.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        setupChatListener();
        
    } catch (error) {
        console.error("Ошибка входа:", error);
        alert("Ошибка входа: " + error.message);
    }
});

/**
 * Обработчик выхода
 */
logoutButton.addEventListener('click', async () => {
    await auth.signOut();
    // Очищаем локальные данные и показываем экран профиля
    currentUser = null;
    currentProfile = null;
    messagesList.innerHTML = '';
    
    chatScreen.classList.add('hidden');
    profileSetup.classList.remove('hidden');
    
    // Перезагрузка страницы для простоты, чтобы гарантировать очистку
    window.location.reload(); 
});


// ====================================================================
// ЛОГИКА ЧАТА (Firestore Realtime)
// ====================================================================

/**
 * Создает HTML-элемент сообщения
 */
function createMessageElement(msg) {
    const isSentByMe = currentUser && currentUser.uid === msg.uid;
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
    
    // Аватар
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.style.backgroundColor = msg.avatarColor || '#ccc'; // Если цвет не указан
    avatar.textContent = msg.username ? msg.username[0].toUpperCase() : 'A';
    
    // Содержимое сообщения
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const author = document.createElement('div');
    author.className = 'message-author';
    author.textContent = msg.username || 'Аноним';
    
    const text = document.createElement('p');
    text.textContent = msg.text;

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    if (msg.timestamp && msg.timestamp.toDate) {
        timestamp.textContent = msg.timestamp.toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    content.appendChild(author);
    content.appendChild(text);
    content.appendChild(timestamp);

    bubble.appendChild(avatar);
    bubble.appendChild(content);

    return bubble;
}

/**
 * Обработчик отправки сообщения
 */
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (!text || !currentProfile) return;

    try {
        await db.collection("messages").add({
            text: text,
            uid: currentProfile.uid,
            username: currentProfile.username,
            avatarColor: currentProfile.avatarColor,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        messageInput.value = ''; // Очистка поля
        
    } catch (error) {
        console.error("Ошибка отправки сообщения:", error);
        alert("Ошибка отправки сообщения: " + error.message);
    }
});


/**
 * Настройка Realtime Listener для сообщений
 */
function setupChatListener() {
    // Получаем последние 50 сообщений, сортируем по времени
    db.collection("messages")
      .orderBy("timestamp", "desc") // Сортируем по убыванию
      .limit(50) 
      .onSnapshot((snapshot) => {
        messagesList.innerHTML = '';
        
        // Преобразуем snapshot в массив и переворачиваем его для правильного порядка
        let messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        messages.reverse(); // Самое старое сообщение теперь первое

        messages.forEach(msg => {
            messagesList.appendChild(createMessageElement(msg));
        });

        // Прокрутка вниз к последнему сообщению
        messagesList.scrollTop = messagesList.scrollHeight;
    });
}


// ====================================================================
// ИНИЦИАЛИЗАЦИЯ
// ====================================================================

// 1. Логика экрана загрузки
setTimeout(() => {
    splashScreen.style.opacity = 0;
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        // Проверяем статус аутентификации после загрузки
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                // Если пользователь авторизован, пытаемся загрузить его профиль
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        currentProfile = doc.data();
                        currentUserInfo.textContent = `Чат "Родина" | ${currentProfile.username}`;
                        chatScreen.classList.remove('hidden');
                        setupChatListener();
                    } else {
                        // Нет профиля, но есть UID — просим создать профиль
                        profileSetup.classList.remove('hidden');
                    }
                });
            } else {
                // Пользователь не авторизован - просим создать профиль
                profileSetup.classList.remove('hidden');
            }
        });
    }, 1000); // 1 секунда на анимацию
}, 3500); // Показываем заставку 3.5 секунды
