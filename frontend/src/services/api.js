import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiClient.post('/detection/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const saveCorrection = async (imageId, bboxes) => {
  const response = await apiClient.post('/annotations/correct', {
    image_id: imageId,
    bboxes: bboxes,
    corrected_by: 'doctor'
  });
  return response.data;
};

export const getTrainingStatus = async () => {
  const response = await apiClient.get('/annotations/count');
  return response.data;
};

export default {
  uploadImage,
  saveCorrection,
  getTrainingStatus
};