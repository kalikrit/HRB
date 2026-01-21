<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  // Состояние
  let benchmarkData = null;
  let metrics = {};
  let isLoading = false;

  // Функция запуска бенчмарка
  async function runBenchmark() {
    isLoading = true;
    benchmarkData = null;
    metrics = {};

    const startTotalTime = performance.now();

    try {
      // Замер времени сети
      const networkStart = performance.now();
      const response = await axios.post('http://localhost:8000/api/benchmark/start', {
        framework: 'svelte',
        payloadSize: 1500,
        complexity: 'high'
      });
      const networkEnd = performance.now();

      // Замер времени рендеринга
      const renderStart = performance.now();
      benchmarkData = response.data.payload;

      // Svelte обновляет DOM синхронно после присвоения.
      // Используем tick() для гарантированного замера после рендеринга.
      await tick();
      const renderEnd = performance.now();
      const totalEnd = performance.now();

      // Сохраняем метрики
      metrics = {
        networkTime: (networkEnd - networkStart).toFixed(2),
        renderTime: (renderEnd - renderStart).toFixed(2),
        totalTime: (totalEnd - startTotalTime).toFixed(2),
        dataSize: response.data.payload.length
      };
    } catch (error) {
      console.error('Ошибка при запуске бенчмарка:', error);
    } finally {
      isLoading = false;
    }
  }

  // Вспомогательная функция для отображения первых 5 элементов
  function getFirstFiveItems() {
    if (!benchmarkData) return '';
    return JSON.stringify(benchmarkData.slice(0, 5), null, 2);
  }

  // Импортируем tick из svelte
  import { tick } from 'svelte';
</script>

<main>
  <header>
    <h1>Heavy Render Benchmark: Svelte</h1>
    <button 
      on:click={runBenchmark} 
      disabled={isLoading}
      class="benchmark-button"
    >
      {isLoading ? 'Загрузка...' : 'Start Benchmark (500 items)'}
    </button>

    <!-- Блок с метриками -->
    {#if metrics.renderTime}
      <div class="metrics">
        <h3>📊 Результаты:</h3>
        <p><strong>Время получения данных:</strong> {metrics.networkTime} мс</p>
        <p><strong>Время рендеринга:</strong> {metrics.renderTime} мс</p>
        <p><strong>Общее время:</strong> {metrics.totalTime} мс</p>
        <p><strong>Отрисовано элементов:</strong> {metrics.dataSize}</p>
      </div>
    {/if}

    <!-- Отображение данных -->
    <div class="data-container">
      {#if benchmarkData}
        <h3>Отрисованные данные (первые 5 из {benchmarkData.length}):</h3>
        <pre>{getFirstFiveItems()}</pre>
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
  .data-container pre {
    text-align: left;
    background: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    max-height: 400px;
    overflow: auto;
    max-width: 800px;
    margin: 0 auto;
  }
</style>