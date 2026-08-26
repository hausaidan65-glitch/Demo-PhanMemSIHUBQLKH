const XLSX = require("xlsx");

const { normalizeText, decodeFilename } = require("./excelImportHelpers");

const {
  isTrainingSheet,
  parseTrainingSheet,
} = require("./trainingExcelImportService");

const {
  extractEventParticipants,
  validateEventParticipant,
  analyzeEventParticipantDuplicates,
  findParentExhibition,
  extractEventMetadata,
} = require("./startupConnectionExcelImportService");

// =====================================================
// NHẬN DIỆN LOẠI SHEET
//
// File này CHỈ điều phối.
// Không xử lý sâu Training/Event.
// =====================================================
function detectImportType(rows, sheetName = "") {
  const normalizedSheetName = normalizeText(sheetName);

  const metadataText = normalizeText(
    rows
      .slice(0, 25)
      .map((row) => (Array.isArray(row) ? row.join(" ") : ""))
      .join(" "),
  );

  // =====================================================
  // 1. DATA / SUMMARY
  // =====================================================
  if (
    normalizedSheetName === "data" ||
    metadataText.includes("danh sach tham gia cac chuong trinh")
  ) {
    return {
      importType: "SUMMARY",

      importTypeLabel: "Sheet tổng hợp",

      needTypeConfirm: false,

      confidence: "HIGH",

      skipImport: true,

      reason: "Sheet DATA chỉ dùng tổng hợp, không import trực tiếp.",
    };
  }

  // =====================================================
  // 2. TRAINING
  //
  // Để service Training tự nhận diện.
  // =====================================================
  if (isTrainingSheet(rows, sheetName)) {
    return {
      importType: "TRAINING",

      importTypeLabel: "Khóa đào tạo",

      needTypeConfirm: false,

      confidence: "MEDIUM",

      skipImport: false,

      reason: "Phát hiện dữ liệu Khóa đào tạo/Lớp học.",
    };
  }

  // =====================================================
  // 3. EVENT
  // =====================================================
  const sheetTokens = normalizedSheetName.split(" ").filter(Boolean);

  // HT trong TL
  if (normalizedSheetName.includes("ht trong tl")) {
    return {
      importType: "STARTUP_SEMINAR",

      importTypeLabel: "Hội thảo",

      needTypeConfirm: false,

      confidence: "HIGH",

      skipImport: false,

      requiresExhibitionParent: true,

      reason: "Tên sheet cho thấy Hội thảo nằm trong Triển lãm.",
    };
  }

  // Triển lãm
  const hasTLToken = sheetTokens.includes("tl");

  const hasExhibitionContent = metadataText.includes("danh sach trien lam");

  if (hasTLToken || hasExhibitionContent) {
    return {
      importType: "STARTUP_EXHIBITION",

      importTypeLabel: "Triển lãm",

      needTypeConfirm: false,

      confidence: hasTLToken && hasExhibitionContent ? "HIGH" : "MEDIUM",

      skipImport: false,

      reason: "Phát hiện dữ liệu Triển lãm.",
    };
  }

  // Hội thảo
  if (sheetTokens.includes("ht")) {
    return {
      importType: "STARTUP_SEMINAR",

      importTypeLabel: "Hội thảo",

      needTypeConfirm: false,

      confidence: "MEDIUM",

      skipImport: false,

      requiresExhibitionParent: false,

      reason: "Tên sheet có ký hiệu HT.",
    };
  }

  // Sự kiện kết nối
  const hasNetworkingSheetName = normalizedSheetName.includes("su kien");

  const hasEventName = metadataText.includes("ten su kien");

  const hasParticipantList =
    metadataText.includes("danh sach nguoi tham du") ||
    metadataText.includes("danh sach khach tham du") ||
    metadataText.includes("danh sach tham du");

  if (hasNetworkingSheetName || (hasEventName && hasParticipantList)) {
    return {
      importType: "NETWORKING_EVENT",

      importTypeLabel: "Sự kiện kết nối",

      needTypeConfirm: false,

      confidence: hasNetworkingSheetName ? "HIGH" : "MEDIUM",

      skipImport: false,

      reason: "Phát hiện dữ liệu Sự kiện kết nối.",
    };
  }

  // =====================================================
  // 4. UNKNOWN
  // =====================================================
  return {
    importType: "UNKNOWN",

    importTypeLabel: "Chưa xác định",

    needTypeConfirm: true,

    confidence: "LOW",

    skipImport: false,

    reason: "Không đủ thông tin để hệ thống tự xác định.",
  };
}

