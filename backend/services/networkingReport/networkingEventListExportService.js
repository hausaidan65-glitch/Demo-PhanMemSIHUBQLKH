const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const UNKNOWN_FILTER_VALUE = "__UNKNOWN__";

class NetworkingEventListExportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkingEventListExportValidationError";
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
  event_name: { header: "Tên sự kiện", width: 36, value: (row) => row.event_name || "" },
  event_code: { header: "Mã sự kiện", width: 18, value: (row) => row.event_code || "" },
  mission: { header: "Nhiệm vụ", width: 32, value: (row) => row.mission || "" },
  location: { header: "Địa điểm", width: 28, value: (row) => row.location || "" },
  organizer: { header: "Đơn vị tổ chức", width: 30, value: (row) => row.organizer || "" },
  start_datetime: { header: "Bắt đầu", width: 20, value: (row) => formatDateTime(row.start_datetime) },
  end_datetime: { header: "Kết thúc", width: 20, value: (row) => formatDateTime(row.end_datetime) },
  stored_status: { header: "Trạng thái lưu", width: 18, value: (row) => row.stored_status || "" },
  operational_status: { header: "Trạng thái hoạt động", width: 22, value: (row) => row.operational_status || "" },
  max_participants: { header: "Sức chứa", width: 14, value: (row) => Number(row.max_participants) || 0 },
  total_registered: { header: "Đăng ký hợp lệ", width: 18, value: (row) => Number(row.total_registered) || 0 },
  checked_in_participants: { header: "Đã check-in", width: 16, value: (row) => Number(row.checked_in_participants) || 0 },
};

const DEFAULT_FIELD_KEYS = Object.keys(FIELD_DEFINITIONS);
const STORED_STATUS_VALUES = new Set(["DRAFT", "OPEN", "CLOSED", "FINISHED"]);
const OPERATIONAL_STATUS_VALUES = new Set(["FINISHED", "ONGOING", "UPCOMING"]);

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
    throw new NetworkingEventListExportValidationError(
      "Vui lòng chọn ít nhất một trường để xuất.",
    );
  }
  const invalidField = fields.find((field) => !FIELD_DEFINITIONS[field]);
  if (invalidField) {
    throw new NetworkingEventListExportValidationError(
      `Trường xuất không hợp lệ: ${invalidField}.`,
    );
  }
  return fields;
}

function parseFilters(query, scope) {
  if (scope === "ALL") return {};
  const filters = {
    keyword: normalizedText(query.keyword),
    stored_status: normalizedText(query.stored_status),
    operational_status: normalizedText(query.operational_status),
    mission: normalizedText(query.mission),
  };
  if (filters.keyword.length > 200) {
    throw new NetworkingEventListExportValidationError(
      "Từ khóa tìm kiếm không được vượt quá 200 ký tự.",
    );
  }
  if (filters.stored_status
      && filters.stored_status !== UNKNOWN_FILTER_VALUE
      && !STORED_STATUS_VALUES.has(filters.stored_status)) {
    throw new NetworkingEventListExportValidationError(
      "Trạng thái lưu không hợp lệ.",
    );
  }
  if (filters.operational_status
      && !OPERATIONAL_STATUS_VALUES.has(filters.operational_status)) {
    throw new NetworkingEventListExportValidationError(
      "Trạng thái hoạt động không hợp lệ.",
    );
  }
  if (filters.mission.length > 255) {
    throw new NetworkingEventListExportValidationError(
      "Giá trị nhiệm vụ không hợp lệ.",
    );
  }
  return filters;
}

function parseExportQuery(query = {}) {
  const scope = normalizedText(query.scope).toUpperCase();
  if (scope !== "ALL" && scope !== "FILTERED") {
    throw new NetworkingEventListExportValidationError(
      "Phạm vi xuất báo cáo không hợp lệ.",
    );
  }
  return {
    scope,
    selectedFields: parseSelectedFields(query),
    filters: parseFilters(query, scope),
  };
}

function matchesExact(value, filterValue) {
  if (!filterValue) return true;
  const valueText = normalizedText(value);
  return filterValue === UNKNOWN_FILTER_VALUE
    ? valueText === ""
    : valueText === filterValue;
}

function filterEvents(events, scope, filters = {}) {
  if (scope === "ALL") return [...events];
  const keyword = searchableText(filters.keyword);
  return events.filter((event) => {
    const keywordMatches = !keyword || [
      event.event_name, event.event_code, event.location,
      event.organizer, event.mission,
    ].some((value) => searchableText(value).includes(keyword));
    return keywordMatches
      && matchesExact(event.stored_status, filters.stored_status)
      && matchesExact(event.operational_status, filters.operational_status)
      && matchesExact(event.mission, filters.mission);
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
  if (filters.keyword) rows.push(`Từ khóa: ${filters.keyword}`);
  if (filters.stored_status) rows.push(`Trạng thái lưu: ${filters.stored_status === UNKNOWN_FILTER_VALUE ? "Không xác định" : filters.stored_status}`);
  if (filters.operational_status) rows.push(`Trạng thái hoạt động: ${filters.operational_status}`);
  if (filters.mission) rows.push(`Nhiệm vụ: ${filters.mission === UNKNOWN_FILTER_VALUE ? "Không xác định" : filters.mission}`);
  return rows.length ? rows.join("; ") : "Không có";
}

function buildWorkbook({ period, events, scope, filters, selectedFields }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIHUB";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Sự kiện kết nối");
  const columns = [
    { header: "STT", width: 8, value: (_row, index) => index + 1 },
    ...selectedFields.map((key) => FIELD_DEFINITIONS[key]),
  ];
  const lastColumn = columns.length;
  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell(1, 1);
  title.value = "BÁO CÁO CHI TIẾT DANH SÁCH SỰ KIỆN KẾT NỐI";
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
  addMetadata("Bộ lọc đang áp dụng", scope === "ALL" ? "Không áp dụng" : filterMetadata(filters));
  addMetadata("Tổng số dòng xuất", events.length);
  sheet.addRow([]);
  const headerRow = sheet.addRow(columns.map((column) => column.header));
  events.forEach((event, index) => {
    sheet.addRow(columns.map((column) => column.value(event, index)));
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
  return `SIHUB_Networking_Events_${periodFilenamePart(period)}_${scope}.xlsx`;
}

module.exports = {
  DEFAULT_FIELD_KEYS,
  FIELD_DEFINITIONS,
  XLSX_CONTENT_TYPE,
  buildFilename,
  buildWorkbook,
  filterEvents,
  parseExportQuery,
};
