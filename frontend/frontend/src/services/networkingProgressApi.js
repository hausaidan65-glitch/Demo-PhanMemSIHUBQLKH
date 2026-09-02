import apiClient from './apiClient';

const networkingProgressApi = {
  getNetworkingProgress(eventId) {
    return apiClient.get(`/networking-events/${eventId}/progress`);
  },

  createNetworkingProgress(eventId, payload) {
    return apiClient.post(`/networking-events/${eventId}/progress`, payload);
  },
};

export default networkingProgressApi;
