import asyncio
import threading
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json
import os
import shutil

from ..database import get_db, SessionLocal
from ..models import XRayImage, Annotation, ModelVersion
from ..schemas import CorrectionRequest, BBoxResponse, TrainingStatusResponse

router = APIRouter(prefix="/api/annotations", tags=["annotations"])

pending_corrections = 0
training_threshold = 100
is_training = False

ANNOTATIONS_DIR = "/app/data/annotations"
IMAGES_DIR = "/app/data/images"
TRAINING_IMAGES_DIR = "/app/data/training_images"
TRAINING_LABELS_DIR = "/app/data/training_labels"

def save_training_data(image_id: int, filename: str, bboxes: List[dict]):
    """
    Сохраняет исправленные изображения и их аннотации в формате YOLO с полигонами
    Формат: class_id x1 y1 x2 y2 x3 y3 x4 y4
    """
    os.makedirs(ANNOTATIONS_DIR, exist_ok=True)
    os.makedirs(TRAINING_IMAGES_DIR, exist_ok=True)
    os.makedirs(TRAINING_LABELS_DIR, exist_ok=True)

    source_image = os.path.join(IMAGES_DIR, filename)
    dest_image = os.path.join(TRAINING_IMAGES_DIR, filename)
    
    if os.path.exists(source_image):
        shutil.copy2(source_image, dest_image)

    base_name = os.path.splitext(filename)[0]
    label_file = os.path.join(TRAINING_LABELS_DIR, f"{base_name}.txt")
    
    with open(label_file, 'w', encoding='utf-8') as f:
        for bbox in bboxes:
            x_center = bbox['x_center']
            y_center = bbox['y_center']
            width = bbox['width']
            height = bbox['height']

            x1 = x_center - width / 2
            y1 = y_center - height / 2
            x2 = x_center + width / 2
            y2 = y_center - height / 2
            x3 = x_center + width / 2
            y3 = y_center + height / 2
            x4 = x_center - width / 2
            y4 = y_center + height / 2
            
            class_id = bbox.get('class_id', 0)
            f.write(f"{class_id} {x1:.6f} {y1:.6f} {x2:.6f} {y2:.6f} {x3:.6f} {y3:.6f} {x4:.6f} {y4:.6f}\n")

    annotation_file = os.path.join(ANNOTATIONS_DIR, f"{base_name}_annotations.json")
    annotation_data = {
        'image_filename': filename,
        'image_id': image_id,
        'source': 'human_correction',
        'saved_at': datetime.now().isoformat(),
        'has_fractures': len(bboxes) > 0,
        'annotations': bboxes
    }
    
    with open(annotation_file, 'w', encoding='utf-8') as f:
        json.dump(annotation_data, f, indent=2, ensure_ascii=False)
    
    return label_file

async def sync_pending_corrections():
    """Синхронизация счетчика с БД"""
    global pending_corrections, training_threshold
    
    db = SessionLocal()
    try:
        real_count = db.query(Annotation.image_id).filter(
            Annotation.annotation_type == 'human_correction',
            Annotation.is_verified == True
        ).distinct().count()
        pending_corrections = real_count
        
    finally:
        db.close()

