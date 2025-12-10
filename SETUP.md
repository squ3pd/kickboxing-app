# Инструкция по установке и запуску

## Быстрый старт

### 1. Установите зависимости

```bash
npm install
```

Это установит:
- express - веб-сервер
- cors - для CORS запросов
- sqlite3 - база данных
- node-telegram-bot-api - для Telegram бота (опционально)

### 2. Запустите сервер

```bash
npm start
```

Сервер запустится на `http://localhost:3000`

### 3. Обновите API URL во фронтенде

В файле `app.js` найдите строку:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://your-server-url.com/api'; // Замените на ваш URL
```

Замените `https://your-server-url.com/api` на URL вашего сервера.

### 4. Деплой

#### Вариант 1: Railway (рекомендуется)

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Railway автоматически определит Node.js проект
5. Получите URL вашего приложения
6. Обновите API_BASE_URL в app.js

#### Вариант 2: Render

1. Зарегистрируйтесь на https://render.com
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Укажите команду запуска: `npm start`
5. Получите URL и обновите API_BASE_URL

#### Вариант 3: VPS

1. Установите Node.js на сервере
2. Загрузите код
3. Установите зависимости: `npm install`
4. Запустите через PM2: `pm2 start server.js`
5. Настройте Nginx как reverse proxy

## Проверка работы

1. Откройте `http://localhost:3000` в браузере
2. Откройте консоль разработчика (F12)
3. Попробуйте добавить спортсмена
4. Проверьте, что данные сохраняются в `database.sqlite`

## Структура базы данных

База данных создается автоматически в файле `database.sqlite`.

Таблицы:
- `users` - пользователи Telegram
- `athletes` - спортсмены
- `workouts` - тренировки

## Troubleshooting

### Проблема: "Cannot find module 'sqlite3'"

Решение: Установите зависимости заново
```bash
npm install
```

### Проблема: Порт 3000 занят

Решение: Измените порт через переменную окружения
```bash
PORT=3001 npm start
```

### Проблема: Данные не сохраняются

Решение: 
1. Проверьте, что сервер запущен
2. Проверьте консоль браузера на ошибки
3. Убедитесь, что API_BASE_URL правильный

