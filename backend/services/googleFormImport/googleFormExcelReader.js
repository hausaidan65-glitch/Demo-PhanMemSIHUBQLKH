const XLSX = require("xlsx");

// =====================================================
// BASIC
// =====================================================

function cleanCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toIsoDate(day, month, year) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y || y < 2000 || y > 2100 || m > 12 || d > 31) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extractExhibitionFilenameMetadata(fileName) {
  const baseName = String(fileName || "")
    .replace(/\.(xlsx|xls)$/i, "")
    .replace(/^\s*20\d{2}\s*[-–—:]\s*/i, "")
    .replace(/^\s*khảo\s+sát\s+sau\s+triển\s+lãm\s*/i, "")
    .replace(/\s*\(\s*câu\s+trả\s+lời\s*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const years = unique((String(fileName || "").match(/\b20\d{2}\b/g) || []).map(Number));

  return {
    exhibitionFilenameName: baseName || null,
    exhibitionFilenameYear: years.length === 1 ? years[0] : null,
  };
}

function isGenericTrainingMetadataLine(value) {
  const text = normalizeText(value).replace(/[.:\-–]+$/g, "").trim();

  if (!text) return true;

  return (
    /^(danh sach|phieu|bieu mau)(\s|$)/.test(text) ||
    /^(don vi|don vi to chuc|co quan|dia chi|dia diem|thoi gian)(\s*:|$)/.test(text) ||
    /^(trung tam|so|ban|vien|hoc vien|truong|cong ty|hiep hoi)(\s|$)/.test(text)
  );
}

function splitTrainingHierarchy(titleLines = []) {
  const lines = titleLines.map(cleanCell).filter(Boolean);
  const combinedPattern = /^(?:danh\s+sách\s+)?(lớp\s+[^\-–:]+?)\s*[\-–:]\s*(.+)$/i;
  const combinedLine = lines.find((line) => combinedPattern.test(line));
  const combined = combinedLine?.match(combinedPattern);
  const hierarchyLines = lines.filter(
    (line) => line !== combinedLine && !isGenericTrainingMetadataLine(line),
  );
  const findLabeledValue = (pattern) => {
    const matched = hierarchyLines.map((line) => line.match(pattern)).find(Boolean);
    return matched?.[1]?.trim() || null;
  };
  const labeledProgramName = findLabeledValue(
    /^(?:tên\s+)?(?:chương\s+trình|nhiệm\s+vụ\s+đào\s+tạo)\s*:\s*(.+)$/i,
  );
  const relatedProgramName = findLabeledValue(
    /^thuộc\s+((?:chương\s+trình|nhiệm\s+vụ\s+đào\s+tạo)\s+.+)$/i,
  );
  const labeledCourseName = findLabeledValue(
    /^(?:tên\s+)?(?:course|khóa\s+học|nhiệm\s+vụ\s+khóa\s+đào\s+tạo)\s*:\s*(.+)$/i,
  );
  const labeledOpeningName = findLabeledValue(
    /^(?:tên\s+)?(?:lớp|khóa\s+đào\s+tạo|đợt\s+tổ\s+chức|opening)\s*:\s*(.+)$/i,
  );
  const programIndex = hierarchyLines.findIndex((line) =>
    /^(chương\s+trình|nhiệm\s+vụ\s+đào\s+tạo)(\s|:|$)/i.test(line),
  );
  const trainingProgramName = labeledProgramName || relatedProgramName || (programIndex >= 0
    ? hierarchyLines[programIndex]
    : null);
  const openingName = labeledOpeningName
    || combined?.[1]?.trim()
    || hierarchyLines.find((line) => /^lớp\s+.+/i.test(line))
    || null;
  const courseName = labeledCourseName
    || combined?.[2]?.trim()
    || null;

  return {
    trainingProgramName,
    courseName,
    openingName,
  };
}

// Metadata is deliberately read from workbook cells before the detected header.
// The filename is never used as a source and missing values remain unresolved.
function extractSheetMetadata(rows = [], headerRowIndex = -1, totalStudents = 0) {
  const metadataRows = rows.slice(0, headerRowIndex < 0 ? Math.min(rows.length, 15) : headerRowIndex);
  const texts = metadataRows.flatMap((row) => (Array.isArray(row) ? row : []))
    .map(cleanCell).filter(Boolean);
  const combined = texts.join("\n");
  const years = unique((combined.match(/\b(20\d{2})\b/g) || []).map(Number));
  const dates = [];
  const locationLine = texts.find((text) => /^địa\s*điểm\s*:/i.test(text));
  const location = locationLine?.replace(/^địa\s*điểm\s*:\s*/i, "").trim() || null;
  const labeledExhibition = texts.map((text) =>
    text.match(/^(?:tên\s+)?triển\s+lãm\s*:\s*(.+)$/i),
  ).find(Boolean);
  const exhibitionName = labeledExhibition?.[1]?.trim()
    || texts.find((text) => /^triển\s+lãm\s+.+/i.test(text))
    || null;
  const labeledNetworking = texts.map((text) =>
    text.match(/^(?:tên\s+)?(?:sự\s+kiện\s+kết\s+nối|sự\s+kiện)\s*:\s*(.+)$/i),
  ).find(Boolean);
  const networkingEventName = labeledNetworking?.[1]?.trim()
    || texts.find((text) => /^sự\s+kiện\s+kết\s+nối\s+.+/i.test(text))
    || null;

  // Supports "17 & 19/08/2026" as well as ordinary dd/mm/yyyy values.
  for (const match of combined.matchAll(/\b(\d{1,2})\s*(?:&|,|và)\s*(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/gi)) {
    dates.push(toIsoDate(match[1], match[3], match[4]), toIsoDate(match[2], match[3], match[4]));
  }
  for (const match of combined.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) {
    dates.push(toIsoDate(match[1], match[2], match[3]));
  }
  const sessionHeadingDates = [];
  if (headerRowIndex >= 0 && years.length === 1) {
    const possibleSessionRows = rows.slice(headerRowIndex + 1, headerRowIndex + 3);
    possibleSessionRows.forEach((row) => {
      const rowDates = (Array.isArray(row) ? row : []).map(cleanCell)
        .map((cell) => cell.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|\(|$)/))
        .filter(Boolean);
      if (rowDates.length < 2) return;
      rowDates.forEach((match) => {
        sessionHeadingDates.push(toIsoDate(match[1], match[2], years[0]));
      });
    });
  }
  const times = unique([...combined.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)(?:\s*[-–]\s*([01]?\d|2[0-3])[:h]([0-5]\d))?/gi)]
    .map((match) => ({ startTime: `${String(match[1]).padStart(2, "0")}:${match[2]}`, endTime: match[3] ? `${String(match[3]).padStart(2, "0")}:${match[4]}` : null }))
    .map((item) => JSON.stringify(item))).map(JSON.parse);
  const titleLines = texts.filter((text) => !/^(thời gian|địa điểm)\s*:/i.test(text));
  const hierarchy = splitTrainingHierarchy(titleLines);
  const resolvedDates = sessionHeadingDates.length >= 2
    ? sessionHeadingDates
    : unique(dates);
  const sessions = resolvedDates.map((sessionDate, index) => ({
    sessionDate,
    startTime: times[index]?.startTime || times[0]?.startTime || null,
    endTime: times[index]?.endTime || times[0]?.endTime || null,
  }));
  const missing = [];
  if (!hierarchy.trainingProgramName) missing.push("trainingProgramName");
  if (!hierarchy.courseName) missing.push("courseName");
  if (years.length !== 1) missing.push("year");
  if (!sessions.length) missing.push("date");
  if (!sessions.length || sessions.some((item) => !item.startTime)) missing.push("time");

  return {
    ...hierarchy,
    year: years.length === 1 ? years[0] : null,
    yearCandidates: years,
    sessions,
    location,
    exhibitionName,
    networkingEventName,
    studentCount: Number(totalStudents) || 0,
    status: missing.length ? "NEEDS_ADMIN_CONFIRMATION" : "READY",
    missing,
  };
}

