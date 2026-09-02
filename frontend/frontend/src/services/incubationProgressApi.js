import apiClient from './apiClient';

const incubationProgressApi = {
  getIncubationProgress(programId) {
    return apiClient.get(`/incubation-programs/${programId}/progress`);
  },

  createIncubationProgress(programId, payload) {
    return apiClient.post(`/incubation-programs/${programId}/progress`, payload);
  },
};

export default incubationProgressApi;
