# Этап сборки
FROM node:18-alpine AS build

WORKDIR /app

# Копирование package.json
COPY package.json ./

# Установка зависимостей
RUN npm install

# Копирование всего остального кода
COPY . .

# Сборка приложения
RUN npm run build

# Этап production - nginx
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/build /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]