// =====================================================
// Helper dùng chung cho Import Excel SIHUB
// =====================================================

// ======================================
// Chuẩn hóa text
// ======================================
function normalizeText(text) {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================
// Decode tên file tiếng Việt
// ======================================
function decodeFilename(filename) {
  try {
    return Buffer.from(filename, "latin1").toString("utf8");
  } catch (error) {
    return filename;
  }
}

// ======================================
// Tìm dòng chứa keyword
// ======================================
function findRowIndex(rows, keyword) {
  const key = normalizeText(keyword);

  return rows.findIndex((row) => {
    const safeRow = Array.isArray(row) ? row : [];

    return normalizeText(safeRow.join(" ")).includes(key);
  });
}

// ======================================
// Lấy text trong row
// ======================================
function getRowText(row = []) {
  return row
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ")
    .trim();
}

// ======================================
// Chuẩn hóa số điện thoại Excel
// ======================================
function normalizeExcelPhone(value) {
  if (value === undefined || value === null) {
    return "";
  }

  let phone = String(value).trim();

  if (!phone) {
    return "";
  }

  // Bỏ ký tự trình bày
  phone = phone.replace(/[\s.\-()]/g, "");

  // +84xxxxxxxxx
  // -> 0xxxxxxxxx
  if (phone.startsWith("+84")) {
    phone = `0${phone.slice(3)}`;
  }

  // 84xxxxxxxxx
  // -> 0xxxxxxxxx
  if (phone.startsWith("84") && phone.length === 11) {
    phone = `0${phone.slice(2)}`;
  }

  // Excel Number làm mất số 0 đầu:
  //
  // 908161670
  // -> 0908161670
  //
  // 353788789
  // -> 0353788789
  if (/^[35789]\d{8}$/.test(phone)) {
    phone = `0${phone}`;
  }

  return phone;
}

// ======================================
// Bỏ nhãn metadata
//
// "Thời gian: 08h00"
// -> "08h00"
// ======================================
function stripLeadingMetadataLabel(value, label) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const normalizedRaw = normalizeText(raw);

  const normalizedLabel = normalizeText(label);

  if (!normalizedRaw.startsWith(normalizedLabel)) {
    return raw;
  }

  const colonIndex = raw.indexOf(":");

  if (colonIndex !== -1) {
    return raw.slice(colonIndex + 1).trim();
  }

  const removeWordCount = normalizedLabel.split(" ").filter(Boolean).length;

  return raw
    .split(/\s+/)
    .slice(removeWordCount)
    .join(" ")
    .replace(/^[:\-–—]+\s*/, "")
    .trim();
}

module.exports = {
  normalizeText,
  decodeFilename,
  findRowIndex,
  getRowText,
  normalizeExcelPhone,
  stripLeadingMetadataLabel,
};
