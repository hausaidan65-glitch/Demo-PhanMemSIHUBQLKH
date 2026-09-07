const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

class CourseOpeningExportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CourseOpeningExportValidationError";
    this.statusCode = 400;
  }
}

const FIELD_DEFINITIONS = {
  class_name: { header: "Tên lớp", width: 34, value: (row) => row.class_name || "" },
  class_code: { header: "Mã lớp", width: 18, value: (row) => row.class_code || "" },
  organization_start_date: { header: "Ngày bắt đầu", width: 17, value: (row) => formatDate(row.organization_start_date) },
  organization_end_date: { header: "Ngày kết thúc", width: 17, value: (row) => formatDate(row.organization_end_date) },
  location: { header: "Địa điểm", width: 28, value: (row) => row.location || "" },
  operational_status: { header: "Trạng thái vận hành", width: 22, value: (row) => statusLabel(row.operational_status) },
  organization_status: { header: "Trạng thái tổ chức", width: 22, value: (row) => statusLabel(row.organization_status) },
  total_students_registered: { header: "Học viên đăng ký", width: 20, value: (row) => Number(row.total_students_registered) || 0 },
  total_students_attended: { header: "Học viên đi học", width: 20, value: (row) => Number(row.total_students_attended) || 0 },
  total_certificates_issued: { header: "Chứng nhận đã cấp", width: 22, value: (row) => Number(row.total_certificates_issued) || 0 },
};

const DEFAULT_FIELD_KEYS = Object.keys(FIELD_DEFINITIONS);
const STATUS_VALUES = new Set([
  "OPEN", "FULL", "CLOSED", "ACTIVE", "FINISHED", "ONGOING", "UPCOMING", "PENDING",
]);
const ORGANIZATION_STATUS_VALUES = new Set(["FINISHED", "ONGOING", "UPCOMING"]);
const PRESENCE_VALUES = new Set(["HAS", "NONE"]);
const FILTER_NAMES = [
  "search",
  "operationalStatus",
  "organizationStatus",
  "startDate",
  "endDate",
  "registrationPresence",
  "attendancePresence",
  "certificatePresence",
];

const STATUS_LABELS = {
  OPEN: "Đang mở",
  FULL: "Đã đủ",
  CLOSED: "Đã đóng",
  ACTIVE: "Đang hoạt động",
  FINISHED: "Đã kết thúc",
  ONGOING: "Đang diễn ra",
  UPCOMING: "Sắp tổ chức",
  PENDING: "Chờ xử lý",
};

function statusLabel(value) {
  return STATUS_LABELS[value] || value || "";
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseSelectedFields(query = {}) {
  if (!Object.prototype.hasOwnProperty.call(query, "fields")) {
    return [...DEFAULT_FIELD_KEYS];
  }

  const rawFields = Array.isArray(query.fields)
    ? query.fields.flatMap((value) => String(value).split(","))
    : String(query.fields).split(",");
  const fields = [...new Set(rawFields.map((field) => field.trim()).filter(Boolean))];

  if (!fields.length) {
    throw new CourseOpeningExportValidationError(
      "Vui lòng chọn ít nhất một trường để xuất.",
    );
  }

  const invalidField = fields.find((field) => !FIELD_DEFINITIONS[field]);
  if (invalidField) {
    throw new CourseOpeningExportValidationError(
      `Trường xuất không hợp lệ: ${invalidField}.`,
    );
  }

  return fields;
}

function parseFilters(query = {}, scope) {
  if (scope === "ALL") return {};

  const filters = FILTER_NAMES.reduce((result, name) => {
    result[name] = String(query[name] ?? "").trim();
    return result;
  }, {});

  if (filters.search.length > 200) {
    throw new CourseOpeningExportValidationError("Từ khóa tìm kiếm không được vượt quá 200 ký tự.");
  }
  if (filters.operationalStatus && !STATUS_VALUES.has(filters.operationalStatus)) {
    throw new CourseOpeningExportValidationError("Trạng thái vận hành không hợp lệ.");
  }
  if (filters.organizationStatus && !ORGANIZATION_STATUS_VALUES.has(filters.organizationStatus)) {
    throw new CourseOpeningExportValidationError("Trạng thái tổ chức không hợp lệ.");
  }

  ["registrationPresence", "attendancePresence", "certificatePresence"].forEach((name) => {
    if (filters[name] && !PRESENCE_VALUES.has(filters[name])) {
      throw new CourseOpeningExportValidationError("Giá trị lọc có/không có dữ liệu không hợp lệ.");
    }
  });

  ["startDate", "endDate"].forEach((name) => {
    if (filters[name] && !isValidIsoDate(filters[name])) {
      throw new CourseOpeningExportValidationError("Ngày lọc phải có định dạng YYYY-MM-DD hợp lệ.");
    }
  });
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    throw new CourseOpeningExportValidationError("Từ ngày không được sau Đến ngày.");
  }

  return filters;
}

function parseExportQuery(query = {}) {
  const scope = String(query.scope ?? "").trim().toUpperCase();
  if (!new Set(["ALL", "FILTERED"]).has(scope)) {
    throw new CourseOpeningExportValidationError("Phạm vi xuất báo cáo không hợp lệ.");
  }

  return {
    scope,
    selectedFields: parseSelectedFields(query),
    filters: parseFilters(query, scope),
  };
}

