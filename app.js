// Инициализация Telegram Web App
let tg = window.Telegram?.WebApp;
let telegramUserId = null;

if (tg) {
    tg.ready();
    tg.expand();
    // Настройка цветовой схемы
    tg.setHeaderColor('#667eea');
    tg.setBackgroundColor('#f5f5f5');
    
    // Получаем ID пользователя из Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        telegramUserId = tg.initDataUnsafe.user.id.toString();
        console.log('👤 Telegram User ID:', telegramUserId);
    } else if (tg.initData) {
        // Парсим initData если нужно
        try {
            const params = new URLSearchParams(tg.initData);
            const userStr = params.get('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                telegramUserId = user.id.toString();
                console.log('👤 Telegram User ID (из initData):', telegramUserId);
            }
        } catch (e) {
            console.warn('Не удалось получить User ID из initData');
        }
    }
    
    if (!telegramUserId) {
        telegramUserId = 'user_' + Date.now();
        console.warn('⚠️ User ID не найден, используем временный:', telegramUserId);
    }
} else {
    // Для тестирования вне Telegram
    console.warn('Telegram Web App API не доступен. Приложение работает в режиме тестирования.');
    telegramUserId = 'test_user_' + Date.now();
    // Создаем заглушку для tg.showAlert
    window.Telegram = {
        WebApp: {
            ready: () => {},
            expand: () => {},
            setHeaderColor: () => {},
            setBackgroundColor: () => {},
            showAlert: (message) => {
                alert(message);
            }
        }
    };
    tg = window.Telegram.WebApp;
}

// Используем IndexedDB вместо API - работает полностью в браузере, без сервера
const USE_INDEXEDDB = true; // Переключите на false, если хотите использовать API

// Функция для безопасного показа уведомлений
function showNotification(message) {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

// Хранилище данных
let athletes = [];
let workouts = [];

// Инициализация IndexedDB
let dbInitialized = false;
async function initDatabase() {
    if (dbInitialized) return;
    try {
        await kickboxingDB.init();
        dbInitialized = true;
        console.log('✅ База данных IndexedDB инициализирована');
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
}

// Проверка доступности localStorage
function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.error('❌ localStorage недоступен:', e);
        return false;
    }
}

// Функция для загрузки данных из IndexedDB
async function loadDataFromIndexedDB() {
    try {
        await initDatabase();
        
        athletes = await kickboxingDB.getAthletes(telegramUserId);
        workouts = await kickboxingDB.getWorkouts(telegramUserId);
        
        console.log('✅ Данные загружены из IndexedDB:', { 
            athletes: athletes.length, 
            workouts: workouts.length 
        });
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных из IndexedDB:', error);
        // Fallback на localStorage
        loadDataFromStorage();
        return false;
    }
}

// Функция для загрузки данных из API (если нужно)
async function loadDataFromAPI() {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-User-Id': telegramUserId
        };
        
        // Загружаем спортсменов
        const athletesResponse = await fetch(`${API_BASE_URL}/athletes?userId=${telegramUserId}`, { headers });
        if (athletesResponse.ok) {
            athletes = await athletesResponse.json();
            console.log('✅ Спортсмены загружены из API:', athletes.length);
        } else {
            console.error('❌ Ошибка загрузки спортсменов:', athletesResponse.status);
            athletes = [];
        }
        
        // Загружаем тренировки
        const workoutsResponse = await fetch(`${API_BASE_URL}/workouts?userId=${telegramUserId}`, { headers });
        if (workoutsResponse.ok) {
            workouts = await workoutsResponse.json();
            console.log('✅ Тренировки загружены из API:', workouts.length);
        } else {
            console.error('❌ Ошибка загрузки тренировок:', workoutsResponse.status);
            workouts = [];
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных из API:', error);
        // Fallback на IndexedDB если API недоступен
        return await loadDataFromIndexedDB();
    }
}

