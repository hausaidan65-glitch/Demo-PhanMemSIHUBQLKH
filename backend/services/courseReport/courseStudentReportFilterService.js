const VALID_SCOPES = new Set(["ALL", "FILTERED"]);

const ENUM_FILTERS = {
  attendance_status: new Set(["ATTENDED", "NOT_ATTENDED"]),
  attendance_rate: new Set([
    "FULL",
    "AT_LEAST_80",
    "FROM_50_TO_80",
    "FROM_0_TO_50",
    "ZERO",
  ]),
  certificate_eligible: new Set(["ELIGIBLE", "NOT_ELIGIBLE"]),
  certificate_issued: new Set(["ISSUED", "NOT_ISSUED"]),
};

class CourseStudentReportFilterValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CourseStudentReportFilterValidationError";
    this.statusCode = 400;
  }
}

function normalizeRawValue(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return normalizeRawValue(value).toLowerCase();
}

function validateEnumFilters(filters) {
  Object.entries(ENUM_FILTERS).forEach(([name, allowedValues]) => {
    const value = normalizeRawValue(filters[name]);

    if (value && !allowedValues.has(value)) {
      throw new CourseStudentReportFilterValidationError(
        `Bộ lọc ${name} không hợp lệ.`,
      );
    }
  });
}

function matchesAttendanceRate(student, filter) {
  if (!filter) {
    return true;
  }

  if (
    student.attendance_rate === null ||
    student.attendance_rate === undefined ||
    student.attendance_rate === ""
  ) {
    return false;
  }

  const rate = Number(student.attendance_rate);

  if (!Number.isFinite(rate)) {
    return false;
  }

  if (filter === "FULL") {
    return rate === 100;
  }

  if (filter === "AT_LEAST_80") {
    return rate >= 80;
  }

  if (filter === "FROM_50_TO_80") {
    return rate >= 50 && rate < 80;
  }

  if (filter === "FROM_0_TO_50") {
    return rate > 0 && rate < 50;
  }

  return rate === 0;
}

function filterCourseReportStudents(students, scope, filters = {}) {
  if (!Array.isArray(students)) {
    throw new CourseStudentReportFilterValidationError(
      "Danh sách học viên không hợp lệ.",
    );
  }

  const normalizedScope = normalizeRawValue(scope);

  if (!VALID_SCOPES.has(normalizedScope)) {
    throw new CourseStudentReportFilterValidationError(
      "Phạm vi xuất báo cáo không hợp lệ.",
    );
  }

  if (normalizedScope === "ALL") {
    return students.slice();
  }

  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new CourseStudentReportFilterValidationError(
      "Bộ lọc học viên không hợp lệ.",
    );
  }

  validateEnumFilters(filters);

  const search = normalizeText(filters.search);
  const gender = normalizeRawValue(filters.gender);
  const userType = normalizeRawValue(filters.user_type);
  const company = normalizeText(filters.company);
  const position = normalizeText(filters.position);
  const registerStatus = normalizeRawValue(filters.register_status);
  const attendanceStatus = normalizeRawValue(filters.attendance_status);
  const attendanceRate = normalizeRawValue(filters.attendance_rate);
  const certificateEligible = normalizeRawValue(filters.certificate_eligible);
  const certificateIssued = normalizeRawValue(filters.certificate_issued);

  return students.filter((student) => {
    const matchesSearch =
      !search ||
      [student.full_name, student.email, student.phone].some((value) =>
        normalizeText(value).includes(search),
      );
    const matchesGender =
      !gender || normalizeRawValue(student.gender) === gender;
    const matchesUserType =
      !userType || normalizeRawValue(student.user_type) === userType;
    const matchesCompany =
      !company || normalizeText(student.company).includes(company);
    const matchesPosition =
      !position || normalizeText(student.position).includes(position);
    const matchesRegisterStatus =
      !registerStatus ||
      normalizeRawValue(student.register_status) === registerStatus;
    const matchesAttendanceStatus =
      !attendanceStatus ||
      (attendanceStatus === "ATTENDED"
        ? student.attended === true
        : student.attended !== true);
    const matchesCertificateEligible =
      !certificateEligible ||
      (certificateEligible === "ELIGIBLE"
        ? student.certificate_eligible === true
        : student.certificate_eligible !== true);
    const matchesCertificateIssued =
      !certificateIssued ||
      (certificateIssued === "ISSUED"
        ? student.certificate_issued === true
        : student.certificate_issued !== true);

    return (
      matchesSearch &&
      matchesGender &&
      matchesUserType &&
      matchesCompany &&
      matchesPosition &&
      matchesRegisterStatus &&
      matchesAttendanceStatus &&
      matchesAttendanceRate(student, attendanceRate) &&
      matchesCertificateEligible &&
      matchesCertificateIssued
    );
  });
}

module.exports = {
  CourseStudentReportFilterValidationError,
  filterCourseReportStudents,
};
