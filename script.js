// ====================================================================
// !!! ВАЖНО: ЗАМЕНИТЕ ЭТИ ПЛЕЙСХОЛДЕРЫ НА ВАШИ КЛЮЧИ ИЗ SUPABASE !!!
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
 * @param {object} post - объект поста из Supabase
 * @returns {HTMLElement}
 */
function createPostElement(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = `post-${post.id}`; // Для обновления/удаления в реальном времени

    const content = document.createElement('p');
    content.className = 'post-card-content';
    content.textContent = post.content;

    const date = document.createElement('p');
    date.className = 'post-card-date';
    // Форматирование даты
    const formattedDate = new Date(post.created_at).toLocaleString('ru-RU', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    date.textContent = `Анонимно | ${formattedDate}`;

    card.appendChild(content);
    card.appendChild(date);
    return card;
}

/**
 * Рендерит все посты на стену, очищая предыдущие
 * @param {Array<object>} posts - массив постов
 */
function renderPosts(posts) {
    postsWall.innerHTML = '';
    posts.forEach(post => {
        postsWall.appendChild(createPostElement(post));
    });
}

// --- Функции для работы с Supabase ---

/**
 * 1. Получает посты при первой загрузке
 */
async function fetchInitialPosts() {
    loadingSpinner.style.display = 'block';
    
    const { data: posts, error } = await supabase
        .from('wall_posts')
        .select('*')
        .order('created_at', { ascending: false }) // Сначала новые посты
        .limit(50); // Ограничим 50 постами

    loadingSpinner.style.display = 'none';

    if (error) {
        console.error('Ошибка загрузки постов:', error);
        return;
    }

    renderPosts(posts);
}

/**
 * 2. Обработчик отправки формы (Добавление поста)
 */
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();

    if (!content) return;
    
    // Временно отключим кнопку, чтобы избежать дублирования
    const button = postForm.querySelector('button');
    button.disabled = true;

    const { error } = await supabase
        .from('wall_posts')
        .insert([{ content: content }]);

    button.disabled = false;
    
    if (error) {
        console.error('Ошибка добавления поста:', error);
        alert('Не удалось отправить пост. Попробуйте снова.');
    } else {
        postContent.value = ''; // Очищаем поле ввода
    }
});


/**
 * 3. Настройка Realtime (Обновление в реальном времени)
 */
function setupRealtimeListener() {
    supabase
        .channel('schema-db-changes') // Подписываемся на изменения в публичной схеме
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wall_posts' }, (payload) => {
            // При вставке нового поста
            const newPost = payload.new;
            console.log('Новый пост в реальном времени:', newPost);
            
            // Создаем элемент и вставляем его в начало стены
            const newPostElement = createPostElement(newPost);
            postsWall.prepend(newPostElement);
            
            // Добавим класс для анимации появления (если хотите)
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