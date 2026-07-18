# ============================================
# Бэкенд
# ============================================
FROM python:3.10-slim AS backend

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# ============================================
# Фронтенд
# ============================================
FROM node:18-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package*.json .
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY frontend/ .
RUN npm run build

# ============================================
# Финальный образ
# ============================================
FROM python:3.10-slim

WORKDIR /app

# Копируем бэкенд
COPY --from=backend /app/backend /app/backend

# Копируем готовый фронтенд
COPY --from=frontend /app/frontend/build /app/frontend/build

# Устанавливаем uvicorn для запуска
RUN pip install --no-cache-dir uvicorn fastapi

# Копируем скрипт запуска
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8000 3000

CMD ["/start.sh"]
