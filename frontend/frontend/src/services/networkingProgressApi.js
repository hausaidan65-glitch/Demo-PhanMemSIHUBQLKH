import apiClient from './apiClient';
import { createProgressPayload } from './progressPayload';

const networkingProgressApi = {
  getNetworkingProgress(eventId) {
    return apiClient.get(`/networking-events/${eventId}/progress`);
  },

  createNetworkingProgress(eventId, payload) {
    return apiClient.post(
      `/networking-events/${eventId}/progress`,
      createProgressPayload(payload),
    );
  },
};

export default networkingProgressApi;
