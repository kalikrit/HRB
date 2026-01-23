import { writable } from 'svelte/store';

// 1. Хранилище для сырой строки последнего SSE-события
export const rawEventStore = writable('');

// 2. Хранилище для последнего распарсенного события (объект)
export const eventStore = writable(null);

// 3. Хранилище для истории последних событий (массив объектов)
export const historyStore = writable([]);
const HISTORY_LIMIT = 20; // Максимальная длина истории

// 4. Хранилище для метрик производительности
export const metricsStore = writable({
    totalReceived: 0,      // Общее количество обработанных событий
    lastLatency: null,     // Задержка последнего события (мс)
    averageLatency: null   // Средняя задержка (мс)
});

/**
 * ЦЕНТРАЛЬНАЯ ФУНКЦИЯ ДЛЯ ОБРАБОТКИ НОВОГО СОБЫТИЯ ИЗ SSE.
 * @param {string} rawData - Сырые данные события (event.data)
 */
export function processNewEvent(rawData) {
    // 1. Сохраняем сырые данные
    rawEventStore.set(rawData);

    let parsedEvent = null;
    let serverTimestamp = null;
    const clientTimestamp = Date.now(); // Время получения на клиенте

    try {
        // 2. Парсим JSON, отрезая префикс "data: " если он есть
        const jsonString = rawData.startsWith('data: ') ? rawData.slice(6) : rawData;
        parsedEvent = JSON.parse(jsonString);

        // 3. Сохраняем распарсенное событие
        eventStore.set(parsedEvent);

        // 4. Вычисляем задержку (latency), если есть метка времени с сервера
        if (parsedEvent.timestamp) {
            // Приводим ISO-строку с сервера к миллисекундам
            serverTimestamp = new Date(parsedEvent.timestamp).getTime();
        }

        // 5. Обновляем историю событий
        historyStore.update(history => {
            const newEntry = {
                ...parsedEvent, // Все поля с сервера
                _clientTime: new Date(clientTimestamp).toISOString(), // Наша метка
                _latency: serverTimestamp ? (clientTimestamp - serverTimestamp) : null // Задержка
            };
            // Добавляем новое событие в начало массива и обрезаем до лимита
            return [newEntry, ...history.slice(0, HISTORY_LIMIT - 1)];
        });

        // 6. Обновляем метрики производительности
        metricsStore.update(currentMetrics => {
            const newTotal = currentMetrics.totalReceived + 1;
            let newAvgLatency = currentMetrics.averageLatency;
            let lastLatency = null;

            // Если смогли вычислить задержку для этого события
            if (serverTimestamp) {
                lastLatency = clientTimestamp - serverTimestamp;
                // Пересчитываем среднюю задержку: (старая_средняя * старое_кол-во + новая_задержка) / новое_кол-во
                newAvgLatency = currentMetrics.totalReceived === 0
                    ? lastLatency
                    : ((currentMetrics.averageLatency || 0) * currentMetrics.totalReceived + lastLatency) / newTotal;
            }

            return {
                totalReceived: newTotal,
                lastLatency: lastLatency,
                averageLatency: newAvgLatency ? Math.round(newAvgLatency) : null
            };
        });

    } catch (error) {
        console.error('[store] Ошибка при обработке события:', error, 'Данные:', rawData);
    }
}