const ExcelJS = require("exceljs");
const { resolveReportPeriod } = require("../../utils/reportPeriod");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const FIELD_DEFINITIONS = {
  full_name: { header: "Họ và tên", width: 28, getValue: (row) => displayValue(row.full_name) },
  email: { header: "Email", width: 28, getValue: (row) => displayValue(row.email) },
  phone: { header: "Điện thoại", width: 18, getValue: (row) => displayValue(row.phone) },
  gender: { header: "Giới tính", width: 14, getValue: (row) => displayValue(row.gender) },
  age_group: { header: "Nhóm tuổi", width: 16, getValue: (row) => displayValue(row.age_group) },
  user_type: { header: "Nhóm đối tượng", width: 20, getValue: (row) => displayValue(row.user_type) },
  organization: { header: "Đơn vị", width: 26, getValue: (row) => displayValue(row.organization) },
  position: { header: "Chức vụ", width: 20, getValue: (row) => displayValue(row.position) },
  participant_role: { header: "Vai trò tham gia", width: 20, getValue: (row) => displayValue(row.participant_role) },
  has_project: { header: "Có dự án", width: 14, getValue: (row) => getHasProjectLabel(row.has_project) },
  project_field: { header: "Lĩnh vực dự án", width: 24, getValue: (row) => displayValue(row.project_field) },
  startup_stage: { header: "Giai đoạn Startup", width: 22, getValue: (row) => displayValue(row.startup_stage) },
  program_selection_status: { header: "Trạng thái tuyển chọn chương trình", width: 32, getValue: (row) => displayValue(row.program_selection_status) },
  support_needs: { header: "Nhu cầu hỗ trợ", width: 30, getValue: (row) => displayValue(row.support_needs) },
  organizer_question: { header: "Câu hỏi cho BTC", width: 30, getValue: (row) => displayValue(row.organizer_question) },
  note: { header: "Ghi chú", width: 28, getValue: (row) => displayValue(row.note) },
  registration_status: { header: "Trạng thái đăng ký", width: 22, getValue: (row) => displayValue(row.registration_status) },
  checked_in: { header: "Check-in", width: 18, getValue: (row) => getCheckedInLabel(row.checked_in) },
  checked_in_at: { header: "Thời gian check-in", width: 22, getValue: (row) => formatDateTime(row.checked_in_at) },
  created_at: { header: "Thời gian đăng ký", width: 22, getValue: (row) => formatDateTime(row.created_at) },
};

