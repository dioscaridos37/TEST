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

// --- Инициализация Firebase и Firestore ---
// (Вам нужно добавить эти CDN-скрипты в index.html, см. Шаг 3)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const postForm = document.getElementById('post-form');
const postContent = document.getElementById('post-content');
const postsWall = document.getElementById('posts-wall');
const loadingSpinner = document.getElementById('loading');


// --- Функции для работы с DOM (остаются прежними) ---

/**
 * Создает HTML-элемент для поста
 */
function createPostElement(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    // Используем .id для CSS анимации, но не обязательно
    card.id = `post-${post.id}`; 

    const content = document.createElement('p');
    content.className = 'post-card-content';
    // Firestore использует поле 'text'
    content.textContent = post.text; 

    const date = document.createElement('p');
    date.className = 'post-card-date';
    // Firestore возвращает timestamp иначе, преобразуем его
    const timestamp = post.timestamp ? post.timestamp.toDate() : new Date();
    const formattedDate = timestamp.toLocaleString('ru-RU', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    date.textContent = `Анонимно | ${formattedDate}`;

    card.appendChild(content);
    card.appendChild(date);
    return card;
}

/**
 * Рендерит посты при первой загрузке
 */
function renderPosts(posts) {
    postsWall.innerHTML = '';
    posts.forEach(post => {
        postsWall.appendChild(createPostElement(post));
    });
}


// --- 🚀 ЛОГИКА FIRESTORE: Добавление поста ---

/**
 * 2. Обработчик отправки формы (Добавление поста)
 */
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();

    if (!content) return;
    
    const button = postForm.querySelector('button');
    button.disabled = true;

    try {
        // Отправляем пост в коллекцию 'wall_posts'
        await db.collection("wall_posts").add({
            // Используем поле 'text', как в старом коде
            text: content, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Генерируем метку времени на сервере
        });

        // Успешная отправка, очищаем поле
        postContent.value = ''; 

    } catch (error) {
        // Показываем ошибку, если запись заблокирована (напр. неправильные Rules)
        console.error('Ошибка добавления поста:', error);
        alert(`❌ Ошибка публикации: ${error.message}. Проверьте правила (Rules) в Firebase.`);
        postContent.value = content; 
    } finally {
        button.disabled = false;
    }
});


// --- 🔄 Realtime (Обновление в реальном времени) ---

function setupRealtimeListener() {
    // Получаем посты, сортируем по времени и слушаем изменения
    db.collection("wall_posts")
      // Сортировка по возрастанию (новые посты внизу)
      .orderBy("timestamp", "asc")
      .onSnapshot((snapshot) => {
        
        // Очищаем стену для полного перерендера (проще, чем обрабатывать изменения)
        postsWall.innerHTML = ''; 
        
        snapshot.forEach((doc) => {
            // Добавляем ID документа к данным, чтобы функция createPostElement могла его использовать
            const post = { id: doc.id, ...doc.data() }; 
            const newPostElement = createPostElement(post);
            postsWall.appendChild(newPostElement);

            // Плавное появление (для новых элементов)
            if (!document.getElementById(`post-${post.id}`)) {
                newPostElement.style.opacity = 0;
                setTimeout(() => {
                    newPostElement.style.transition = 'opacity 0.5s ease-in';
                    newPostElement.style.opacity = 1;
                }, 50);
            }
        });
        
        // Скрываем спиннер после первой загрузки
        loadingSpinner.style.display = 'none'; 
    });
}


// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    // В Firestore Realtime Listener сам загружает и слушает изменения.
    setupRealtimeListener();
});
