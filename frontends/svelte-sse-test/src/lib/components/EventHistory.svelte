<script>
    // Импортируем хранилище истории событий
    import { historyStore } from '$lib/stores.js';
    // Реактивная переменная для количества отображаемых строк (можно менять)
    let visibleRows = 10;
</script>

<div class="history-panel">
    <h3>🕐 История событий (последние {visibleRows})</h3>

    <div class="controls">
        <label>
            Показать строк:
            <select bind:value={visibleRows}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </select>
        </label>
    </div>

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Значение</th>
                    <th>Время (сервер)</th>
                    <th>Задержка</th>
                </tr>
            </thead>
            <tbody>
                {#each $historyStore.slice(0, visibleRows) as event (event.id)}
                    <tr>
                        <td class="mono">{event.id}</td>
                        <td class="mono"><strong>{event.value}</strong></td>
                        <td class="mono">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], {hour12: false}) : '–'}</td>
                        <td class="mono latency {event._latency > 100 ? 'high-latency' : ''}">
                            {event._latency ? event._latency + ' мс' : '–'}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if $historyStore.length === 0}
            <p class="empty-message">История событий пуста. Ожидайте данные...</p>
        {/if}
    </div>
    <p class="hint">Всего событий в истории: {$historyStore.length}</p>
</div>

<style>
    .history-panel {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.25rem;
        margin: 1.5rem 0;
    }
    .history-panel h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #212529;
    }
    .controls {
        margin-bottom: 1rem;
    }
    .controls label {
        font-size: 0.9em;
        color: #6c757d;
    }
    .controls select {
        margin-left: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        border: 1px solid #ced4da;
    }
    .table-container {
        overflow-x: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9em;
    }
    th {
        background-color: #e9ecef;
        padding: 0.75rem;
        text-align: left;
        border-bottom: 2px solid #dee2e6;
        font-weight: 600;
        color: #495057;
    }
    td {
        padding: 0.75rem;
        border-bottom: 1px solid #dee2e6;
    }
    tbody tr:hover {
        background-color: #f1f3f4;
    }
    .mono {
        font-family: 'Courier New', monospace;
    }
    .latency {
        font-weight: bold;
    }
    .high-latency {
        color: #dc3545; /* Красный цвет для высокой задержки */
    }
    .empty-message {
        text-align: center;
        color: #6c757d;
        font-style: italic;
        padding: 2rem;
    }
    .hint {
        font-size: 0.8em;
        color: #6c757d;
        margin-top: 1rem;
        margin-bottom: 0;
    }
</style>