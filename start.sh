#!/bin/bash

# Переходим в папку бэкенда
cd /app/backend

# Запускаем бэкенд
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Ждём запуск бэкенда
sleep 5

# Запускаем фронтенд (статику)
cd /app/frontend/build
python3 -m http.server 3000
