const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Инициализация базы данных
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initDatabase();
    }
});

// Инициализация таблиц
function initDatabase() {
    db.serialize(() => {
        // Таблица пользователей (Telegram ID)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            telegram_id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица спортсменов
        db.run(`CREATE TABLE IF NOT EXISTS athletes (
            id TEXT PRIMARY KEY,
            user_telegram_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
        )`);

        // Таблица тренировок
        db.run(`CREATE TABLE IF NOT EXISTS workouts (
            id TEXT PRIMARY KEY,
            user_telegram_id TEXT NOT NULL,
            athlete_id TEXT NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            exercises TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id),
            FOREIGN KEY (athlete_id) REFERENCES athletes(id)
        )`);

        console.log('✅ Таблицы базы данных инициализированы');
    });
}

// Получение Telegram ID из запроса
function getTelegramId(req) {
    // Приоритет: заголовок > query параметр > дефолтное значение
    const userId = req.headers['x-telegram-user-id'] || req.query.userId;
    
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.warn('⚠️ User ID не найден в запросе, используем тестовый');
        return 'test_user_' + Date.now();
    }
    
    return userId;
}

// API: Получить всех спортсменов пользователя
app.get('/api/athletes', (req, res) => {
    const userId = getTelegramId(req);
    
    db.all(
        'SELECT * FROM athletes WHERE user_telegram_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Ошибка получения спортсменов:', err);
                return res.status(500).json({ error: 'Ошибка получения данных' });
            }
            res.json(rows);
        }
    );
});

// API: Добавить спортсмена
app.post('/api/athletes', (req, res) => {
    const userId = getTelegramId(req);
    const { name } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Имя спортсмена обязательно' });
    }
    
    // Создаем или обновляем пользователя
    db.run(
        'INSERT OR IGNORE INTO users (telegram_id) VALUES (?)',
        [userId],
        (err) => {
            if (err) {
                console.error('Ошибка создания пользователя:', err);
            }
        }
    );
    
    const athleteId = Date.now().toString();
    const athlete = {
        id: athleteId,
        user_telegram_id: userId,
        name: name.trim(),
        created_at: new Date().toISOString()
    };
    
    db.run(
        'INSERT INTO athletes (id, user_telegram_id, name, created_at) VALUES (?, ?, ?, ?)',
        [athlete.id, athlete.user_telegram_id, athlete.name, athlete.created_at],
        (err) => {
            if (err) {
                console.error('Ошибка добавления спортсмена:', err);
                return res.status(500).json({ error: 'Ошибка сохранения' });
            }
            res.json(athlete);
        }
    );
});

// API: Удалить спортсмена
app.delete('/api/athletes/:id', (req, res) => {
    const userId = getTelegramId(req);
    const athleteId = req.params.id;
    
    db.run(
        'DELETE FROM athletes WHERE id = ? AND user_telegram_id = ?',
        [athleteId, userId],
        function(err) {
            if (err) {
                console.error('Ошибка удаления спортсмена:', err);
                return res.status(500).json({ error: 'Ошибка удаления' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Спортсмен не найден' });
            }
            res.json({ success: true });
        }
    );
});

// API: Получить все тренировки пользователя
app.get('/api/workouts', (req, res) => {
    const userId = getTelegramId(req);
    const athleteId = req.query.athleteId;
    
    let query = 'SELECT * FROM workouts WHERE user_telegram_id = ?';
    let params = [userId];
    
    if (athleteId) {
        query += ' AND athlete_id = ?';
        params.push(athleteId);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Ошибка получения тренировок:', err);
            return res.status(500).json({ error: 'Ошибка получения данных' });
        }
        
        // Парсим JSON строки упражнений
        const workouts = rows.map(row => ({
            ...row,
            exercises: JSON.parse(row.exercises)
        }));
        
        res.json(workouts);
    });
});

// API: Добавить тренировку
app.post('/api/workouts', (req, res) => {
    const userId = getTelegramId(req);
    const { athleteId, date, type, exercises } = req.body;
    
    if (!athleteId || !date || !type || !exercises || !Array.isArray(exercises)) {
        return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }
    
    const workoutId = Date.now().toString();
    const workout = {
        id: workoutId,
        user_telegram_id: userId,
        athlete_id: athleteId,
        date: date,
        type: type,
        exercises: JSON.stringify(exercises),
        created_at: new Date().toISOString()
    };
    
    db.run(
        'INSERT INTO workouts (id, user_telegram_id, athlete_id, date, type, exercises, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [workout.id, workout.user_telegram_id, workout.athlete_id, workout.date, workout.type, workout.exercises, workout.created_at],
        (err) => {
            if (err) {
                console.error('Ошибка добавления тренировки:', err);
                return res.status(500).json({ error: 'Ошибка сохранения' });
            }
            res.json({
                ...workout,
                exercises: JSON.parse(workout.exercises)
            });
        }
    );
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 API доступен по адресу: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Ошибка закрытия БД:', err.message);
        } else {
            console.log('✅ База данных закрыта');
        }
        process.exit(0);
    });
});