// Основная функция загрузки данных
async function loadData() {
    if (USE_INDEXEDDB) {
        return await loadDataFromIndexedDB();
    } else {
        return await loadDataFromAPI();
    }
}

// Функция для загрузки данных из localStorage (fallback)
function loadDataFromStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('⚠️ localStorage недоступен, используем пустые массивы');
        athletes = [];
        workouts = [];
        return;
    }
    
    try {
        const athletesData = localStorage.getItem('athletes');
        const workoutsData = localStorage.getItem('workouts');
        
        if (athletesData) {
            athletes = JSON.parse(athletesData);
            if (!Array.isArray(athletes)) {
                console.warn('⚠️ Данные спортсменов повреждены, сбрасываем');
                athletes = [];
            }
        } else {
            athletes = [];
        }
        
        if (workoutsData) {
            workouts = JSON.parse(workoutsData);
            if (!Array.isArray(workouts)) {
                console.warn('⚠️ Данные тренировок повреждены, сбрасываем');
                workouts = [];
            }
        } else {
            workouts = [];
        }
        
        console.log('✅ Данные загружены из localStorage:', { 
            athletes: athletes.length, 
            workouts: workouts.length 
        });
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных:', error);
        athletes = [];
        workouts = [];
    }
}

// Функция для сохранения данных в localStorage
function saveDataToStorage() {
    if (!isLocalStorageAvailable()) {
        console.error('❌ localStorage недоступен, данные не могут быть сохранены');
        showNotification('Ошибка: localStorage недоступен. Данные не будут сохранены.');
        return;
    }
    
    try {
        const athletesStr = JSON.stringify(athletes);
        const workoutsStr = JSON.stringify(workouts);
        
        localStorage.setItem('athletes', athletesStr);
        localStorage.setItem('workouts', workoutsStr);
        
        // Проверяем, что данные действительно сохранились
        const checkAthletes = localStorage.getItem('athletes');
        const checkWorkouts = localStorage.getItem('workouts');
        
        if (checkAthletes && checkWorkouts) {
            const parsedAthletes = JSON.parse(checkAthletes);
            const parsedWorkouts = JSON.parse(checkWorkouts);
            console.log('💾 Данные успешно сохранены в localStorage:', { 
                athletes: parsedAthletes.length, 
                workouts: parsedWorkouts.length 
            });
        } else {
            console.error('❌ Данные не сохранились в localStorage!');
            throw new Error('Данные не сохранились');
        }
    } catch (error) {
        console.error('❌ Ошибка при сохранении данных:', error);
        // Пытаемся сохранить снова через небольшую задержку
        setTimeout(() => {
            try {
                if (isLocalStorageAvailable()) {
                    localStorage.setItem('athletes', JSON.stringify(athletes));
                    localStorage.setItem('workouts', JSON.stringify(workouts));
                    console.log('✅ Повторная попытка сохранения успешна');
                }
            } catch (e) {
                console.error('❌ Повторная попытка сохранения не удалась:', e);
                showNotification('Ошибка при сохранении данных. Проверьте консоль.');
            }
        }, 100);
    }
}

// Загружаем данные при инициализации скрипта
loadDataFromStorage();

// Текущие данные для тренировки
let currentWorkout = {
    athleteId: null,
    date: new Date().toISOString().split('T')[0],
    type: null,
    exercises: []
};

let selectedExerciseType = null;
let selectedWorkoutType = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    // Инициализируем базу данных
    await initDatabase();
    
    // Загружаем данные при каждом открытии
    await loadData();
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    document.getElementById('workoutDate').value = currentWorkout.date;
    
    updateCounts();
    loadAthletes();
    updateNavigation();
    
    console.log('🚀 Приложение инициализировано, данные загружены');
});

// Перезагружаем данные при видимости страницы (когда пользователь возвращается)
document.addEventListener('visibilitychange', async function() {
    if (!document.hidden) {
        console.log('👁️ Страница стала видимой, перезагружаем данные');
        await loadData();
        updateCounts();
        loadAthletes();
    }
});