// =====================================================
// READ EXCEL
// =====================================================
async function readSihubExcel(filePath, originalName) {
  const decodedFileName = decodeFilename(originalName);

  // =====================================================
  // FILE TẠM CỦA EXCEL
  //
  // ~$abc.xlsx
  // không phải dữ liệu thật.
  // =====================================================
  if (decodedFileName.startsWith("~$")) {
    console.log(`[SIHUB EXCEL] Bỏ file tạm: ${decodedFileName}`);

    return [];
  }

  const workbook = XLSX.readFile(filePath);

  const results = [];

  let summaryInfo = null;

  let previousTrainingClass = null;

  // =====================================================
  // DUYỆT TỪNG SHEET
  // =====================================================
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!rows || rows.length === 0) {
      continue;
    }

    const detected = detectImportType(rows, sheetName);

    // ===================================================
    // DATA
    // ===================================================
    if (detected.importType === "SUMMARY" || detected.skipImport === true) {
      summaryInfo = {
        sheetName,
        totalRows: rows.length,
        importType: "SUMMARY",
        importTypeLabel: "Sheet tổng hợp",
      };

      console.log(
        `[SIHUB EXCEL] Đã đọc sheet tổng hợp "${sheetName}" - ${rows.length} dòng.`,
      );

      continue;
    }

    // ===================================================
    // TRAINING
    // ===================================================
    if (detected.importType === "TRAINING") {
      const trainingItem = parseTrainingSheet({
        rows,
        sheetName,
        previousClassData: previousTrainingClass,
      });

      if (!trainingItem) {
        continue;
      }

      results.push({
        fileName: decodedFileName,

        filePath,

        sheetName,

        ...trainingItem,
      });

      if (trainingItem.class?.className) {
        previousTrainingClass = {
          ...trainingItem.class,
        };
      }

      continue;
    }

    // ===================================================
    // RỜI TRAINING
    // ===================================================
    previousTrainingClass = null;

    // ===================================================
    // EVENT
    // ===================================================
    const isEvent = [
      "STARTUP_EXHIBITION",
      "STARTUP_SEMINAR",
      "NETWORKING_EVENT",
    ].includes(detected.importType);

    if (isEvent) {
      const participants = extractEventParticipants(rows);

      const event = extractEventMetadata(rows, sheetName, detected.importType);
      const requiresExhibitionParent =
        detected.importType === "STARTUP_SEMINAR" &&
        (detected.requiresExhibitionParent === true ||
          Boolean(event?.parentEventName));

      const analysis = analyzeEventParticipantDuplicates(participants);

      const validations = participants.map((participant, index) => ({
        rowIndex: index,

        participant: {
          ...participant,
        },

        ...validateEventParticipant(participant),
      }));

      const invalidRows = validations.filter(
        (item) => item.errors.length > 0 || item.warnings.length > 0,
      );

      results.push({
        fileName: decodedFileName,

        filePath,

        sheetName,

        importType: detected.importType,

        importTypeLabel: detected.importTypeLabel,

        needTypeConfirm: Boolean(detected.needTypeConfirm),

        confidence: detected.confidence || "MEDIUM",

        detectionReason: detected.reason || null,
        requiresExhibitionParent,
        // Giữ structure cũ
        class: {
          className: null,
          programName: null,
          schedule: null,
          location: null,
        },

        event,

        // FE hiện tại vẫn dùng students
        students: participants,

        totalStudents: participants.length,

        totalParticipants: participants.length,

        participantAnalysis: {
          totalRows: analysis.totalRows,

          totalUnique: analysis.totalUnique,

          totalValidUnique: analysis.totalValidUnique,

          totalDuplicates: analysis.totalDuplicates,

          totalConflicts: analysis.totalConflicts,

          duplicateRows: analysis.duplicateRows,

          conflictRows: analysis.conflictRows,
        },

        participantValidation: {
          totalChecked: validations.length,

          totalIssues: invalidRows.length,

          rows: invalidRows,
        },
      });

      continue;
    }

    // ===================================================
    // UNKNOWN
    //
    // Giữ lại Preview để Admin nhìn thấy.
    // Không tự đoán.
    // ===================================================
    results.push({
      fileName: decodedFileName,

      filePath,

      sheetName,

      importType: "UNKNOWN",

      importTypeLabel: "Chưa xác định",

      needTypeConfirm: true,

      confidence: "LOW",

      detectionReason: detected.reason || "Không xác định được loại dữ liệu.",

      class: {
        className: null,
        programName: null,
        schedule: null,
        location: null,
      },

      event: null,

      students: [],

      totalStudents: 0,

      totalParticipants: 0,

      participantAnalysis: null,

      participantValidation: null,
    });
  }

  // =====================================================
  // HỘI THẢO → TRIỂN LÃM CHA
  //
  // Chạy sau khi đọc hết workbook.
  // =====================================================
  const exhibitions = results.filter(
    (item) => item.importType === "STARTUP_EXHIBITION",
  );

  for (const item of results) {
    if (item.importType !== "STARTUP_SEMINAR") {
      continue;
    }

    // ===================================================
    // HỘI THẢO ĐỘC LẬP
    //
    // Không có dấu hiệu "HT trong TL"
    // và Excel không ghi parent.
    //
    // => KHÔNG bắt chọn Triển lãm.
    // ===================================================
    if (item.requiresExhibitionParent !== true) {
      item.parentMatch = null;

      item.needParentConfirm = false;

      if (item.event) {
        item.event.parentEventName = null;
      }

      continue;
    }

    // ===================================================
    // HỘI THẢO THUỘC TRIỂN LÃM
    // ===================================================
    const parentMatch = findParentExhibition(item, exhibitions);

    item.parentMatch = parentMatch;

    if (
      parentMatch &&
      parentMatch.confidence === "HIGH" &&
      parentMatch.parentEventName &&
      parentMatch.parentSheetName &&
      parentMatch.needParentConfirm !== true
    ) {
      item.event = item.event || {};

      item.event.parentEventName = parentMatch.parentEventName;

      item.needParentConfirm = false;
    } else {
      item.needParentConfirm = true;
    }
  }

  // =====================================================
  // GẮN SUMMARY NHỎ
  // =====================================================
  if (summaryInfo) {
    for (const item of results) {
      item.sourceSummary = {
        ...summaryInfo,
      };
    }
  }

  return results;
}

module.exports = {
  readSihubExcel,
  detectImportType,
};
