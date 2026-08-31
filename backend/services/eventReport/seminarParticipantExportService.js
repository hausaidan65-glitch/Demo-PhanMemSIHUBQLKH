const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const EXPORT_COLUMNS = [
  { header: "STT", key: "index", width: 8 },
  { header: "Họ và tên", key: "full_name", width: 28 },
  { header: "Email", key: "email", width: 28 },
  { header: "Điện thoại", key: "phone", width: 18 },
  { header: "Giới tính", key: "gender", width: 14 },
  { header: "Nhóm tuổi", key: "age_group", width: 16 },
  { header: "Nhóm đối tượng", key: "user_type", width: 20 },
  { header: "Đơn vị", key: "organization", width: 26 },
  { header: "Chức vụ", key: "position", width: 20 },
  { header: "Vai trò tham gia", key: "participant_role", width: 20 },
  { header: "Có dự án", key: "has_project", width: 14 },
  { header: "Lĩnh vực dự án", key: "project_field", width: 24 },
  { header: "Giai đoạn Startup", key: "startup_stage", width: 22 },
  {
    header: "Trạng thái tuyển chọn chương trình",
    key: "program_selection_status",
    width: 32,
  },
  { header: "Nhu cầu hỗ trợ", key: "support_needs", width: 30 },
  { header: "Câu hỏi cho BTC", key: "organizer_question", width: 30 },
  { header: "Ghi chú", key: "note", width: 28 },
  { header: "Trạng thái đăng ký", key: "registration_status", width: 22 },
  { header: "Check-in", key: "checked_in", width: 18 },
  { header: "Thời gian check-in", key: "checked_in_at", width: 22 },
  { header: "Thời gian đăng ký", key: "created_at", width: 22 },
];

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizedText(value) {
  return String(value ?? "").trim();
}

function searchableText(value) {
  return normalizedText(value).toLocaleLowerCase("vi-VN");
}

function normalizeCheckedIn(value) {
  if (value === true || value === 1 || value === "1") {
    return "CHECKED";
  }

  if (value === false || value === 0 || value === "0") {
    return "UNCHECKED";
  }

  return "UNKNOWN";
}

function matchesRawFilter(value, filterValue) {
  if (!filterValue) {
    return true;
  }

  const valueText = normalizedText(value);

  return filterValue === "UNKNOWN"
    ? valueText === ""
    : valueText === filterValue;
}

function parseOptionalInteger(value, name, minimum, maximum) {
  if (value === undefined || normalizedText(value) === "") {
    return null;
  }

  const rawValue = normalizedText(value);

  if (!/^\d+$/.test(rawValue)) {
    throw validationError(`${name} không hợp lệ.`);
  }

  const parsedValue = Number(rawValue);

  if (parsedValue < minimum || parsedValue > maximum) {
    throw validationError(`${name} không hợp lệ.`);
  }

  return parsedValue;
}

function parseExportQuery(query) {
  const scope = normalizedText(query.scope).toUpperCase();

  if (!["ALL", "FILTERED"].includes(scope)) {
    throw validationError("scope phải là ALL hoặc FILTERED.");
  }

  const year = parseOptionalInteger(query.year, "Năm báo cáo", 2000, 2100);
  const quarter = parseOptionalInteger(query.quarter, "Quý báo cáo", 1, 4);
  const month = parseOptionalInteger(query.month, "Tháng báo cáo", 1, 12);

  if (quarter !== null && month !== null) {
    throw validationError("Không thể dùng đồng thời quý và tháng.");
  }

  if ((quarter !== null || month !== null) && year === null) {
    throw validationError("Năm báo cáo là bắt buộc khi có quý hoặc tháng.");
  }

  const filters = {
    keyword: normalizedText(query.keyword),
    registrationStatus: normalizedText(query.registration_status),
    checkedIn: normalizedText(query.checked_in).toUpperCase(),
    userType: normalizedText(query.user_type),
    gender: normalizedText(query.gender),
  };

  if (
    filters.checkedIn &&
    !["CHECKED", "UNCHECKED", "UNKNOWN"].includes(filters.checkedIn)
  ) {
    throw validationError("checked_in không hợp lệ.");
  }

  return {
    scope,
    filters,
    period: { year, quarter, month },
  };
}

function filterParticipants(participants, filters) {
  const keyword = searchableText(filters.keyword);

  return participants.filter((participant) => {
    const keywordMatches =
      !keyword ||
      [
        participant.full_name,
        participant.email,
        participant.phone,
        participant.organization,
        participant.position,
      ].some((value) => searchableText(value).includes(keyword));

    return (
      keywordMatches &&
      matchesRawFilter(
        participant.registration_status,
        filters.registrationStatus,
      ) &&
      (!filters.checkedIn ||
        normalizeCheckedIn(participant.checked_in) === filters.checkedIn) &&
      matchesRawFilter(participant.user_type, filters.userType) &&
      matchesRawFilter(participant.gender, filters.gender)
    );
  });
}