// Перезагружаем данные при фокусе окна
window.addEventListener('focus', async function() {
    console.log('🎯 Окно получило фокус, перезагружаем данные');
    await loadData();
    updateCounts();
    loadAthletes();
});

// Навигация между страницами
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    updateNavigation();
    
    // Загружаем данные при переходе на страницу
    loadData().then(() => {
        if (pageId === 'athletesPage') {
            loadAthletesList();
        } else if (pageId === 'resultsPage') {
            loadAthletesForResults();
            // Инициализируем правильный вид при переходе на страницу
            setTimeout(() => {
                switchView(currentView || 'detailed');
            }, 100);
        }
    });
}

function updateNavigation() {
    const currentPage = document.querySelector('.page.active').id;
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach((btn, index) => {
        btn.classList.remove('active');
        if (currentPage === 'homePage' && index === 0) {
            btn.classList.add('active');
        }
    });
}

// Обновление счетчиков с анимацией
function updateCounts() {
    const athletesCountEl = document.getElementById('athletesCount');
    const workoutsCountEl = document.getElementById('workoutsCount');
    
    if (athletesCountEl) {
        animateCount(athletesCountEl, athletes.length);
    }
    
    if (workoutsCountEl) {
        animateCount(workoutsCountEl, workouts.length);
    }
}

// Анимация счетчика
function animateCount(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const duration = 800;
    const startTime = Date.now();
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Используем easing функцию для плавности
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(currentValue + (targetValue - currentValue) * easeOutCubic);
        
        element.textContent = current;
        element.setAttribute('data-count', current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetValue;
            element.setAttribute('data-count', targetValue);
        }
    }
    
    update();
}

// Управление спортсменами
function loadAthletes() {
    const select = document.getElementById('athleteSelect');
    const resultsSelect = document.getElementById('resultsAthleteSelect');
    
    [select, resultsSelect].forEach(sel => {
        if (sel) {
            sel.innerHTML = '<option value="">Выберите спортсмена</option>';
            athletes.forEach(athlete => {
                const option = document.createElement('option');
                option.value = athlete.id;
                option.textContent = athlete.name;
                sel.appendChild(option);
            });
        }
    });
    
    console.log('👥 Спортсмены загружены в селекты:', athletes.length);
}

