# ============================================
# Этап 1: Бэкенд (установка зависимостей)
# ============================================
FROM python:3.10-slim AS backend-builder

WORKDIR /app/backend

COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# ============================================
# Этап 2: Фронтенд (сборка)
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json .

RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY frontend/ .

RUN npm run build

# ============================================
# Этап 3: Финальный образ
# ============================================
FROM python:3.10-slim

WORKDIR /app

# Копируем зависимости и код бэкенда
COPY --from=backend-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend-builder /app/backend /app/backend

# Копируем собранный фронтенд
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Копируем скрипт запуска
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8000 3000

CMD ["/start.sh"]
