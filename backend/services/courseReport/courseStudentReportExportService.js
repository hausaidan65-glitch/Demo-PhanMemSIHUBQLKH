const ExcelJS = require("exceljs");

const WORKSHEET_NAME = "Báo cáo học viên";
const HEADER_ROW_NUMBER = 14;

const REGISTER_STATUS_LABELS = {
  CONFIRMED: "Đã xác nhận",
  PENDING: "Chờ xác nhận",
};

const FIELD_DEFINITIONS = {
  full_name: { label: "Họ và tên", width: 26, getValue: (student) => safeText(student.full_name) },
  email: { label: "Email", width: 32, getValue: (student) => safeText(student.email) },
  phone: { label: "Số điện thoại", width: 18, getValue: (student) => safeText(student.phone) },
  gender: { label: "Giới tính", width: 14, getValue: (student) => safeText(student.gender) },
  user_type: { label: "Nhóm đối tượng", width: 20, getValue: (student) => safeText(student.user_type) },
  company: { label: "Đơn vị", width: 28, getValue: (student) => safeText(student.company) },
  position: { label: "Chức vụ", width: 24, getValue: (student) => safeText(student.position) },
  register_status: {
    label: "Trạng thái đăng ký",
    width: 22,
    getValue: (student) => REGISTER_STATUS_LABELS[student.register_status] || safeText(student.register_status),
  },
  attended: { label: "Đã đi học", width: 14, getValue: (student) => student.attended === true ? "Có" : "Không" },
  attended_sessions: { label: "Số buổi tham dự", width: 18, getValue: (student) => safeNumber(student.attended_sessions) },
  total_sessions: { label: "Tổng số buổi", width: 16, getValue: (student) => safeNumber(student.total_sessions) },
  attendance_rate: { label: "Tỷ lệ tham dự (%)", width: 20, getValue: (student) => safeNumber(student.attendance_rate) },
  certificate_eligible: { label: "Đủ điều kiện chứng nhận", width: 26, getValue: (student) => student.certificate_eligible === true ? "Có" : "Không" },
  certificate_issued: { label: "Đã cấp chứng nhận", width: 22, getValue: (student) => student.certificate_issued === true ? "Có" : "Không" },
  certificate_no: { label: "Số chứng nhận", width: 22, getValue: (student) => safeText(student.certificate_no) },
};

const DEFAULT_FIELD_KEYS = Object.freeze(Object.keys(FIELD_DEFINITIONS));

function fieldValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseSelectedFields(query = {}) {
  if (!Object.prototype.hasOwnProperty.call(query, "fields")) {
    return null;
  }

  const rawFields = Array.isArray(query.fields) ? query.fields.join(",") : query.fields;
  const keys = String(rawFields ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (!keys.length) {
    throw fieldValidationError("Vui lòng chọn ít nhất một trường để xuất.");
  }

  const unknownFields = keys.filter((key) => !FIELD_DEFINITIONS[key]);
  if (unknownFields.length) {
    throw fieldValidationError(
      `Trường xuất không hợp lệ: ${[...new Set(unknownFields)].join(", ")}.`,
    );
  }

  return [...new Set(keys)];
}

const ATTENDANCE_STATUS_LABELS = {
  ATTENDED: "Đi học: Đã đi học",
  NOT_ATTENDED: "Đi học: Chưa đi học",
};

const ATTENDANCE_RATE_LABELS = {
  FULL: "Tỷ lệ tham dự: 100%",
  AT_LEAST_80: "Tỷ lệ tham dự: ≥80%",
  FROM_50_TO_80: "Tỷ lệ tham dự: 50% đến dưới 80%",
  FROM_0_TO_50: "Tỷ lệ tham dự: trên 0% đến dưới 50%",
  ZERO: "Tỷ lệ tham dự: 0%",
};

const CERTIFICATE_ELIGIBLE_LABELS = {
  ELIGIBLE: "Đủ điều kiện chứng nhận: Có",
  NOT_ELIGIBLE: "Đủ điều kiện chứng nhận: Không",
};

const CERTIFICATE_ISSUED_LABELS = {
  ISSUED: "Đã cấp chứng nhận: Có",
  NOT_ISSUED: "Đã cấp chứng nhận: Không",
};

function safeText(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    return "";
  }

  return String(value);
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : "";
}

