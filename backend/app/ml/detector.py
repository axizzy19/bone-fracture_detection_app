import os
import warnings
warnings.filterwarnings("ignore")

os.environ['ULTRALYTICS_AUTOINSTALL'] = 'false'
os.environ['YOLO_VERBOSE'] = 'false'

from ultralytics import YOLO
from PIL import Image
from typing import List, Dict, Any

class FractureDetector:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.class_names = ['elbow positive', 'fingers positive', 'forearm fracture', 
                           'humerus fracture', 'humerus', 'shoulder fracture', 'wrist positive']
        self.load_model()
    
    def load_model(self):
        """Загрузка модели YOLO через ultralytics"""
        if not os.path.exists(self.model_path):
            print(f"Файл модели не найден: {self.model_path}")
            self.model = None
            return
        
        try:
            print(f"Загрузка модели: {self.model_path}")
            self.model = YOLO(self.model_path)
            
            if self.model:
                if hasattr(self.model, 'names'):
                    names = self.model.names
                    if isinstance(names, dict):
                        self.class_names = list(names.values())
                    else:
                        self.class_names = names
                print(f"Модель загружена успешно")
                print(f"Классы: {self.class_names}")
            else:
                print(f"Модель не загружена")
                
        except Exception as e:
            print(f"Ошибка загрузки модели: {e}")
            self.model = None
    
    def reload_model(self, new_model_path: str):
        """Перезагрузка модели после дообучения"""
        print(f"Перезагрузка модели из: {new_model_path}")
        self.model_path = new_model_path
        self.load_model()
    
    def predict(self, image_path: str, conf_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """Детекция на изображении — РАБОТАЕТ"""
        if self.model is None:
            print("Модель не загружена")
            return []
        
        try:
            results = self.model(image_path, conf=conf_threshold, verbose=False)
        except Exception as e:
            print(f"Ошибка инференса: {e}")
            return []
        
        detections = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            img = Image.open(image_path)
            img_width, img_height = img.size
            
            for box in boxes:
                try:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    confidence = float(box.conf[0].cpu().numpy())
                    
                    x_center = ((x1 + x2) / 2) / img_width
                    y_center = ((y1 + y2) / 2) / img_height
                    width = (x2 - x1) / img_width
                    height = (y2 - y1) / img_height
                    
                    class_name = self.class_names[class_id] if class_id < len(self.class_names) else f"class_{class_id}"
                    
                    detections.append({
                        'x_center': float(x_center),
                        'y_center': float(y_center),
                        'width': float(width),
                        'height': float(height),
                        'confidence': confidence,
                        'class_id': class_id,
                        'class_name': class_name
                    })
                except Exception as e:
                    print(f"Ошибка обработки бокса: {e}")
                    continue
        
        return detections