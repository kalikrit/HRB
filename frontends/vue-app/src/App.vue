<template>
  <div class="app">
    <header>
      <h1>Heavy Render Benchmark: Vue 3</h1>
      <button 
        @click="runBenchmark" 
        :disabled="isLoading"
        class="benchmark-button"
      >
        {{ isLoading ? 'Загрузка...' : 'Start Benchmark (500 items)' }}
      </button>

      <!-- Блок с метриками -->
      <div v-if="metrics.renderTime" class="metrics">
        <h3>📊 Результаты:</h3>
        <p><strong>Время получения данных:</strong> {{ metrics.networkTime }} мс</p>
        <p><strong>Время рендеринга:</strong> {{ metrics.renderTime }} мс</p>
        <p><strong>Общее время:</strong> {{ metrics.totalTime }} мс</p>
        <p><strong>Отрисовано элементов:</strong> {{ metrics.dataSize }}</p>
      </div>

      <!-- Отображение данных -->
      <div class="data-container">
        <h3 v-if="benchmarkData">
          Отрисованные данные (первые 5 из {{ benchmarkData.length }}):
        </h3>
        <pre v-if="benchmarkData">{{ getFirstFiveItems }}</pre>
        <p v-else-if="isLoading">Получение и отрисовка данных...</p>
        <p v-else>Нажмите кнопку, чтобы запустить тест.</p>
      </div>
    </header>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import axios from 'axios'

// Состояние для данных, метрик и загрузки
const benchmarkData = ref(null)
const metrics = ref({})
const isLoading = ref(false)

// Запуск бенчмарка
const runBenchmark = async () => {
  isLoading.value = true
  benchmarkData.value = null
  metrics.value = {}

  const startTotalTime = performance.now()

  try {
    // Замер времени сети
    const networkStart = performance.now()
    const response = await axios.post('http://localhost:8000/api/benchmark/start', {
      framework: 'vue',
      payloadSize: 1500,
      complexity: 'high'
    })
    const networkEnd = performance.now()

    // Замер времени рендеринга
    const renderStart = performance.now()
    benchmarkData.value = response.data.payload

    // Ожидаем обновления DOM для замера окончания рендеринга
    await nextTick()
    const renderEnd = performance.now()
    const totalEnd = performance.now()

    // Сохраняем метрики
    metrics.value = {
      networkTime: (networkEnd - networkStart).toFixed(2),
      renderTime: (renderEnd - renderStart).toFixed(2),
      totalTime: (totalEnd - startTotalTime).toFixed(2),
      dataSize: response.data.payload.length
    }
  } catch (error) {
    console.error('Ошибка при запуске бенчмарка:', error)
  } finally {
    isLoading.value = false
  }
}

// Вспомогательная computed-функция для отображения первых 5 элементов
const getFirstFiveItems = computed(() => {
  if (!benchmarkData.value) return ''
  return JSON.stringify(benchmarkData.value.slice(0, 5), null, 2)
})
</script>

<style scoped>
.app {
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