function formatDateTime(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );

  if (!match) {
    return value || "";
  }

  const date = `${match[3]}/${match[2]}/${match[1]}`;

  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
}

function displayValue(value) {
  return value === null || value === undefined ? "" : value;
}

function getCheckedInLabel(value) {
  const normalizedValue = normalizeCheckedIn(value);

  if (normalizedValue === "CHECKED") {
    return "Đã check-in";
  }

  if (normalizedValue === "UNCHECKED") {
    return "Chưa check-in";
  }

  return "Không xác định";
}

function getHasProjectLabel(value) {
  if (value === true || value === 1 || value === "1") {
    return "Có";
  }

  if (value === false || value === 0 || value === "0") {
    return "Không";
  }

  return "Không xác định";
}

function addMetadataRow(sheet, label, value) {
  const row = sheet.addRow([label, displayValue(value)]);

  row.getCell(1).font = { bold: true };
  sheet.mergeCells(row.number, 2, row.number, EXPORT_COLUMNS.length);
}

function createWorkbook({ seminar, participants, scope, filters, period }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Người tham gia");

  workbook.creator = "SIHUB";
  sheet.mergeCells(1, 1, 1, EXPORT_COLUMNS.length);
  sheet.getCell("A1").value = "BÁO CÁO NGƯỜI THAM GIA HỘI THẢO";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF15803D" },
  };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  addMetadataRow(sheet, "Tên hội thảo", seminar.event_name);
  addMetadataRow(sheet, "Mã hội thảo", seminar.event_code);
  addMetadataRow(sheet, "Địa điểm", seminar.location);
  addMetadataRow(sheet, "Bắt đầu", formatDateTime(seminar.start_datetime));
  addMetadataRow(sheet, "Kết thúc", formatDateTime(seminar.end_datetime));
  addMetadataRow(sheet, "Trạng thái", seminar.status);
  addMetadataRow(sheet, "Phạm vi xuất", scope === "ALL" ? "TẤT CẢ" : "THEO BỘ LỌC");

  if (period.year !== null) {
    addMetadataRow(sheet, "Năm báo cáo", period.year);
  }

  if (period.quarter !== null) {
    addMetadataRow(sheet, "Quý", period.quarter);
  }

  if (period.month !== null) {
    addMetadataRow(sheet, "Tháng", period.month);
  }

  if (scope === "FILTERED") {
    const filterMetadata = [
      ["Từ khóa", filters.keyword],
      ["Trạng thái đăng ký", filters.registrationStatus],
      ["Check-in", filters.checkedIn],
      ["Nhóm đối tượng", filters.userType],
      ["Giới tính", filters.gender],
    ];

    filterMetadata.forEach(([label, value]) => {
      if (value) {
        addMetadataRow(sheet, label, value);
      }
    });
  }

  sheet.addRow([]);
  const headerRow = sheet.addRow(EXPORT_COLUMNS.map((column) => column.header));

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF166534" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  participants.forEach((participant, index) => {
    sheet.addRow([
      index + 1,
      displayValue(participant.full_name),
      displayValue(participant.email),
      displayValue(participant.phone),
      displayValue(participant.gender),
      displayValue(participant.age_group),
      displayValue(participant.user_type),
      displayValue(participant.organization),
      displayValue(participant.position),
      displayValue(participant.participant_role),
      getHasProjectLabel(participant.has_project),
      displayValue(participant.project_field),
      displayValue(participant.startup_stage),
      displayValue(participant.program_selection_status),
      displayValue(participant.support_needs),
      displayValue(participant.organizer_question),
      displayValue(participant.note),
      displayValue(participant.registration_status),
      getCheckedInLabel(participant.checked_in),
      formatDateTime(participant.checked_in_at),
      formatDateTime(participant.created_at),
    ]);
  });

  EXPORT_COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: EXPORT_COLUMNS.length },
  };

  return workbook;
}

async function buildExport({ seminar, participants, options }) {
  const exportedParticipants =
    options.scope === "FILTERED"
      ? filterParticipants(participants, options.filters)
      : [...participants];
  const workbook = createWorkbook({
    seminar,
    participants: exportedParticipants,
    scope: options.scope,
    filters: options.filters,
    period: options.period,
  });
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    exportedParticipants,
    filename: `seminar-participants-${seminar.seminar_id}-${options.scope.toLowerCase()}.xlsx`,
  };
}

module.exports = {
  EXPORT_COLUMNS,
  XLSX_CONTENT_TYPE,
  buildExport,
  createWorkbook,
  filterParticipants,
  normalizeCheckedIn,
  parseExportQuery,
};