function formatDate(value) {
  const match = safeText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function formatPeriod(period) {
  if (!period || typeof period !== "object") {
    return "Không xác định";
  }

  const type = safeText(period.type).trim().toUpperCase();
  const year = safeText(period.year).trim();

  if (!year) {
    return "Không xác định";
  }

  if (type === "QUARTER") {
    const quarter = safeText(period.quarter).trim();

    return quarter ? `Quý ${quarter}/${year}` : "Không xác định";
  }

  if (type === "MONTH") {
    const month = safeText(period.month).trim();

    return month ? `Tháng ${month}/${year}` : "Không xác định";
  }

  if (type === "WEEK") {
    const week = safeText(period.week).trim();
    const startDate = formatDate(period.start_date || period.report_start);
    const endDate = formatDate(period.end_date || period.report_end);

    return week && startDate && endDate
      ? `Tuần ${week} / ${year} (${startDate} – ${endDate})`
      : "Không xác định";
  }

  return type === "YEAR" ? `Năm ${year}` : "Không xác định";
}

function buildFilterDescription(scope, filters = {}) {
  if (scope === "ALL" || !filters || typeof filters !== "object") {
    return "Không";
  }

  const descriptions = [];
  const addTextFilter = (name, label) => {
    const value = safeText(filters[name]).trim();

    if (value) {
      descriptions.push(`${label}: ${value}`);
    }
  };

  addTextFilter("search", "Tìm kiếm");
  addTextFilter("gender", "Giới tính");
  addTextFilter("user_type", "Nhóm đối tượng");
  addTextFilter("company", "Đơn vị");
  addTextFilter("position", "Chức vụ");
  addTextFilter("register_status", "Trạng thái đăng ký");

  const attendanceStatus = safeText(filters.attendance_status).trim();
  const attendanceRate = safeText(filters.attendance_rate).trim();
  const certificateEligible = safeText(filters.certificate_eligible).trim();
  const certificateIssued = safeText(filters.certificate_issued).trim();

  if (attendanceStatus) {
    descriptions.push(
      ATTENDANCE_STATUS_LABELS[attendanceStatus] ||
        `Đi học: ${attendanceStatus}`,
    );
  }

  if (attendanceRate) {
    descriptions.push(
      ATTENDANCE_RATE_LABELS[attendanceRate] ||
        `Tỷ lệ tham dự: ${attendanceRate}`,
    );
  }

  if (certificateEligible) {
    descriptions.push(
      CERTIFICATE_ELIGIBLE_LABELS[certificateEligible] ||
        `Đủ điều kiện chứng nhận: ${certificateEligible}`,
    );
  }

  if (certificateIssued) {
    descriptions.push(
      CERTIFICATE_ISSUED_LABELS[certificateIssued] ||
        `Đã cấp chứng nhận: ${certificateIssued}`,
    );
  }

  return descriptions.length ? descriptions.join("; ") : "Không";
}

function sanitizeFilenamePart(value) {
  return safeText(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
}

function buildPeriodFilenamePart(period) {
  const year = safeText(period?.year).trim();

  if (!year) {
    return new Date().toISOString().slice(0, 10);
  }

  if (period.type === "QUARTER" && period.quarter) {
    return `${year}_Q${period.quarter}`;
  }

  if (period.type === "MONTH" && period.month) {
    return `${year}_${String(period.month).padStart(2, "0")}`;
  }

  if (period.type === "WEEK" && period.week) {
    return `${year}_W${String(period.week).padStart(2, "0")}`;
  }

  return year;
}

function buildCourseStudentReportFilename(opening = {}, period = null) {
  const openingPart =
    sanitizeFilenamePart(opening.class_code) ||
    sanitizeFilenamePart(opening.class_name) ||
    "lop";
  return `SIHUB_Training_Students_${openingPart}_${buildPeriodFilenamePart(period)}.xlsx`;
}

function buildCourseStudentReportContentDisposition(filename) {
  const utf8Filename = safeText(filename).replace(/[\r\n]/g, "").trim() ||
    "SIHUB_Training_Students.xlsx";
  const asciiFilename = utf8Filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, (character) => (character === "Đ" ? "D" : "d"))
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/["\\]/g, "-")
    .trim() || "SIHUB_Training_Students.xlsx";
  const encodedFilename = encodeURIComponent(utf8Filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

function styleMetadataRow(worksheet, rowNumber) {
  worksheet.getCell(rowNumber, 1).font = { bold: true };
  worksheet.getCell(rowNumber, 2).alignment = {
    vertical: "top",
    wrapText: true,
  };
}

function buildCourseStudentReportWorkbook({
  opening = {},
  students = [],
  scope,
  filters = {},
  period = null,
  selectedFields = null,
} = {}) {
  if (!Array.isArray(students)) {
    throw new TypeError("Danh sách học viên export không hợp lệ.");
  }

  if (scope !== "ALL" && scope !== "FILTERED") {
    throw new TypeError("Phạm vi export không hợp lệ.");
  }

  const fieldKeys = selectedFields === null ? DEFAULT_FIELD_KEYS : selectedFields;

  if (!Array.isArray(fieldKeys) || !fieldKeys.length) {
    throw fieldValidationError("Vui lòng chọn ít nhất một trường để xuất.");
  }

  const invalidField = fieldKeys.find((key) => !FIELD_DEFINITIONS[key]);
  if (invalidField) {
    throw fieldValidationError(`Trường xuất không hợp lệ: ${invalidField}.`);
  }

  const columns = [
    { label: "STT", width: 8, getValue: (_student, index) => index + 1 },
    ...fieldKeys.map((key) => FIELD_DEFINITIONS[key]),
  ];
  const columnCount = columns.length;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "SIHUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(WORKSHEET_NAME);

  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width;
  });

  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = worksheet.getCell(1, 1);

  titleCell.value = "BÁO CÁO HỌC VIÊN THEO LỚP";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 28;

  const metadata = [
    ["Khóa đào tạo:", safeText(opening.course_name)],
    ["Lớp / Đợt tổ chức:", safeText(opening.class_name)],
    ["Mã lớp:", safeText(opening.class_code)],
    ["Ngày bắt đầu tổ chức:", formatDate(opening.organization_start_date)],
    ["Ngày kết thúc tổ chức:", formatDate(opening.organization_end_date)],
    ["Địa điểm:", safeText(opening.location)],
    ["Kỳ báo cáo:", formatPeriod(period)],
    [
      "Phạm vi xuất:",
      scope === "ALL" ? "Toàn bộ lớp" : "Kết quả đang lọc",
    ],
    ["Bộ lọc áp dụng:", buildFilterDescription(scope, filters)],
    ["Số học viên:", students.length],
  ];

  metadata.forEach((values, index) => {
    const rowNumber = index + 3;

    worksheet.getRow(rowNumber).values = values;
    worksheet.mergeCells(rowNumber, 2, rowNumber, columnCount);
    styleMetadataRow(worksheet, rowNumber);
  });

  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);

  headerRow.values = columns.map((column) => column.label);
  headerRow.font = { bold: true };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  headerRow.height = 30;

  students.forEach((student, index) => {
    const row = worksheet.addRow(
      columns.map((column) => column.getValue(student, index)),
    );

    row.alignment = { vertical: "top", wrapText: true };
  });

  const lastTableRow = Math.max(worksheet.rowCount, HEADER_ROW_NUMBER);
  const border = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  for (let rowNumber = HEADER_ROW_NUMBER; rowNumber <= lastTableRow; rowNumber += 1) {
    for (let column = 1; column <= columnCount; column += 1) {
      worksheet.getCell(rowNumber, column).border = border;
    }
  }

  worksheet.views = [{ state: "frozen", ySplit: HEADER_ROW_NUMBER }];
  worksheet.autoFilter = {
    from: { row: HEADER_ROW_NUMBER, column: 1 },
    to: { row: HEADER_ROW_NUMBER, column: columnCount },
  };

  return workbook;
}

module.exports = {
  DEFAULT_FIELD_KEYS,
  FIELD_DEFINITIONS,
  buildCourseStudentReportContentDisposition,
  buildCourseStudentReportFilename,
  buildCourseStudentReportWorkbook,
  parseSelectedFields,
};
