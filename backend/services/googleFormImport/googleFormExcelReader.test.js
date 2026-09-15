const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const { extractExhibitionFilenameMetadata, extractSheetMetadata, readGoogleFormWorkbook, splitTrainingHierarchy } = require("./googleFormExcelReader");

test("reads and preserves every worksheet independently", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["CHƯƠNG TRÌNH A"], ["Tên course: COURSE A"], ["LỚP 1"],
    ["Họ và tên", "Email"], ["Nguyễn A", "a@example.com"],
  ]), "Sheet valid 1");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["DANH SÁCH THAM DỰ"], ["Họ và tên", "Email"], ["Nguyễn B", "b@example.com"],
  ]), "Sheet needs confirm");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Sheet empty");
  const result = readGoogleFormWorkbook({
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  });

  assert.equal(result.totalSheets, 3);
  assert.deepEqual(result.sheets.map((sheet) => sheet.sheetName), [
    "Sheet valid 1", "Sheet needs confirm", "Sheet empty",
  ]);
  assert.equal(result.sheets[0].headerRowNumber, 4);
  assert.equal(result.sheets[1].headerRowNumber, 2);
  assert.equal(result.sheets[1].dataRows[0].values["Họ và tên"], "Nguyễn B");
  assert.equal(result.sheets[2].status, "EMPTY");
});

test("splits separate and combined course/opening metadata", () => {
  assert.deepEqual(
    splitTrainingHierarchy(["CHƯƠNG TRÌNH KHỞI NGHIỆP", "Tên course: KHAI BÁO THUẾ", "LỚP 2"]),
    { trainingProgramName: "CHƯƠNG TRÌNH KHỞI NGHIỆP", courseName: "KHAI BÁO THUẾ", openingName: "LỚP 2" },
  );
  assert.deepEqual(
    splitTrainingHierarchy(["CHƯƠNG TRÌNH KHỞI NGHIỆP", "DANH SÁCH LỚP 1 - PHÁP LÝ KHỞI NGHIỆP"]),
    { trainingProgramName: "CHƯƠNG TRÌNH KHỞI NGHIỆP", courseName: "PHÁP LÝ KHỞI NGHIỆP", openingName: "LỚP 1" },
  );
});

test("never fills hierarchy from nearby unclassified text", () => {
  assert.deepEqual(
    splitTrainingHierarchy(["VĂN BẢN KHÔNG XÁC ĐỊNH", "QUẢN TRỊ TÀI CHÍNH", "LỚP 2"]),
    { trainingProgramName: null, courseName: null, openingName: "LỚP 2" },
  );
});

test("extracts every date and never defaults a missing time/year", () => {
  const metadata = extractSheetMetadata(
    [
      ["CHƯƠNG TRÌNH KHỞI NGHIỆP"],
      ["DANH SÁCH LỚP PHÁP LÝ"],
      ["Thời gian: 17 & 19/08/2026"],
    ],
    3,
    65,
  );

  assert.equal(metadata.year, 2026);
  assert.deepEqual(metadata.sessions.map((item) => item.sessionDate), [
    "2026-08-17",
    "2026-08-19",
  ]);
  assert.equal(metadata.studentCount, 65);
  assert.equal(metadata.status, "NEEDS_ADMIN_CONFIRMATION");
  assert.deepEqual(metadata.missing, ["courseName", "time"]);
});

test("ambiguous year is not guessed", () => {
  const metadata = extractSheetMetadata(
    [["Chương trình 2025"], ["Tổ chức ngày 01/02/2026 lúc 08:00-11:30"]],
    2,
    1,
  );
  assert.equal(metadata.year, null);
  assert.ok(metadata.missing.includes("year"));
});

test("ignores organization and generic list titles when resolving training hierarchy", () => {
  const metadata = extractSheetMetadata(
    [
      ["TRUNG TÂM KHỞI NGHIỆP SÁNG TẠO THÀNH PHỐ HỒ CHÍ MINH"],
      ["DANH SÁCH THAM DỰ"],
      ["LỚP QUẢN TRỊ TÀI CHÍNH DOANH NGHIỆP"],
      ["Họ và tên", "Email"],
    ],
    3,
    1,
  );

  assert.equal(metadata.trainingProgramName, null);
  assert.equal(metadata.courseName, null);
  assert.equal(metadata.openingName, "LỚP QUẢN TRỊ TÀI CHÍNH DOANH NGHIỆP");
  assert.equal(metadata.status, "NEEDS_ADMIN_CONFIRMATION");
  assert.ok(metadata.missing.includes("trainingProgramName"));
  assert.ok(metadata.missing.includes("courseName"));
});

