import apiClient from "./apiClient";

const COURSE_REPORT_PATH = "/reports/courses";

const courseReportApi = {
  exportSummary(params) {
    return apiClient.get(`${COURSE_REPORT_PATH}/export`, {
      params,
      responseType: "blob",
    });
  },

  getSummary(params) {
    return apiClient.get(`${COURSE_REPORT_PATH}/summary`, { params });
  },

  getPrograms(params) {
    return apiClient.get(`${COURSE_REPORT_PATH}/programs`, { params });
  },

  getCoursesByProgram(programId, params) {
    return apiClient.get(
      `${COURSE_REPORT_PATH}/programs/${programId}/courses`,
      { params },
    );
  },

  getProgramOverview(programId, params = {}) {
    return apiClient.get(
      `${COURSE_REPORT_PATH}/programs/${programId}/overview`,
      { params },
    );
  },

  getOpeningsByCourse(courseId, params) {
    return apiClient.get(`${COURSE_REPORT_PATH}/courses/${courseId}/openings`, {
      params,
    });
  },

  exportCourseOpenings(courseId, params) {
    return apiClient.get(
      `${COURSE_REPORT_PATH}/courses/${courseId}/openings/export`,
      { params, responseType: "blob" },
    );
  },

  getOpeningStudents(openingId) {
    return apiClient.get(`${COURSE_REPORT_PATH}/openings/${openingId}/students`);
  },

  exportOpeningStudents(openingId, params) {
    return apiClient.get(
      `${COURSE_REPORT_PATH}/openings/${openingId}/students/export`,
      {
        params,
        responseType: "blob",
      },
    );
  },

  getStudentAttendance(openingId, registrationId) {
    return apiClient.get(
      `${COURSE_REPORT_PATH}/openings/${openingId}/students/${registrationId}/attendance`,
    );
  },
};

export default courseReportApi;
