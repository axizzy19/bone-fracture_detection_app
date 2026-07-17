import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, Alert } from 'react-bootstrap';
import { FiUpload } from 'react-icons/fi';
import { uploadImage } from '../services/api';

function ImageUploader({ onUpload }) {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setLoading(true);
    setError(null);
    
    try {
      const result = await uploadImage(file);
      onUpload(result);
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.message || 'Ошибка загрузки изображения');
    } finally {
      setLoading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>Загрузить снимок</Card.Title>
        
        <div 
          {...getRootProps()} 
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          style={{
            border: '2px dashed #ccc',
            borderRadius: '10px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
            transition: 'all 0.3s'
          }}
        >
          <input {...getInputProps()} />
          <FiUpload size={48} color="#6c757d" />
          <p className="mt-3">
            {isDragActive ? 'Отпустите файл для загрузки' : 'Перетащите снимок или кликните для выбора'}
          </p>
          <small className="text-muted">Поддерживаются: PNG, JPG, JPEG</small>
        </div>
        
        {loading && (
          <Alert variant="info" className="mt-3">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
              Обработка изображения...
            </div>
          </Alert>
        )}
        
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

export default ImageUploader;