test("generic list normalization does not discard a combined class and course title", () => {
  assert.deepEqual(
    splitTrainingHierarchy([
      "Đơn vị tổ chức: SIHUB",
      "DANH SÁCH HỌC VIÊN",
      "CHƯƠNG TRÌNH KHỞI NGHIỆP",
      "DANH SÁCH LỚP 2 - KHAI BÁO THUẾ",
    ]),
    {
      trainingProgramName: "CHƯƠNG TRÌNH KHỞI NGHIỆP",
      courseName: "KHAI BÁO THUẾ",
      openingName: "LỚP 2",
    },
  );
});

test("prioritizes explicit real program, course and opening names from Excel content", () => {
  assert.deepEqual(
    splitTrainingHierarchy([
      "TRUNG TÂM HỖ TRỢ KHỞI NGHIỆP",
      "DANH SÁCH THAM DỰ",
      "Tên lớp: Lớp Quản trị tài chính doanh nghiệp",
      "Tên course: Quản trị tài chính",
      "Tên chương trình: Nâng cao năng lực doanh nghiệp",
    ]),
    {
      trainingProgramName: "Nâng cao năng lực doanh nghiệp",
      courseName: "Quản trị tài chính",
      openingName: "Lớp Quản trị tài chính doanh nghiệp",
    },
  );
});

test("reads related program, location and multi-session headings without guessing time", () => {
  const metadata = extractSheetMetadata(
    [
      ["TRUNG TÂM HỖ TRỢ KHỞI NGHIỆP"],
      ["DANH SÁCH THAM DỰ"],
      ["LỚP QUẢN TRỊ TÀI CHÍNH DOANH NGHIỆP"],
      ["Thuộc Chương trình nâng cao năng lực doanh nghiệp"],
      ["Thời gian: Từ 29/7 - 07/8/2025"],
      ["Địa điểm: 273 Điện Biên Phủ, TP.HCM"],
      ["STT", "Họ và tên", "Email"],
      ["", "29/7 (Tối)", "31/7 (Tối)", "02/8 (Sáng)", "02/8 (Chiều)", "07/8 (Chiều)"],
    ],
    6,
    1,
  );

  assert.equal(metadata.trainingProgramName, "Chương trình nâng cao năng lực doanh nghiệp");
  assert.equal(metadata.courseName, null);
  assert.equal(metadata.openingName, "LỚP QUẢN TRỊ TÀI CHÍNH DOANH NGHIỆP");
  assert.equal(metadata.location, "273 Điện Biên Phủ, TP.HCM");
  assert.deepEqual(metadata.sessions, [
    { sessionDate: "2025-07-29", startTime: null, endTime: null },
    { sessionDate: "2025-07-31", startTime: null, endTime: null },
    { sessionDate: "2025-08-02", startTime: null, endTime: null },
    { sessionDate: "2025-08-02", startTime: null, endTime: null },
    { sessionDate: "2025-08-07", startTime: null, endTime: null },
  ]);
  assert.equal(metadata.status, "NEEDS_ADMIN_CONFIRMATION");
  assert.ok(metadata.missing.includes("courseName"));
  assert.ok(metadata.missing.includes("time"));
});

test("extracts explicit exhibition metadata without guessing missing time", () => {
  const metadata = extractSheetMetadata(
    [
      ["Tên triển lãm: Startup Connection Day 2026"],
      ["Ngày tổ chức: 12/09/2026"],
      ["Địa điểm: SIHUB"],
      ["Họ và tên", "Email"],
    ],
    3,
    25,
  );

  assert.equal(metadata.exhibitionName, "Startup Connection Day 2026");
  assert.equal(metadata.year, 2026);
  assert.equal(metadata.location, "SIHUB");
  assert.equal(metadata.studentCount, 25);
  assert.deepEqual(metadata.sessions, [
    { sessionDate: "2026-09-12", startTime: null, endTime: null },
  ]);
});

test("normalizes verified exhibition survey filename without inventing schedule metadata", () => {
  assert.deepEqual(
    extractExhibitionFilenameMetadata(
      "2026 - KHẢO SÁT SAU TRIỂN LÃM SMART HEALTHCARE 2026 (Câu trả lời).xlsx",
    ),
    {
      exhibitionFilenameName: "SMART HEALTHCARE 2026",
      exhibitionFilenameYear: 2026,
    },
  );
});

