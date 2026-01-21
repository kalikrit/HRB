<script>
    import { tick } from 'svelte';
    import axios from 'axios';

    // Состояние
    let benchmarkData = null;
    let metrics = {};
    let isLoading = false;
    let fpsChartData = [];

    // Функция запуска бенчмарка
    async function runBenchmark() {
        isLoading = true;
        benchmarkData = null;
        metrics = {};
        fpsChartData = [];

        const startTotalTime = performance.now();

        try {
            // 1. СЕТЕВОЙ ЗАПРОС
            const networkStart = performance.now();
            const response = await axios.post('http://localhost:8000/api/benchmark/start', {
                framework: 'svelte',
                payloadSize: 2500, // Увеличиваем нагрузку
                complexity: 'high'
            });
            const networkEnd = performance.now();
            const networkTime = networkEnd - networkStart;

            // 2. НАСТРОЙКА СИСТЕМЫ ЗАМЕРА FPS
            let animationFrameId;
            let frameCount = 0;
            let lastFrameTime = performance.now();
            const fpsSamples = [];

            function measureFPS(timestamp) {
                frameCount++;
                const now = performance.now();
                const elapsed = now - lastFrameTime;

                if (elapsed >= 10) {
                    const currentFPS = (frameCount / elapsed) * 1000;
                    fpsSamples.push({
                        time: (now - startTotalTime).toFixed(0),
                        fps: Math.min(Math.max(currentFPS, 0), 120).toFixed(1)
                    });
                    fpsChartData = [...fpsSamples.slice(-20)];
                    frameCount = 0;
                    lastFrameTime = now;
                }
                animationFrameId = requestAnimationFrame(measureFPS);
            }

            // Запускаем замер FPS
            animationFrameId = requestAnimationFrame(measureFPS);

            // 3. ЗАПУСК РЕНДЕРИНГА
            const renderStart = performance.now();
            benchmarkData = response.data.payload;

            // 4. ОЖИДАНИЕ ЗАВЕРШЕНИЯ РЕНДЕРИНГА
            // Ждём обновления DOM Svelte
            await tick();
            // Дополнительно ждём, чтобы браузер отрисовал кадр
            await new Promise(resolve => {
                const checkRenderComplete = () => {
                    requestAnimationFrame(() => {
                        if (performance.now() - renderStart > 50) {
                            resolve();
                        } else {
                            checkRenderComplete();
                        }
                    });
                };
                checkRenderComplete();
            });

            // 5. ОСТАНОВКА ЗАМЕРОВ И ПОДСЧЁТ
            cancelAnimationFrame(animationFrameId);
            const renderEnd = performance.now();
            const totalEnd = performance.now();

            const renderTime = renderEnd - renderStart;
            const totalTime = totalEnd - startTotalTime;

            // Расчёт среднего FPS по замерам ВО ВРЕМЯ рендеринга
            const samplesDuringRender = fpsSamples.filter(s =>
                parseFloat(s.time) >= (renderStart - startTotalTime) &&
                parseFloat(s.time) <= (renderEnd - startTotalTime)
            );

            const avgFPS = samplesDuringRender.length > 0
                ? (samplesDuringRender.reduce((sum, sample) => sum + parseFloat(sample.fps), 0) / samplesDuringRender.length).toFixed(1)
                : `0 (${fpsSamples.length} samples total)`;

            metrics = {
                networkTime: networkTime.toFixed(2),
                renderTime: renderTime.toFixed(2),
                totalTime: totalTime.toFixed(2),
                dataSize: response.data.payload.length,
                fps: avgFPS,
                fpsSampleCount: samplesDuringRender.length || fpsSamples.length
            };

        } catch (error) {
            console.error('Ошибка при запуске бенчмарка:', error);
            metrics = { error: 'Произошла ошибка' };
        } finally {
            isLoading = false;
        }
    }

    // Вспомогательная функция для заголовка графика
    function getChartTitle() {
        if (!fpsChartData.length) return 'График FPS';
        const lastSample = fpsChartData[fpsChartData.length - 1];
        return `График FPS (до ${lastSample.time} мс)`;
    }
