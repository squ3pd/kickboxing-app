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
let standards = JSON.parse(localStorage.getItem('standards') || '{}');

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
    } else if (pageId === 'standardsPage') {
        loadAthletesForStandards();
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
    const standardsSelect = document.getElementById('standardsAthleteSelect');
    
    [select, standardsSelect].forEach(sel => {
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
        localStorage.setItem('athletes', JSON.stringify(athletes));
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
        localStorage.setItem('athletes', JSON.stringify(athletes));
        loadAthletes();
        loadAthletesList();
        updateCounts();
    }
}

function loadAthletesForStandards() {
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
        'usttm': 'УСТТМ'
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
    localStorage.setItem('workouts', JSON.stringify(workouts));
    
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

// Таблица нормативов
const standardFields = [
    { id: 'run100', name: 'Бег 100м', unit: 'сек' },
    { id: 'run3000', name: 'Бег 3000м', unit: 'мин' },
    { id: 'pushups', name: 'Отжимания', unit: 'раз' },
    { id: 'pullups', name: 'Подтягивания', unit: 'раз' },
    { id: 'situp', name: 'Пресс', unit: 'раз' },
    { id: 'jump', name: 'Прыжок в длину', unit: 'см' },
    { id: 'flexibility', name: 'Гибкость', unit: 'см' }
];

function loadStandards() {
    const athleteId = document.getElementById('standardsAthleteSelect').value;
    
    if (!athleteId) {
        document.getElementById('standardsTableBody').innerHTML = '';
        document.getElementById('resultsTable').style.display = 'none';
        return;
    }
    
    const athleteStandards = standards[athleteId] || {};
    const tbody = document.getElementById('standardsTableBody');
    tbody.innerHTML = '';
    
    standardFields.forEach(field => {
        const row = document.createElement('tr');
        const value = athleteStandards[field.id] || '';
        row.innerHTML = `
            <td>${field.name}</td>
            <td>
                <input type="number" 
                       id="std_${field.id}" 
                       value="${value}" 
                       step="0.01"
                       onchange="updateStandard('${athleteId}', '${field.id}', this.value)">
            </td>
            <td>${field.unit}</td>
        `;
        tbody.appendChild(row);
    });
    
    calculateResults(athleteId, athleteStandards);
}

function updateStandard(athleteId, fieldId, value) {
    if (!standards[athleteId]) {
        standards[athleteId] = {};
    }
    standards[athleteId][fieldId] = parseFloat(value) || 0;
    calculateResults(athleteId, standards[athleteId]);
}

function saveStandards() {
    const athleteId = document.getElementById('standardsAthleteSelect').value;
    
    if (!athleteId) {
        showNotification('Выберите спортсмена');
        return;
    }
    
    // Сохраняем все значения из полей ввода
    standardFields.forEach(field => {
        const input = document.getElementById(`std_${field.id}`);
        if (input) {
            updateStandard(athleteId, field.id, input.value);
        }
    });
    
    localStorage.setItem('standards', JSON.stringify(standards));
    showNotification('Нормативы сохранены!');
    calculateResults(athleteId, standards[athleteId]);
}

function calculateResults(athleteId, athleteStandards) {
    // Здесь должны быть формулы из PDF файла
    // Пока используем базовые расчеты
    
    const results = {};
    
    // Пример расчетов (нужно заменить формулами из PDF)
    if (athleteStandards.run100) {
        // Пример: оценка скорости
        results['Оценка скорости'] = calculateSpeedScore(athleteStandards.run100);
    }
    
    if (athleteStandards.run3000) {
        results['Оценка выносливости'] = calculateEnduranceScore(athleteStandards.run3000);
    }
    
    if (athleteStandards.pushups && athleteStandards.pullups && athleteStandards.situp) {
        results['Оценка силы'] = calculateStrengthScore(
            athleteStandards.pushups,
            athleteStandards.pullups,
            athleteStandards.situp
        );
    }
    
    if (athleteStandards.jump) {
        results['Оценка прыгучести'] = calculateJumpScore(athleteStandards.jump);
    }
    
    if (athleteStandards.flexibility) {
        results['Оценка гибкости'] = calculateFlexibilityScore(athleteStandards.flexibility);
    }
    
    // Общая оценка (пример)
    const scores = Object.values(results).filter(v => typeof v === 'number');
    if (scores.length > 0) {
        results['Общая оценка'] = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    }
    
    renderResultsTable(results);
}

// Функции расчета (заменить формулами из PDF)
function calculateSpeedScore(time) {
    // Пример: чем меньше время, тем выше оценка
    // Максимум 100 баллов за 10 секунд, минимум 0 за 20 секунд
    if (time <= 10) return 100;
    if (time >= 20) return 0;
    return ((20 - time) / 10 * 100).toFixed(1);
}

function calculateEnduranceScore(time) {
    // Пример: чем меньше время, тем выше оценка
    // Максимум 100 баллов за 8 минут, минимум 0 за 20 минут
    if (time <= 8) return 100;
    if (time >= 20) return 0;
    return ((20 - time) / 12 * 100).toFixed(1);
}

function calculateStrengthScore(pushups, pullups, situps) {
    // Пример: среднее значение нормализованных оценок
    const pushupScore = Math.min(100, (pushups / 50) * 100);
    const pullupScore = Math.min(100, (pullups / 20) * 100);
    const situpScore = Math.min(100, (situps / 60) * 100);
    return ((pushupScore + pullupScore + situpScore) / 3).toFixed(1);
}

function calculateJumpScore(distance) {
    // Пример: чем больше расстояние, тем выше оценка
    // Максимум 100 баллов за 300 см, минимум 0 за 150 см
    if (distance >= 300) return 100;
    if (distance <= 150) return 0;
    return ((distance - 150) / 150 * 100).toFixed(1);
}

function calculateFlexibilityScore(distance) {
    // Пример: чем больше расстояние, тем выше оценка
    // Максимум 100 баллов за 30 см, минимум 0 за 0 см
    return Math.min(100, (distance / 30 * 100).toFixed(1));
}

function renderResultsTable(results) {
    const container = document.getElementById('resultsTable');
    const tbody = document.getElementById('resultsTableBody');
    
    if (Object.keys(results).length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    tbody.innerHTML = '';
    
    Object.entries(results).forEach(([key, value]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${key}</td>
            <td>${value}</td>
        `;
        tbody.appendChild(row);
    });
}

