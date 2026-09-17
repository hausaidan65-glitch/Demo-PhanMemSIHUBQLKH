import apiClient from "./apiClient";

const COURSE_SURVEY_PATH = "/course-surveys";

const courseSurveyApi = {
  list(params = {}) {
    return apiClient.get(COURSE_SURVEY_PATH, { params });
  },

  getById(id) {
    return apiClient.get(`${COURSE_SURVEY_PATH}/${id}`);
  },

  remove(id) {
    return apiClient.delete(`${COURSE_SURVEY_PATH}/${id}`);
  },

  exportExcel(params = {}) {
    return apiClient.get(`${COURSE_SURVEY_PATH}/export`, {
      params,
      responseType: "blob",
    });
  },

  listClasses() {
    return apiClient.get("/course-classes");
  },
};

export default courseSurveyApi;