const DEFAULT_FIELD_KEYS = Object.freeze(Object.keys(FIELD_DEFINITIONS));
const INDEX_COLUMN = {
  header: "STT",
  width: 8,
  getValue: (_row, index) => index + 1,
};
const EXPORT_COLUMNS = [
  INDEX_COLUMN,
  ...DEFAULT_FIELD_KEYS.map((key) => ({ key, ...FIELD_DEFINITIONS[key] })),
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

function parseExportQuery(query) {
  const scope = normalizedText(query.scope).toUpperCase();

  if (!["ALL", "FILTERED"].includes(scope)) {
    throw validationError("scope phải là ALL hoặc FILTERED.");
  }

  const hasPeriod = ["year", "quarter", "month", "week"].some(
    (name) => query[name] !== undefined && normalizedText(query[name]) !== "",
  );
  const period = hasPeriod
    ? resolveReportPeriod(query)
    : {
        type: null,
        year: null,
        quarter: null,
        month: null,
        week: null,
        start_date: null,
        end_date: null,
      };

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

  let selectedFields = null;
  if (Object.prototype.hasOwnProperty.call(query, "fields")) {
    const rawFields = Array.isArray(query.fields)
      ? query.fields.join(",")
      : query.fields;
    const keys = normalizedText(rawFields)
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    if (!keys.length) {
      throw validationError("Vui lòng chọn ít nhất một trường để xuất.");
    }

    const unknownFields = keys.filter((key) => !FIELD_DEFINITIONS[key]);
    if (unknownFields.length) {
      throw validationError(
        `Trường xuất không hợp lệ: ${[...new Set(unknownFields)].join(", ")}.`,
      );
    }

    selectedFields = [...new Set(keys)];
  }

  return {
    scope,
    filters,
    period,
    selectedFields,
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

function sanitizeFilenamePart(value) {
  return normalizedText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
}

function buildPeriodFilenamePart(period) {
  if (!period?.year) {
    return new Date().toISOString().slice(0, 10);
  }

  if (period.type === "QUARTER") return `${period.year}_Q${period.quarter}`;
  if (period.type === "MONTH") {
    return `${period.year}_${String(period.month).padStart(2, "0")}`;
  }
  if (period.type === "WEEK") {
    return `${period.year}_W${String(period.week).padStart(2, "0")}`;
  }

  return String(period.year);
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

function addMetadataRow(sheet, label, value, columnCount) {
  const row = sheet.addRow([label, displayValue(value)]);

  row.getCell(1).font = { bold: true };
  sheet.mergeCells(row.number, 2, row.number, columnCount);
}

function createWorkbook({
  seminar,
  participants,
  scope,
  filters,
  period,
  selectedFields = null,
}) {
  const fieldKeys = selectedFields === null ? DEFAULT_FIELD_KEYS : selectedFields;
  const columns = [
    INDEX_COLUMN,
    ...fieldKeys.map((key) => FIELD_DEFINITIONS[key]),
  ];
  const columnCount = columns.length;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Người tham gia");

  workbook.creator = "SIHUB";
  sheet.mergeCells(1, 1, 1, columnCount);
  sheet.getCell("A1").value = "BÁO CÁO NGƯỜI THAM GIA HỘI THẢO";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF15803D" },
  };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  addMetadataRow(sheet, "Tên hội thảo", seminar.event_name, columnCount);
  addMetadataRow(sheet, "Mã hội thảo", seminar.event_code, columnCount);
  addMetadataRow(sheet, "Địa điểm", seminar.location, columnCount);
  addMetadataRow(sheet, "Bắt đầu", formatDateTime(seminar.start_datetime), columnCount);
  addMetadataRow(sheet, "Kết thúc", formatDateTime(seminar.end_datetime), columnCount);
  addMetadataRow(sheet, "Trạng thái", seminar.status, columnCount);
  addMetadataRow(sheet, "Phạm vi xuất", scope === "ALL" ? "TẤT CẢ" : "THEO BỘ LỌC", columnCount);

  if (period.year !== null) {
    addMetadataRow(sheet, "Năm báo cáo", period.year, columnCount);
  }

  if (period.quarter !== null) {
    addMetadataRow(sheet, "Quý", period.quarter, columnCount);
  }

  if (period.month !== null) {
    addMetadataRow(sheet, "Tháng", period.month, columnCount);
  }

  if (period.week !== null) {
    addMetadataRow(sheet, "Tuần", `${period.week} / ${period.year}`, columnCount);
    addMetadataRow(
      sheet,
      "Thời gian kỳ báo cáo",
      `${formatDateTime(period.start_date)} – ${formatDateTime(period.end_date)}`,
      columnCount,
    );
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
        addMetadataRow(sheet, label, value, columnCount);
      }
    });
  }

  sheet.addRow([]);
  const headerRow = sheet.addRow(columns.map((column) => column.header));

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF166534" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  participants.forEach((participant, index) => {
    sheet.addRow(columns.map((column) => column.getValue(participant, index)));
  });

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: columnCount },
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
    selectedFields: options.selectedFields,
  });
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    exportedParticipants,
    filename: `SIHUB_Seminar_Participants_${
      sanitizeFilenamePart(seminar.event_code) || seminar.seminar_id
    }_${buildPeriodFilenamePart(options.period)}_${options.scope}.xlsx`,
  };
}

module.exports = {
  DEFAULT_FIELD_KEYS,
  EXPORT_COLUMNS,
  FIELD_DEFINITIONS,
  XLSX_CONTENT_TYPE,
  buildExport,
  createWorkbook,
  filterParticipants,
  normalizeCheckedIn,
  parseExportQuery,
};
