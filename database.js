// IndexedDB база данных - работает полностью в браузере, без сервера

class KickboxingDB {
    constructor() {
        this.dbName = 'KickboxingDB';
        this.version = 1;
        this.db = null;
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ Ошибка открытия IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB открыта успешно');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Удаляем старые хранилища, если они есть
                if (db.objectStoreNames.contains('athletes')) {
                    db.deleteObjectStore('athletes');
                }
                if (db.objectStoreNames.contains('workouts')) {
                    db.deleteObjectStore('workouts');
                }

                // Создаем хранилище для спортсменов
                const athletesStore = db.createObjectStore('athletes', { keyPath: 'id' });
                athletesStore.createIndex('userId', 'userId', { unique: false });
                athletesStore.createIndex('createdAt', 'createdAt', { unique: false });

                // Создаем хранилище для тренировок
                const workoutsStore = db.createObjectStore('workouts', { keyPath: 'id' });
                workoutsStore.createIndex('userId', 'userId', { unique: false });
                workoutsStore.createIndex('athleteId', 'athleteId', { unique: false });
                workoutsStore.createIndex('date', 'date', { unique: false });
                workoutsStore.createIndex('createdAt', 'createdAt', { unique: false });

                console.log('✅ Структура IndexedDB создана');
            };
        });
    }

    // Получить всех спортсменов пользователя
    async getAthletes(userId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const transaction = this.db.transaction(['athletes'], 'readonly');
            const store = transaction.objectStore('athletes');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                const athletes = request.result.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                resolve(athletes);
            };

            request.onerror = () => {
                console.error('❌ Ошибка получения спортсменов:', request.error);
                reject(request.error);
            };
        });
    }

    // Добавить спортсмена
    async addAthlete(userId, athlete) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const athleteData = {
                ...athlete,
                userId: userId,
                createdAt: athlete.createdAt || new Date().toISOString()
            };

            const transaction = this.db.transaction(['athletes'], 'readwrite');
            const store = transaction.objectStore('athletes');
            const request = store.add(athleteData);

            request.onsuccess = () => {
                console.log('✅ Спортсмен добавлен в IndexedDB:', athleteData.id);
                resolve(athleteData);
            };

            request.onerror = () => {
                console.error('❌ Ошибка добавления спортсмена:', request.error);
                reject(request.error);
            };
        });
    }

    // Удалить спортсмена
    async deleteAthlete(userId, athleteId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const transaction = this.db.transaction(['athletes'], 'readwrite');
            const store = transaction.objectStore('athletes');
            const request = store.get(athleteId);

            request.onsuccess = () => {
                const athlete = request.result;
                if (!athlete) {
                    reject(new Error('Спортсмен не найден'));
                    return;
                }

                if (athlete.userId !== userId) {
                    reject(new Error('Нет доступа к этому спортсмену'));
                    return;
                }

                const deleteRequest = store.delete(athleteId);
                deleteRequest.onsuccess = () => {
                    console.log('✅ Спортсмен удален из IndexedDB:', athleteId);
                    resolve(true);
                };

                deleteRequest.onerror = () => {
                    console.error('❌ Ошибка удаления спортсмена:', deleteRequest.error);
                    reject(deleteRequest.error);
                };
            };

            request.onerror = () => {
                console.error('❌ Ошибка получения спортсмена:', request.error);
                reject(request.error);
            };
        });
    }

    // Получить все тренировки пользователя
    async getWorkouts(userId, athleteId = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const transaction = this.db.transaction(['workouts'], 'readonly');
            const store = transaction.objectStore('workouts');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                let workouts = request.result;

                // Фильтруем по спортсмену, если указан
                if (athleteId) {
                    workouts = workouts.filter(w => w.athleteId === athleteId);
                }

                // Сортируем по дате (новые сверху)
                workouts = workouts.sort((a, b) => {
                    const dateCompare = new Date(b.date) - new Date(a.date);
                    if (dateCompare !== 0) return dateCompare;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });

                resolve(workouts);
            };

            request.onerror = () => {
                console.error('❌ Ошибка получения тренировок:', request.error);
                reject(request.error);
            };
        });
    }

    // Добавить тренировку
    async addWorkout(userId, workout) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const workoutData = {
                ...workout,
                userId: userId,
                createdAt: workout.createdAt || new Date().toISOString()
            };

            const transaction = this.db.transaction(['workouts'], 'readwrite');
            const store = transaction.objectStore('workouts');
            const request = store.add(workoutData);

            request.onsuccess = () => {
                console.log('✅ Тренировка добавлена в IndexedDB:', workoutData.id);
                resolve(workoutData);
            };

            request.onerror = () => {
                console.error('❌ Ошибка добавления тренировки:', request.error);
                reject(request.error);
            };
        });
    }

    // Удалить все тренировки спортсмена
    async deleteWorkoutsByAthleteId(userId, athleteId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('База данных не инициализирована'));
                return;
            }

            const transaction = this.db.transaction(['workouts'], 'readwrite');
            const store = transaction.objectStore('workouts');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                const workouts = request.result;
                const workoutsToDelete = workouts.filter(w => w.athleteId === athleteId);
                
                if (workoutsToDelete.length === 0) {
                    console.log('✅ Нет тренировок для удаления');
                    resolve(0);
                    return;
                }

                let deletedCount = 0;
                let deletePromises = workoutsToDelete.map(workout => {
                    return new Promise((resolveDelete, rejectDelete) => {
                        const deleteRequest = store.delete(workout.id);
                        deleteRequest.onsuccess = () => {
                            deletedCount++;
                            resolveDelete();
                        };
                        deleteRequest.onerror = () => {
                            rejectDelete(deleteRequest.error);
                        };
                    });
                });

                Promise.all(deletePromises)
                    .then(() => {
                        console.log(`✅ Удалено ${deletedCount} тренировок спортсмена ${athleteId}`);
                        resolve(deletedCount);
                    })
                    .catch((error) => {
                        console.error('❌ Ошибка удаления тренировок:', error);
                        reject(error);
                    });
            };

            request.onerror = () => {
                console.error('❌ Ошибка получения тренировок:', request.error);
                reject(request.error);
            };
        });
    }

    // Получить статистику
    async getStats(userId) {
        const [athletes, workouts] = await Promise.all([
            this.getAthletes(userId),
            this.getWorkouts(userId)
        ]);

        return {
            athletesCount: athletes.length,
            workoutsCount: workouts.length
        };
    }
}

// Создаем глобальный экземпляр базы данных
const kickboxingDB = new KickboxingDB();

