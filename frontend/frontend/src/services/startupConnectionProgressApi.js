import apiClient from './apiClient';
import { createProgressPayload } from './progressPayload';

const startupConnectionProgressApi = {
  getStartupConnectionProgress(eventId) {
    return apiClient.get(`/startup-connection/events/${eventId}/progress`);
  },

  createStartupConnectionProgress(eventId, payload) {
    return apiClient.post(
      `/startup-connection/events/${eventId}/progress`,
      createProgressPayload(payload),
    );
  },
};

export default startupConnectionProgressApi;
