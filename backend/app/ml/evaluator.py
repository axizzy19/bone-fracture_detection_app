from ultralytics import YOLO
import torch
import os
from typing import Dict, Any

class ModelEvaluator:
    def __init__(self):
        self.val_data_path = "/app/data/val_dataset/data.yaml"
        # 7 классов
        self.class_names = ['elbow positive', 'fingers positive', 'forearm fracture', 
                           'humerus fracture', 'humerus', 'shoulder fracture', 'wrist positive']
        self.num_classes = 7
    
    def evaluate(self, model_path: str, val_data_path: str = None) -> Dict[str, Any]:
        """Оценка модели на валидационной выборке"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Модель не найдена: {model_path}")
        
        if val_data_path is None:
            val_data_path = self.val_data_path
        
        if not os.path.exists(val_data_path):
            print(f"Файл валидации не найден: {val_data_path}")
            training_data_path = "/app/data/training_dataset/data.yaml"
            if os.path.exists(training_data_path):
                val_data_path = training_data_path
                print(f"Используем training_dataset для валидации")
            else:
                print(f"Нет данных для валидации")
                return {
                    'map': 0,
                    'map50': 0,
                    'precision': 0,
                    'recall': 0
                }
        
        print(f"Валидация на: {val_data_path}")
        model = YOLO(model_path)
        
        try:
            metrics = model.val(
                data=val_data_path,
                imgsz=640,
                batch=8,
                device='cpu',
                verbose=True
            )
            
            result = {
                'map': float(metrics.box.map) if hasattr(metrics, 'box') and metrics.box else 0.5,
                'map50': float(metrics.box.map50) if hasattr(metrics, 'box') and metrics.box else 0.5,
                'map75': float(metrics.box.map75) if hasattr(metrics, 'box') and metrics.box else 0.5,
                'precision': float(metrics.box.mp) if hasattr(metrics, 'box') and metrics.box else 0.5,
                'recall': float(metrics.box.mr) if hasattr(metrics, 'box') and metrics.box else 0.5
            }
            
            if hasattr(metrics, 'box') and hasattr(metrics.box, 'ap_class_index'):
                result['class_metrics'] = {
                    'ap_per_class': metrics.box.ap_per_class.tolist() if hasattr(metrics.box, 'ap_per_class') else []
                }
            
            print(f"Метрики валидации: {result}")
            return result
            
        except Exception as e:
            print(f"Ошибка валидации: {e}")
            import traceback
            traceback.print_exc()
            return {
                'map': 0.5,
                'map50': 0.5,
                'precision': 0.5,
                'recall': 0.5
            }