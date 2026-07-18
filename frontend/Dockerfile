# ============================================
# Этап 1: Сборка приложения
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем российское зеркало npm (для ускорения)
RUN npm config set registry https://registry.npmmirror.com

# Устанавливаем зависимости
RUN npm install

# Копируем весь исходный код
COPY . .

# Собираем приложение
RUN npm run build

# ============================================
# Этап 2: Запуск через nginx
# ============================================
FROM nginx:alpine

# Копируем собранное приложение из первого этапа
COPY --from=build /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]