async function showAddAthleteForm() {
    const name = prompt('Введите имя спортсмена:');
    if (name && name.trim()) {
        try {
            await initDatabase();
            
            const athlete = {
                id: Date.now().toString(),
                name: name.trim(),
                createdAt: new Date().toISOString()
            };
            
            if (USE_INDEXEDDB) {
                await kickboxingDB.addAthlete(telegramUserId, athlete);
            } else {
                // API вариант
                const response = await fetch(`${API_BASE_URL}/athletes?userId=${telegramUserId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Telegram-User-Id': telegramUserId
                    },
                    body: JSON.stringify({ name: name.trim() })
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка сохранения');
                }
                
                const savedAthlete = await response.json();
                Object.assign(athlete, savedAthlete);
            }
            
            athletes.push(athlete);
            console.log('✅ Спортсмен успешно сохранен');
            
            loadAthletes();
            loadAthletesList();
            updateCounts();
            showNotification('Спортсмен добавлен!');
        } catch (error) {
            console.error('❌ Ошибка при добавлении спортсмена:', error);
            showNotification('Ошибка при сохранении спортсмена');
        }
    }
}

async function loadAthletesList() {
    // Перезагружаем данные перед отображением
    await loadData();
    
    const list = document.getElementById('athletesList');
    if (!list) return;
    
    list.innerHTML = '';
    
    console.log('📋 Загрузка списка спортсменов, найдено:', athletes.length);
    
    if (athletes.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Нет спортсменов</p>';
        return;
    }
    
    athletes.forEach(athlete => {
        const item = document.createElement('div');
        item.className = 'athlete-item';
        item.innerHTML = `
            <span class="athlete-name">${athlete.name}</span>
            <button onclick="deleteAthlete('${athlete.id}')" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Удалить</button>
        `;
        list.appendChild(item);
    });
    
    console.log('✅ Список спортсменов отображен');
}

async function deleteAthlete(id) {
    if (confirm('Удалить спортсмена?')) {
        try {
            await initDatabase();
            
            if (USE_INDEXEDDB) {
                await kickboxingDB.deleteAthlete(telegramUserId, id);
            } else {
                // API вариант
                const response = await fetch(`${API_BASE_URL}/athletes/${id}?userId=${telegramUserId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Telegram-User-Id': telegramUserId
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка удаления');
                }
            }
            
            athletes = athletes.filter(a => a.id !== id);
            loadAthletes();
            loadAthletesList();
            updateCounts();
            showNotification('Спортсмен удален!');
        } catch (error) {
            console.error('❌ Ошибка при удалении спортсмена:', error);
            showNotification('Ошибка при удалении спортсмена');
        }
    }
}

function loadAthletesForResults() {
    loadAthletes();
}

// Управление тренировками
function selectType(button, type) {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    selectedWorkoutType = type;
    currentWorkout.type = type;
}

function selectExerciseType(button, type) {
    document.querySelectorAll('.exercise-type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    selectedExerciseType = type;
}

function addExercise() {
    const duration = parseFloat(document.getElementById('duration').value);
    const avgHR = parseInt(document.getElementById('avgHR').value);
    
    if (!selectedExerciseType) {
        showNotification('Выберите тип упражнения');
        return;
    }
    
    if (!duration || duration <= 0) {
        showNotification('Введите продолжительность');
        return;
    }
    
    if (!avgHR || avgHR <= 0) {
        showNotification('Введите средний ЧСС');
        return;
    }
    
    // Определение зоны нагрузки по ЧСС
    const zone = getHRZone(avgHR);
    
    // Расчет УОИ (удельный объем интенсивности)
    const voi = calculateVOI(avgHR, duration);
    
    const exercise = {
        id: Date.now().toString(),
        type: selectedExerciseType,
        duration: duration,
        avgHR: avgHR,
        zone: zone,
        voi: voi
    };
    
    currentWorkout.exercises.push(exercise);
    renderExercises();
    updateWorkoutSummary();
    
    // Очистка формы
    document.getElementById('duration').value = '';
    document.getElementById('avgHR').value = '';
    selectedExerciseType = null;
    document.querySelectorAll('.exercise-type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelector('.save-btn').style.display = 'block';
}

function getHRZone(hr) {
    // Упрощенная логика определения зоны
    // В реальном приложении нужно учитывать возраст и индивидуальные параметры
    if (hr < 100) return 'Восстановительная';
    if (hr < 120) return 'Небольшая';
    if (hr < 150) return 'Средняя';
    if (hr < 170) return 'Высокая';
    return 'Максимальная';
}

function calculateVOI(hr, duration) {
    // Базовая формула УОИ
    // В реальном приложении нужно использовать формулу из PDF
    // Пример: УОИ = (ЧСС - ЧСС покоя) / (ЧСС макс - ЧСС покоя) * 100
    const restingHR = 60; // ЧСС покоя (можно сделать настраиваемым)
    const maxHR = 200; // Максимальный ЧСС (можно рассчитать по возрасту)
    
    const voi = ((hr - restingHR) / (maxHR - restingHR)) * 100;
    return Math.max(0, Math.min(100, voi.toFixed(1)));
}

function renderExercises() {
    const list = document.getElementById('exercisesList');
    list.innerHTML = '';
    
    if (currentWorkout.exercises.length === 0) {
        return;
    }
    
    const header = document.createElement('div');
    header.style.marginBottom = '15px';
    header.innerHTML = `<h3 style="font-size: 18px; font-weight: bold; color: #333;">Упражнения (${currentWorkout.exercises.length})</h3>`;
    list.appendChild(header);
    
    currentWorkout.exercises.forEach(exercise => {
        const item = document.createElement('div');
        item.className = 'exercise-item';
        item.innerHTML = `
            <div class="exercise-header">
                <span class="exercise-title">${getExerciseTypeName(exercise.type)}</span>
                <button class="remove-exercise" onclick="removeExercise('${exercise.id}')">×</button>
            </div>
            <div class="exercise-details">
                Продолжительность: ${exercise.duration} мин<br>
                ЧСС: ${exercise.avgHR} уд/мин<br>
                Зона: ${exercise.zone}<br>
                УОИ: ${exercise.voi}%
            </div>
        `;
        list.appendChild(item);
    });
}

function getExerciseTypeName(type) {
    const names = {
        'ofp': 'ОФП',
        'spu': 'СПУ',
        'us': 'УС',
        'usttm': 'УСТТМ',
        'ttm': 'ТТМ',
        'sfp': 'СФП',
        'rv': 'РВ',
        'rs': 'РС'
    };
    return names[type] || type.toUpperCase();
}

function removeExercise(id) {
    currentWorkout.exercises = currentWorkout.exercises.filter(e => e.id !== id);
    renderExercises();
    updateWorkoutSummary();
    
    if (currentWorkout.exercises.length === 0) {
        document.querySelector('.save-btn').style.display = 'none';
    }
}

function updateWorkoutSummary() {
    const summary = document.getElementById('workoutSummary');
    
    if (currentWorkout.exercises.length === 0) {
        summary.innerHTML = '';
        return;
    }
    
    const totalDuration = currentWorkout.exercises.reduce((sum, e) => sum + e.duration, 0);
    const avgVOI = currentWorkout.exercises.reduce((sum, e) => sum + parseFloat(e.voi), 0) / currentWorkout.exercises.length;
    
    summary.innerHTML = `
        <h3>Итого:</h3>
        <div class="summary-item">
            Общее время: ${totalDuration.toFixed(1)} мин<br>
            УОИ (средняя): ${avgVOI.toFixed(1)}%
        </div>
    `;
}

async function saveWorkout() {
    const athleteId = document.getElementById('athleteSelect').value;
    const date = document.getElementById('workoutDate').value;
    
    if (!athleteId) {
        showNotification('Выберите спортсмена');
        return;
    }
    
    if (!selectedWorkoutType) {
        showNotification('Выберите тип занятия');
        return;
    }
    
    if (currentWorkout.exercises.length === 0) {
        showNotification('Добавьте хотя бы одно упражнение');
        return;
    }
    
    try {
        await initDatabase();
        
        const workout = {
            id: Date.now().toString(),
            athleteId: athleteId,
            date: date,
            type: selectedWorkoutType,
            exercises: currentWorkout.exercises,
            createdAt: new Date().toISOString()
        };
        
        if (USE_INDEXEDDB) {
            await kickboxingDB.addWorkout(telegramUserId, workout);
        } else {
            // API вариант
            const response = await fetch(`${API_BASE_URL}/workouts?userId=${telegramUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-User-Id': telegramUserId
                },
                body: JSON.stringify({
                    athleteId: athleteId,
                    date: date,
                    type: selectedWorkoutType,
                    exercises: currentWorkout.exercises
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения');
            }
            
            const savedWorkout = await response.json();
            Object.assign(workout, savedWorkout);
        }
        
        workouts.push(workout);
        console.log('✅ Тренировка успешно сохранена');
        
        // Сброс формы
        currentWorkout = {
            athleteId: null,
            date: new Date().toISOString().split('T')[0],
            type: null,
            exercises: []
        };
        document.getElementById('athleteSelect').value = '';
        document.getElementById('workoutDate').value = currentWorkout.date;
        document.getElementById('duration').value = '';
        document.getElementById('avgHR').value = '';
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.exercise-type-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('exercisesList').innerHTML = '';
        document.getElementById('workoutSummary').innerHTML = '';
        document.querySelector('.save-btn').style.display = 'none';
        selectedExerciseType = null;
        selectedWorkoutType = null;
        
        updateCounts();
        showNotification('Тренировка сохранена!');
    } catch (error) {
        console.error('❌ Ошибка при сохранении тренировки:', error);
        showNotification('Ошибка при сохранении тренировки');
    }
}

// Отображение результатов тренировок
async function loadWorkoutResults() {
    const athleteId = document.getElementById('resultsAthleteSelect')?.value;
    const container = document.getElementById('workoutResultsContainer');
    
    if (!container) return;
    
    if (!athleteId) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Выберите спортсмена для просмотра результатов</p>';
        return;
    }
    
    // Обновляем данные перед отображением
    await loadData();
    
    // Если используем IndexedDB, загружаем тренировки конкретного спортсмена
    if (USE_INDEXEDDB) {
        try {
            await initDatabase();
            workouts = await kickboxingDB.getWorkouts(telegramUserId, athleteId);
        } catch (error) {
            console.error('Ошибка загрузки тренировок:', error);
        }
    }
    
    const athleteWorkouts = workouts.filter(w => w.athlete_id === athleteId || w.athleteId === athleteId);
    
    if (athleteWorkouts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Нет тренировок для этого спортсмена</p>';
        return;
    }
    
    // Сортируем тренировки по дате (новые сверху)
    athleteWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = '';
    
    athleteWorkouts.forEach(workout => {
        const workoutCard = document.createElement('div');
        workoutCard.className = 'workout-result-card';
        
        const workoutAthleteId = workout.athlete_id || workout.athleteId;
        const athlete = athletes.find(a => a.id === workoutAthleteId);
        const workoutTypeName = {
            'training': 'Тренировка',
            'control': 'Контрольное занятие',
            'competition': 'Соревнование'
        }[workout.type] || workout.type;
        
        // Подсчет статистики
        const totalDuration = workout.exercises.reduce((sum, e) => sum + e.duration, 0);
        const avgHR = workout.exercises.reduce((sum, e) => sum + e.avgHR, 0) / workout.exercises.length;
        const avgVOI = workout.exercises.reduce((sum, e) => sum + parseFloat(e.voi), 0) / workout.exercises.length;
        
        // Группировка упражнений по типам
        const exercisesByType = {};
        workout.exercises.forEach(ex => {
            if (!exercisesByType[ex.type]) {
                exercisesByType[ex.type] = [];
            }
            exercisesByType[ex.type].push(ex);
        });
        
        workoutCard.innerHTML = `
            <div class="workout-result-header">
                <h3>${workoutTypeName}</h3>
                <span class="workout-date">${formatDate(workout.date)}</span>
            </div>
            <div class="workout-result-summary">
                <div class="summary-stat">
                    <span class="stat-label">Общее время:</span>
                    <span class="stat-value">${totalDuration.toFixed(1)} мин</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Средний ЧСС:</span>
                    <span class="stat-value">${Math.round(avgHR)} уд/мин</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Средний УОИ:</span>
                    <span class="stat-value">${avgVOI.toFixed(1)}%</span>
                </div>
            </div>
            <div class="workout-exercises-table">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Тип упражнения</th>
                            <th>Продолжительность (мин)</th>
                            <th>ЧСС (уд/мин)</th>
                            <th>Зона</th>
                            <th>УОИ (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${workout.exercises.map(ex => `
                            <tr>
                                <td>${getExerciseTypeName(ex.type)}</td>
                                <td>${ex.duration}</td>
                                <td>${ex.avgHR}</td>
                                <td>${ex.zone}</td>
                                <td>${ex.voi}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.appendChild(workoutCard);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Переключение между видами отображения
let currentView = 'detailed';
let chartInstances = [];

function switchView(view) {
    console.log('🔄 Переключение вида:', view);
    currentView = view;
    
    try {
        const detailedBtn = document.getElementById('toggleDetailed');
        const statisticsBtn = document.getElementById('toggleStatistics');
        const chartsBtn = document.getElementById('toggleCharts');
        const detailedContainer = document.getElementById('workoutResultsContainer');
        const statisticsContainer = document.getElementById('statisticsContainer');
        const chartsContainer = document.getElementById('chartsContainer');
        
        if (!detailedContainer && !statisticsContainer && !chartsContainer) {
            console.error('❌ Контейнеры не найдены, возможно страница не загружена');
            return;
        }
        
        // Сбрасываем активные кнопки
        [detailedBtn, statisticsBtn, chartsBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Скрываем все контейнеры
        if (detailedContainer) detailedContainer.style.display = 'none';
        if (statisticsContainer) statisticsContainer.style.display = 'none';
        if (chartsContainer) chartsContainer.style.display = 'none';
        
        // Уничтожаем старые графики
        if (chartInstances && chartInstances.length > 0) {
            chartInstances.forEach(chart => {
                try {
                    chart.destroy();
                } catch (e) {
                    console.warn('Ошибка при уничтожении графика:', e);
                }
            });
            chartInstances = [];
        }
        
        if (view === 'detailed') {
            if (detailedBtn) detailedBtn.classList.add('active');
            if (detailedContainer) {
                detailedContainer.style.display = 'block';
                loadWorkoutResults();
            }
        } else if (view === 'statistics') {
            if (statisticsBtn) statisticsBtn.classList.add('active');
            if (statisticsContainer) {
                statisticsContainer.style.display = 'block';
                loadStatistics();
            }
        } else if (view === 'charts') {
            if (chartsBtn) chartsBtn.classList.add('active');
            if (chartsContainer) {
                chartsContainer.style.display = 'block';
                loadCharts();
            }
        }
        
        console.log('✅ Вид переключен:', view);
    } catch (error) {
        console.error('❌ Ошибка при переключении вида:', error);
        showNotification('Ошибка при переключении вида');
    }
}

function onAthleteSelectChange() {
    if (currentView === 'detailed') {
        loadWorkoutResults();
    } else if (currentView === 'statistics') {
        loadStatistics();
    } else if (currentView === 'charts') {
        loadCharts();
    }
}

// Загрузка и отображение графиков
async function loadCharts() {
    const athleteId = document.getElementById('resultsAthleteSelect')?.value;
    const container = document.getElementById('chartsContainer');
    
    if (!container) {
        console.error('❌ Контейнер графиков не найден');
        return;
    }
    
    if (!athleteId) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Выберите спортсмена для просмотра графиков</p>';
        return;
    }
    
    // Проверяем наличие Chart.js
    if (typeof Chart === 'undefined') {
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 20px;">Ошибка: Chart.js не загружен. Проверьте подключение к интернету.</p>';
        console.error('❌ Chart.js не загружен');
        return;
    }
    
    try {
        // Обновляем данные
        await loadData();
        
        // Если используем IndexedDB, загружаем тренировки конкретного спортсмена
        if (USE_INDEXEDDB) {
            try {
                await initDatabase();
                workouts = await kickboxingDB.getWorkouts(telegramUserId, athleteId);
            } catch (error) {
                console.error('Ошибка загрузки тренировок:', error);
            }
        }
        
        const athleteWorkouts = workouts.filter(w => w.athlete_id === athleteId || w.athleteId === athleteId);
        
        if (athleteWorkouts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Нет тренировок для отображения графиков</p>';
            return;
        }
        
        // Сортируем тренировки по дате
        athleteWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        container.innerHTML = '';
        
        // График 1: Динамика общей продолжительности тренировок
        createDurationChart(container, athleteWorkouts);
        
        // График 2: Динамика среднего ЧСС
        createHRChart(container, athleteWorkouts);
        
        // График 3: Динамика среднего УОИ
        createVOIChart(container, athleteWorkouts);
        
        // График 4: Распределение по типам упражнений
        createExerciseTypesChart(container, athleteWorkouts);
        
        // График 5: Количество тренировок по месяцам
        createMonthlyWorkoutsChart(container, athleteWorkouts);
        
        console.log('✅ Графики загружены');
    } catch (error) {
        console.error('❌ Ошибка при загрузке графиков:', error);
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 20px;">Ошибка при загрузке графиков. Проверьте консоль.</p>';
    }
}

function createDurationChart(container, workouts) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = '<h3>Динамика продолжительности тренировок</h3><canvas id="durationChart"></canvas>';
    container.appendChild(card);
    
    const ctx = document.getElementById('durationChart').getContext('2d');
    const labels = workouts.map(w => formatDate(w.date));
    const durations = workouts.map(w => {
        return w.exercises.reduce((sum, e) => sum + e.duration, 0);
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Продолжительность (мин)',
                data: durations,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Минуты'
                    }
                }
            }
        }
    });
    
    chartInstances.push(chart);
}

function createHRChart(container, workouts) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = '<h3>Динамика среднего ЧСС</h3><canvas id="hrChart"></canvas>';
    container.appendChild(card);
    
    const ctx = document.getElementById('hrChart').getContext('2d');
    const labels = workouts.map(w => formatDate(w.date));
    const avgHR = workouts.map(w => {
        return Math.round(w.exercises.reduce((sum, e) => sum + e.avgHR, 0) / w.exercises.length);
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Средний ЧСС (уд/мин)',
                data: avgHR,
                borderColor: '#f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'ЧСС (уд/мин)'
                    }
                }
            }
        }
    });
    
    chartInstances.push(chart);
}

function createVOIChart(container, workouts) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = '<h3>Динамика среднего УОИ</h3><canvas id="voiChart"></canvas>';
    container.appendChild(card);
    
    const ctx = document.getElementById('voiChart').getContext('2d');
    const labels = workouts.map(w => formatDate(w.date));
    const avgVOI = workouts.map(w => {
        return parseFloat((w.exercises.reduce((sum, e) => sum + parseFloat(e.voi), 0) / w.exercises.length).toFixed(1));
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Средний УОИ (%)',
                data: avgVOI,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'УОИ (%)'
                    }
                }
            }
        }
    });
    
    chartInstances.push(chart);
}

function createExerciseTypesChart(container, workouts) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = '<h3>Распределение по типам упражнений</h3><canvas id="exerciseTypesChart"></canvas>';
    container.appendChild(card);
    
    const ctx = document.getElementById('exerciseTypesChart').getContext('2d');
    const exerciseTypes = {};
    
    workouts.forEach(workout => {
        workout.exercises.forEach(ex => {
            const typeName = getExerciseTypeName(ex.type);
            if (!exerciseTypes[typeName]) {
                exerciseTypes[typeName] = 0;
            }
            exerciseTypes[typeName] += ex.duration;
        });
    });
    
    const labels = Object.keys(exerciseTypes);
    const data = Object.values(exerciseTypes);
    const colors = [
        '#2196f3', '#4caf50', '#ff9800', '#9c27b0',
        '#f44336', '#00bcd4', '#ffeb3b', '#795548'
    ];
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    chartInstances.push(chart);
}

function createMonthlyWorkoutsChart(container, workouts) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = '<h3>Количество тренировок по месяцам</h3><canvas id="monthlyChart"></canvas>';
    container.appendChild(card);
    
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const monthlyData = {};
    
    workouts.forEach(workout => {
        const date = new Date(workout.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { label: monthLabel, count: 0 };
        }
        monthlyData[monthKey].count++;
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(key => monthlyData[key].label);
    const data = sortedMonths.map(key => monthlyData[key].count);
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Количество тренировок',
                data: data,
                backgroundColor: '#667eea',
                borderColor: '#764ba2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Количество'
                    }
                }
            }
        }
    });
    
    chartInstances.push(chart);
}

// Заглушка для loadStatistics (если функция не существует)
function loadStatistics() {
    const container = document.getElementById('statisticsContainer');
    if (container) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Статистика по периодам будет здесь</p>';
    }
}

