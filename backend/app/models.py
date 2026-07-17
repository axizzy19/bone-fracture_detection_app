from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class XRayImage(Base):
    __tablename__ = "xray_images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    file_path = Column(String)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    
    annotations = relationship("Annotation", back_populates="image", cascade="all, delete-orphan")

class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("xray_images.id", ondelete="CASCADE"))
    
    x_center = Column(Float)
    y_center = Column(Float)
    width = Column(Float)
    height = Column(Float)
    
    annotation_type = Column(String, index=True)
    
    confidence = Column(Float, nullable=True)
    
    is_verified = Column(Boolean, default=False)
    
    corrected_by = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    image = relationship("XRayImage", back_populates="annotations")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String, unique=True)
    model_path = Column(String)
    metrics = Column(JSON)
    is_active = Column(Boolean, default=False)
    training_samples = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class TrainingHistory(Base):
    __tablename__ = "training_history"
    
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String)
    samples_used = Column(Integer)
    metrics = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)