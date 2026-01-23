<script>
    // Импортируем хранилище метрик
    import { metricsStore } from '$lib/stores.js';
    // Префикс $ означает автоматическую подписку на обновления
</script>

<div class="metrics-panel">
    <h3>📊 Метрики производительности</h3>
    <div class="metrics-grid">
        <div class="metric">
            <span class="metric-label">Событий получено:</span>
            <span class="metric-value">{$metricsStore.totalReceived}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Последняя задержка:</span>
            <span class="metric-value">
                {$metricsStore.lastLatency ? $metricsStore.lastLatency + ' мс' : '–'}
            </span>
        </div>
        <div class="metric">
            <span class="metric-label">Средняя задержка:</span>
            <span class="metric-value">
                {$metricsStore.averageLatency ? $metricsStore.averageLatency + ' мс' : '–'}
            </span>
        </div>
    </div>
    <p class="hint">Задержка — время между отправкой события сервером и его обработкой в браузере.</p>
</div>

<style>
    .metrics-panel {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.25rem;
        margin: 1.5rem 0;
    }
    .metrics-panel h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #212529;
    }
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    .metric {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border-left: 4px solid #3498db;
    }
    .metric-label {
        display: block;
        font-size: 0.85em;
        color: #6c757d;
        margin-bottom: 0.25rem;
    }
    .metric-value {
        display: block;
        font-size: 1.5em;
        font-weight: bold;
        color: #212529;
    }
    .hint {
        font-size: 0.8em;
        color: #6c757d;
        margin-top: 1rem;
        margin-bottom: 0;
    }
</style>