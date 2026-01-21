import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // Состояние для хранения данных с бэкенда
  const [benchmarkData, setBenchmarkData] = useState(null)
  // Состояние для хранения метрик производительности
  const [metrics, setMetrics] = useState({})
  // Состояние для отображения процесса загрузки
  const [isLoading, setIsLoading] = useState(false)

  // Функция для запуска бенчмарка
  const runBenchmark = async () => {
    setIsLoading(true)
    setBenchmarkData(null)
    setMetrics({})

    // Фиксируем начальное время для замера общего времени выполнения
    const startTotalTime = performance.now()

    try {
      // Фиксируем время начала сетевого запроса
      const networkStart = performance.now()
      const response = await axios.post('http://localhost:8000/api/benchmark/start', {
        framework: 'react',
        payloadSize: 1500, 
        complexity: 'high'
      })
      const networkEnd = performance.now()

      // Фиксируем время перед началом рендеринга
      const renderStart = performance.now()

      // Сохраняем данные в состояние. Это вызовет ререндер компонента.
      setBenchmarkData(response.data.payload)

      // Используем useEffect для фиксации времени окончания рендеринга
      // Для простоты в этом шаге используем setTimeout, чтобы дать React обновить DOM
      setTimeout(() => {
        const renderEnd = performance.now()
        const totalEnd = performance.now()

        // Рассчитываем метрики
        setMetrics({
          networkTime: (networkEnd - networkStart).toFixed(2),
          renderTime: (renderEnd - renderStart).toFixed(2),
          totalTime: (totalEnd - startTotalTime).toFixed(2),
          dataSize: response.data.payload.length
        })
        setIsLoading(false)
      }, 0)

    } catch (error) {
      console.error('Ошибка при запуске бенчмарка:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Heavy Render Benchmark: React</h1>
        <button 
          onClick={runBenchmark} 
          disabled={isLoading}
          style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '20px' }}
        >
          {isLoading ? 'Загрузка...' : 'Start Benchmark (500 items)'}
        </button>

        {/* Блок с метриками */}
        {metrics.renderTime && (
          <div className="metrics" style={{ textAlign: 'left', marginBottom: '30px' }}>
            <h3>📊 Результаты:</h3>
            <p><strong>Время получения данных:</strong> {metrics.networkTime} мс</p>
            <p><strong>Время рендеринга:</strong> {metrics.renderTime} мс</p>
            <p><strong>Общее время:</strong> {metrics.totalTime} мс</p>
            <p><strong>Отрисовано элементов:</strong> {metrics.dataSize}</p>
          </div>
        )}

        {/* Отображение данных */}
        <div className="data-container">
          {benchmarkData ? (
            <>
              <h3>Отрисованные данные (первые 5 из {benchmarkData.length}):</h3>
              <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '15px', borderRadius: '5px', maxHeight: '400px', overflow: 'auto' }}>
                {JSON.stringify(benchmarkData.slice(0, 5), null, 2)}
              </pre>
            </>
          ) : isLoading ? (
            <p>Получение и отрисовка данных...</p>
          ) : (
            <p>Нажмите кнопку, чтобы запустить тест.</p>
          )}
        </div>
      </header>
    </div>
  )
}

export default App