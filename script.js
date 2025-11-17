// ====================================================================
// ✅ ШАГ 1: КЛЮЧИ ИЗ SUPABASE (ВАШИ ДАННЫЕ)
// ====================================================================
const SUPABASE_URL = 'https://qnufeercenmhfottbyxo.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudWZlZXJjZW5taGZvdHRieXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzM2NTEsImV4cCI6MjA3ODkwOTY1MX0.pYvv7WsUPFoy_rmf7wooORfg6_Bxkp9t0t_RP4iP6h8';
// ====================================================================

// Инициализация клиента Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const postForm = document.getElementById('post-form');
const postContent = document.getElementById('post-content');
const postsWall = document.getElementById('posts-wall');
const loadingSpinner = document.getElementById('loading');


// --- Функции для работы с DOM ---

/**
 * Создает HTML-элемент для поста
 */
function createPostElement(post) {
    const card = document.createElement('div');
    card.className = 'post-card';

    const content = document.createElement('p');
    content.className = 'post-card-content';
    content.textContent = post.content;

    const date = document.createElement('p');
    date.className = 'post-card-date';
    const formattedDate = new Date(post.created_at).toLocaleString('ru-RU', { 
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


// --- 🚀 ИСПРАВЛЕННАЯ ЛОГИКА: Добавление поста ---

/**
 * 2. Обработчик отправки формы (Добавление поста)
 */
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();

    if (!content) return;
    
    const button = postForm.querySelector('button');
    // Блокируем кнопку, чтобы избежать двойной отправки
    button.disabled = true;

    // В Supabase отправляем только текст поста
    const { error } = await supabase
        .from('wall_posts')
        .insert([{ content: content }]);

    // Разблокируем кнопку
    button.disabled = false;
    
    if (error) {
        // !!! ЕСЛИ ЕСТЬ ОШИБКА, ВЫВОДИМ ЕЕ И НЕ ОЧИЩАЕМ ПОЛЕ !!!
        console.error('Ошибка добавления поста:', error);
        alert(`❌ Ошибка публикации: ${error.message}. Проверьте настройки Policies в Supabase (INSERT для 'anon').`);
        // Текст останется в поле для повторной попытки или исправления
        postContent.value = content; 
    } else {
        // Успешная отправка, очищаем поле
        postContent.value = ''; 
    }
});


// --- Функции для работы с Supabase ---

/**
 * 1. Получает посты при первой загрузке
 */
async function fetchInitialPosts() {
    loadingSpinner.style.display = 'block';
    
    const { data: posts, error } = await supabase
        .from('wall_posts')
        .select('*')
        // ИЗМЕНЕНИЕ 1: Сортировка по возрастанию (новые посты внизу списка)
        .order('created_at', { ascending: true }) 
        .limit(50); 

    loadingSpinner.style.display = 'none';

    if (error) {
        console.error('Ошибка загрузки постов:', error);
        return;
    }

    renderPosts(posts);
}

/**
 * 3. Настройка Realtime (Обновление в реальном времени)
 */
function setupRealtimeListener() {
    supabase
        .channel('schema-db-changes') 
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wall_posts' }, (payload) => {
            const newPost = payload.new;
            console.log('Новый пост в реальном времени:', newPost);
            
            const newPostElement = createPostElement(newPost);
            // ИЗМЕНЕНИЕ 2: Вставляем новый пост В КОНЕЦ стены, чтобы он был СНИЗУ
            postsWall.appendChild(newPostElement); 
            
            // Плавное появление
            newPostElement.style.opacity = 0;
            setTimeout(() => {
                newPostElement.style.transition = 'opacity 0.5s ease-in';
                newPostElement.style.opacity = 1;
            }, 50);

        })
        .subscribe();
}


// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    fetchInitialPosts();
    setupRealtimeListener();
});
