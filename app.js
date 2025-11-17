// =======================================================
// 1. КОНФИГУРАЦИЯ FIREBASE (Замените своими данными!)
// =======================================================
const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_AUTH_DOMAIN",
    projectId: "ВАШ_PROJECT_ID",
    storageBucket: "ВАШ_STORAGE_BUCKET",
    messagingSenderId: "ВАШ_SENDER_ID",
    appId: "ВАШ_APP_ID"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Временный ID пользователя (В реальном приложении это берется из auth.currentUser.uid)
const currentUserId = "userA"; // Представим, что это ID текущего пользователя
const currentChatId = "chat_eva_summer"; // ID активного чата

// =======================================================
// 2. ФУНКЦИИ ЧАТА
// =======================================================

const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');

/**
 * Создает HTML-элемент для сообщения
 * @param {object} messageData - Данные сообщения из Firestore
 */
function createMessageElement(messageData) {
    const messageDiv = document.createElement('div');
    const isOutgoing = messageData.senderId === currentUserId;

    messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Текст сообщения
    const p = document.createElement('p');
    p.textContent = messageData.text;
    contentDiv.appendChild(p);

    // Добавление временной метки (конвертация из Firebase Timestamp)
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    
    let time = new Date();
    if (messageData.timestamp) {
        time = messageData.timestamp.toDate();
    }
    timeSpan.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeSpan);

    return messageDiv;
}

/**
 * Отправляет сообщение в Firestore
 */
async function sendMessage() {
    const text = messageInput.value.trim();

    if (text === '') return;

    const newMessage = {
        senderId: currentUserId,
        chatId: currentChatId,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // Время на сервере
    };

    try {
        // Добавляем сообщение в коллекцию 'chats/chat_eva_summer/messages'
        await db.collection('chats').doc(currentChatId).collection('messages').add(newMessage);
        messageInput.value = ''; // Очищаем поле ввода
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Прокрутка вниз
    } catch (error) {
        console.error("Ошибка при отправке сообщения: ", error);
        alert("Не удалось отправить сообщение.");
    }
}

// Слушатель для кнопки отправки
sendButton.addEventListener('click', sendMessage);

// Слушатель для нажатия Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

/**
 * Слушает обновления сообщений в Firestore в реальном времени
 */
function listenForMessages() {
    // Подписываемся на изменения в коллекции сообщений для текущего чата
    db.collection('chats')
      .doc(currentChatId)
      .collection('messages')
      .orderBy('timestamp', 'asc') // Сортировка по времени
      .onSnapshot((snapshot) => {
        // Очищаем старые сообщения при полной загрузке/обновлении
        // В продакшене лучше обрабатывать только .docChanges()
        messagesContainer.innerHTML = ''; 
        
        snapshot.forEach((doc) => {
            const message = doc.data();
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Прокрутка вниз после загрузки/обновления
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
        console.error("Ошибка при получении данных чата: ", error);
    });
}

// Запускаем слушатель сообщений при загрузке
listenForMessages();


// =======================================================
// 3. АУТЕНТИФИКАЦИЯ (Базовый пример)
// =======================================================

function handleLogin() {
    // В реальном приложении здесь будет форма и обработка ввода
    const email = "testuser@example.com";
    const password = "password123";

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Успешный вход:", userCredential.user.uid);
            // После входа можно обновить currentUserId и начать слушать чаты
        })
        .catch((error) => {
            console.error("Ошибка входа:", error.message);
            // Если пользователя нет, можно его зарегистрировать:
            // auth.createUserWithEmailAndPassword(...)
        });
}

// Вызовите handleLogin() для тестирования, если у вас настроена аутентификация в Firebase.
// handleLogin();