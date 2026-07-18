# Бэкенд
FROM python:3.10-slim AS backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .

# Фронтенд
FROM node:18-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json .
RUN npm config set registry https://registry.npmmirror.com
RUN npm install
COPY frontend/ .
RUN npm run build

# Финальный образ
FROM python:3.10-slim
WORKDIR /app
COPY --from=backend /app/backend /app/backend
COPY --from=frontend /app/frontend/build /app/frontend/build

# Устанавливаем зависимости для запуска
RUN pip install uvicorn fastapi

# Запускаем бэкенд
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
