import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { FiSave, FiEdit2, FiX, FiMove, FiCornerDownRight, FiPlus, FiTrash2 } from 'react-icons/fi';
import { saveCorrection } from '../services/api';

function ImageViewer({ imagePath, predictions, imageId, onCorrectionSave }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [bboxes, setBboxes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [selectedClass, setSelectedClass] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragIndex, setDragIndex] = useState(null);
  const [initialBox, setInitialBox] = useState(null);

  const [isCreatingBox, setIsCreatingBox] = useState(false);
  const [newBoxStart, setNewBoxStart] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState(null);

  const classNames = [
    { id: 0, name: 'Локоть', color: '#2ecc71' },
    { id: 1, name: 'Пальцы', color: '#3498db' },
    { id: 2, name: 'Предплечье', color: '#9b59b6' },
    { id: 3, name: 'Плечевая кость', color: '#e67e22' },
    { id: 4, name: 'Плечо', color: '#1abc9c' },
    { id: 5, name: 'Лопатка', color: '#e74c3c' },
    { id: 6, name: 'Запястье', color: '#f39c12' }
  ];

  useEffect(() => {
    if (predictions && predictions.length > 0) {
      const boxes = predictions.map((p, idx) => ({
        id: p.id || idx,
        x: p.x_center - p.width / 2,
        y: p.y_center - p.height / 2,
        width: p.width,
        height: p.height,
        confidence: p.confidence,
        class_id: p.class_id || 0,
        original: true,
        isNew: false,
        deleted: false
      }));
      setBboxes(boxes);
    } else {
      setBboxes([]);
    }
  }, [predictions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      setImageLoaded(true);
      setImageError(false);
      drawBoxes(ctx, img.width, img.height);
    };
    
    img.onerror = (e) => {
      console.error('Ошибка загрузки изображения:', imagePath, e);
      setImageError(true);
      setImageLoaded(false);
    };
    
    img.src = imagePath;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imagePath]);

  const drawBoxes = (ctx, width, height) => {
    if (!ctx) return;
    
    const visibleBoxes = bboxes.filter(b => !b.deleted);
    
    const fontSize = 38;
    const padding = 6;
    const labelHeight = fontSize + 12;
    
    visibleBoxes.forEach((box) => {
        const x = box.x * width;
        const y = box.y * height;
        const w = box.width * width;
        const h = box.height * height;
        
        const realIndex = bboxes.findIndex(b => b.id === box.id);
        const isSelected = selectedBox === realIndex;
        
        const classInfo = classNames[box.class_id] || classNames[0];
        const color = box.isNew ? '#9560ff' : (isSelected ? '#e74c3c' : classInfo.color);

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x, y, w, h);
        
        if (isSelected && isEditing) {
            ctx.fillStyle = color + '20';
            ctx.fillRect(x, y, w, h);
        }
        
        if (isEditing && isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            const pointSize = 7;
            const points = [
                { px: x, py: y },
                { px: x + w/2, py: y },
                { px: x + w, py: y },
                { px: x, py: y + h/2 },
                { px: x + w, py: y + h/2 },
                { px: x, py: y + h },
                { px: x + w/2, py: y + h },
                { px: x + w, py: y + h }
            ];
            points.forEach(({ px, py }) => {
                ctx.beginPath();
                ctx.arc(px, py, pointSize, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            });
        }
        
        const label = box.confidence 
            ? `${classInfo.name} ${(box.confidence * 100).toFixed(0)}%`
            : classInfo.name;
        
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        
        const metrics = ctx.measureText(label);
        const labelWidth = metrics.width + padding * 2;
        const labelY = y - labelHeight - 4;
        
        if (labelY > 0) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = color + 'cc';
            ctx.beginPath();
            ctx.roundRect(x, labelY, labelWidth, labelHeight, 4);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 2;
            ctx.fillText(label, x + padding, y - 6);
            ctx.shadowBlur = 0;
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = color + 'cc';
            const insideY = y + 4;
            ctx.beginPath();
            ctx.roundRect(x, insideY, labelWidth, labelHeight, 4);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 2;
            ctx.fillText(label, x + padding, insideY + fontSize + 2);
            ctx.shadowBlur = 0;
        }
    });
    
    if (tempBox) {
        const x = tempBox.x * width;
        const y = tempBox.y * height;
        const w = tempBox.width * width;
        const h = tempBox.height * height;
        
        ctx.strokeStyle = '#9560ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#9560ff';
        ctx.fillText('Новая область', x + 8, y - 10);
    }
  };

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      drawBoxes(ctx, width, height);
    };
    img.src = imagePath;
  }, [bboxes, selectedBox, isEditing, tempBox, imageLoaded, drawBoxes]);

  const getMouseCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getResizeHandle = (mouseX, mouseY, box, index) => {
    if (!isEditing || selectedBox !== index) return null;
    
    const canvas = canvasRef.current;
    const x = box.x * canvas.width;
    const y = box.y * canvas.height;
    const w = box.width * canvas.width;
    const h = box.height * canvas.height;
    const pointSize = 10;
    
    const handles = [
      { px: x, py: y },
      { px: x + w/2, py: y },
      { px: x + w, py: y },
      { px: x, py: y + h/2 },
      { px: x + w, py: y + h/2 },
      { px: x, py: y + h },
      { px: x + w/2, py: y + h },
      { px: x + w, py: y + h }
    ];
    
    for (let handle of handles) {
      if (Math.abs(mouseX - handle.px) < pointSize && Math.abs(mouseY - handle.py) < pointSize) {
        return handle;
      }
    }
    return null;
  };

  const getBoxAtPosition = (mouseX, mouseY) => {
    const canvas = canvasRef.current;
    const visibleBoxes = bboxes.filter(b => !b.deleted);
    for (let i = visibleBoxes.length - 1; i >= 0; i--) {
      const box = visibleBoxes[i];
      const x = box.x * canvas.width;
      const y = box.y * canvas.height;
      const w = box.width * canvas.width;
      const h = box.height * canvas.height;
      
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        return bboxes.findIndex(b => b.id === box.id);
      }
    }
    return null;
  };

  const startNewBox = (e) => {
    if (!isEditing) return;
    
    const mouse = getMouseCoords(e);
    const canvas = canvasRef.current;
    
    const boxIndex = getBoxAtPosition(mouse.x, mouse.y);
    if (boxIndex !== null) {
      setSelectedBox(boxIndex);
      setShowClassSelector(true);
      setSelectedClass(bboxes[boxIndex].class_id || 0);
      return;
    }
    
    setIsCreatingBox(true);
    setNewBoxStart({ x: mouse.x / canvas.width, y: mouse.y / canvas.height });
    setSelectedBox(null);
    setShowClassSelector(false);
  };

  const handleMouseMove = (e) => {
    if (isCreatingBox) {
      const mouse = getMouseCoords(e);
      const canvas = canvasRef.current;
      
      const startX = newBoxStart.x * canvas.width;
      const startY = newBoxStart.y * canvas.height;
      const endX = mouse.x;
      const endY = mouse.y;
      
      const x = Math.min(startX, endX) / canvas.width;
      const y = Math.min(startY, endY) / canvas.height;
      const width = Math.abs(endX - startX) / canvas.width;
      const height = Math.abs(endY - startY) / canvas.height;
      
      setTempBox({ x, y, width, height });
      return;
    }
    
    if (!isDragging || dragIndex === null || !isEditing) {
      const mouse = getMouseCoords(e);
      let isOverHandle = false;
      const visibleBoxes = bboxes.filter(b => !b.deleted);
      for (let i = 0; i < visibleBoxes.length; i++) {
        const box = visibleBoxes[i];
        const realIndex = bboxes.findIndex(b => b.id === box.id);
        if (getResizeHandle(mouse.x, mouse.y, box, realIndex)) {
          isOverHandle = true;
          break;
        }
      }
      canvasRef.current.style.cursor = isOverHandle ? 'pointer' : (isEditing ? 'crosshair' : 'default');
      return;
    }
    
    const mouse = getMouseCoords(e);
    const canvas = canvasRef.current;
    const box = bboxes[dragIndex];
    
    if (dragType === 'move') {
      const dx = (mouse.x - dragStart.x) / canvas.width;
      const dy = (mouse.y - dragStart.y) / canvas.height;
      
      const newBox = {
        ...box,
        x: Math.max(0, Math.min(1 - box.width, initialBox.x + dx)),
        y: Math.max(0, Math.min(1 - box.height, initialBox.y + dy))
      };
      
      const newBboxes = [...bboxes];
      newBboxes[dragIndex] = newBox;
      setBboxes(newBboxes);
      
    } else if (dragType === 'resize') {
      const dx = (mouse.x - dragStart.x) / canvas.width;
      const dy = (mouse.y - dragStart.y) / canvas.height;
      
      let newBox = { ...initialBox };
      const minSize = 0.02;
      
      const handle = getResizeHandle(dragStart.x, dragStart.y, initialBox, dragIndex);
      if (!handle) return;
      
      const handleX = handle.px / canvas.width;
      const handleY = handle.py / canvas.height;
      
      if (handleX === initialBox.x) {
        newBox.width = Math.max(minSize, initialBox.width - dx);
        newBox.x = initialBox.x + dx;
      } else if (handleX === initialBox.x + initialBox.width) {
        newBox.width = Math.max(minSize, initialBox.width + dx);
      }
      
      if (handleY === initialBox.y) {
        newBox.height = Math.max(minSize, initialBox.height - dy);
        newBox.y = initialBox.y + dy;
      } else if (handleY === initialBox.y + initialBox.height) {
        newBox.height = Math.max(minSize, initialBox.height + dy);
      }
      
      newBox.x = Math.max(0, Math.min(1 - newBox.width, newBox.x));
      newBox.y = Math.max(0, Math.min(1 - newBox.height, newBox.y));
      
      const newBboxes = [...bboxes];
      newBboxes[dragIndex] = newBox;
      setBboxes(newBboxes);
    }
  };

  const handleMouseDown = (e) => {
    if (!isEditing) return;
    
    const mouse = getMouseCoords(e);
    
    const visibleBoxes = bboxes.filter(b => !b.deleted);
    for (let i = 0; i < visibleBoxes.length; i++) {
      const box = visibleBoxes[i];
      const realIndex = bboxes.findIndex(b => b.id === box.id);
      const handle = getResizeHandle(mouse.x, mouse.y, box, realIndex);
      if (handle) {
        setIsDragging(true);
        setDragType('resize');
        setDragIndex(realIndex);
        setDragStart({ x: mouse.x, y: mouse.y });
        setInitialBox({ ...box });
        setSelectedBox(realIndex);
        setShowClassSelector(true);
        setSelectedClass(box.class_id || 0);
        return;
      }
    }
    
    const boxIndex = getBoxAtPosition(mouse.x, mouse.y);
    if (boxIndex !== null) {
      setIsDragging(true);
      setDragType('move');
      setDragIndex(boxIndex);
      setDragStart({ x: mouse.x, y: mouse.y });
      setInitialBox({ ...bboxes[boxIndex] });
      setSelectedBox(boxIndex);
      setShowClassSelector(true);
      setSelectedClass(bboxes[boxIndex].class_id || 0);
      return;
    }
    
    startNewBox(e);
  };

  const handleMouseUp = (e) => {
    if (isCreatingBox) {
      if (tempBox && tempBox.width > 0.02 && tempBox.height > 0.02) {
        const newBox = {
          id: Date.now() + Math.random(),
          x: tempBox.x,
          y: tempBox.y,
          width: tempBox.width,
          height: tempBox.height,
          confidence: null,
          original: false,
          isNew: true,
          deleted: false,
          class_id: selectedClass
        };
        setBboxes([...bboxes, newBox]);
        const newIndex = bboxes.length;
        setSelectedBox(newIndex);
        setShowClassSelector(true);
      }
      setIsCreatingBox(false);
      setTempBox(null);
      setNewBoxStart({ x: 0, y: 0 });
      return;
    }
    
    if (isDragging) {
      setIsDragging(false);
      setDragType(null);
      setDragIndex(null);
      setInitialBox(null);
    }
  };

  const handleMouseLeave = (e) => {
    if (isCreatingBox) {
      setIsCreatingBox(false);
      setTempBox(null);
    }
    if (isDragging) {
      setIsDragging(false);
      setDragType(null);
      setDragIndex(null);
      setInitialBox(null);
    }
  };

  const handleClassSelect = (classId) => {
    setSelectedClass(classId);
    if (selectedBox !== null) {
      const newBboxes = [...bboxes];
      newBboxes[selectedBox].class_id = classId;
      setBboxes(newBboxes);
    }
  };

  const handleDeleteBox = () => {
    if (selectedBox === null) return;
    
    const box = bboxes[selectedBox];
    if (box.isNew) {
      setBboxes(bboxes.filter((_, i) => i !== selectedBox));
    } else {
      const newBboxes = [...bboxes];
      newBboxes[selectedBox].deleted = true;
      setBboxes(newBboxes);
    }
    setSelectedBox(null);
    setShowClassSelector(false);
  };

  const handleSaveCorrections = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const activeBoxes = bboxes.filter(b => !b.deleted);
      
      const correctedBoxes = activeBoxes.map(box => ({
        x_center: box.x + box.width / 2,
        y_center: box.y + box.height / 2,
        width: box.width,
        height: box.height,
        class_id: box.class_id || 0
      }));
      
      await saveCorrection(imageId, correctedBoxes);
      
      setMessage({ type: 'success', text: 'Изменения сохранены' });
      setIsEditing(false);
      onCorrectionSave();
      
      setBboxes(bboxes.map(b => ({ ...b, original: false, isNew: false })));
      setShowClassSelector(false);
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Ошибка сохранения: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (bboxes.some(b => b.isNew)) {
      if (!window.confirm('Есть несохраненные новые области. Отменить?')) return;
    }
    setIsEditing(false);
    setSelectedBox(null);
    setShowClassSelector(false);
    setIsCreatingBox(false);
    setTempBox(null);
    if (predictions) {
      const boxes = predictions.map((p, idx) => ({
        id: p.id || idx,
        x: p.x_center - p.width / 2,
        y: p.y_center - p.height / 2,
        width: p.width,
        height: p.height,
        confidence: p.confidence,
        class_id: p.class_id || 0,
        original: true,
        isNew: false,
        deleted: false
      }));
      setBboxes(boxes);
    }
  };

  if (!imagePath) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center text-muted">
          <p>Загрузите снимок для детекции</p>
        </Card.Body>
      </Card>
    );
  }

  const activeBoxes = bboxes.filter(b => !b.deleted);

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <span className="fw-bold">Результат детекции</span>
          <Badge bg="secondary" className="ms-2">{activeBoxes.length}</Badge>
        </div>
        <div>
          {!isEditing ? (
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!imageLoaded}
            >
              <FiEdit2 className="me-1" /> Редактировать
            </Button>
          ) : (
            <>
              <Button 
                variant="outline-success" 
                size="sm" 
                className="me-2"
                onClick={handleSaveCorrections}
                disabled={saving}
              >
                {saving ? <Spinner size="sm" /> : <FiSave className="me-1" />}
                Сохранить
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleCancelEdit}
              >
                <FiX className="me-1" /> Отмена
              </Button>
            </>
          )}
        </div>
      </Card.Header>
      
      <Card.Body>
        <div 
          ref={containerRef}
          style={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: '300px',
            background: '#f8f9fa',
            borderRadius: '10px',
            overflow: 'auto',
            position: 'relative'
          }}
        >
          {!imageLoaded && !imageError && (
            <div className="text-center" style={{ position: 'absolute' }}>
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Загрузка изображения...</p>
            </div>
          )}
          
          {imageError && (
            <div className="text-center text-danger">
              <p style={{ fontSize: '48px' }}>Изображение не загружено</p>
              <p className="text-muted small">{imagePath}</p>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            style={{
              display: imageLoaded ? 'block' : 'none',
              maxWidth: '100%',
              height: 'auto',
              cursor: isEditing ? 'crosshair' : 'default'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>
        
        {imageError && (
          <Alert variant="danger" className="mt-3">
            Не удалось загрузить изображение. Проверьте путь: {imagePath}
          </Alert>
        )}

        {isEditing && showClassSelector && selectedBox !== null && !bboxes[selectedBox]?.deleted && (
          <div className="mt-3">
            <Alert variant="light" className="mb-0 border">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <span className="fw-semibold">Область:</span>
                {classNames.map((cls) => (
                  <Button
                    key={cls.id}
                    variant={selectedClass === cls.id ? 'dark' : 'outline-secondary'}
                    size="sm"
                    onClick={() => handleClassSelect(cls.id)}
                    style={{
                      backgroundColor: selectedClass === cls.id ? cls.color : 'transparent',
                      borderColor: cls.color,
                      color: selectedClass === cls.id ? '#fff' : cls.color
                    }}
                  >
                    {cls.name}
                  </Button>
                ))}
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={handleDeleteBox}
                  className="ms-auto"
                >
                  <FiTrash2 className="me-1" /> Удалить
                </Button>
              </div>
            </Alert>
          </div>
        )}
        
        {isEditing && (
          <div className="mt-3">
            <Alert variant="light" className="mb-0 border bg-light">
              <div className="d-flex flex-wrap gap-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success bg-opacity-25 text-success p-2">
                    <FiEdit2 />
                  </span>
                  <div>
                    <div className="fw-semibold small">Редактировать область</div>
                    <div className="text-muted small">Кликните на рамку → выберите тип → перемещайте или меняйте размер</div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-warning bg-opacity-25 text-warning p-2">
                    <FiPlus />
                  </span>
                  <div>
                    <div className="fw-semibold small">Создать новую область</div>
                    <div className="text-muted small">Зажмите и проведите на пустом месте → выберите тип</div>
                  </div>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {isEditing && activeBoxes.length === 0 && imageLoaded && (
          <div className="mt-3">
            <Alert variant="warning" className="mb-0">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>На изображении нет отмеченных областей</span>
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={handleSaveCorrections}
                  disabled={saving}
                >
                  {saving ? <Spinner size="sm" /> : <FiSave className="me-1" />}
                  Сохранить как "без патологии"
                </Button>
              </div>
            </Alert>
          </div>
        )}
        
        {message && (
          <Alert variant={message.type} className="mt-3">
            {message.text}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

export default ImageViewer;