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
 * Теперь поддерживает ПАКЕТНЫЕ обновления (batch: true).
 * @param {string} rawData - Сырые данные события (event.data)
 */
export function processNewEvent(rawData) {
    rawEventStore.set(rawData); // Для отладки всё ещё сохраняем сырые данные

    let parsedEvent = null;
    const clientTimestamp = Date.now();

    try {
        const jsonString = rawData.startsWith('data: ') ? rawData.slice(6) : rawData;
        parsedEvent = JSON.parse(jsonString);

        // ===== ВАЖНОЕ ИЗМЕНЕНИЕ: ОБРАБОТКА ПАКЕТА =====
        if (parsedEvent.batch && Array.isArray(parsedEvent.updates)) {
            // ОБРАБОТКА ПАКЕТА ИЗ МНОГИХ ОБНОВЛЕНИЙ
            let totalLatency = 0;
            let latencyCount = 0;

            // 1. Обновляем историю (добавляем все события из пакета)
            historyStore.update(history => {
                const newEntries = parsedEvent.updates.map(update => {
                    const serverTimestamp = update.timestamp ? new Date(update.timestamp).getTime() : null;
                    const latency = serverTimestamp ? (clientTimestamp - serverTimestamp) : null;

                    if (latency !== null) {
                        totalLatency += latency;
                        latencyCount++;
                    }

                    return {
                        ...update,
                        _clientTime: new Date(clientTimestamp).toISOString(),
                        _latency: latency
                    };
                });

                // Добавляем новые записи в начало и обрезаем до лимита
                return [...newEntries, ...history.slice(0, HISTORY_LIMIT - newEntries.length)];
            });

            // 2. Обновляем метрики для пакета
            metricsStore.update(currentMetrics => {
                const newTotal = currentMetrics.totalReceived + parsedEvent.updates.length;
                let newAvgLatency = currentMetrics.averageLatency;
                let lastLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : null;

                if (lastLatency !== null) {
                    newAvgLatency = currentMetrics.totalReceived === 0
                        ? lastLatency
                        : ((currentMetrics.averageLatency || 0) * currentMetrics.totalReceived + totalLatency) / newTotal;
                }

                return {
                    totalReceived: newTotal,
                    lastLatency: lastLatency,
                    averageLatency: newAvgLatency ? Math.round(newAvgLatency) : null
                };
            });

            // 3. Последнее событие из пакета сохраняем для eventStore (опционально)
            if (parsedEvent.updates.length > 0) {
                eventStore.set(parsedEvent.updates[0]);
            }

        } else {
            // ===== СТАРАЯ ЛОГИКА ДЛЯ ОДИНОЧНЫХ СОБЫТИЙ (на всякий случай) =====
            // ... (оставьте старый код из функции как есть, начиная с eventStore.set(parsedEvent);)
            // Этот блок теперь вряд ли будет выполняться, но пусть остаётся для совместимости
            const serverTimestamp = parsedEvent.timestamp ? new Date(parsedEvent.timestamp).getTime() : null;

            eventStore.set(parsedEvent);

            historyStore.update(history => {
                const newEntry = {
                    ...parsedEvent,
                    _clientTime: new Date(clientTimestamp).toISOString(),
                    _latency: serverTimestamp ? (clientTimestamp - serverTimestamp) : null
                };
                return [newEntry, ...history.slice(0, HISTORY_LIMIT - 1)];
            });

            metricsStore.update(currentMetrics => {
                const newTotal = currentMetrics.totalReceived + 1;
                let newAvgLatency = currentMetrics.averageLatency;
                let lastLatency = null;

                if (serverTimestamp) {
                    lastLatency = clientTimestamp - serverTimestamp;
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
        }

    } catch (error) {
        console.error('[store] Ошибка при обработке события:', error, 'Данные:', rawData);
    }
}