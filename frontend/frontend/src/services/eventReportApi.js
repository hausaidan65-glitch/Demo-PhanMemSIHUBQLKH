import apiClient from "./apiClient";

const SEMINAR_REPORT_PATH = "/reports/events/seminars";

const eventReportApi = {
  getSeminarSummary(params) {
    return apiClient.get(`${SEMINAR_REPORT_PATH}/summary`, { params });
  },

  getSeminars(params) {
    return apiClient.get(SEMINAR_REPORT_PATH, { params });
  },

  exportSeminarSummary(params) {
    return apiClient.get(`${SEMINAR_REPORT_PATH}/export`, {
      params,
      responseType: "blob",
    });
  },

  exportSeminarList(params) {
    return apiClient.get(`${SEMINAR_REPORT_PATH}/list/export`, {
      params,
      responseType: "blob",
    });
  },

  getSeminarParticipants(seminarId) {
    return apiClient.get(`${SEMINAR_REPORT_PATH}/${seminarId}/participants`);
  },

  exportSeminarParticipants(seminarId, params) {
    return apiClient.get(
      `${SEMINAR_REPORT_PATH}/${seminarId}/participants/export`,
      { params, responseType: "blob" },
    );
  },

  getSeminarParticipantDetail(seminarId, participantId) {
    return apiClient.get(
      `${SEMINAR_REPORT_PATH}/${seminarId}/participants/${participantId}`,
    );
  },
};

export default eventReportApi;
