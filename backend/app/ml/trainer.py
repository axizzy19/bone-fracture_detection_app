import os
import shutil
import json
import yaml
import random
from datetime import datetime
from typing import List, Dict, Any

class ModelTrainer:
    def __init__(self, models_dir: str, data_dir: str):
        self.models_dir = models_dir
        self.data_dir = data_dir
        self.is_training = False
        self.class_names = ['elbow positive', 'fingers positive', 'forearm fracture', 
                           'humerus fracture', 'humerus', 'shoulder fracture', 'wrist positive']
        self.num_classes = 7
        
    def prepare_dataset(self, annotations: List[Dict]) -> str:
        """Заглушка — просто создаем пустой датасет"""
        dataset_dir = os.path.join(self.data_dir, 'training_dataset')
        
        if os.path.exists(dataset_dir):
            shutil.rmtree(dataset_dir)
        
        os.makedirs(os.path.join(dataset_dir, 'images'), exist_ok=True)
        os.makedirs(os.path.join(dataset_dir, 'labels'), exist_ok=True)
        
        print(f"Подготовка датасета (заглушка): {dataset_dir}")
        print(f"Всего изображений: {len(annotations)}")
        
        data_yaml = {
            'path': dataset_dir,
            'train': 'images',
            'val': '/app/data/val_dataset',
            'nc': self.num_classes,
            'names': self.class_names
        }
        
        data_yaml_path = os.path.join(dataset_dir, 'data.yaml')
        with open(data_yaml_path, 'w') as f:
            yaml.dump(data_yaml, f)
        
        return data_yaml_path
    
    async def train_async(self, base_model_path: str, annotations: List[Dict], 
                          epochs: int = 10, callback=None):
        """ЗАГЛУШКА — имитация обучения без реальных вычислений"""
        if self.is_training:
            raise Exception("Обучение уже запущено")
        
        self.is_training = True
        print(f"[ЗАГЛУШКА] Запуск дообучения на {len(annotations)} примерах")
        
        from ..database import SessionLocal
        from ..models import TrainingHistory
        
        db = SessionLocal()
        try:
            history = TrainingHistory(
                status='started',
                samples_used=len(annotations)
            )
            db.add(history)
            db.commit()
            db.refresh(history)
            history_id = history.id
            print(f"История обучения создана: ID {history_id}")
        finally:
            db.close()
        
        try:
            data_yaml_path = self.prepare_dataset(annotations)
            print(f"Датасет подготовлен: {data_yaml_path}")
            
            print("[ЗАГЛУШКА] Имитация обучения...")
            import asyncio
            await asyncio.sleep(3)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            project_name = f"retrain_{timestamp}"
            new_model_dir = os.path.join(self.models_dir, project_name)
            os.makedirs(os.path.join(new_model_dir, 'weights'), exist_ok=True)
            new_model_path = os.path.join(new_model_dir, 'weights', 'best.pt')
            
            if os.path.exists(base_model_path):
                shutil.copy2(base_model_path, new_model_path)
                print(f"Модель скопирована (заглушка): {new_model_path}")
            else:
                with open(new_model_path, 'w') as f:
                    f.write('dummy model')
                print(f"Создан файл-заглушка: {new_model_path}")
            
            # Метрики-заглушка
            metrics = {
                'map': 0.85,
                'precision': 0.82,
                'recall': 0.79
            }
            
            print(f"[ЗАГЛУШКА] Обучение завершено!")
            print(f"Метрики (заглушка): {metrics}")
            
            db = SessionLocal()
            try:
                training_record = db.query(TrainingHistory).filter(
                    TrainingHistory.id == history_id
                ).first()
                if training_record:
                    training_record.status = 'completed'
                    training_record.completed_at = datetime.now()
                    training_record.metrics = metrics
                db.commit()
            finally:
                db.close()
            
            self.is_training = False
            
            if callback:
                callback(new_model_path, metrics)
            
            return new_model_path, metrics
            
        except Exception as e:
            print(f"Ошибка (заглушка): {e}")
            
            db = SessionLocal()
            try:
                training_record = db.query(TrainingHistory).filter(
                    TrainingHistory.id == history_id
                ).first()
                if training_record:
                    training_record.status = 'failed'
                    training_record.error_message = str(e)
                    training_record.completed_at = datetime.now()
                db.commit()
            finally:
                db.close()
            
            self.is_training = False
            raise e