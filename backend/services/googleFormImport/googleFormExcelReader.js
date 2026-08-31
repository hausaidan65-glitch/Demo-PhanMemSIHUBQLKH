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

function buildDataRows(rows = [], headerRowIndex = -1, headers = []) {
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

  const sheets = workbook.SheetNames.map((sheetName) => {
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
      totalRows: countDataRows(rows, headerRowIndex),

      /*
       * Preview có header.
       */
      sampleRows: hasDetectedHeader
        ? buildSampleRows(rows, headerRowIndex, headers, 5)
        : [],
      dataRows: hasDetectedHeader
        ? buildDataRows(rows, headerRowIndex, headers)
        : [],

      /*
       * Preview raw nếu không detect được header.
       */
      rawPreviewRows: !hasDetectedHeader ? buildRawPreviewRows(rows, 5) : [],
    };
  });

  return {
    fileName: file.originalname || file.filename || "google-form.xlsx",

    totalSheets: sheets.length,

    sheets,
  };
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  readGoogleFormWorkbook,
};