function matchesPresence(value, filter) {
  if (!filter) return true;
  const count = Number(value);
  const safeCount = Number.isFinite(count) ? count : 0;
  return filter === "HAS" ? safeCount > 0 : safeCount === 0;
}

function filterOpenings(openings, scope, filters = {}) {
  if (scope === "ALL") return [...openings];
  const search = String(filters.search || "").toLowerCase();

  return openings.filter((opening) => {
    const startDate = String(opening.organization_start_date || "").slice(0, 10);
    const endDate = String(opening.organization_end_date || "").slice(0, 10);
    const matchesSearch = !search || [opening.class_name, opening.class_code]
      .some((value) => String(value ?? "").trim().toLowerCase().includes(search));

    return matchesSearch
      && (!filters.operationalStatus || opening.operational_status === filters.operationalStatus)
      && (!filters.organizationStatus || opening.organization_status === filters.organizationStatus)
      && (!filters.startDate || (endDate && endDate >= filters.startDate))
      && (!filters.endDate || (startDate && startDate <= filters.endDate))
      && matchesPresence(opening.total_students_registered, filters.registrationPresence)
      && matchesPresence(opening.total_students_attended, filters.attendancePresence)
      && matchesPresence(opening.total_certificates_issued, filters.certificatePresence);
  });
}

function formatPeriod(period) {
  if (period.type === "QUARTER") return `Quý ${period.quarter} / ${period.year}`;
  if (period.type === "MONTH") return `Tháng ${period.month} / ${period.year}`;
  if (period.type === "WEEK") return `Tuần ${period.week} / ${period.year}`;
  return `Năm ${period.year}`;
}

function periodFilenamePart(period) {
  if (period.type === "QUARTER") return `${period.year}_Q${period.quarter}`;
  if (period.type === "MONTH") return `${period.year}_${String(period.month).padStart(2, "0")}`;
  if (period.type === "WEEK") return `${period.year}_W${String(period.week).padStart(2, "0")}`;
  return String(period.year);
}

function filterMetadata(filters) {
  const rows = [];
  if (filters.search) rows.push(`Từ khóa: ${filters.search}`);
  if (filters.operationalStatus) rows.push(`Trạng thái vận hành: ${statusLabel(filters.operationalStatus)}`);
  if (filters.organizationStatus) rows.push(`Trạng thái tổ chức: ${statusLabel(filters.organizationStatus)}`);
  if (filters.startDate) rows.push(`Từ ngày: ${formatDate(filters.startDate)}`);
  if (filters.endDate) rows.push(`Đến ngày: ${formatDate(filters.endDate)}`);
  const presenceLabels = [
    ["registrationPresence", "Có học viên đăng ký"],
    ["attendancePresence", "Có học viên đi học"],
    ["certificatePresence", "Có cấp chứng nhận"],
  ];
  presenceLabels.forEach(([key, label]) => {
    if (filters[key]) rows.push(`${label}: ${filters[key] === "HAS" ? "Có" : "Không"}`);
  });
  return rows.length ? rows.join("; ") : "Không có";
}

function buildWorkbook({ course, period, openings, scope, filters, selectedFields }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIHUB";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Lớp - Đợt tổ chức");
  const columns = [
    { header: "STT", width: 8, value: (_row, index) => index + 1 },
    ...selectedFields.map((key) => FIELD_DEFINITIONS[key]),
  ];
  const lastColumn = columns.length;

  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell(1, 1);
  title.value = "BÁO CÁO CHI TIẾT LỚP / ĐỢT TỔ CHỨC";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  const addMetadata = (label, value) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (lastColumn > 2) sheet.mergeCells(row.number, 2, row.number, lastColumn);
  };
  addMetadata("Khóa đào tạo", course.course_name || "");
  addMetadata("Kỳ báo cáo", `${formatPeriod(period)} (${formatDate(period.start_date)} – ${formatDate(period.end_date)})`);
  addMetadata("Phạm vi", scope === "ALL" ? "Toàn bộ" : "Theo bộ lọc");
  addMetadata("Bộ lọc đang áp dụng", scope === "ALL" ? "Không áp dụng" : filterMetadata(filters));
  addMetadata("Tổng số dòng xuất", openings.length);
  sheet.addRow([]);

  const headerRow = sheet.addRow(columns.map((column) => column.header));
  openings.forEach((opening, index) => {
    sheet.addRow(columns.map((column) => column.value(opening, index)));
  });
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  const border = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };
  for (let row = headerRow.number; row <= sheet.rowCount; row += 1) {
    for (let column = 1; column <= lastColumn; column += 1) {
      sheet.getCell(row, column).border = border;
    }
  }
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: lastColumn },
  };
  return workbook;
}

function buildFilename(course, period, scope) {
  const coursePart = String(course.course_code || course.course_id || "course")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "course";
  return `SIHUB_Training_Openings_${coursePart}_${periodFilenamePart(period)}_${scope}.xlsx`;
}

module.exports = {
  CourseOpeningExportValidationError,
  DEFAULT_FIELD_KEYS,
  FIELD_DEFINITIONS,
  XLSX_CONTENT_TYPE,
  buildFilename,
  buildWorkbook,
  filterOpenings,
  parseExportQuery,
};
