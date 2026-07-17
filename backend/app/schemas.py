from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class BBoxBase(BaseModel):
    x_center: float
    y_center: float
    width: float
    height: float
    confidence: Optional[float] = None
    class_id: Optional[int] = 0

class BBoxCreate(BBoxBase):
    annotation_type: str
    is_verified: bool = False

class BBoxResponse(BBoxBase):
    id: int
    image_id: int
    annotation_type: str
    is_verified: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    predictions: List[BBoxResponse]

class CorrectionRequest(BaseModel):
    image_id: int
    bboxes: List[BBoxBase]
    corrected_by: Optional[str] = "doctor"

class TrainingStatusResponse(BaseModel):
    is_training: bool
    current_samples: int
    threshold: int
    last_training: Optional[datetime]
    model_metrics: Optional[dict]
    
    model_config = ConfigDict(protected_namespaces=())