import apiClient from './apiClient';

const openingStudentImportApi = {
  preview(openingId, file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post(
      `/opening-student-import/${openingId}/preview`,
      formData,
    );
  },

  confirm(openingId, rows) {
    return apiClient.post(`/opening-student-import/${openingId}/confirm`, {
      rows,
    });
  },
};

export default openingStudentImportApi;