@router.post("/correct")
async def correct_annotations(
    request: CorrectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Сохранение исправленных пользователем bbox"""
    global pending_corrections, training_threshold
    
    image = db.query(XRayImage).filter(XRayImage.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")

    db.query(Annotation).filter(
        Annotation.image_id == request.image_id,
        Annotation.annotation_type == 'human_correction'
    ).delete()
    db.query(Annotation).filter(
        Annotation.image_id == request.image_id,
        Annotation.annotation_type == 'ai_prediction'
    ).delete()

    saved_count = 0
    bboxes_for_file = []
    for bbox in request.bboxes:
        annotation = Annotation(
            image_id=request.image_id,
            x_center=bbox.x_center,
            y_center=bbox.y_center,
            width=bbox.width,
            height=bbox.height,
            annotation_type='human_correction',
            is_verified=True,
            corrected_by=request.corrected_by or "doctor",
            confidence=None
        )
        db.add(annotation)
        saved_count += 1
        bboxes_for_file.append({
            'x_center': bbox.x_center,
            'y_center': bbox.y_center,
            'width': bbox.width,
            'height': bbox.height,
            'class_id': bbox.class_id if hasattr(bbox, 'class_id') else 0
        })
    
    db.commit()
    
    # Сохраняем в файлы YOLO формата (с полигонами)
    if saved_count > 0 or True:  # Сохраняем даже пустые (без перелома)
        try:
            save_training_data(request.image_id, image.filename, bboxes_for_file)
        except Exception as e:
            print(f"Ошибка сохранения данных: {e}")
    
    pending_corrections = db.query(Annotation).filter(
        Annotation.annotation_type == 'human_correction',
        Annotation.is_verified == True
    ).count()
    
    print(f"Всего накоплено исправлений: {pending_corrections} из {training_threshold}")
    
    print(f"ℹАвтоматическое обучение ОТКЛЮЧЕНО (накоплено: {pending_corrections})")
    
    return {
        "status": "success", 
        "message": f"Сохранено {saved_count} аннотаций", 
        "pending_corrections": pending_corrections,
        "threshold": training_threshold,
        "saved_count": saved_count
    }

@router.get("/count", response_model=TrainingStatusResponse)
async def get_annotation_count(db: Session = Depends(get_db)):
    global pending_corrections, is_training, training_threshold
    
    real_count = db.query(Annotation.image_id).filter(
        Annotation.annotation_type == 'human_correction',
        Annotation.is_verified == True
    ).distinct().count()
    
    pending_corrections = real_count
    
    print(f"Статус: {real_count} изображений с исправлениями (порог: {training_threshold})")
    
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    metrics = active_model.metrics if active_model else None
    if metrics and isinstance(metrics, str):
        try:
            metrics = json.loads(metrics)
        except:
            metrics = None
    
    return TrainingStatusResponse(
        is_training=is_training,
        current_samples=real_count,
        threshold=training_threshold,
        last_training=active_model.created_at if active_model else None,
        model_metrics=metrics
    )

@router.post("/force-train")
async def force_training(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Принудительный запуск обучения"""
    global is_training
    
    if is_training:
        return {"status": "error", "message": "Обучение уже запущено"}

    count = db.query(Annotation).filter(
        Annotation.annotation_type == 'human_correction',
        Annotation.is_verified == True
    ).count()
    
    if count < 3:
        return {"status": "error", "message": f"Недостаточно данных: {count} исправлений (нужно минимум 3)"}
    
    print(f"Принудительный запуск обучения на {count} примерах")
    background_tasks.add_task(trigger_training)
    
    return {"status": "success", "message": f"Обучение запущено на {count} примерах"}

async def trigger_training():
    """Фоновая задача для запуска обучения"""
    global is_training, pending_corrections
    
    if is_training:
        print("Обучение уже запущено")
        return
    
    print("ЗАПУСК ДООБУЧЕНИЯ МОДЕЛИ")
    
    is_training = True
    
    try:
        db = SessionLocal()
        try:
            corrections = db.query(
                Annotation, XRayImage
            ).join(
                XRayImage, Annotation.image_id == XRayImage.id
            ).filter(
                Annotation.annotation_type == 'human_correction',
                Annotation.is_verified == True
            ).all()
            
            
            if len(corrections) < 3:
                print(f"Слишком мало данных")
                is_training = False
                return
            
            annotations_by_image = {}
            image_paths = []
            for ann, image in corrections:
                if ann.image_id not in annotations_by_image:
                    annotations_by_image[ann.image_id] = {
                        'image_path': image.file_path,
                        'bboxes': []
                    }
                    image_paths.append(image.file_path)
                annotations_by_image[ann.image_id]['bboxes'].append({
                    'x_center': ann.x_center,
                    'y_center': ann.y_center,
                    'width': ann.width,
                    'height': ann.height,
                    'class_id': 0
                })
            
            annotations_list = list(annotations_by_image.values())
            
        finally:
            db.close()
        
        if len(annotations_list) < 3:
            print(f"Слишком мало изображений")
            is_training = False
            return
        
        from ..ml.trainer import ModelTrainer
        import os as os_module
        
        model_path = os_module.getenv("MODEL_PATH", "/app/models/best.pt")
        
        trainer = ModelTrainer("/app/models", "/app/data")
        
        print("Начинаем дообучение...")
        new_model_path, metrics = await trainer.train_async(
            model_path,
            annotations_list,
            epochs=10,
            callback=None
        )
        
        print(f"Дообучение завершено!")
        print(f"Новая модель: {new_model_path}")
        print(f"Метрики: {metrics}")

        try:
            from ..ml.model_manager import model_manager
            if model_manager and model_manager.detector:
                model_manager.detector.reload_model(new_model_path)
                model_manager.current_model_path = new_model_path
        except Exception as e:
            print(f"Ошибка обновления ModelManager: {e}")
        
        db = SessionLocal()
        try:
            used_image_ids = db.query(Annotation.image_id).filter(
                Annotation.annotation_type == 'human_correction',
                Annotation.is_verified == True
            ).distinct().all()
            used_image_ids = [id[0] for id in used_image_ids]
            
            deleted_annotations = db.query(Annotation).filter(
                Annotation.annotation_type == 'human_correction',
                Annotation.is_verified == True
            ).delete()
            
            deleted_images = 0
            if used_image_ids:
                deleted_images = db.query(XRayImage).filter(
                    XRayImage.id.in_(used_image_ids)
                ).delete(synchronize_session=False)
            
            db.commit()
            print(f"Удалено из БД: {deleted_annotations} аннотаций, {deleted_images} изображений")
            
            for image_path in image_paths:
                try:
                    if os.path.exists(image_path):
                        os.remove(image_path)
                except Exception as e:
                    print(f"Не удалось удалить {image_path}: {e}")
            
            for dir_path in ['/app/data/training_images', '/app/data/training_labels', '/app/data/annotations']:
                if os.path.exists(dir_path):
                    for f in os.listdir(dir_path):
                        file_path = os.path.join(dir_path, f)
                        try:
                            if os.path.isfile(file_path):
                                os.remove(file_path)
                        except Exception as e:
                            print(f"Не удалось удалить {file_path}: {e}")
            
            pending_corrections = 0
            print(f"Счетчик сброшен: {pending_corrections}")
            
        finally:
            db.close()
        
    except Exception as e:
        print(f"Ошибка обучения: {e}")
        import traceback
        traceback.print_exc()
    finally:
        is_training = False
        print("ДООБУЧЕНИЕ ЗАВЕРШЕНО")

@router.post("/sync")
async def sync_counter(db: Session = Depends(get_db)):
    """Принудительная синхронизация счетчика"""
    global pending_corrections
    
    real_count = db.query(Annotation).filter(
        Annotation.annotation_type == 'human_correction',
        Annotation.is_verified == True
    ).count()
    pending_corrections = real_count
    
    return {
        "status": "success",
        "pending_corrections": pending_corrections,
        "threshold": training_threshold,
        "ready_for_training": pending_corrections >= training_threshold
    }

@router.get("/status")
async def get_training_status():
    """Получение статуса обучения"""
    global is_training, pending_corrections, training_threshold
    return {
        "is_training": is_training,
        "pending_corrections": pending_corrections,
        "threshold": training_threshold,
        "ready_for_training": pending_corrections >= training_threshold
    }

@router.post("/clear-all")
async def clear_all_data(db: Session = Depends(get_db)):
    """Полная очистка всех данных"""
    global pending_corrections
    
    deleted_annotations = db.query(Annotation).delete()
    deleted_images = db.query(XRayImage).delete()
    db.commit()
    
    for dir_path in [IMAGES_DIR, TRAINING_IMAGES_DIR, ANNOTATIONS_DIR, TRAINING_LABELS_DIR]:
        if os.path.exists(dir_path):
            for f in os.listdir(dir_path):
                file_path = os.path.join(dir_path, f)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Не удалось удалить {file_path}: {e}")
    
    pending_corrections = 0
    
    return {
        "status": "success",
        "deleted_annotations": deleted_annotations,
        "deleted_images": deleted_images,
        "pending_corrections": pending_corrections
    }

@router.get("/all")
async def get_all_annotations(db: Session = Depends(get_db)):
    """Получение всех аннотаций"""
    annotations = db.query(Annotation).all()
    result = []
    for ann in annotations:
        result.append({
            "id": ann.id,
            "image_id": ann.image_id,
            "filename": ann.image.filename if ann.image else None,
            "x_center": ann.x_center,
            "y_center": ann.y_center,
            "width": ann.width,
            "height": ann.height,
            "annotation_type": ann.annotation_type,
            "is_verified": ann.is_verified,
            "confidence": ann.confidence,
            "corrected_by": ann.corrected_by,
            "created_at": ann.created_at.isoformat() if ann.created_at else None
        })
    return {"total": len(result), "annotations": result}

@router.get("/export-yolo")
async def export_yolo_annotations(db: Session = Depends(get_db)):
    """Экспорт всех аннотаций в формате YOLO (полигоны)"""
    annotations = db.query(Annotation).filter(
        Annotation.annotation_type == 'human_correction',
        Annotation.is_verified == True
    ).all()
    
    result = []
    for ann in annotations:
        x1 = ann.x_center - ann.width / 2
        y1 = ann.y_center - ann.height / 2
        x2 = ann.x_center + ann.width / 2
        y2 = ann.y_center - ann.height / 2
        x3 = ann.x_center + ann.width / 2
        y3 = ann.y_center + ann.height / 2
        x4 = ann.x_center - ann.width / 2
        y4 = ann.y_center + ann.height / 2
        
        result.append({
            "image_id": ann.image_id,
            "filename": ann.image.filename if ann.image else None,
            "class_id": 0,
            "points": [
                {"x": x1, "y": y1},
                {"x": x2, "y": y2},
                {"x": x3, "y": y3},
                {"x": x4, "y": y4}
            ],
            "yolo_format": f"0 {x1:.6f} {y1:.6f} {x2:.6f} {y2:.6f} {x3:.6f} {y3:.6f} {x4:.6f} {y4:.6f}"
        })
    
    return {
        "total": len(result),
        "annotations": result
    }