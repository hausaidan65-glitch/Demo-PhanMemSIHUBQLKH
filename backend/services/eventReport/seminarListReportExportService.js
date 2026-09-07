const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const UNKNOWN_FILTER_VALUE = "__UNKNOWN__";
const NO_PARENT_FILTER_VALUE = "__NO_PARENT__";

class SeminarListExportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SeminarListExportValidationError";
    this.statusCode = 400;
  }
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

const FIELD_DEFINITIONS = {
  event_name: { header: "Tên hội thảo", width: 36, value: (row) => row.event_name || "" },
  event_code: { header: "Mã", width: 18, value: (row) => row.event_code || "" },
  parent_exhibition_name: { header: "Triển lãm trực thuộc", width: 30, value: (row) => row.parent_exhibition_name || "" },
  mission: { header: "Nhiệm vụ", width: 28, value: (row) => row.mission || "" },
  location: { header: "Địa điểm", width: 28, value: (row) => row.location || "" },
  start_datetime: { header: "Bắt đầu", width: 20, value: (row) => formatDateTime(row.start_datetime) },
  end_datetime: { header: "Kết thúc", width: 20, value: (row) => formatDateTime(row.end_datetime) },
  organizer: { header: "Đơn vị tổ chức", width: 30, value: (row) => row.organizer || "" },
  status: { header: "Trạng thái", width: 18, value: (row) => row.status || "" },
  max_participants: { header: "Sức chứa", width: 14, value: (row) => Number(row.max_participants) || 0 },
  total_participants: { header: "Lượt tham gia", width: 16, value: (row) => Number(row.total_participants) || 0 },
  checked_in_participants: { header: "Đã check-in", width: 16, value: (row) => Number(row.checked_in_participants) || 0 },
};

const DEFAULT_FIELD_KEYS = Object.keys(FIELD_DEFINITIONS);
const FILTER_NAMES = ["keyword", "status", "parent", "mission"];

function normalizedText(value) {
  return String(value ?? "").trim();
}

function searchableText(value) {
  return normalizedText(value).toLocaleLowerCase("vi-VN");
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
    throw new SeminarListExportValidationError(
      "Vui lòng chọn ít nhất một trường để xuất.",
    );
  }
  const invalidField = fields.find((field) => !FIELD_DEFINITIONS[field]);
  if (invalidField) {
    throw new SeminarListExportValidationError(
      `Trường xuất không hợp lệ: ${invalidField}.`,
    );
  }
  return fields;
}

function parseFilters(query, scope) {
  if (scope === "ALL") return {};
  const filters = FILTER_NAMES.reduce((result, name) => {
    result[name] = normalizedText(query[name]);
    return result;
  }, {});
  if (filters.keyword.length > 200) {
    throw new SeminarListExportValidationError(
      "Từ khóa tìm kiếm không được vượt quá 200 ký tự.",
    );
  }
  ["status", "mission"].forEach((name) => {
    if (filters[name] === NO_PARENT_FILTER_VALUE) {
      throw new SeminarListExportValidationError("Giá trị bộ lọc không hợp lệ.");
    }
  });
  if (filters.parent === UNKNOWN_FILTER_VALUE) {
    throw new SeminarListExportValidationError(
      "Giá trị triển lãm trực thuộc không hợp lệ.",
    );
  }
  if (filters.parent && filters.parent !== NO_PARENT_FILTER_VALUE
      && !/^\d+$/.test(filters.parent)) {
    throw new SeminarListExportValidationError(
      "Triển lãm trực thuộc không hợp lệ.",
    );
  }
  return filters;
}

function parseExportQuery(query = {}) {
  const scope = normalizedText(query.scope).toUpperCase();
  if (scope !== "ALL" && scope !== "FILTERED") {
    throw new SeminarListExportValidationError(
      "Phạm vi xuất báo cáo không hợp lệ.",
    );
  }
  return {
    scope,
    selectedFields: parseSelectedFields(query),
    filters: parseFilters(query, scope),
  };
}

