<script>
    // Импортируем хук жизненного цикла
    import { onMount, onDestroy } from 'svelte';
    // Импортируем хранилища и центральную функцию обработки
    import { processNewEvent, metricsStore, rawEventStore } from '$lib/stores.js';
    import MetricsPanel from '$lib/components/MetricsPanel.svelte';
    import EventHistory from '$lib/components/EventHistory.svelte';
    // Импортируем компонент графика
    import LiveChart from '$lib/components/LiveChart.svelte';

    let eventSource = null;

    // Функция запускается при монтировании компонента (открытии страницы)
    onMount(() => {
        console.log('Подключаюсь к SSE-потоку...');

        // Создаём новое подключение EventSource к нашему эндпоинту
        eventSource = new EventSource('http://localhost:8000/api/stream');

        // Обработчик успешного открытия соединения
        eventSource.onopen = (event) => {
            console.log('SSE соединение установлено.');
            rawEventStore.set('SSE: Соединение активно. Ожидание данных...');
        };

        // Обработчик входящих сообщений
        eventSource.onmessage = (event) => {
            processNewEvent(event.data);
        };

        // Обработчик ошибок соединения
        eventSource.onerror = (err) => {
            console.error('Ошибка SSE соединения:', err);
            rawEventStore.set('SSE: Ошибка соединения. Попытка переподключения...');
            // Закрываем битое соединение
            if (eventSource) eventSource.close();
            // Через 3 секунды пытаемся переподключиться
            setTimeout(() => {
                console.log('Пытаюсь переподключиться...');
                // Здесь можно вызвать onMount логику заново,
                // но для простоты прототипа просто обновим страницу
                // location.reload();
            }, 3000);
        };
    });

    // Функция запускается при размонтировании компонента (закрытии вкладки)
    // Важно для очистки ресурсов.
    onDestroy(() => {
        if (eventSource) {
            console.log('Закрываю SSE соединение.');
            eventSource.close();
        }
    });

    // Функция для ручной остановки потока (для тестов)
    function stopStream() {
        if (eventSource) {
            eventSource.close();
            rawEventStore.set('Поток вручную остановлен.');
            console.log('Поток остановлен пользователем.');
        }
    }
</script>

<main>
    <h1>🔍 Svelte + SSE Прототип</h1>
    <p>Этот компонент подключен к реальному SSE-потоку.</p>

    <div class="status">
        <h2>Статус:</h2>
        <p>Получено событий: <strong>{$metricsStore.totalReceived}</strong></p>
        <p>Последнее сообщение: <code>{$rawEventStore || 'Ожидание данных...'}</code></p>
    </div>

    <!-- ПАНЕЛЬ МЕТРИК -->
    <MetricsPanel />

    <!-- График в реальном времени -->
    <LiveChart />

    <!-- ТАБЛИЦА ИСТОРИИ -->
    <EventHistory />

    <div class="controls">
        <button on:click={stopStream}>Остановить поток</button>
        <button on:click={() => location.reload()}>Перезагрузить страницу</button>
    </div>

    <p class="hint">Откройте консоль браузера (F12) чтобы увидеть детальный лог каждого события.</p>
</main>

<style>
    main {
        font-family: sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        line-height: 1.6;
    }
    .status {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
    }
    code {
        background: #eee;
        padding: 2px 5px;
        border-radius: 3px;
        word-break: break-all;
        display: inline-block;
        max-width: 100%;
        overflow-x: auto;
    }
    .controls button {
        margin-right: 10px;
        padding: 10px 15px;
        cursor: pointer;
    }
    .hint {
        margin-top: 30px;
        font-size: 0.9em;
        color: #666;
    }
</style>