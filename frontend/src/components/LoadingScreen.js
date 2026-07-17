import React from 'react';
import './LoadingScreen.css';

function LoadingScreen({ progress }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-title">
          <h1>Детекция переломов на рентгеновских снимках</h1>
          <p className="loading-subtitle">Загрузка приложения...</p>
        </div>
        <div className="loading-progress-container">
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="loading-progress-text">{Math.round(progress)}%</div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;