</script>

<main>
    <header>
        <h1>Heavy Render Benchmark: Svelte</h1>
        <button
            on:click={runBenchmark}
            disabled={isLoading}
            class="benchmark-button"
        >
            {isLoading ? 'Загрузка...' : 'Start Benchmark (2500 items)'}
        </button>

        <!-- Блок с метриками -->
        {#if metrics.renderTime}
            <div class="metrics">
                <h3>📊 Результаты:</h3>
                <p><strong>Время получения данных:</strong> {metrics.networkTime} мс</p>
                <p><strong>Время рендеринга:</strong> {metrics.renderTime} мс</p>
                <p><strong>Общее время:</strong> {metrics.totalTime} мс</p>
                <p><strong>Средний FPS во время рендеринга:</strong> {metrics.fps} ({metrics.fpsSampleCount} замеров)</p>
                <p><strong>Отрисовано элементов:</strong> {metrics.dataSize}</p>

                <!-- График FPS -->
                {#if fpsChartData.length > 0}
                    <div style="margin-top: 15px;">
                        <p><strong>{getChartTitle()} (последние 10 замеров):</strong></p>
                        <div style="
                            height: 20px;
                            background: #e0e0e0;
                            border-radius: 3px;
                            overflow: hidden;
                            display: flex;
                            align-items: flex-end;
                        ">
                            {#each fpsChartData.slice(-10) as sample, idx (idx)}
                                <div
                                    title="{sample.time}мс: {sample.fps} FPS"
                                    style="
                                        flex: 1;
                                        height: {(sample.fps / 60) * 100}%;
                                        background: {sample.fps > 30 ? '#4caf50' : sample.fps > 15 ? '#ff9800' : '#f44336'};
                                        margin: 0 1px;
                                    "
                                />
                            {/each}
                        </div>
                        <small style="display: block; text-align: center; color: #666;">
                            Время → (Зелёный: >30 FPS, Оранжевый: 15-30 FPS, Красный: &lt;15 FPS)
                        </small>
                    </div>
                {:else}
                    <p><small>График FPS: рендеринг был слишком быстрым для захвата кадров.</small></p>
                {/if}
            </div>
        {/if}

        <!-- Отображение данных в виде реальной таблицы -->
        <div class="data-container">
            {#if benchmarkData}
                <h3>Отрисовано элементов: {benchmarkData.length}</h3>
                <table class="render-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Value</th>
                            <th>Active</th>
                            <th>Tags</th>
                            <th>Nested Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each benchmarkData as item (item.id)}
                            <tr class={item.active ? 'active-row' : 'inactive-row'}>
                                <td>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.value}</td>
                                <td>{item.active ? '✅' : '❌'}</td>
                                <td>{item.tags?.join(', ') || '-'}</td>
                                <td>{item.nested?.level || '-'}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else if isLoading}
                <p>Получение и отрисовка данных...</p>
            {:else}
                <p>Нажмите кнопку, чтобы запустить тест.</p>
            {/if}
        </div>
    </header>
</main>

<style>
    main {
        text-align: center;
        font-family: sans-serif;
        padding: 20px;
    }
    .benchmark-button {
        padding: 10px 20px;
        font-size: 16px;
        margin-bottom: 20px;
        cursor: pointer;
    }
    .metrics {
        text-align: left;
        margin: 0 auto 30px;
        max-width: 500px;
        background: #f9f9f9;
        padding: 15px;
        border-radius: 8px;
    }
    .data-container {
        max-height: 500px;
        overflow: auto;
        margin-top: 20px;
    }
    .render-table {
        width: 100%;
        border-collapse: collapse;
        font-family: monospace;
        font-size: 12px;
    }
    .render-table th {
        padding: 8px;
        border: 1px solid #ccc;
        background: #f0f0f0;
        position: sticky;
        top: 0;
    }
    .render-table td {
        padding: 8px;
        border: 1px solid #ccc;
    }
    .active-row {
        background-color: #e8f5e9;
    }
    .inactive-row {
        background-color: #fce4ec;
    }
</style>