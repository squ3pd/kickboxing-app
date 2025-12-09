# Инструкция по интеграции формул

Для корректной работы расчетов необходимо заменить функции расчета в файле `app.js` формулами из PDF файла "Шестаков №8.2025.pdf".

## Где находятся функции расчета

Все функции расчета находятся в файле `app.js` в конце файла.

## Функции, которые нужно обновить

### 1. calculateVOI() - Расчет УОИ (удельный объем интенсивности)

**Текущая реализация (строка ~150):**
```javascript
function calculateVOI(hr, duration) {
    const restingHR = 60;
    const maxHR = 200;
    const voi = ((hr - restingHR) / (maxHR - restingHR)) * 100;
    return Math.max(0, Math.min(100, voi.toFixed(1)));
}
```

**Что нужно сделать:**
- Заменить формулу на формулу из PDF
- Учесть все параметры, указанные в формуле
- Возможно, потребуется добавить дополнительные параметры (возраст, индивидуальные характеристики)

### 2. calculateSpeedScore() - Расчет оценки скорости

**Текущая реализация (строка ~280):**
```javascript
function calculateSpeedScore(time) {
    if (time <= 10) return 100;
    if (time >= 20) return 0;
    return ((20 - time) / 10 * 100).toFixed(1);
}
```

**Что нужно сделать:**
- Заменить на формулу из PDF для оценки бега на 100м
- Учесть нормативы и шкалу оценок

### 3. calculateEnduranceScore() - Расчет оценки выносливости

**Текущая реализация (строка ~290):**
```javascript
function calculateEnduranceScore(time) {
    if (time <= 8) return 100;
    if (time >= 20) return 0;
    return ((20 - time) / 12 * 100).toFixed(1);
}
```

**Что нужно сделать:**
- Заменить на формулу из PDF для оценки бега на 3000м
- Учесть нормативы и шкалу оценок

### 4. calculateStrengthScore() - Расчет оценки силы

**Текущая реализация (строка ~300):**
```javascript
function calculateStrengthScore(pushups, pullups, situps) {
    const pushupScore = Math.min(100, (pushups / 50) * 100);
    const pullupScore = Math.min(100, (pullups / 20) * 100);
    const situpScore = Math.min(100, (situps / 60) * 100);
    return ((pushupScore + pullupScore + situpScore) / 3).toFixed(1);
}
```

**Что нужно сделать:**
- Заменить на формулу из PDF для комплексной оценки силы
- Учесть весовые коэффициенты, если они указаны в формуле

### 5. calculateJumpScore() - Расчет оценки прыгучести

**Текущая реализация (строка ~310):**
```javascript
function calculateJumpScore(distance) {
    if (distance >= 300) return 100;
    if (distance <= 150) return 0;
    return ((distance - 150) / 150 * 100).toFixed(1);
}
```

**Что нужно сделать:**
- Заменить на формулу из PDF для оценки прыжка в длину
- Учесть нормативы и шкалу оценок

### 6. calculateFlexibilityScore() - Расчет оценки гибкости

**Текущая реализация (строка ~320):**
```javascript
function calculateFlexibilityScore(distance) {
    return Math.min(100, (distance / 30 * 100).toFixed(1));
}
```

**Что нужно сделать:**
- Заменить на формулу из PDF для оценки гибкости
- Учесть нормативы и шкалу оценок

## Пример замены функции

Допустим, формула из PDF выглядит так:
```
Оценка = (Результат - Минимум) / (Максимум - Минимум) * 100
```

Тогда функция будет выглядеть так:
```javascript
function calculateSpeedScore(time) {
    const minTime = 10; // Минимальное время (лучший результат)
    const maxTime = 20; // Максимальное время (худший результат)
    
    if (time <= minTime) return 100;
    if (time >= maxTime) return 0;
    
    const score = ((maxTime - time) / (maxTime - minTime)) * 100;
    return parseFloat(score.toFixed(1));
}
```

## Дополнительные параметры

Если формулы требуют дополнительные параметры (возраст, пол, вес и т.д.), необходимо:

1. Добавить поля ввода в форму спортсмена
2. Сохранять эти данные в объекте спортсмена
3. Передавать их в функции расчета

Пример:
```javascript
// В функции calculateVOI добавить параметры спортсмена
function calculateVOI(hr, duration, athlete) {
    const age = athlete.age || 20;
    const maxHR = 220 - age; // Формула расчета максимального ЧСС
    // ... остальная логика
}
```

## Тестирование

После замены формул:

1. Проверьте расчеты на тестовых данных
2. Убедитесь, что результаты соответствуют ожидаемым значениям
3. Проверьте граничные случаи (минимальные и максимальные значения)
4. Убедитесь, что нет ошибок деления на ноль

## Вопросы?

Если у вас возникли вопросы по интеграции формул, обратитесь к преподавателю или проверьте документацию в PDF файле.

