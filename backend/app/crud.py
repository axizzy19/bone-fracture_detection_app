from sqlalchemy.orm import Session
from .models import XRayImage, Annotation

def get_image_by_id(db: Session, image_id: int):
    return db.query(XRayImage).filter(XRayImage.id == image_id).first()

def get_annotations_by_image(db: Session, image_id: int):
    return db.query(Annotation).filter(Annotation.image_id == image_id).all()

def get_verified_annotations(db: Session):
    return db.query(Annotation).filter(Annotation.is_verified == True).all()