function matchesRawFilter(value, filterValue) {
  if (!filterValue) return true;
  const normalizedValue = normalizedText(value);
  return filterValue === UNKNOWN_FILTER_VALUE
    ? normalizedValue === ""
    : normalizedValue === filterValue;
}

function filterSeminars(seminars, scope, filters = {}) {
  if (scope === "ALL") return [...seminars];
  const keyword = searchableText(filters.keyword);
  return seminars.filter((seminar) => {
    const keywordMatches = !keyword || [
      seminar.event_name, seminar.event_code, seminar.location,
      seminar.organizer, seminar.mission, seminar.parent_exhibition_name,
    ].some((value) => searchableText(value).includes(keyword));
    const parentMatches = !filters.parent
      || (filters.parent === NO_PARENT_FILTER_VALUE
        ? !normalizedText(seminar.parent_event_id)
        : normalizedText(seminar.parent_event_id) === filters.parent);
    return keywordMatches
      && matchesRawFilter(seminar.status, filters.status)
      && parentMatches
      && matchesRawFilter(seminar.mission, filters.mission);
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

function filterMetadata(filters, sourceSeminars = []) {
  const rows = [];
  if (filters.keyword) rows.push(`Từ khóa: ${filters.keyword}`);
  if (filters.status) rows.push(`Trạng thái: ${filters.status === UNKNOWN_FILTER_VALUE ? "Không xác định" : filters.status}`);
  if (filters.parent) {
    const parentName = sourceSeminars.find(
      (seminar) => normalizedText(seminar.parent_event_id) === filters.parent,
    )?.parent_exhibition_name;
    rows.push(`Triển lãm trực thuộc: ${filters.parent === NO_PARENT_FILTER_VALUE
      ? "Không có"
      : parentName || `ID ${filters.parent}`}`);
  }
  if (filters.mission) rows.push(`Nhiệm vụ: ${filters.mission === UNKNOWN_FILTER_VALUE ? "Không xác định" : filters.mission}`);
  return rows.length ? rows.join("; ") : "Không có";
}

function buildWorkbook({
  period,
  seminars,
  sourceSeminars = seminars,
  scope,
  filters,
  selectedFields,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIHUB";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Hội thảo");
  const columns = [
    { header: "STT", width: 8, value: (_row, index) => index + 1 },
    ...selectedFields.map((key) => FIELD_DEFINITIONS[key]),
  ];
  const lastColumn = columns.length;
  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell(1, 1);
  title.value = "BÁO CÁO CHI TIẾT DANH SÁCH HỘI THẢO";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;
  const addMetadata = (label, value) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (lastColumn > 2) sheet.mergeCells(row.number, 2, row.number, lastColumn);
  };
  addMetadata("Kỳ báo cáo", formatPeriod(period));
  addMetadata("Phạm vi", scope === "ALL" ? "Toàn bộ" : "Theo bộ lọc");
  addMetadata("Bộ lọc đang áp dụng", scope === "ALL"
    ? "Không áp dụng"
    : filterMetadata(filters, sourceSeminars));
  addMetadata("Tổng số dòng xuất", seminars.length);
  sheet.addRow([]);
  const headerRow = sheet.addRow(columns.map((column) => column.header));
  seminars.forEach((seminar, index) => {
    sheet.addRow(columns.map((column) => column.value(seminar, index)));
  });
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width; });
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
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

function buildFilename(period, scope) {
  return `SIHUB_Seminar_List_${periodFilenamePart(period)}_${scope}.xlsx`;
}

module.exports = {
  DEFAULT_FIELD_KEYS,
  FIELD_DEFINITIONS,
  XLSX_CONTENT_TYPE,
  buildFilename,
  buildWorkbook,
  filterSeminars,
  parseExportQuery,
};
