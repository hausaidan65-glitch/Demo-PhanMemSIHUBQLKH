const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const KPI_ROWS = [
  ["Tổng số hội thảo", (summary) => summary.total_seminars],
  ["Tổng số người tham gia", (summary) => summary.total_participants],
  ["Đang mở", (summary) => summary.statuses?.open],
  ["Đã đóng", (summary) => summary.statuses?.closed],
  ["Đã kết thúc", (summary) => summary.statuses?.finished],
  ["Bản nháp", (summary) => summary.statuses?.draft],
  ["Trạng thái khác", (summary) => summary.statuses?.other_status_count],
  ["Thiếu thời gian tổ chức chính thức", (summary) => summary.missing_official_dates],
];

const SEMINAR_COLUMNS = [
  { header: "STT", width: 8 },
  { header: "Mã hội thảo", width: 18 },
  { header: "Tên hội thảo", width: 36 },
  { header: "Triển lãm cha", width: 30 },
  { header: "Nhiệm vụ", width: 28 },
  { header: "Đơn vị tổ chức", width: 28 },
  { header: "Thời gian bắt đầu", width: 21 },
  { header: "Thời gian kết thúc", width: 21 },
  { header: "Địa điểm", width: 28 },
  { header: "Trạng thái", width: 16 },
  { header: "Tổng người tham gia", width: 20 },
  { header: "Đã check-in", width: 16 },
];

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function formatDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (part) => String(part).padStart(2, "0");
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );
  if (!match) return value || "";
  const time = match[4] ? ` ${match[4]}:${match[5]}` : "";
  return `${match[3]}/${match[2]}/${match[1]}${time}`;
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

function styleTitle(sheet, lastColumn) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell("A1");
  title.value = "BÁO CÁO HỘI THẢO SIHUB";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;
}

function addMetadataRow(sheet, label, value, lastColumn) {
  const row = sheet.addRow([label, value]);
  row.getCell(1).font = { bold: true };
  sheet.mergeCells(row.number, 2, row.number, lastColumn);
}

function applyTableStyle(sheet, headerRow, columnCount) {
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
    for (let column = 1; column <= columnCount; column += 1) {
      sheet.getCell(row, column).border = border;
    }
  }
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: columnCount },
  };
}

function buildWorkbook({ period, summary = {}, seminars = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIHUB";
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet("Tổng quan");
  styleTitle(overviewSheet, 2);
  overviewSheet.getColumn(1).width = 38;
  overviewSheet.getColumn(2).width = 28;
  addMetadataRow(overviewSheet, "Kỳ báo cáo", formatPeriod(period), 2);
  addMetadataRow(overviewSheet, "Từ ngày", formatDate(period.start_date), 2);
  addMetadataRow(overviewSheet, "Đến ngày", formatDate(period.end_date), 2);
  addMetadataRow(overviewSheet, "Thời điểm xuất báo cáo", new Date().toLocaleString("vi-VN"), 2);
  overviewSheet.addRow([]);
  const kpiHeader = overviewSheet.addRow(["Chỉ số", "Giá trị"]);
  KPI_ROWS.forEach(([label, getValue]) => {
    overviewSheet.addRow([label, Number(getValue(summary)) || 0]);
  });
  applyTableStyle(overviewSheet, kpiHeader, 2);

  const seminarSheet = workbook.addWorksheet("Hội thảo");
  styleTitle(seminarSheet, SEMINAR_COLUMNS.length);
  addMetadataRow(
    seminarSheet,
    "Kỳ báo cáo",
    `${formatPeriod(period)} (${formatDate(period.start_date)} – ${formatDate(period.end_date)})`,
    SEMINAR_COLUMNS.length,
  );
  seminarSheet.addRow([]);
  const seminarHeader = seminarSheet.addRow(SEMINAR_COLUMNS.map((column) => column.header));
  seminars.forEach((seminar, index) => {
    seminarSheet.addRow([
      index + 1,
      seminar.event_code || "",
      seminar.event_name || "",
      seminar.parent_exhibition_name || "",
      seminar.mission || "",
      seminar.organizer || "",
      formatDateTime(seminar.start_datetime),
      formatDateTime(seminar.end_datetime),
      seminar.location || "",
      seminar.status || "",
      Number(seminar.total_participants) || 0,
      Number(seminar.checked_in_participants) || 0,
    ]);
  });
  SEMINAR_COLUMNS.forEach((column, index) => {
    seminarSheet.getColumn(index + 1).width = column.width;
  });
  seminarSheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  applyTableStyle(seminarSheet, seminarHeader, SEMINAR_COLUMNS.length);

  return workbook;
}

function buildFilename(period) {
  return `SIHUB_Seminar_Report_${periodFilenamePart(period)}.xlsx`;
}

module.exports = {
  KPI_ROWS,
  SEMINAR_COLUMNS,
  XLSX_CONTENT_TYPE,
  buildFilename,
  buildWorkbook,
};
