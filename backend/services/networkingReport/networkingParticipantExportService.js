const ExcelJS = require("exceljs");
const { resolveReportPeriod } = require("../../utils/reportPeriod");

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const text = (value) => String(value ?? "").trim();
const formatDateTime = (value) => {
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return text(value);
  const date = `${match[3]}/${match[2]}/${match[1]}`;
  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
};
function normalizeCheckedIn(value) {
  if (value === true || value === 1 || value === "1") return "CHECKED";
  if (value === false || value === 0 || value === "0") return "UNCHECKED";
  return "UNKNOWN";
}
function checkedInLabel(value) {
  const normalized = normalizeCheckedIn(value);
  return normalized === "CHECKED" ? "Đã check-in" : normalized === "UNCHECKED" ? "Chưa check-in" : "Không xác định";
}
const FIELD_DEFINITIONS = {
  full_name: { header: "Họ và tên", width: 28, value: (row) => text(row.full_name) },
  email: { header: "Email", width: 28, value: (row) => text(row.email) },
  phone: { header: "Điện thoại", width: 18, value: (row) => text(row.phone) },
  gender: { header: "Giới tính", width: 14, value: (row) => text(row.gender) },
  age_group: { header: "Nhóm tuổi", width: 16, value: (row) => text(row.age_group) },
  user_type: { header: "Nhóm đối tượng", width: 20, value: (row) => text(row.user_type) },
  organization: { header: "Đơn vị", width: 28, value: (row) => text(row.organization) },
  position: { header: "Chức vụ", width: 22, value: (row) => text(row.position) },
  role: { header: "Vai trò tham gia", width: 20, value: (row) => text(row.role) },
  registration_status: { header: "Trạng thái đăng ký", width: 22, value: (row) => text(row.registration_status) },
  checked_in: { header: "Check-in", width: 18, value: (row) => checkedInLabel(row.checked_in) },
  checked_in_at: { header: "Thời gian check-in", width: 22, value: (row) => formatDateTime(row.checked_in_at) },
  created_at: { header: "Thời gian đăng ký", width: 22, value: (row) => formatDateTime(row.created_at) },
};
const DEFAULT_FIELD_KEYS = Object.freeze(Object.keys(FIELD_DEFINITIONS));
const INDEX_COLUMN = { header: "STT", width: 8, value: (_row, index) => index + 1 };
const EXPORT_COLUMNS = [INDEX_COLUMN, ...DEFAULT_FIELD_KEYS.map((key) => ({ key, ...FIELD_DEFINITIONS[key] }))];
function validationError(message) {
  const error = new Error(message); error.statusCode = 400; return error;
}
function parseExportQuery(query = {}) {
  const scope = text(query.scope).toUpperCase();
  if (!["ALL", "FILTERED"].includes(scope)) throw validationError("scope phải là ALL hoặc FILTERED.");
  const filters = {
    keyword: text(query.keyword), registrationStatus: text(query.registration_status),
    checkedIn: text(query.checked_in).toUpperCase(), userType: text(query.user_type),
    gender: text(query.gender), ageGroup: text(query.age_group),
    organization: text(query.organization), position: text(query.position), role: text(query.role),
  };
  if (filters.checkedIn && !["CHECKED", "UNCHECKED", "UNKNOWN"].includes(filters.checkedIn)) throw validationError("checked_in không hợp lệ.");
  if (filters.registrationStatus && !["PENDING", "CONFIRMED", "UNKNOWN"].includes(filters.registrationStatus.toUpperCase())) {
    throw validationError("registration_status không hợp lệ.");
  }
  if (filters.registrationStatus) filters.registrationStatus = filters.registrationStatus.toUpperCase();
  ["registrationStatus", "userType", "gender", "ageGroup", "organization", "position", "role"].forEach((key) => {
    if (filters[key].toUpperCase() === "UNKNOWN") filters[key] = "UNKNOWN";
  });
  let selectedFields = null;
  if (Object.prototype.hasOwnProperty.call(query, "fields")) {
    const raw = Array.isArray(query.fields) ? query.fields.join(",") : query.fields;
    const fields = text(raw).split(",").map((key) => key.trim()).filter(Boolean);
    if (!fields.length) throw validationError("Vui lòng chọn ít nhất một trường để xuất.");
    const invalid = [...new Set(fields.filter((key) => !FIELD_DEFINITIONS[key]))];
    if (invalid.length) throw validationError(`Trường xuất không hợp lệ: ${invalid.join(", ")}.`);
    selectedFields = [...new Set(fields)];
  }
  return { scope, filters, selectedFields, period: resolveReportPeriod(query, { includeTime: true }) };
}
function matches(value, filter) {
  if (!filter) return true;
  const normalized = text(value);
  return filter === "UNKNOWN" ? normalized === "" : normalized === filter;
}
function filterParticipants(participants, filters) {
  const keyword = text(filters.keyword).toLocaleLowerCase("vi-VN");
  return participants.filter((row) => {
    const keywordMatch = !keyword || [row.full_name, row.email, row.phone, row.organization, row.position, row.role]
      .some((value) => text(value).toLocaleLowerCase("vi-VN").includes(keyword));
    return keywordMatch && matches(row.registration_status, filters.registrationStatus) &&
      (!filters.checkedIn || normalizeCheckedIn(row.checked_in) === filters.checkedIn) &&
      matches(row.user_type, filters.userType) && matches(row.gender, filters.gender) &&
      matches(row.age_group, filters.ageGroup) && matches(row.organization, filters.organization) &&
      matches(row.position, filters.position) && matches(row.role, filters.role);
  });
}
function formatPeriod(period) {
  if (period.type === "QUARTER") return `Quý ${period.quarter} / ${period.year}`;
  if (period.type === "MONTH") return `Tháng ${period.month} / ${period.year}`;
  if (period.type === "WEEK") return `Tuần ${period.week} / ${period.year} (${formatDateTime(period.start_date)} – ${formatDateTime(period.end_date)})`;
  return `Năm ${period.year}`;
}
function periodFilenamePart(period) {
  if (period.type === "QUARTER") return `${period.year}_Q${period.quarter}`;
  if (period.type === "MONTH") return `${period.year}_${String(period.month).padStart(2, "0")}`;
  if (period.type === "WEEK") return `${period.year}_W${String(period.week).padStart(2, "0")}`;
  return String(period.year);
}
const sanitizeFilenamePart = (value) => text(value).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
function addMetadataRow(sheet, label, value, count) {
  const row = sheet.addRow([label, value ?? ""]); row.getCell(1).font = { bold: true }; sheet.mergeCells(row.number, 2, row.number, count);
}
function createWorkbook({ event, participants, options }) {
  const keys = options.selectedFields === null ? DEFAULT_FIELD_KEYS : options.selectedFields;
  const columns = [INDEX_COLUMN, ...keys.map((key) => FIELD_DEFINITIONS[key])];
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Người tham gia");
  workbook.creator = "SIHUB"; workbook.created = new Date(); sheet.mergeCells(1, 1, 1, columns.length);
  sheet.getCell("A1").value = "BÁO CÁO NGƯỜI THAM GIA SỰ KIỆN KẾT NỐI";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  [["Tên sự kiện", event.event_name], ["Mã sự kiện", event.event_code], ["Địa điểm", event.location],
    ["Bắt đầu chính thức", formatDateTime(event.start_datetime)], ["Kết thúc chính thức", formatDateTime(event.end_datetime)],
    ["Kỳ báo cáo", formatPeriod(options.period)], ["Phạm vi xuất", options.scope === "ALL" ? "Tất cả" : "Theo bộ lọc"]]
    .forEach(([label, value]) => addMetadataRow(sheet, label, value, columns.length));
  const metadata = [["Từ khóa", options.filters.keyword], ["Trạng thái đăng ký", options.filters.registrationStatus],
    ["Check-in", options.filters.checkedIn], ["Nhóm đối tượng", options.filters.userType], ["Giới tính", options.filters.gender],
    ["Nhóm tuổi", options.filters.ageGroup], ["Đơn vị", options.filters.organization], ["Chức vụ", options.filters.position], ["Vai trò", options.filters.role]]
    .filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("; ");
  addMetadataRow(sheet, "Bộ lọc đang áp dụng", options.scope === "FILTERED" ? metadata || "Không" : "Không", columns.length);
  addMetadataRow(sheet, "Tổng số dòng xuất", participants.length, columns.length); sheet.addRow([]);
  const headerRow = sheet.addRow(columns.map((column) => column.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }; headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  participants.forEach((row, index) => sheet.addRow(columns.map((column) => column.value(row, index))));
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width; });
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: columns.length } };
  return workbook;
}
async function buildExport({ event, participants, options }) {
  const exportedParticipants = options.scope === "FILTERED" ? filterParticipants(participants, options.filters) : [...participants];
  const workbook = createWorkbook({ event, participants: exportedParticipants, options });
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, exportedParticipants, filename: `SIHUB_Networking_Participants_${sanitizeFilenamePart(event.event_code) || event.event_id}_${periodFilenamePart(options.period)}_${options.scope}.xlsx` };
}
module.exports = { DEFAULT_FIELD_KEYS, EXPORT_COLUMNS, FIELD_DEFINITIONS, XLSX_CONTENT_TYPE, buildExport, createWorkbook, filterParticipants, normalizeCheckedIn, parseExportQuery };
