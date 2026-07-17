import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Card } from 'react-bootstrap';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import TrainingControl from './components/TrainingControl';
import LoadingScreen from './components/LoadingScreen';
import { getTrainingStatus } from './services/api';

function App() {
  const [currentImage, setCurrentImage] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [imageId, setImageId] = useState(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState({
    is_training: false,
    current_samples: 0,
    threshold: 100
  });

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setLoading(false), 400);
      }
      setLoadingProgress(Math.min(progress, 100));
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const status = await getTrainingStatus();
        setTrainingStatus(status);
      } catch (error) {
        console.error('Ошибка загрузки статуса:', error);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (data) => {
    console.log('Загружено изображение:', data);
    setCurrentImage(data.filename);
    setPredictions(data.predictions || []);
    setImageId(data.id);
    setViewerKey(prev => prev + 1);
  };

  const handleCorrectionSave = () => {
    fetchTrainingStatus();
  };

  const fetchTrainingStatus = async () => {
    try {
      const status = await getTrainingStatus();
      setTrainingStatus(status);
    } catch (error) {
      console.error('Ошибка загрузки статуса:', error);
    }
  };

  if (loading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1> Детекция переломов</h1>
        <TrainingControl 
          status={trainingStatus}
          onRefresh={fetchTrainingStatus}
        />
      </header>
      
      <main className="container mt-4">
        <div className="row">
          <div className="col-md-4">
            <ImageUploader onUpload={handleImageUpload} />
          </div>
          <div className="col-md-8">
            {currentImage ? (
              <ImageViewer 
                key={viewerKey}
                imagePath={`/api/images/${currentImage}`}
                predictions={predictions}
                imageId={imageId}
                onCorrectionSave={handleCorrectionSave}
              />
            ) : (
              <Card className="shadow-sm">
                <Card.Body className="text-center text-muted py-5">
                  <p>Загрузите снимок слева для детекции</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;