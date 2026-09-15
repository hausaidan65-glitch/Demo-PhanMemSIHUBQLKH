// =====================================================
// GOOGLE FORM DATA CLEANER
//
// Chỉ xử lý data ở FE để REVIEW nhanh.
//
// KHÔNG insert DB.
// KHÔNG kiểm tra user tồn tại trong DB.
// Phần DB conflict sẽ làm ở API validate batch.
// =====================================================

// =====================================================
// BASIC
// =====================================================

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// =====================================================
// PHONE
// =====================================================

function normalizePhone(value) {
  const raw = cleanText(value);

  if (!raw) {
    return "";
  }

  /*
   * Lấy nhóm số điện thoại đầu tiên.
   *
   * Ví dụ:
   * 0901234567 / 0912345678
   * => 0901234567
   */
  const firstCandidate =
    raw
      .split(/[/,;|\n]+/)
      .map((item) => item.trim())
      .find(Boolean) || raw;

  let digits = firstCandidate.replace(/\D/g, "");

  /*
   * +84xxxxxxxxx
   * 84xxxxxxxxx
   * => 0xxxxxxxxx
   */
  if (digits.startsWith("84") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }

  return digits;
}

// =====================================================
// BOOLEAN
// =====================================================

function normalizeBoolean(value) {
  const text = cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (["co", "yes", "true", "1"].includes(text)
    || text.includes("da co y tuong")
    || text.includes("da co du an")) {
    return true;
  }

  if (["khong", "no", "false", "0"].includes(text)
    || text.includes("chua co y tuong")
    || text.includes("chua co du an")) {
    return false;
  }

  return null;
}

// =====================================================
// VALUE THEO FIELD
// =====================================================

const EXHIBITION_NUMERIC_FIELDS = new Set([
  "exhibition_product_quantity",
  "sold_or_ordered_quantity",
  "visitor_count",
  "b2b_matching_count",
  "public_sector_connection_count",
  "mou_count",
  "exhibition_revenue",
]);
const EXHIBITION_EXPLICIT_ZERO_VALUES = new Set([
  "khong",
  "khong co",
  "chua",
  "chua co",
  "van chua",
  "n/a",
]);

function normalizeExhibitionNumericValue(value) {
  const text = cleanText(value);
  const comparableText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (text === "" || EXHIBITION_EXPLICIT_ZERO_VALUES.has(comparableText)) {
    return 0;
  }

  if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) {
    return Number(text.replace(/\./g, ""));
  }

  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) {
    const numberValue = Number(text);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
  }

  const certainCount = comparableText.match(
    /^~\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:luot|dich vu|san pham|ma hang|mou)?$|^(\d+(?:\.\d+)?|\.\d+)\s+(?:luot|dich vu|san pham|ma hang|mou)$/,
  );
  if (certainCount) {
    return Number(certainCount[1] || certainCount[2]);
  }

  const certainMillions = comparableText.match(
    /^~?\s*(\d+(?:[.,]\d+)?)\s*trieu(?:\s*(?:vnd|vnđ|dong))?$/,
  );
  if (certainMillions) {
    return Number(certainMillions[1].replace(",", ".")) * 1000000;
  }

  const certainCurrency = comparableText.match(
    /^(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:vnd|vnđ|dong)$/,
  );
  if (certainCurrency) {
    return Number(certainCurrency[1].replace(/\./g, ""));
  }

  return 0;
}

export function normalizeValue(field, value, targetType = null) {
  if (field === "email") {
    return normalizeEmail(value);
  }

  if (field === "phone") {
    return normalizePhone(value);
  }

  if (field === "has_project" || field === "female_founder") {
    const booleanValue = normalizeBoolean(value);

    if (booleanValue !== null) {
      return booleanValue;
    }
  }

  if (targetType === "EXHIBITION" && EXHIBITION_NUMERIC_FIELDS.has(field)) {
    const normalizedValue = normalizeExhibitionNumericValue(value);
    return normalizedValue;
  }

  return cleanText(value);
}

// =====================================================
// DEDUPE KEY
// =====================================================

function buildDuplicateKey(data = {}, target = null) {
  const email = normalizeEmail(data.email);

  const phone = normalizePhone(data.phone);

  if (email) {
    return `email:${email}`;
  }

  if (phone) {
    return `phone:${phone}`;
  }

  const fullname = cleanText(data.fullname)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  const targetIdentity = target?.type === "EXHIBITION"
    ? (target.eventId ? `exhibition:${target.eventId}` : "")
    : target?.type === "NETWORKING"
      ? (target.eventId ? `networking:${target.eventId}` : "")
      : (target?.openingId ? `opening:${target.openingId}` : "");

  return fullname && targetIdentity
    ? `${targetIdentity}|fullname:${fullname}`
    : "";
}

// =====================================================
// BUILD PERSON
// =====================================================

