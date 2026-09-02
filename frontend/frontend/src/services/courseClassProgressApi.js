import apiClient from './apiClient';

const courseClassProgressApi = {
  getCourseClassProgress(openingId) {
    return apiClient.get(`/course-classes/${openingId}/progress`);
  },

  createCourseClassProgress(openingId, payload) {
    return apiClient.post(`/course-classes/${openingId}/progress`, payload);
  },
};

export default courseClassProgressApi;
