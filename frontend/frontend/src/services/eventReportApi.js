import apiClient from "./apiClient";

const SEMINAR_REPORT_PATH = "/reports/events/seminars";

const eventReportApi = {
  getSeminarSummary(params) {
    return apiClient.get(`${SEMINAR_REPORT_PATH}/summary`, { params });
  },

  getSeminars(params) {
    return apiClient.get(SEMINAR_REPORT_PATH, { params });
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
