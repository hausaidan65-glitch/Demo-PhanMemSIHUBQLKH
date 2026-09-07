import apiClient from './apiClient';
import { createProgressPayload } from './progressPayload';

const courseClassProgressApi = {
  getCourseClassProgress(openingId) {
    return apiClient.get(`/course-classes/${openingId}/progress`);
  },

  createCourseClassProgress(openingId, payload) {
    return apiClient.post(
      `/course-classes/${openingId}/progress`,
      createProgressPayload(payload),
    );
  },
};

export default courseClassProgressApi;
