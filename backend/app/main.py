from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from datetime import datetime

from .database import engine
from .models import Base, XRayImage, Annotation
from .ml.model_manager import init_model_manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medical Detection API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:80", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "/app/models/best.pt"

print(f"Загрузка модели из: {MODEL_PATH}")
model_manager = init_model_manager(MODEL_PATH, "/app/models")

if model_manager and model_manager.detector and model_manager.detector.model is not None:
    print(f"Модель загружена успешно")
else:
    print(f"Модель не загружена, детекция не работает")

from .routers import detection, annotations

app.include_router(detection.router)
app.include_router(annotations.router)

@app.get("/")
async def root():
    return {"message": "Medical Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    model_loaded = False
    if model_manager and model_manager.detector:
        model_loaded = model_manager.detector.model is not None
    return {"status": "healthy", "model_loaded": model_loaded}

@app.get("/api/images/{filename}")
async def get_image(filename: str):
    """Отдача загруженного изображения"""
    image_path = os.path.join("/app/data/images", filename)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return FileResponse(image_path)

@app.on_event("startup")
async def startup_event():
    print("Приложение запущено")