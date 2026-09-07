const ExcelJS = require("exceljs");

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const KPI_ROWS = [
  ["Tổng khóa đào tạo", "total_courses"],
  ["Tổng lớp / đợt tổ chức", "total_openings"],
  ["Đã kết thúc", "finished_openings"],
  ["Đang diễn ra", "ongoing_openings"],
  ["Sắp tổ chức", "upcoming_openings"],
  ["Tổng học viên đăng ký", "total_students_registered"],
  ["Tổng học viên tham dự", "total_students_attended"],
  ["Tổng chứng nhận đã cấp", "total_certificates_issued"],
];

const COURSE_COLUMNS = [
  { header: "STT", width: 8 },
  { header: "Chương trình", width: 30 },
  { header: "Khóa đào tạo", width: 36 },
  { header: "Số đợt tổ chức", width: 18 },
  { header: "Học viên đăng ký", width: 20 },
  { header: "Học viên tham dự", width: 20 },
  { header: "Chứng nhận đã cấp", width: 22 },
];

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function formatPeriod(period) {
  if (period.type === "QUARTER") return `Quý ${period.quarter} / ${period.year}`;
  if (period.type === "MONTH") return `Tháng ${period.month} / ${period.year}`;
  if (period.type === "WEEK") return `Tuần ${period.week} / ${period.year}`;
  return `Năm ${period.year}`;
}

function periodFilenamePart(period) {
  if (period.type === "QUARTER") return `${period.year}_Q${period.quarter}`;
  if (period.type === "MONTH") {
    return `${period.year}_${String(period.month).padStart(2, "0")}`;
  }
  if (period.type === "WEEK") {
    return `${period.year}_W${String(period.week).padStart(2, "0")}`;
  }
  return String(period.year);
}

function styleTitle(sheet, lastColumn) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell("A1");
  title.value = "BÁO CÁO ĐÀO TẠO SIHUB";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF15803D" },
  };
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
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF166534" },
  };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
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

function buildWorkbook({ period, summary = {}, courses = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIHUB";
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet("Tổng quan");
  styleTitle(overviewSheet, 2);
  overviewSheet.getColumn(1).width = 34;
  overviewSheet.getColumn(2).width = 28;
  addMetadataRow(overviewSheet, "Kỳ báo cáo", formatPeriod(period), 2);
  addMetadataRow(overviewSheet, "Từ ngày", formatDate(period.start_date), 2);
  addMetadataRow(overviewSheet, "Đến ngày", formatDate(period.end_date), 2);
  addMetadataRow(
    overviewSheet,
    "Thời điểm xuất báo cáo",
    new Date().toLocaleString("vi-VN"),
    2,
  );
  overviewSheet.addRow([]);
  const kpiHeader = overviewSheet.addRow(["Chỉ số", "Giá trị"]);
  KPI_ROWS.forEach(([label, key]) => {
    overviewSheet.addRow([label, Number(summary[key]) || 0]);
  });
  applyTableStyle(overviewSheet, kpiHeader, 2);

  const courseSheet = workbook.addWorksheet("Khóa đào tạo");
  styleTitle(courseSheet, COURSE_COLUMNS.length);
  addMetadataRow(
    courseSheet,
    "Kỳ báo cáo",
    `${formatPeriod(period)} (${formatDate(period.start_date)} – ${formatDate(
      period.end_date,
    )})`,
    COURSE_COLUMNS.length,
  );
  courseSheet.addRow([]);
  const courseHeader = courseSheet.addRow(
    COURSE_COLUMNS.map((column) => column.header),
  );
  courses.forEach((course, index) => {
    courseSheet.addRow([
      index + 1,
      course.program_name || "",
      course.course_name || "",
      Number(course.total_openings) || 0,
      Number(course.total_students_registered) || 0,
      Number(course.total_students_attended) || 0,
      Number(course.total_certificates_issued) || 0,
    ]);
  });
  COURSE_COLUMNS.forEach((column, index) => {
    courseSheet.getColumn(index + 1).width = column.width;
  });
  courseSheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  applyTableStyle(courseSheet, courseHeader, COURSE_COLUMNS.length);

  return workbook;
}

function buildFilename(period) {
  return `SIHUB_Training_Report_${periodFilenamePart(period)}.xlsx`;
}

module.exports = {
  COURSE_COLUMNS,
  KPI_ROWS,
  XLSX_CONTENT_TYPE,
  buildFilename,
  buildWorkbook,
};
