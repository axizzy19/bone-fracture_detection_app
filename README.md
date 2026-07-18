# Bone Fracture Detection

**Веб-приложение для детекции переломов на рентгеновских снимках с возможностью редактирования разметки и дообучения модели.**

---

## О проекте

Это полнофункциональное веб-приложение, которое позволяет:

- Загружать рентгеновские снимки
- Автоматически детектировать переломы с помощью дообученной YOLOv8
- Редактировать предсказания модели (добавлять/удалять/изменять боксы)
- Сохранять исправленные аннотации для дообучения модели
- Накопливать данные и запускать автоматическое дообучение (на данный момент не реализовано в самом приложении)

---

## Пример работы

<img width="1644" height="1262" alt="image" src="https://github.com/user-attachments/assets/2eb5a418-fcc1-49fc-b6de-535af5893129" />

---

## Модель

- **Архитектура:** YOLOv8 (YOLOv8l)
- **Задача:** Детекция переломов
- **Классы:** `elbow positive`, `fingers positive`, `forearm fracture`, `humerus fracture`, `humerus`, `shoulder fracture`, `wrist positive`
- **Формат аннотаций:** YOLO с полигонами (4 точки)
- **Дообучение:** автоматическое на накопленных исправлениях

Веса модели можно скачать [отсюда](https://drive.google.com/file/d/1Qps9W6gvOdb_8djLl3GPhCUVlFTJjS3F/view?usp=sharing) \
Исследование в поисках наилучшей модели [тут](https://github.com/axizzy19/bone-fracture_detection_research/tree/main)

---

## Технологии

| Компонент | Технология |
|-----------|------------|
| **Бэкенд** | FastAPI, SQLAlchemy, PostgreSQL |
| **Машинное обучение** | YOLOv8, PyTorch, Ultralytics |
| **Фронтенд** | React, React Bootstrap, Axios |
| **Контейнеризация** | Docker, Docker Compose |
| **Деплой** | Nginx |

---

## Структура проекта
bone-fracture-detection/\
├── backend/ # Бэкенд (FastAPI)\
│ ├── app/\
│ │ ├── ml/ # Модель и обучение\
│ │ │ ├── detector.py # Загрузка и инференс модели\
│ │ │ ├── trainer.py # Дообучение модели\
│ │ │ ├── evaluator.py # Валидация модели\
│ │ │ └── model_manager.py # Управление версиями моделей\
│ │ ├── routers/ # API эндпоинты\
│ │ │ ├── detection.py # Загрузка и детекция\
│ │ │ └── annotations.py # Сохранение исправлений\
│ │ │ └── training.py\
│ │ ├── models.py # SQLAlchemy модели\
│ │ ├── database.py # Подключение к БД\
│ │ └── schemas.py # Pydantic схемы\
│ │ └── main.py\
│ │ └── crud.py\
│ ├── models/ # Файлы моделей\
│ └── requirements.txt # зависимости\
│
├── frontend/ # Фронтенд (React)\
│ ├── src/\
│ │ ├── components/\
│ │ │ ├── ImageUploader.js\
│ │ │ ├── ImageViewer.js # Просмотр и редактирование боксов\
│ │ │ └── TrainingControl.js\
│ │ │ └── LoadingScreen.js\
│ │ │ └── LoadingScreen.css\
│ │ ├── services/\
│ │ │ └── api.js\
│ │ └── App.js\
│ ├── public/\
│ │ │ └── index.html\
│ │ │ └── favicon.svg\
│ ├── package.json\
│ └── Dockerfile\
│
├── docker-compose.yml # Docker Compose\
└── README.md # Этот файл\

---

## Запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/axizzy19/bone-fracture_detection_app.git
cd bone-fracture_detection_app
```
### 2. Запустить через Docker
```bash
docker-compose up -d --build
```
