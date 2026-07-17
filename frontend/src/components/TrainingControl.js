import React, { useState } from 'react';
import { Card, ProgressBar, Badge, Button, Modal, Alert } from 'react-bootstrap';
import { FiRefreshCw, FiActivity, FiTrash2, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import axios from 'axios';

function TrainingControl({ status, onRefresh }) {
  const { 
    is_training, 
    current_samples, 
    threshold, 
    last_training, 
    model_metrics 
  } = status;

  const [showModal, setShowModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState(null);

  const progress = Math.min((current_samples / threshold) * 100, 100);
  const isReady = current_samples >= threshold;

  const handleClearData = async () => {
    setClearing(true);
    setClearMessage(null);
    
    try {
      const response = await axios.post('/api/annotations/clear-all');
      setClearMessage({ 
        type: 'success', 
        text: `Очищено: ${response.data.deleted_images} изображений, ${response.data.deleted_annotations} аннотаций` 
      });
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      setClearMessage({ 
        type: 'danger', 
        text: 'Ошибка очистки: ' + (error.response?.data?.detail || error.message) 
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-1">
                <FiActivity className="me-2" />
                Статус обучения
              </h6>
            </div>
            <div>
              <Button 
                variant="outline-danger" 
                size="sm"
                className="me-2"
                onClick={() => setShowModal(true)}
                disabled={is_training || current_samples === 0}
              >
                <FiTrash2 /> Очистить
              </Button>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="d-flex justify-content-between mb-1">
              <span>Накоплено исправлений</span>
              <span>
                <strong>{current_samples}</strong> / {threshold}
                {isReady && <Badge bg="success" className="ms-2">Готово!</Badge>}
              </span>
            </div>
            <ProgressBar 
              now={progress} 
              variant={isReady ? 'success' : is_training ? 'warning' : 'info'}
              animated={is_training}
              style={{ height: '8px' }}
            />
          </div>
          
          {is_training && (
            <div className="mt-3">
              <Alert variant="info">
                <div className="d-flex align-items-center">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  <div>
                    <div className="fw-semibold">Обучение запущено...</div>
                    <small className="text-muted">Это может занять несколько минут. Не закрывайте страницу.</small>
                  </div>
                </div>
              </Alert>
            </div>
          )}
          
          {/* {last_training && (
            <div className="mt-2">
              <small className="text-muted">
                <FiCheckCircle className="me-1" /> Последнее обучение: {new Date(last_training).toLocaleString()}
              </small>
            </div>
          )}
          
          {model_metrics && (
            <div className="mt-2">
              <small className="text-muted">
                mAP: {(model_metrics.map * 100).toFixed(1)}% | 
                Precision: {(model_metrics.precision * 100).toFixed(1)}% |
                Recall: {(model_metrics.recall * 100).toFixed(1)}%
              </small>
            </div>
          )} */}
          
          <div className="mt-2">
            <small className="text-info">
              Автоматическое дообучение запустится при накоплении {threshold} исправлений
            </small>
          </div>

          {clearMessage && (
            <Alert variant={clearMessage.type} className="mt-2 mb-0">
              {clearMessage.text}
            </Alert>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Очистка данных</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить все накопленные данные?</p>
          <ul>
            <li>Все исправленные аннотации будут удалены</li>
            <li>Все загруженные изображения будут удалены</li>
            <li>Счетчик сбросится на 0</li>
          </ul>
          <p className="text-danger"><strong>Это действие нельзя отменить!</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleClearData} disabled={clearing}>
            {clearing ? 'Очистка...' : 'Да, очистить всё'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default TrainingControl;