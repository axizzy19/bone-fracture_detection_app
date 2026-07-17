from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import shutil
import os
from datetime import datetime

from ..database import get_db
from ..models import XRayImage, Annotation
from ..schemas import ImageUploadResponse, BBoxResponse
from ..ml.model_manager import model_manager

router = APIRouter(prefix="/api/detection", tags=["detection"])

@router.post("/predict", response_model=ImageUploadResponse)
async def predict_fracture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Загрузка изображения и детекция"""
    try:
        print(f"Получен файл: {file.filename}")
        
        images_dir = "/app/data/images"
        os.makedirs(images_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(images_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        db_image = XRayImage(
            filename=filename,
            file_path=file_path
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        
        predictions = []
        if model_manager and model_manager.detector and model_manager.detector.model is not None:
            try:
                predictions = model_manager.predict(file_path)
            except Exception as e:
                print(f"Ошибка предсказания: {e}")
        else:
            print("Модель не загружена, возвращаем пустой результат")

        saved_predictions = []
        for pred in predictions:
            annotation = Annotation(
                image_id=db_image.id,
                x_center=pred['x_center'],
                y_center=pred['y_center'],
                width=pred['width'],
                height=pred['height'],
                annotation_type='ai_prediction',
                confidence=pred['confidence'],
                is_verified=False
            )
            db.add(annotation)
            db.commit()
            db.refresh(annotation)
            saved_predictions.append(annotation)
        
        return ImageUploadResponse(
            id=db_image.id,
            filename=filename,
            upload_date=db_image.upload_date,
            predictions=[BBoxResponse.model_validate(p) for p in saved_predictions]
        )
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка обработки: {str(e)}")