const ExcelJS = require("exceljs");

const WORKSHEET_NAME = "Báo cáo học viên";
const COLUMN_COUNT = 16;
const HEADER_ROW_NUMBER = 14;

const HEADERS = [
  "STT",
  "Họ và tên",
  "Email",
  "Số điện thoại",
  "Giới tính",
  "Nhóm đối tượng",
  "Đơn vị",
  "Chức vụ",
  "Trạng thái đăng ký",
  "Đã đi học",
  "Số buổi tham dự",
  "Tổng số buổi",
  "Tỷ lệ tham dự (%)",
  "Đủ điều kiện chứng nhận",
  "Đã cấp chứng nhận",
  "Số chứng nhận",
];

const COLUMN_WIDTHS = [
  8, 26, 32, 18, 14, 20, 28, 24, 22, 14, 18, 16, 20, 26, 22, 22,
];

const REGISTER_STATUS_LABELS = {
  CONFIRMED: "Đã xác nhận",
  PENDING: "Chờ xác nhận",
};

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

function buildCourseStudentReportFilename(opening = {}) {
  const openingPart =
    sanitizeFilenamePart(opening.class_code) ||
    sanitizeFilenamePart(opening.class_name) ||
    "lop";
  const dateText = new Date().toISOString().slice(0, 10);

  return `bao-cao-hoc-vien-${openingPart}-${dateText}.xlsx`;
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
} = {}) {
  if (!Array.isArray(students)) {
    throw new TypeError("Danh sách học viên export không hợp lệ.");
  }

  if (scope !== "ALL" && scope !== "FILTERED") {
    throw new TypeError("Phạm vi export không hợp lệ.");
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "SIHUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(WORKSHEET_NAME);

  COLUMN_WIDTHS.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.mergeCells(1, 1, 1, COLUMN_COUNT);
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
    worksheet.mergeCells(rowNumber, 2, rowNumber, COLUMN_COUNT);
    styleMetadataRow(worksheet, rowNumber);
  });

  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);

  headerRow.values = HEADERS;
  headerRow.font = { bold: true };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  headerRow.height = 30;

  students.forEach((student, index) => {
    const row = worksheet.addRow([
      index + 1,
      safeText(student.full_name),
      safeText(student.email),
      safeText(student.phone),
      safeText(student.gender),
      safeText(student.user_type),
      safeText(student.company),
      safeText(student.position),
      REGISTER_STATUS_LABELS[student.register_status] ||
        safeText(student.register_status),
      student.attended === true ? "Có" : "Không",
      safeNumber(student.attended_sessions),
      safeNumber(student.total_sessions),
      safeNumber(student.attendance_rate),
      student.certificate_eligible === true ? "Có" : "Không",
      student.certificate_issued === true ? "Có" : "Không",
      safeText(student.certificate_no),
    ]);

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
    for (let column = 1; column <= COLUMN_COUNT; column += 1) {
      worksheet.getCell(rowNumber, column).border = border;
    }
  }

  worksheet.views = [{ state: "frozen", ySplit: HEADER_ROW_NUMBER }];
  worksheet.autoFilter = {
    from: { row: HEADER_ROW_NUMBER, column: 1 },
    to: { row: HEADER_ROW_NUMBER, column: COLUMN_COUNT },
  };

  return workbook;
}

module.exports = {
  buildCourseStudentReportFilename,
  buildCourseStudentReportWorkbook,
};