// =====================================================
// HEADER KEYWORDS
//
// Chỉ dùng để NHẬN DIỆN dòng header.
// Không map dữ liệu ở bước này.
// =====================================================

const HEADER_KEYWORDS = [
  "dau thoi gian",

  "ho va ten",
  "ho ten",
  "ten hoc vien",

  "so dien thoai",
  "dien thoai",
  "sdt",

  "email",
  "email lien he",

  "chuc vu",

  "don vi",
  "don vi cong tac",

  "dia chi",

  "ma so thue",

  "gioi tinh",

  "nhom tuoi",
  "do tuoi",

  "doi tuong",

  "du an",
  "linh vuc",

  "xac nhan",

  "cau hoi",
];

// =====================================================
// CHẤM ĐIỂM MỘT DÒNG CÓ GIỐNG HEADER KHÔNG
// =====================================================

function scoreHeaderRow(row = []) {
  const cells = Array.isArray(row) ? row : [];

  let score = 0;
  let nonEmptyCount = 0;

  for (const cell of cells) {
    const raw = cleanCell(cell);

    if (!raw) {
      continue;
    }

    nonEmptyCount += 1;

    const text = normalizeText(raw);

    // -------------------------------------------------
    // Tín hiệu header mạnh
    // -------------------------------------------------

    const keywordMatched = HEADER_KEYWORDS.some(
      (keyword) => text === keyword || text.includes(keyword),
    );

    if (keywordMatched) {
      score += 3;
    }

    // -------------------------------------------------
    // Google Form thường dùng câu hỏi dài
    // -------------------------------------------------

    if (
      raw.includes("?") ||
      text.startsWith("ban ") ||
      text.startsWith("doanh nghiep ") ||
      text.startsWith("hien nay ")
    ) {
      score += 1;
    }

    // -------------------------------------------------
    // Dấu hiệu rõ đây là DATA
    // -------------------------------------------------

    // Ngày / timestamp
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
      score -= 3;
    }

    // SĐT
    const phoneDigits = raw.replace(/\D/g, "");

    if (/^0\d{9}$/.test(phoneDigits)) {
      score -= 3;
    }

    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      score -= 3;
    }
  }

  // Ít hơn 2 ô có dữ liệu thì không coi là header.
  if (nonEmptyCount < 2) {
    return -999;
  }

  return score;
}

