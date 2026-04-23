import apiRequest from '../../../lib/apiRequest';

export const fetchAllBoardings = () =>
  apiRequest.get('/boardings');

export const generateDescription = (features) =>
  apiRequest.post('/boardings/generate-description', { features });

export const verifyImage = (imageFile) => {
  const data = new FormData();
  data.append('image', imageFile);
  return apiRequest.post('/boardings/verify-image', data);
};

export const createBoarding = (data) =>
  apiRequest.post('/boardings/add', data);

export const updateBoarding = (id, data) =>
  apiRequest.put(`/boardings/${id}`, data);

export const toggleBoardingStatus = (id, status) =>
  apiRequest.patch(`/boardings/${id}/status`, { status });

export const deleteBoarding = (id) =>
  apiRequest.delete(`/boardings/${id}`);

export const joinWaitlist = (boardingId, studentName, studentEmail) =>
  apiRequest.post(`/boardings/${boardingId}/waitlist`, { studentName, studentEmail });

export const getWaitlist = (boardingId) =>
  apiRequest.get(`/boardings/${boardingId}/waitlist`);
