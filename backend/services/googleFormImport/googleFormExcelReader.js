const XLSX = require("xlsx");
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}
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

    const keywordMatched = HEADER_KEYWORDS.some(
      (keyword) => text === keyword || text.includes(keyword),
    );

    if (keywordMatched) {
      score += 3;
    }

    // Header Google Form thường là câu hỏi dài
    if (
      raw.includes("?") ||
      text.startsWith("ban ") ||
      text.startsWith("doanh nghiep ") ||
      text.startsWith("hien nay ")
    ) {
      score += 1;
    }

    // Dấu hiệu đây là DATA chứ không phải header
    if (
      /^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw) ||
      /^0\d{9}$/.test(raw.replace(/\D/g, "")) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
    ) {
      score -= 3;
    }
  }

  if (nonEmptyCount < 2) {
    return -999;
  }

  return score;
}
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
   * Phải có ít nhất tín hiệu header tương đối rõ.
   *
   * Nếu không:
   * => sheet này không có header đáng tin cậy.
   * Không được lấy dòng học viên làm header.
   */
  if (bestScore < 3) {
    return -1;
  }

  return bestIndex;
}
// =====================================================
// CLEAN
// =====================================================

function cleanCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

// =====================================================
// TÌM DÒNG HEADER
//
// Google Form thông thường:
// dòng đầu tiên chính là header.
//
// Nhưng vẫn hỗ trợ trường hợp phía trên có dòng trống.
// =====================================================

function findHeaderRowIndex(rows = []) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = Array.isArray(rows[index]) ? rows[index] : [];

    const nonEmptyCells = row.filter((cell) => cleanCell(cell) !== "");

    // Tối thiểu 2 cột có dữ liệu
    // mới coi đây là header.
    if (nonEmptyCells.length >= 2) {
      return index;
    }
  }

  return -1;
}

// =====================================================
// CHUẨN HÓA HEADER
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

    // Cột trống vẫn cần tên ổn định
    // để Preview không bị lệch index.
    return text || `Cột ${index + 1}`;
  });
}

// =====================================================
// SAMPLE ROWS
//
// Bước này CHỈ dùng để Admin nhìn nhanh.
// Chưa phải dữ liệu dùng để import.
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
// READ GOOGLE FORM WORKBOOK
//
// QUAN TRỌNG:
// - Không detect Training/Event
// - Không map student
// - Không insert DB
// - Không gọi service SIHUB cũ
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

      // Giữ dữ liệu hiển thị giống Excel.
      // Ví dụ ngày tháng không biến thành serial.
      raw: false,
    });

    const headerRowIndex = findHeaderRowIndex(rows);

    const headers = getHeaders(rows, headerRowIndex);

    const dataRows =
      headerRowIndex >= 0
        ? rows
            .slice(headerRowIndex + 1)
            .filter((row) =>
              (Array.isArray(row) ? row : []).some(
                (cell) => cleanCell(cell) !== "",
              ),
            )
        : [];

    return {
      sheetName,

      headerRowNumber: headerRowIndex >= 0 ? headerRowIndex + 1 : null,

      headers,

      totalRows: dataRows.length,

      sampleRows: buildSampleRows(rows, headerRowIndex, headers, 5),
    };
  });

  return {
    fileName: file.originalname || file.filename || "google-form.xlsx",

    totalSheets: sheets.length,

    sheets,
  };
}

module.exports = {
  readGoogleFormWorkbook,
};