// =====================================================
// TÌM HEADER
//
// Chỉ tìm tối đa 15 dòng đầu.
// Không được lấy dòng học viên làm header.
// =====================================================

function findHeaderRowIndex(rows = []) {
  const maxSearchRows = Math.min(rows.length, 15);

  let bestIndex = -1;
  let bestScore = -Infinity;

  for (let index = 0; index < maxSearchRows; index += 1) {
    const row = Array.isArray(rows[index]) ? rows[index] : [];

    const score = scoreHeaderRow(row);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  /*
   * Ít nhất phải có một tín hiệu header tương đối rõ.
   *
   * Nếu thấp hơn:
   * => không đủ tin cậy.
   * => trả -1.
   *
   * Tuyệt đối không tự lấy dòng đầu làm header.
   */
  if (bestScore < 3) {
    return -1;
  }

  return bestIndex;
}

// =====================================================
// LẤY HEADER
// =====================================================

function getHeaders(rows = [], headerRowIndex = -1) {
  if (headerRowIndex < 0) {
    return [];
  }

  const headerRow = Array.isArray(rows[headerRowIndex])
    ? rows[headerRowIndex]
    : [];

  return headerRow.map((value, index) => {
    const text = cleanCell(value);

    /*
     * Không bỏ cột trống.
     *
     * Vì nếu bỏ:
     * column index phía sau sẽ bị lệch.
     */
    return text || `[Cột trống ${index + 1}]`;
  });
}

// =====================================================
// PREVIEW DỮ LIỆU KHI CÓ HEADER
//
// Chỉ lấy tối đa 5 dòng.
// Chưa dùng để import.
// =====================================================

function buildSampleRows(
  rows = [],
  headerRowIndex = -1,
  headers = [],
  limit = 5,
) {
  if (headerRowIndex < 0 || headers.length === 0) {
    return [];
  }

  const sample = [];

  for (
    let index = headerRowIndex + 1;
    index < rows.length && sample.length < limit;
    index += 1
  ) {
    const row = Array.isArray(rows[index]) ? rows[index] : [];

    const hasData = row.some((cell) => cleanCell(cell) !== "");

    if (!hasData) {
      continue;
    }

    const values = {};

    headers.forEach((header, columnIndex) => {
      values[header] = cleanCell(row[columnIndex]);
    });

    sample.push({
      rowNumber: index + 1,
      values,
    });
  }

  return sample;
}
// =====================================================
// FULL DATA ROWS
//
// Dùng cho bước Mapping / Review.
//
// - Giữ rowNumber gốc để Admin biết dòng Excel.
// - Không loại dữ liệu chỉ vì thiếu một vài field.
// - Chưa quyết định dòng rác ở đây.
// =====================================================

function classifyTask(value) {
  const task = normalizeText(value);
  if (task === "ket noi") return "NETWORKING";
  if (task === "hoi thao") return "SEMINAR";
  return null;
}

function findValueByHeader(values = {}, expectedHeader) {
  const entry = Object.entries(values).find(
    ([header]) => normalizeText(header) === normalizeText(expectedHeader),
  );
  return cleanCell(entry?.[1]);
}

function buildRowRouting(values = {}, metadata = {}) {
  const programName = findValueByHeader(values, "CHƯƠNG TRÌNH") || null;
  const taskValue = findValueByHeader(values, "NHIỆM VỤ") || null;
  const yearValue = findValueByHeader(values, "NĂM") || null;
  const fullname = findValueByHeader(values, "Họ và Tên") || null;
  const metadataEventName = metadata.networkingEventName || null;
  const metadataConflict = Boolean(
    metadataEventName
    && programName
    && normalizeText(metadataEventName) !== normalizeText(programName)
  );

  return {
    targetType: classifyTask(taskValue),
    taskValue,
    programName,
    year: /^20\d{2}$/.test(yearValue) ? Number(yearValue) : null,
    fullname,
    metadataEventName,
    metadataConflict,
  };
}

function buildDataRows(rows = [], headerRowIndex = -1, headers = [], metadata = {}) {
  if (headerRowIndex < 0 || headers.length === 0) {
    return [];
  }

  const result = [];

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = Array.isArray(rows[index]) ? rows[index] : [];

    const hasData = row.some((cell) => cleanCell(cell) !== "");

    if (!hasData) {
      continue;
    }

    const values = {};

    headers.forEach((header, columnIndex) => {
      values[header] = cleanCell(row[columnIndex]);
    });

    result.push({
      rowNumber: index + 1,
      values,
      routing: buildRowRouting(values, metadata),
    });
  }

  return result;
}
// =====================================================
// RAW PREVIEW
//
// Dùng khi KHÔNG nhận diện được header.
//
// Quan trọng:
// - vẫn cho Admin nhìn thấy dữ liệu
// - nhưng không gọi các giá trị đó là header
// =====================================================

