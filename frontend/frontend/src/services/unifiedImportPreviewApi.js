import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function previewUnifiedImport(files) {
  const body = new FormData();

  files.forEach((file) => body.append("files", file));

  const response = await axios.post(
    `${API_URL}/sihub-import/unified-preview`,
    body,
  );

  return response.data?.data;
}

export async function validateUnifiedImport(sheets) {
  const response = await axios.post(
    `${API_URL}/sihub-import/unified-validate`,
    {
      sheets,
    },
  );

  return response.data?.data;
}

export async function commitUnifiedImport(sheets) {
  const response = await axios.post(`${API_URL}/sihub-import/unified-commit`, {
    sheets,
  });

  return response.data?.data;
}

export async function createTrainingOpening(courseId, payload) {
  const token = localStorage.getItem("admin_token");
  const response = await axios.post(
    `${API_URL}/classes/${courseId}/openings`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return response.data?.data;
}

export async function createTrainingCourse(programId, courseName) {
  const token = localStorage.getItem("admin_token");
  const response = await axios.post(
    `${API_URL}/courses`,
    {
      program_id: Number(programId),
      course_name: courseName,
      description: null,
      status: "OPEN",
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return response.data?.data;
}

export async function loadTrainingCourses(programId) {
  const response = await axios.get(`${API_URL}/courses/program/${programId}`);
  return response.data?.data || [];
}

export async function loadTrainingOpenings(courseId) {
  const response = await axios.get(`${API_URL}/course-classes/course/${courseId}`);
  return response.data?.data || [];
}
