// Инициализация Telegram Web App
let tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    // Настройка цветовой схемы
    tg.setHeaderColor('#667eea');
    tg.setBackgroundColor('#f5f5f5');
} else {
    // Для тестирования вне Telegram
    console.warn('Telegram Web App API не доступен. Приложение работает в режиме тестирования.');
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

// Функция для безопасного показа уведомлений
function showNotification(message) {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

// Хранилище данных
let athletes = JSON.parse(localStorage.getItem('athletes') || '[]');
let workouts = JSON.parse(localStorage.getItem('workouts') || '[]');

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
document.addEventListener('DOMContentLoaded', function() {
    // Устанавливаем сегодняшнюю дату по умолчанию
    document.getElementById('workoutDate').value = currentWorkout.date;
    
    updateCounts();
    loadAthletes();
    updateNavigation();
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
    if (pageId === 'athletesPage') {
        loadAthletesList();
    } else if (pageId === 'resultsPage') {
        loadAthletesForResults();
        loadWorkoutResults();
    }
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

// Обновление счетчиков
function updateCounts() {
    document.getElementById('athletesCount').textContent = athletes.length;
    document.getElementById('workoutsCount').textContent = workouts.length;
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
}

function showAddAthleteForm() {
    const name = prompt('Введите имя спортсмена:');
    if (name && name.trim()) {
        const athlete = {
            id: Date.now().toString(),
            name: name.trim(),
            createdAt: new Date().toISOString()
        };
        athletes.push(athlete);
        saveDataToStorage();
        loadAthletes();
        loadAthletesList();
        updateCounts();
        showNotification('Спортсмен добавлен!');
    }
}

function loadAthletesList() {
    const list = document.getElementById('athletesList');
    list.innerHTML = '';
    
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
}

function deleteAthlete(id) {
    if (confirm('Удалить спортсмена?')) {
        athletes = athletes.filter(a => a.id !== id);
        saveDataToStorage();
        loadAthletes();
        loadAthletesList();
        updateCounts();
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

function saveWorkout() {
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
    
    const workout = {
        id: Date.now().toString(),
        athleteId: athleteId,
        date: date,
        type: selectedWorkoutType,
        exercises: currentWorkout.exercises,
        createdAt: new Date().toISOString()
    };
    
    workouts.push(workout);
    saveDataToStorage();
    
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
}

// Отображение результатов тренировок
function loadWorkoutResults() {
    const athleteId = document.getElementById('resultsAthleteSelect')?.value;
    const container = document.getElementById('workoutResultsContainer');
    
    if (!container) return;
    
    if (!athleteId) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Выберите спортсмена для просмотра результатов</p>';
        return;
    }
    
    const athleteWorkouts = workouts.filter(w => w.athleteId === athleteId);
    
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
        
        const athlete = athletes.find(a => a.id === workout.athleteId);
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

