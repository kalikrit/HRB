<script>
    // Импортируем необходимые модули
    import { onMount, onDestroy } from 'svelte';
    import { historyStore } from '$lib/stores.js';
    import Chart from 'chart.js/auto'; // Основной импорт Chart.js

    // Ссылка на DOM-элемент canvas
    let canvas;
    // Переменная для хранения экземпляра графика
    let chartInstance = null;

    // Настройки графика (конфиг Chart.js)
    let chartConfig = {
        type: 'line',
        data: {
            labels: [], // Здесь будут метки времени (x-axis)
            datasets: [{
                label: 'Значение (value)',
                data: [],  // Здесь будут значения (y-axis)
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 300 // Плавная анимация при добавлении точки
            },
            scales: {
                x: {
                    title: { display: true, text: 'Время' }
                },
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Значение' }
                }
            },
            plugins: {
                legend: { display: true }
            }
        }
    };

    // Функция инициализации графика (вызывается при монтировании)
    function initChart() {
        if (!canvas) return;
        // Создаём экземпляр графика
        chartInstance = new Chart(canvas, chartConfig);
        console.log('[LiveChart] График инициализирован');
    }

    // Функция обновления данных графика при изменении historyStore
    function updateChartData(history) {
        if (!chartInstance) return;

        // Берем последние 50 точек для отображения, чтобы график не перегружался
        const displayData = history.slice(0, 50).reverse(); // reverse() чтобы новое было справа

        // Обновляем данные в конфиге графика
        chartInstance.data.labels = displayData.map(event =>
            event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { second: '2-digit', fractionalSecondDigits: 3 }) : ''
        );
        chartInstance.data.datasets[0].data = displayData.map(event => event.value);

        // Запускаем плавное обновление графика
        chartInstance.update('none'); // 'none' чтобы не было лишней анимации при массовом обновлении
    }

    // Хук жизненного цикла: монтирование
    onMount(() => {
        initChart();
        // Сразу подписываемся на обновления хранилища истории
        const unsubscribe = historyStore.subscribe(updateChartData);
        // Возвращаем функцию очистки (вызовется в onDestroy)
        return () => {
            unsubscribe();
        };
    });

    // Хук жизненного цикла: размонтирование
    onDestroy(() => {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
            console.log('[LiveChart] График уничтожен');
        }
    });
</script>

<div class="chart-container">
    <h3>📈 График в реальном времени</h3>
    <p>Отображает последние 50 значений из истории. Данные обновляются автоматически.</p>
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    .chart-container {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.25rem;
        margin: 1.5rem 0;
    }
    .chart-container h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #212529;
    }
    .chart-container p {
        color: #6c757d;
        font-size: 0.9em;
        margin-bottom: 1rem;
    }
    canvas {
        width: 100% !important; /* Важно для адаптивности */
    }
</style>