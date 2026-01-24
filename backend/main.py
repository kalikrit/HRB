from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from enum import Enum
import random
from datetime import datetime

import asyncio
import json

# Создаем экземпляр приложения FastAPI
app = FastAPI(title="Heavy Render Benchmark API")

# ========== НАСТРОЙКА CORS ==========
# Разрешаем запросы с этих источников (origins)
origins = [
    "http://localhost:5173",  # React / Vite по умолчанию
    "http://localhost:5174",  # Для Vue или Svelte
    "http://localhost:5175",  # Резервный порт
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],  # Разрешаем все заголовки
)
# =====================================

# Перечисление для сложности данных
class Complexity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

# Модель для конфигурации запроса от фронтенда
class BenchmarkRequest(BaseModel):
    framework: str = "react"
    payloadSize: int = Field(default=1000, ge=1, le=5000)
    complexity: Complexity = Complexity.LOW

# Функция-генератор тестовых данных
def generate_item(item_id: int, complexity: Complexity):
    """Генерирует один тестовый объект."""
    base_item = {
        "id": item_id,
        "name": f"Item-{item_id}",
        "value": random.randint(1, 1000),
        "active": random.choice([True, False]),
        "timestamp": datetime.now().isoformat(),
        "description": "This is a test description for benchmarking purposes."
    }

    if complexity == Complexity.MEDIUM:
        base_item["tags"] = [f"tag-{i}" for i in range(random.randint(1, 5))]
        base_item["nested"] = {"level": 1, "score": random.uniform(0, 1)}
    elif complexity == Complexity.HIGH:
        base_item["tags"] = [f"tag-{i}" for i in range(random.randint(3, 7))]
        base_item["nested"] = {
            "level": random.randint(1, 3),
            "score": random.uniform(0, 1),
            "metadata": {
                "createdBy": f"user-{random.randint(1, 100)}",
                "priority": random.choice(["low", "medium", "high"])
            }
        }
        base_item["history"] = [
            {"event": f"event_{j}", "count": random.randint(1, 10)}
            for j in range(random.randint(2, 5))
        ]
    return base_item

# Главный эндпоинт API
@app.post("/api/benchmark/start")
async def start_benchmark(request: BenchmarkRequest):
    """
    Принимает конфигурацию бенчмарка и возвращает массив данных.
    Именно этот массив фронтенды будут пытаться отрендерить.
    """
    # Генерируем массив данных запрошенного размера и сложности
    payload = [
        generate_item(i, request.complexity)
        for i in range(request.payloadSize)
    ]
    return {
        "framework": request.framework,
        "generatedAt": datetime.now().isoformat(),
        "config": request.dict(),
        "payload": payload  # Основная нагрузка для фронтенда
    }

@app.get("/api/stream")
async def stream_data():
    """Поток Server-Sent Events с ПАКЕТНЫМИ обновлениями (нагрузочный тест)."""
    async def event_generator():
        # ИНИЦИАЛИЗАЦИЯ: создаём 100 виртуальных объектов с начальным состоянием
        objects = {
            i: {
                "id": i,
                "value": random.randint(1, 100),  # Начальное значение
                "trend": random.choice([-1, 1])   # Тренд для изменения (-1 = падает, 1 = растёт)
            }
            for i in range(100)  # У нас будет 100 независимых объектов
        }

        try:
            while True:
                await asyncio.sleep(0.1)  # Пауза 100 мс (~10 обновлений в секунду)

                # ФОРМИРУЕМ ПАКЕТ ОБНОВЛЕНИЙ: для каждого объекта немного меняем значение
                updates = []
                for obj_id, obj in objects.items():
                    # Изменяем значение с небольшим случайным шагом и трендом
                    change = random.uniform(-2.5, 2.5) * obj["trend"]
                    obj["value"] = max(0.1, obj["value"] + change)  # Не даём уйти ниже 0

                    # С 5% вероятностью меняем тренд
                    if random.random() < 0.05:
                        obj["trend"] *= -1

                    # Добавляем обновление в пакет
                    updates.append({
                        "id": obj_id,
                        "value": round(obj["value"], 4),
                        "timestamp": datetime.now().isoformat()
                    })

                # ОТПРАВЛЯЕМ ВЕСЬ ПАКЕТ КАК ОДНО СОБЫТИЕ SSE
                # Это эффективнее, чем 100 отдельных событий
                yield f"data: {json.dumps({'batch': True, 'updates': updates})}\n\n"

        except asyncio.CancelledError:
            print("Клиент отключился от нагрузочного потока")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
    
    
# Простой эндпоинт для проверки работоспособности сервера
@app.get("/")
async def root():
    return {"message": "Heavy Render Benchmark API is running"}