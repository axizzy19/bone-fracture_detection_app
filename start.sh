#!/bin/bash

# Переходим в папку бэкенда
cd /app/backend

# Устанавливаем uvicorn (если не установлен)
pip install uvicorn fastapi -q

# Запускаем бэкенд
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Ждём, пока бэкенд запустится
sleep 5

# Переходим в папку с фронтендом и запускаем простой сервер
cd /app/frontend/build
python3 -m http.server 3000
