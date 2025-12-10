# Бэкенд для Telegram Mini App - Кикбоксинг

## Установка и запуск

### 1. Установите зависимости

```bash
npm install
```

### 2. Запустите сервер

```bash
npm start
```

Сервер запустится на порту 3000 (или на порту, указанном в переменной окружения PORT).

### 3. API Endpoints

#### Спортсмены

- `GET /api/athletes?userId=TELEGRAM_USER_ID` - Получить всех спортсменов пользователя
- `POST /api/athletes?userId=TELEGRAM_USER_ID` - Добавить спортсмена
  - Body: `{ "name": "Имя спортсмена" }`
- `DELETE /api/athletes/:id?userId=TELEGRAM_USER_ID` - Удалить спортсмена

#### Тренировки

- `GET /api/workouts?userId=TELEGRAM_USER_ID&athleteId=ATHLETE_ID` - Получить тренировки
- `POST /api/workouts?userId=TELEGRAM_USER_ID` - Добавить тренировку
  - Body: `{ "athleteId": "...", "date": "2025-01-01", "type": "training", "exercises": [...] }`

## База данных

Используется SQLite. База данных создается автоматически в файле `database.sqlite`.

### Структура таблиц

- `users` - Пользователи (Telegram ID)
- `athletes` - Спортсмены
- `workouts` - Тренировки

## Деплой

### Вариант 1: Vercel / Railway / Render

1. Загрузите код на платформу
2. Установите переменные окружения (если нужно)
3. Сервер запустится автоматически

### Вариант 2: VPS

1. Установите Node.js на сервере
2. Загрузите код
3. Запустите через PM2: `pm2 start server.js`
4. Настройте Nginx как reverse proxy

## Обновление API URL во фронтенде

В файле `app.js` измените `API_BASE_URL` на URL вашего сервера:

```javascript
const API_BASE_URL = 'https://your-server-url.com/api';
```