test("keeps response timestamps out of exhibition schedule metadata and preserves 45 rows", () => {
  const workbook = XLSX.utils.book_new();
  const responseRows = Array.from({ length: 45 }, (_, index) => [
    `09/${String((index % 9) + 1).padStart(2, "0")}/2026 08:30:00`,
    `Người tham gia ${index + 1}`,
  ]);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Dấu thời gian", "Họ và tên"],
    ...responseRows,
  ]), "Câu trả lời biểu mẫu 1");

  const result = readGoogleFormWorkbook({
    originalname: "2026 - KHẢO SÁT SAU TRIỂN LÃM SMART HEALTHCARE 2026 (Câu trả lời).xlsx",
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  });
  const sheet = result.sheets[0];

  assert.equal(sheet.sheetName, "Câu trả lời biểu mẫu 1");
  assert.equal(sheet.totalRows, 45);
  assert.equal(sheet.metadata.exhibitionFilenameName, "SMART HEALTHCARE 2026");
  assert.equal(sheet.metadata.exhibitionFilenameYear, 2026);
  assert.equal(sheet.metadata.year, null);
  assert.equal(sheet.metadata.location, null);
  assert.deepEqual(sheet.metadata.sessions, []);
});

test("extracts explicit networking metadata from workbook content", () => {
  const metadata = extractSheetMetadata(
    [
      ["Tên sự kiện: Kết nối đầu tư 2026"],
      ["Ngày tổ chức: 18/09/2026"],
      ["Thời gian: 08:30 - 11:00"],
      ["Địa điểm: SIHUB"],
      ["Họ và tên", "Email", "Vai trò người tham dự"],
    ],
    4,
    30,
  );

  assert.equal(metadata.networkingEventName, "Kết nối đầu tư 2026");
  assert.equal(metadata.year, 2026);
  assert.equal(metadata.location, "SIHUB");
  assert.equal(metadata.studentCount, 30);
  assert.deepEqual(metadata.sessions, [
    { sessionDate: "2026-09-18", startTime: "08:30", endTime: "11:00" },
  ]);
});

test("does not use networking response timestamps as event schedule", () => {
  const metadata = extractSheetMetadata(
    [
      ["Tên sự kiện: Kết nối đầu tư", "Năm: 2026"],
      ["Dấu thời gian", "Họ và tên", "Email"],
      ["18/09/2026 08:30:00", "Nguyễn A", "a@example.com"],
    ],
    1,
    1,
  );

  assert.equal(metadata.networkingEventName, "Kết nối đầu tư");
  assert.equal(metadata.year, 2026);
  assert.deepEqual(metadata.sessions, []);
});

test("routes mixed DATA rows by NHIỆM VỤ and reports metadata/program conflicts", () => {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ["Họ và Tên", "CHƯƠNG TRÌNH", "NHIỆM VỤ", "NĂM"],
    ["Nguyễn A", "Founder Meetup", "KẾT NỐI", "2025"],
    ["Nguyễn B", "AI Seminar", "HỘI THẢO", "2025"],
    ["", "Founder Meetup", "KẾT NỐI", "2025"],
  ]);
  const eventSheet = XLSX.utils.aoa_to_sheet([
    ["Tên sự kiện: Founder meetup Việt - Hàn"],
    ["Địa điểm: SIHUB"],
    ["Thời gian: 13h30 - 17h30, ngày 18/11/2025"],
    ["Họ và Tên", "CHƯƠNG TRÌNH", "NHIỆM VỤ", "NĂM"],
    ["Nguyễn C", "Founder meetup Climate Tech", "KẾT NỐI", "2025"],
  ]);
  XLSX.utils.book_append_sheet(workbook, dataSheet, "DATA");
  XLSX.utils.book_append_sheet(workbook, eventSheet, "Việt Hàn");

  const result = readGoogleFormWorkbook({
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    originalname: "arbitrary.xlsx",
  });
  const [data, event] = result.sheets;

  assert.equal(data.metadata.detectedTargetType, "MIXED");
  assert.deepEqual(data.metadata.moduleCounts, { NETWORKING: 2, SEMINAR: 1 });
  assert.equal(data.metadata.studentCount, 2);
  assert.deepEqual(
    data.dataRows.map((row) => row.routing.targetType),
    ["NETWORKING", "SEMINAR", "NETWORKING"],
  );
  assert.equal(event.metadata.detectedTargetType, "NETWORKING");
  assert.deepEqual(event.metadata.sessions, [{
    sessionDate: "2025-11-18",
    startTime: "13:30",
    endTime: "17:30",
  }]);
  assert.equal(event.metadata.metadataConflicts.length, 1);
  assert.equal(event.metadata.metadataConflicts[0].metadataEventName, "Founder meetup Việt - Hàn");
  assert.equal(event.metadata.metadataConflicts[0].participantProgramName, "Founder meetup Climate Tech");
});