function buildCleanRow({ sourceRow, mapping, target }) {
  const data = {};

  const rawExtras = {};

  const warnings = [];

  const errors = [];

  const sourceValues = sourceRow?.values || {};

  // =====================================================
  // APPLY MAPPING
  // =====================================================

  for (const [sourceHeader, targetField] of Object.entries(mapping || {})) {
    const rawValue = sourceValues[sourceHeader];

    // ---------------------------------------------
    // IGNORE
    // ---------------------------------------------

    if (targetField === "__IGNORE__" || !targetField) {
      continue;
    }

    // ---------------------------------------------
    // EXTRA
    // ---------------------------------------------

    if (targetField === "__EXTRA__") {
      const cleaned = cleanText(rawValue);

      if (cleaned) {
        rawExtras[sourceHeader] = cleaned;
      }

      continue;
    }

    // ---------------------------------------------
    // MAPPED FIELD
    // ---------------------------------------------

    data[targetField] = normalizeValue(targetField, rawValue, target?.type);
  }

  // =====================================================
  // JUNK
  //
  // Không có bất kỳ định danh con người nào.
  // =====================================================

  const hasIdentity = Boolean(
    cleanText(data.fullname) ||
    normalizePhone(data.phone) ||
    normalizeEmail(data.email),
  );

  if (!hasIdentity) {
    return {
      rowNumber: sourceRow?.rowNumber || null,

      status: "JUNK",

      data,
      rawExtras,

      warnings,

      errors,

      duplicateKey: "",
    };
  }

  const rowTargetType = sourceRow?.routing?.targetType;
  if (rowTargetType && target?.type && rowTargetType !== target.type) {
    errors.push(
      `NHIỆM VỤ của dòng là "${sourceRow.routing.taskValue}" (${rowTargetType}), không thuộc target ${target.type}.`,
    );
  }

  if (sourceRow?.routing?.metadataConflict) {
    errors.push(
      `Mâu thuẫn Tên sự kiện "${sourceRow.routing.metadataEventName}" và CHƯƠNG TRÌNH "${sourceRow.routing.programName}".`,
    );
  }

  // =====================================================
  // REQUIRED
  // =====================================================

  if (!cleanText(data.fullname)) {
    errors.push("Thiếu Họ và tên.");
  }

  // =====================================================
  // EMAIL
  // =====================================================

  if (data.email && !isValidEmail(data.email)) {
    warnings.push("Email không đúng định dạng.");
  }

  // =====================================================
  // PHONE BASIC
  // =====================================================

  if (data.phone) {
    const phone = normalizePhone(data.phone);

    if (phone.length < 9 || phone.length > 11) {
      warnings.push("Số điện thoại có độ dài bất thường.");
    }

    data.phone = phone;
  }

  // =====================================================
  // STATUS LOCAL
  // =====================================================

  let status = "READY";

  if (errors.length > 0) {
    status = "ERROR";
  } else if (warnings.length > 0) {
    status = "WARNING";
  }

  return {
    rowNumber: sourceRow?.rowNumber || null,

    status,

    data,

    rawExtras,

    warnings,

    errors,

    duplicateKey: buildDuplicateKey(data, target),
  };
}

// =====================================================
// CLEAN SHEET
// =====================================================

export function cleanGoogleFormRows({
  dataRows = [],
  mapping = {},
  target = null,
  batchDuplicateKeys = [],
}) {
  const result = [];

  const duplicateMap = new Map();

  for (const sourceRow of dataRows) {
    const cleaned = buildCleanRow({
      sourceRow,
      mapping,
      target,
    });

    // ===================================================
    // DUPLICATE TRONG FILE
    // ===================================================

    if (cleaned.status !== "JUNK" && cleaned.duplicateKey) {
      if (batchDuplicateKeys.includes(cleaned.duplicateKey)) {
        cleaned.status = "DUPLICATE_BATCH";
        cleaned.warnings.push("Trùng học viên với file trước trong cùng batch.");
        result.push(cleaned);
        continue;
      }
      const existed = duplicateMap.get(cleaned.duplicateKey);

      if (existed) {
        cleaned.status = "DUPLICATE_FILE";

        cleaned.warnings.push(`Trùng dữ liệu với dòng ${existed.rowNumber}.`);
      } else {
        duplicateMap.set(cleaned.duplicateKey, cleaned);
      }
    }

    result.push(cleaned);
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = {
    total: result.length,

    ready: 0,
    warning: 0,
    error: 0,
    junk: 0,
    duplicate: 0,

    importable: 0,
  };

  for (const row of result) {
    switch (row.status) {
      case "READY":
        summary.ready += 1;
        summary.importable += 1;
        break;

      case "WARNING":
        summary.warning += 1;

        /*
         * Import nhanh:
         * warning vẫn cho import.
         */
        summary.importable += 1;
        break;

      case "ERROR":
        summary.error += 1;
        break;

      case "JUNK":
        summary.junk += 1;
        break;

      case "DUPLICATE_FILE":
      case "DUPLICATE_BATCH":
        summary.duplicate += 1;
        break;

      default:
        break;
    }
  }

  return {
    summary,
    rows: result,
  };
}
