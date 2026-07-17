import os
from .detector import FractureDetector

class ModelManager:
    def __init__(self, base_model_path: str, models_dir: str):
        self.base_model_path = base_model_path
        self.models_dir = models_dir
        self.detector = FractureDetector(base_model_path)
        os.makedirs(models_dir, exist_ok=True)
    
    def predict(self, image_path: str):
        """Инференс через модель"""
        if self.detector is None or self.detector.model is None:
            print("Модель не загружена")
            return []
        return self.detector.predict(image_path)

model_manager = None

def init_model_manager(base_model_path: str, models_dir: str):
    """Инициализация менеджера моделей"""
    global model_manager
    model_manager = ModelManager(base_model_path, models_dir)
    return model_manager