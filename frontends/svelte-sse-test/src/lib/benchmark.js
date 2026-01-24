import { writable } from 'svelte/store';

// Store для хранения метрик бенчмарка
export const benchmarkStore = writable({
    fps: 60,
    lastFrameTime: 0,
    processingTime: 0, // Время обработки последнего пакета (мс)
    isRunning: false
});

// Приватные переменные модуля
let frameCount = 0;
let lastTime = performance.now();
let animationFrameId = null;
let processingStartTime = 0;

/**
 * Запускает цикл измерения FPS.
 * Вызывается один раз при старте приложения.
 */
export function startFPSCounter() {
    if (animationFrameId) return; // Уже запущен

    benchmarkStore.update(s => ({ ...s, isRunning: true }));
    lastTime = performance.now();
    frameCount = 0;

    const measure = () => {
        animationFrameId = requestAnimationFrame(measure);
        frameCount++;

        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;

        // Пересчитываем FPS каждую секунду
        if (elapsed >= 1000) {
            const fps = Math.round((frameCount * 1000) / elapsed);
            benchmarkStore.update(s => ({ ...s, fps, lastFrameTime: currentTime }));
            frameCount = 0;
            lastTime = currentTime;
        }
    };

    animationFrameId = requestAnimationFrame(measure);
}

/**
 * Останавливает счётчик FPS.
 */
export function stopFPSCounter() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        benchmarkStore.update(s => ({ ...s, isRunning: false }));
    }
}

/**
 * Начинает замер времени обработки (вызвать ДО обработки пакета).
 */
export function startProcessingMeasure() {
    processingStartTime = performance.now();
}

/**
 * Заканчивает замер времени обработки (вызвать ПОСЛЕ обработки пакета).
 * Обновляет benchmarkStore.
 */
export function endProcessingMeasure() {
    const processingTime = performance.now() - processingStartTime;
    benchmarkStore.update(s => ({ ...s, processingTime: Math.round(processingTime) }));
}