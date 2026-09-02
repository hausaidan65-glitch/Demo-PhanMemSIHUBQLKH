import apiClient from './apiClient';

const startupConnectionProgressApi = {
  getStartupConnectionProgress(eventId) {
    return apiClient.get(`/startup-connection/events/${eventId}/progress`);
  },

  createStartupConnectionProgress(eventId, payload) {
    return apiClient.post(
      `/startup-connection/events/${eventId}/progress`,
      payload,
    );
  },
};

export default startupConnectionProgressApi;