function buildRawPreviewRows(rows = [], limit = 5) {
  const result = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = Array.isArray(rows[index]) ? rows[index] : [];

    const values = row.map((cell) => cleanCell(cell));

    const hasData = values.some(Boolean);

    if (!hasData) {
      continue;
    }

    result.push({
      rowNumber: index + 1,
      values,
    });

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

// =====================================================
// ĐẾM DÒNG CÓ DATA
// =====================================================

function countDataRows(rows = [], headerRowIndex = -1) {
  /*
   * Có header:
   * đếm từ dòng sau header.
   */
  if (headerRowIndex >= 0) {
    return rows
      .slice(headerRowIndex + 1)
      .filter((row) =>
        (Array.isArray(row) ? row : []).some((cell) => cleanCell(cell) !== ""),
      ).length;
  }

  /*
   * Không có header:
   * toàn bộ các dòng có dữ liệu đều là raw data.
   */
  return rows.filter((row) =>
    (Array.isArray(row) ? row : []).some((cell) => cleanCell(cell) !== ""),
  ).length;
}

// =====================================================
// READ GOOGLE FORM WORKBOOK
//
// QUAN TRỌNG:
// - Không detect TRAINING / EVENT
// - Không map student
// - Không insert DB
// - Không gọi SIHUB import cũ
// =====================================================

function readGoogleFormWorkbook(file) {
  if (!file) {
    throw new Error("Không tìm thấy file Google Form.");
  }

  let workbook;

  if (file.buffer) {
    workbook = XLSX.read(file.buffer, {
      type: "buffer",
    });
  } else if (file.path) {
    workbook = XLSX.readFile(file.path);
  } else {
    throw new Error("Không đọc được nội dung file Excel.");
  }

  if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
    throw new Error("File Excel không có sheet dữ liệu.");
  }

  const fileName = file.originalname || file.filename || "google-form.xlsx";
  const exhibitionFilenameMetadata = extractExhibitionFilenameMetadata(fileName);
  const sheets = workbook.SheetNames.map((sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,

      defval: "",

      blankrows: false,

      /*
       * Giữ giá trị hiển thị giống Excel.
       *
       * Timestamp Google Form:
       * 4/22/2026 20:40:11
       *
       * thay vì serial Excel.
       */
      raw: false,
    });

    // ===================================================
    // HEADER
    // ===================================================

    const headerRowIndex = findHeaderRowIndex(rows);

    const hasDetectedHeader = headerRowIndex >= 0;

    const headers = hasDetectedHeader ? getHeaders(rows, headerRowIndex) : [];

    // ===================================================
    // RETURN SHEET
    // ===================================================

    const totalRows = countDataRows(rows, headerRowIndex);
    const extractedMetadata = {
      ...extractSheetMetadata(rows, headerRowIndex, totalRows),
      ...exhibitionFilenameMetadata,
    };
    const dataRows = hasDetectedHeader
      ? buildDataRows(rows, headerRowIndex, headers, extractedMetadata)
      : [];
    const routedParticipantRows = dataRows.filter((row) => row.routing?.fullname);
    const moduleCounts = dataRows.reduce((counts, row) => {
      const type = row.routing?.targetType;
      if (type) counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    const detectedTypes = Object.keys(moduleCounts);
    const participantPrograms = unique(
      dataRows.map((row) => row.routing?.programName),
    );
    const metadataConflicts = dataRows
      .filter((row) => row.routing?.metadataConflict)
      .map((row) => ({
        rowNumber: row.rowNumber,
        metadataEventName: row.routing.metadataEventName,
        participantProgramName: row.routing.programName,
      }));
    const detectedTargetType = detectedTypes.length === 1
      ? detectedTypes[0]
      : detectedTypes.length > 1 ? "MIXED" : null;
    const metadata = {
      ...extractedMetadata,
      studentCount: headers.some((header) => normalizeText(header) === "ho va ten")
        ? routedParticipantRows.length
        : extractedMetadata.studentCount,
      detectedTargetType,
      moduleCounts,
      participantPrograms,
      metadataConflicts,
      status: detectedTargetType === "MIXED" || metadataConflicts.length
        ? "NEEDS_ADMIN_CONFIRMATION"
        : extractedMetadata.status,
    };
    const isEmpty = rows.length === 0;

    return {
      sheetName,

      /*
       * FE dùng field này để biết:
       *
       *  có thể map
       *  chưa thể map
       */
      hasDetectedHeader,

      /*
       * 1-based cho Admin dễ hiểu.
       *
       * JS index 0
       * => Excel row 1
       */
      headerRowNumber: hasDetectedHeader ? headerRowIndex + 1 : null,

      headers,

      /*
       * Tổng số dòng dữ liệu thực tế.
       */
      totalRows,

      metadata,
      status: isEmpty ? "EMPTY" : metadata.status,

      /*
       * Preview có header.
       */
      sampleRows: hasDetectedHeader
        ? buildSampleRows(rows, headerRowIndex, headers, 5)
        : [],
      dataRows,

      /*
       * Preview raw nếu không detect được header.
       */
      rawPreviewRows: !hasDetectedHeader ? buildRawPreviewRows(rows, 5) : [],
    };
    } catch (error) {
      return {
        sheetName,
        hasDetectedHeader: false,
        headerRowNumber: null,
        headers: [],
        totalRows: 0,
        metadata: null,
        sampleRows: [],
        dataRows: [],
        rawPreviewRows: [],
        status: "ERROR",
        error: error.message || "Không thể đọc worksheet.",
      };
    }
  });

  return {
    fileName,

    totalSheets: sheets.length,

    sheets,
  };
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  readGoogleFormWorkbook,
  extractSheetMetadata,
  extractExhibitionFilenameMetadata,
  splitTrainingHierarchy,
  classifyTask,
};
