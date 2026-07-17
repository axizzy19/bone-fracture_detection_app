from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import TrainingHistory, ModelVersion
from ..schemas import TrainingStatusResponse

router = APIRouter(prefix="/api/training", tags=["training"])

@router.get("/history")
async def get_training_history(db: Session = Depends(get_db)):
    """Получение истории обучения"""
    history = db.query(TrainingHistory).order_by(
        TrainingHistory.started_at.desc()
    ).limit(50).all()
    
    return [
        {
            'id': h.id,
            'status': h.status,
            'samples_used': h.samples_used,
            'metrics': h.metrics,
            'error_message': h.error_message,
            'started_at': h.started_at,
            'completed_at': h.completed_at
        }
        for h in history
    ]

@router.post("/trigger")
async def trigger_manual_training(db: Session = Depends(get_db)):
    """Ручной запуск обучения (для тестирования)"""
    return {"status": "training_started", "message": "Обучение запущено вручную"}