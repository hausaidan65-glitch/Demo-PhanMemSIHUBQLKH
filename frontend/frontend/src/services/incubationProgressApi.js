import apiClient from './apiClient';
import { createProgressPayload } from './progressPayload';

const incubationProgressApi = {
  getIncubationProgress(programId) {
    return apiClient.get(`/incubation-programs/${programId}/progress`);
  },

  createIncubationProgress(programId, payload) {
    return apiClient.post(
      `/incubation-programs/${programId}/progress`,
      createProgressPayload(payload),
    );
  },
};

export default incubationProgressApi;
