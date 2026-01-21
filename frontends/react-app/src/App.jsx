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
  // Состояние для хранения данных графика FPS
  const [fpsChartData, setFpsChartData] = useState([]);

  // Функция для запуска бенчмарка
const runBenchmark = async () => {
  setIsLoading(true);
  setBenchmarkData(null);
  setMetrics({});
  setFpsChartData([]);

  const startTotalTime = performance.now();

  try {
    // 1. СЕТЕВОЙ ЗАПРОС
    const networkStart = performance.now();
    const response = await axios.post('http://localhost:8000/api/benchmark/start', {
      framework: 'react',
      payloadSize: 2500, // Увеличиваем нагрузку
      complexity: 'high'
    });
    const networkEnd = performance.now();
    const networkTime = networkEnd - networkStart;

    // 2. НАСТРОЙКА СИСТЕМЫ ЗАМЕРА FPS (ЗАПУСКАЕМ СРАЗУ)
    let animationFrameId;
    let frameCount = 0;
    let lastFrameTime = performance.now();
    const fpsSamples = [];

    const measureFPS = (timestamp) => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      // Делаем замер КАЖДЫЙ КАДР (примерно каждые 16 мс при 60 FPS)
      if (elapsed >= 10) { // Небольшой порог для начала сбора
        const currentFPS = (frameCount / elapsed) * 1000;
        fpsSamples.push({
          time: (now - startTotalTime).toFixed(0),
          fps: Math.min(Math.max(currentFPS, 0), 120).toFixed(1) // Ограничиваем разумный диапазон
        });
        // Обновляем график в реальном времени
        setFpsChartData([...fpsSamples.slice(-20)]); // Храним последние 20 замеров
        frameCount = 0;
        lastFrameTime = now;
      }
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    // ЗАПУСКАЕМ ЗАМЕР FPS ПРЯМО СЕЙЧАС
    animationFrameId = requestAnimationFrame(measureFPS);

    // 4. ЗАПУСК РЕНДЕРИНГА
    const renderStart = performance.now();
    setBenchmarkData(response.data.payload);

    // 5. ОЖИДАНИЕ ЗАВЕРШЕНИЯ РЕНДЕРИНГА (с увеличенным временем)
    await new Promise(resolve => {
      const checkRenderComplete = () => {
        requestAnimationFrame(() => {
          // Ждём минимум 100 мс, чтобы FPS-система успела сделать замеры
          if (performance.now() - renderStart > 100) {
            resolve();
          } else {
            checkRenderComplete();
          }
        });
      };
      checkRenderComplete();
    });

    // 6. ОСТАНОВКА ЗАМЕРОВ И ПОДСЧЁТ
    cancelAnimationFrame(animationFrameId);
    const renderEnd = performance.now();
    const totalEnd = performance.now();

    const renderTime = renderEnd - renderStart;
    const totalTime = totalEnd - startTotalTime;

    // Расчёт среднего FPS ТОЛЬКО по замерам, сделанным ВО ВРЕМЯ рендеринга
    const samplesDuringRender = fpsSamples.filter(s => 
      parseFloat(s.time) >= (renderStart - startTotalTime) && 
      parseFloat(s.time) <= (renderEnd - startTotalTime)
    );
    
    const avgFPS = samplesDuringRender.length > 0
      ? (samplesDuringRender.reduce((sum, sample) => sum + parseFloat(sample.fps), 0) / samplesDuringRender.length).toFixed(1)
      : `0 (${fpsSamples.length} samples total)`; // Если не попали в интервал рендеринга

    setMetrics({
      networkTime: networkTime.toFixed(2),
      renderTime: renderTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      dataSize: response.data.payload.length,
      fps: avgFPS,
      fpsSampleCount: samplesDuringRender.length || fpsSamples.length
    });

  } catch (error) {
    console.error('Ошибка:', error);
    setMetrics({ error: 'Произошла ошибка' });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="App">
      <header className="App-header">
        <h1>Heavy Render Benchmark: React</h1>
        <button 
          onClick={runBenchmark} 
          disabled={isLoading}
          style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '20px' }}
        >
          {isLoading ? 'Загрузка...' : 'Start Benchmark (2500 items)'}
        </button>

        {/* Блок с метриками */}
        {metrics.renderTime && (
          <div className="metrics" style={{ textAlign: 'left', marginBottom: '30px' }}>
            <h3>📊 Результаты:</h3>
            <p><strong>Время получения данных:</strong> {metrics.networkTime} мс</p>
            <p><strong>Время рендеринга:</strong> {metrics.renderTime} мс</p>
            <p><strong>Общее время:</strong> {metrics.totalTime} мс</p>
            <p><strong>Средний FPS во время рендеринга:</strong> {metrics.fps} ({metrics.fpsSampleCount} замеров)</p>
            <p><strong>Отрисовано элементов:</strong> {metrics.dataSize}</p>

            {/* Простая текстовая визуализация графика FPS */}
            {fpsChartData.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <p><strong>График FPS (последние 10 замеров):</strong></p>
                <div style={{
                  height: '20px',
                  background: '#e0e0e0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end'
                }}>
                  {fpsChartData.slice(-10).map((sample, idx) => (
                    <div
                      key={idx}
                      title={`${sample.time}мс: ${sample.fps} FPS`}
                      style={{
                        flex: 1,
                        height: `${(sample.fps / 60) * 100}%`,
                        background: sample.fps > 30 ? '#4caf50' : sample.fps > 15 ? '#ff9800' : '#f44336',
                        margin: '0 1px'
                      }}
                    />
                  ))}
                </div>
                <small style={{ display: 'block', textAlign: 'center', color: '#666' }}>
                  Время → (Зелёный: &gt;30 FPS, Оранжевый: 15-30 FPS, Красный: &lt;15 FPS)
                </small>
              </div>
            )}
          </div>
        )}

        {/* Отображение данных в виде реальной таблицы */}
        <div className="data-container" style={{ maxHeight: '500px', overflow: 'auto', marginTop: '20px' }}>
          {benchmarkData ? (
            <>
              <h3>Отрисовано элементов: {benchmarkData.length}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>ID</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>Name</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>Value</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>Active</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>Tags</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc' }}>Nested Level</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.map((item) => (
                    <tr 
                      key={item.id} 
                      style={{ 
                        background: item.active ? '#e8f5e9' : '#fce4ec',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.id}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.value}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.active ? '✅' : '❌'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.tags?.join(', ') || '-'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.nested?.level || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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