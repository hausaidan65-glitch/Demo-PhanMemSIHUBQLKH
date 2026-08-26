const {
  normalizeText,
  normalizeExcelPhone,
  stripLeadingMetadataLabel,
} = require("./excelImportHelpers");

function extractEventParticipants(rows) {
  let headerIndex = -1;

  // =====================================================
  // 1. TÌM HEADER NGƯỜI THAM DỰ
  //
  // Hỗ trợ nhiều kiểu Excel:
  //
  // HỌ TÊN
  // HỌ VÀ TÊN
  // TÊN NGƯỜI THAM DỰ
  //
  // và dạng Sheet 7:
  // STT | TÊN | CHỨC VỤ | TÊN CÔNG TY | SỐ ĐT | EMAIL
  // =====================================================
  for (let i = 0; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    const normalizedRow = row.map((cell) => normalizeText(cell));

    const hasFullnameColumn = normalizedRow.some(
      (cell) =>
        cell === "ho ten" ||
        cell === "ho va ten" ||
        cell === "ten nguoi tham du" ||
        cell === "nguoi tham du",
    );

    // Sheet kiểu:
    // STT | TÊN | CHỨC VỤ | TÊN CÔNG TY | SỐ ĐT | EMAIL
    const hasSimpleNameColumn =
      normalizedRow.includes("ten") &&
      (normalizedRow.includes("stt") ||
        normalizedRow.some((cell) => cell.includes("email")) ||
        normalizedRow.some((cell) => cell.includes("so dt")));

    if (hasFullnameColumn || hasSimpleNameColumn) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return [];
  }

  const headers = rows[headerIndex].map((header) => normalizeText(header));

  const participants = [];

  // =====================================================
  // 2. ĐỌC TỪ DÒNG SAU HEADER
  // =====================================================
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    const participant = {};

    row.forEach((value, index) => {
      const key = headers[index] || "";

      const text =
        value === undefined || value === null ? "" : String(value).trim();

      // ===============================================
      // HỌ TÊN
      // ===============================================
      if (
        key === "ten" ||
        key === "ho ten" ||
        key === "ho va ten" ||
        key === "ten nguoi tham du" ||
        key === "nguoi tham du"
      ) {
        participant.fullname = text;
      }

      // ===============================================
      // EMAIL
      // ===============================================
      if (key === "email" || key.includes("email")) {
        participant.email = text;
      }

      // ===============================================
      // SỐ ĐIỆN THOẠI
      // ===============================================
      if (
        key === "so dt" ||
        key === "sdt" ||
        key === "phone" ||
        key.includes("dien thoai") ||
        key.includes("so dien thoai")
      ) {
        participant.phone = normalizeExcelPhone(value);
      }

      // ===============================================
      // ĐƠN VỊ / CÔNG TY
      // ===============================================
      if (
        key === "ten cong ty" ||
        key === "cong ty" ||
        key === "don vi" ||
        key === "to chuc" ||
        key === "organization" ||
        key.includes("ten don vi")
      ) {
        participant.organization = text;
      }

      // ===============================================
      // CHỨC VỤ
      // ===============================================
      if (key === "chuc vu" || key === "vi tri" || key === "position") {
        participant.position = text;
      }
    });

    // =================================================
    // Chỉ giữ dòng có họ tên
    // =================================================
    if (
      participant.fullname &&
      normalizeText(participant.fullname) !== "ten" &&
      normalizeText(participant.fullname) !== "ho ten" &&
      normalizeText(participant.fullname) !== "ho va ten"
    ) {
      participants.push(participant);
    }
  }

  return participants;
}
// ======================================
// Chuẩn hóa email để so sánh
// Không tự sửa dữ liệu gốc
// ======================================
function normalizeEmailForCompare(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}
// ======================================
// Chuẩn hóa SĐT để so sánh
// Không thay đổi dữ liệu Excel gốc
// ======================================
function normalizePhoneForCompare(phone) {
  return String(phone || "")
    .replace(/\D/g, "")
    .trim();
}
function isValidBasicEmail(value) {
  const email = String(value || "").trim();

  if (!email) {
    return true;
  }

  if (/\s/.test(email)) {
    return false;
  }

  if (email.includes("/") || email.includes(",") || email.includes(";")) {
    return false;
  }

  const atCount = (email.match(/@/g) || []).length;

  if (atCount !== 1) {
    return false;
  }

  const [localPart, domain] = email.split("@");

  return Boolean(localPart && domain);
}
// ======================================
// Validate dữ liệu participant
//
// Chỉ PHÁT HIỆN lỗi.
// Không tự sửa dữ liệu Excel.
// ======================================
function validateEventParticipant(participant = {}) {
  const errors = [];
  const warnings = [];

  const fullname = String(participant.fullname || "").trim();

  const email = String(participant.email || "").trim();

  const phone = String(participant.phone || "").trim();

  // ===================================
  // HỌ TÊN
  // ===================================
  if (!fullname) {
    errors.push({
      field: "fullname",
      code: "FULLNAME_REQUIRED",
      message: "Thiếu họ tên người tham dự.",
    });
  }

  // ===================================
  // EMAIL
  // ===================================
  if (email) {
    const normalizedEmail = email.toLowerCase();

    const emailCount = (normalizedEmail.match(/@/g) || []).length;

    if (
      emailCount !== 1 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      warnings.push({
        field: "email",
        code: "INVALID_EMAIL",
        message: "Email chưa đúng định dạng, cần kiểm tra trước khi import.",
        value: email,
      });
    }
  }
  // ===================================
  // PHONE
  // ===================================
  if (phone) {
    const digits = normalizePhoneForCompare(phone);

    if (!/^0\d{9}$/.test(digits)) {
      warnings.push({
        field: "phone",
        code: "INVALID_PHONE",
        message: "Số điện thoại chưa đúng định dạng 10 số bắt đầu bằng 0.",
        value: phone,
      });
    }
  }

  return {
    errors,
    warnings,

    isValid: errors.length === 0 && warnings.length === 0,
  };
}
// ======================================
// Phát hiện trùng TRONG CÙNG MỘT SỰ KIỆN
//
// QUAN TRỌNG:
// - Không dedupe xuyên các event
// - User A tham gia Event A và Event B vẫn hợp lệ
// - Chỉ đánh dấu nếu cùng một sheet/event bị lặp
// ======================================
function analyzeEventParticipantDuplicates(participants = []) {
  const seenEmail = new Map();
  const seenPhone = new Map();

  const uniqueParticipants = [];
  const duplicateRows = [];
  const conflictRows = [];

  participants.forEach((participant, index) => {
    // ======================================
    // Chuẩn hóa dữ liệu dùng để SO SÁNH
    // Không sửa dữ liệu gốc
    // ======================================
    const rawEmail = normalizeEmailForCompare(participant.email);
    const rawPhone = normalizePhoneForCompare(participant.phone);
    const fullnameKey = normalizeText(participant.fullname);

    // ======================================
    // Chỉ dùng email hợp lệ làm identity
    //
    // Không lấy các dạng:
    // abc @gmail.com
    // a@gmail.com / b@gmail.com
    // làm khóa duplicate.
    // ======================================
    const emailKey = rawEmail && isValidBasicEmail(rawEmail) ? rawEmail : "";

    // ======================================
    // Chỉ dùng SĐT Việt Nam dạng:
    // 0xxxxxxxxx
    // đủ 10 số
    // ======================================
    const phoneKey = rawPhone && /^0\d{9}$/.test(rawPhone) ? rawPhone : "";

    const emailMatch =
      emailKey && seenEmail.has(emailKey) ? seenEmail.get(emailKey) : null;

    const phoneMatch =
      phoneKey && seenPhone.has(phoneKey) ? seenPhone.get(phoneKey) : null;

    // ======================================
    // 1. EMAIL + PHONE cùng trỏ tới
    // một participant trước đó
    // ======================================
    if (
      emailMatch !== null &&
      phoneMatch !== null &&
      emailMatch === phoneMatch
    ) {
      const original = uniqueParticipants[emailMatch];

      const originalName = normalizeText(original?.fullname);

      // --------------------------------------
      // Cùng email + phone nhưng TÊN KHÁC
      //
      // Không được coi là duplicate chắc chắn.
      // Đây là conflict identity.
      // --------------------------------------
      if (fullnameKey && originalName && fullnameKey !== originalName) {
        conflictRows.push({
          rowIndex: index,

          conflictWith: emailMatch,

          reason: "IDENTITY_NAME_CONFLICT",

          message: "Email và số điện thoại trùng nhưng họ tên khác nhau.",

          current: {
            ...participant,
          },

          existing: {
            ...original,
          },
        });

        return;
      }

      // --------------------------------------
      // Cùng tên + email + phone
      // => duplicate mạnh
      // --------------------------------------
      duplicateRows.push({
        rowIndex: index,

        duplicateOf: emailMatch,

        reason: "DUPLICATE_EMAIL_PHONE",

        participant: {
          ...participant,
        },
      });

      return;
    }

    // ======================================
    // 2. EMAIL TRÙNG
    // ======================================
    if (emailMatch !== null) {
      const original = uniqueParticipants[emailMatch];

      const originalPhone = normalizePhoneForCompare(original?.phone);

      const originalName = normalizeText(original?.fullname);

      // --------------------------------------
      // Email giống nhưng phone khác
      // --------------------------------------
      if (
        phoneKey &&
        originalPhone &&
        /^0\d{9}$/.test(originalPhone) &&
        phoneKey !== originalPhone
      ) {
        conflictRows.push({
          rowIndex: index,

          conflictWith: emailMatch,

          reason: "EMAIL_PHONE_CONFLICT",

          message: "Email trùng nhưng số điện thoại khác.",

          current: {
            ...participant,
          },

          existing: {
            ...original,
          },
        });

        return;
      }

      // --------------------------------------
      // Email giống nhưng tên khác
      // --------------------------------------
      if (fullnameKey && originalName && fullnameKey !== originalName) {
        conflictRows.push({
          rowIndex: index,

          conflictWith: emailMatch,

          reason: "EMAIL_NAME_CONFLICT",

          message: "Email trùng nhưng họ tên khác.",

          current: {
            ...participant,
          },

          existing: {
            ...original,
          },
        });

        return;
      }

      // --------------------------------------
      // Email giống, không có conflict khác
      // => duplicate email
      // --------------------------------------
      duplicateRows.push({
        rowIndex: index,

        duplicateOf: emailMatch,

        reason: "DUPLICATE_EMAIL",

        participant: {
          ...participant,
        },
      });

      return;
    }

    // ======================================
    // 3. PHONE TRÙNG
    // ======================================
    if (phoneMatch !== null) {
      const original = uniqueParticipants[phoneMatch];

      const originalEmail = normalizeEmailForCompare(original?.email);

      const originalName = normalizeText(original?.fullname);

      // --------------------------------------
      // Phone giống nhưng email khác
      // --------------------------------------
      if (emailKey && originalEmail && isValidBasicEmail(originalEmail)) {
        conflictRows.push({
          rowIndex: index,

          conflictWith: phoneMatch,

          reason: "PHONE_EMAIL_CONFLICT",

          message: "Số điện thoại trùng nhưng email khác.",

          current: {
            ...participant,
          },

          existing: {
            ...original,
          },
        });

        return;
      }

      // --------------------------------------
      // Phone giống nhưng tên khác
      // --------------------------------------
      if (fullnameKey && originalName && fullnameKey !== originalName) {
        conflictRows.push({
          rowIndex: index,

          conflictWith: phoneMatch,

          reason: "PHONE_NAME_CONFLICT",

          message: "Số điện thoại trùng nhưng họ tên khác.",

          current: {
            ...participant,
          },

          existing: {
            ...original,
          },
        });

        return;
      }

      // --------------------------------------
      // Không có conflict
      // => duplicate phone
      // --------------------------------------
      duplicateRows.push({
        rowIndex: index,

        duplicateOf: phoneMatch,

        reason: "DUPLICATE_PHONE",

        participant: {
          ...participant,
        },
      });

      return;
    }

    // ======================================
    // 4. PARTICIPANT HỢP LỆ MỚI
    // ======================================
    const uniqueIndex = uniqueParticipants.length;

    uniqueParticipants.push({
      ...participant,

      _normalizedFullname: fullnameKey,
    });

    if (emailKey) {
      seenEmail.set(emailKey, uniqueIndex);
    }

    if (phoneKey) {
      seenPhone.set(phoneKey, uniqueIndex);
    }
  });

  return {
    // Tổng dòng người đọc được từ Excel
    totalRows: participants.length,

    // Danh sách người sau khi loại duplicate/conflict
    uniqueParticipants,

    // Giữ field cũ để FE hiện tại không hỏng
    totalUnique: uniqueParticipants.length,

    // Field mới dùng cho Preview mới
    totalValidUnique: uniqueParticipants.length,

    duplicateRows,

    totalDuplicates: duplicateRows.length,

    conflictRows,

    totalConflicts: conflictRows.length,
  };
}
// ======================================
// Chuẩn hóa tên event để so sánh
// ======================================
function normalizeEventNameForMatch(value) {
  return normalizeText(value)
    .replace(/\b2026\b/g, "")
    .replace(/\bexpo\b/g, "")
    .replace(/\bconference\b/g, "")
    .replace(/\bchuong trinh\b/g, "")
    .replace(/\bsu kien\b/g, "")
    .replace(/\bhoi thao\b/g, "")
    .replace(/\btrien lam\b/g, "")
    .replace(/\bht\b/g, "")
    .replace(/\btl\b/g, "")
    .replace(/\btrong\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
// ======================================
// Tạo acronym từ tên Event
//
// Ví dụ:
// "Công nghiệp văn hóa"
// => "cnvh"
//
// Dùng để hỗ trợ tên sheet bị viết tắt.
// Chỉ dùng cho GỢI Ý parent.
// ======================================
function buildEventAcronym(value) {
  const normalized = normalizeEventNameForMatch(value);

  if (!normalized) {
    return "";
  }

  const ignoreWords = new Set([
    "va",
    "cua",
    "cho",
    "trong",
    "tai",
    "voi",
    "nam",
    "ngay",
    "hoi",
  ]);

  return normalized
    .split(" ")
    .filter(Boolean)
    .filter((word) => !ignoreWords.has(word))
    .map((word) => word[0])
    .join("");
}
// ======================================
// So khớp tên Event theo token
//
// Dùng cho trường hợp tên sheet bị Excel cắt:
//
// "SMART GREEN LIV"
// và
// "SMART GREEN LIVING"
//
// Chỉ dùng để GỢI Ý parent,
// không tự xác nhận.
// ======================================
function calculateEventNameMatchScore(sourceValue, targetValue) {
  const source = normalizeEventNameForMatch(sourceValue);

  const target = normalizeEventNameForMatch(targetValue);

  if (!source || !target) {
    return 0;
  }

  // ======================================
  // 1. GIỐNG HOÀN TOÀN
  // ======================================
  if (source === target) {
    return 1;
  }

  // ======================================
  // 2. MỘT TÊN CHỨA TÊN CÒN LẠI
  // ======================================
  if (source.includes(target) || target.includes(source)) {
    return 0.95;
  }

  const sourceTokens = source.split(" ").filter(Boolean);

  const targetTokens = target.split(" ").filter(Boolean);

  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }

  // ======================================
  // 3. MATCH ACRONYM
  //
  // CNVH
  // ↕
  // CÔNG NGHIỆP VĂN HÓA
  // ======================================
  const sourceAcronym = buildEventAcronym(sourceValue);

  const targetAcronym = buildEventAcronym(targetValue);

  const acronymMatched =
    sourceTokens.some(
      (token) =>
        token.length >= 3 &&
        (targetAcronym.includes(token) || targetAcronym.startsWith(token)),
    ) ||
    targetTokens.some(
      (token) =>
        token.length >= 3 &&
        (sourceAcronym.includes(token) || sourceAcronym.startsWith(token)),
    );

  if (acronymMatched) {
    return 0.8;
  }

  // ======================================
  // 4. MATCH TOKEN / PREFIX
  //
  // LIV ↔ LIVING
  // CONFER ↔ CONFERENCE
  // ======================================
  let matched = 0;

  for (const sourceToken of sourceTokens) {
    const found = targetTokens.some((targetToken) => {
      if (sourceToken === targetToken) {
        return true;
      }

      if (
        sourceToken.length >= 3 &&
        targetToken.length >= 3 &&
        (sourceToken.startsWith(targetToken) ||
          targetToken.startsWith(sourceToken))
      ) {
        return true;
      }

      return false;
    });

    if (found) {
      matched++;
    }
  }

  return matched / Math.max(sourceTokens.length, targetTokens.length);
}

// ======================================
// Tìm Triển lãm cha cho Hội thảo
//
// CHỈ dùng để gợi ý.
// Không match chắc chắn => không tự gán.
// ======================================
function findParentExhibition(seminarItem, exhibitions = []) {
  if (!seminarItem) {
    return null;
  }

  // ======================================
  // 1. EXCEL GHI RÕ SỰ KIỆN CHA
  //
  // Đây là tín hiệu mạnh nhất.
  // ======================================
  if (seminarItem.event?.parentEventName) {
    const requestedParent = normalizeEventNameForMatch(
      seminarItem.event.parentEventName,
    );

    let bestMatch = null;
    let bestScore = 0;

    for (const item of exhibitions) {
      const candidates = [item.event?.eventName, item.sheetName];

      let itemScore = 0;

      for (const candidate of candidates) {
        const score = calculateEventNameMatchScore(requestedParent, candidate);

        itemScore = Math.max(itemScore, score);
      }

      if (itemScore > bestScore) {
        bestScore = itemScore;
        bestMatch = item;
      }
    }

    // --------------------------------------
    // Match rất chắc
    // --------------------------------------
    if (bestMatch && bestScore >= 0.9) {
      return {
        parentEventName: bestMatch.event?.eventName || null,

        parentSheetName: bestMatch.sheetName || null,

        confidence: "HIGH",

        matchScore: bestScore,

        needParentConfirm: false,

        reason:
          "Excel ghi trực tiếp sự kiện cha và tìm thấy Triển lãm tương ứng.",
      };
    }

    // --------------------------------------
    // Excel có ghi parent nhưng workbook
    // không tìm thấy Triển lãm đủ chắc.
    //
    // KHÔNG tự gán.
    // --------------------------------------
    return {
      parentEventName: seminarItem.event.parentEventName,

      parentSheetName: null,

      confidence: "HIGH",

      matchScore: bestScore,

      needParentConfirm: true,

      reason:
        "Excel có ghi tên sự kiện cha nhưng chưa tìm thấy Triển lãm tương ứng đủ chắc chắn.",
    };
  }

  // ======================================
  // 2. EXCEL KHÔNG GHI PARENT
  //
  // Thử gợi ý từ tên sheet.
  // ======================================
  const possibleMatches = [];

  for (const item of exhibitions) {
    const scoreByEventName = calculateEventNameMatchScore(
      seminarItem.sheetName,
      item.event?.eventName,
    );

    const scoreBySheetName = calculateEventNameMatchScore(
      seminarItem.sheetName,
      item.sheetName,
    );

    const score = Math.max(scoreByEventName, scoreBySheetName);

    // Không lấy match quá yếu
    if (score >= 0.6) {
      possibleMatches.push({
        item,
        score,
      });
    }
  }

  possibleMatches.sort((a, b) => b.score - a.score);

  // Không tìm thấy
  if (possibleMatches.length === 0) {
    return {
      parentEventName: null,

      parentSheetName: null,

      confidence: "LOW",

      matchScore: 0,

      needParentConfirm: true,

      reason: "Chưa xác định được Triển lãm cha.",
    };
  }

  const best = possibleMatches[0];

  const second = possibleMatches[1];

  // ======================================
  // Nếu có 2 ứng viên gần bằng nhau
  // thì không đoán.
  // ======================================
  if (second && Math.abs(best.score - second.score) < 0.15) {
    return {
      parentEventName: null,

      parentSheetName: null,

      confidence: "LOW",

      matchScore: best.score,

      needParentConfirm: true,

      reason: "Có nhiều Triển lãm có thể là sự kiện cha.",
    };
  }

  // ======================================
  // Có một ứng viên nổi bật.
  //
  // Chỉ GỢI Ý.
  // Admin vẫn xác nhận.
  // ======================================
  return {
    parentEventName: best.item.event?.eventName || null,

    parentSheetName: best.item.sheetName || null,

    confidence: "MEDIUM",

    matchScore: best.score,

    needParentConfirm: true,

    reason:
      "Tên Hội thảo có dấu hiệu khớp với một Triển lãm. Cần Admin xác nhận.",
  };
}
function extractEventMetadata(rows, sheetName = "", importType = "UNKNOWN") {
  let eventName = null;
  let parentEventName = null;
  let schedule = null;
  let location = null;

  const maxRows = Math.min(rows.length, 35);

  for (let i = 0; i < maxRows; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    for (let j = 0; j < row.length; j++) {
      const raw = String(row[j] ?? "").trim();

      if (!raw) {
        continue;
      }

      const normalized = normalizeText(raw);
      // ===============================================
      // DẠNG ĐẶC BIỆT:
      //
      // Nội dung:
      // Hội thảo "Tiếng nói của dữ liệu thời AI"
      // Thuộc Sự kiện
      // "THE SUMMER DATA & AI CONFERENCE 2026"
      //
      // Đây là dữ liệu thật của một số sheet SIHUB.
      // ===============================================
      if (
        importType === "STARTUP_SEMINAR" &&
        normalized.includes("noi dung") &&
        normalized.includes("hoi thao")
      ) {
        // Lấy tất cả chuỗi nằm trong dấu ngoặc kép
        const quotedValues = [...raw.matchAll(/["“”]([^"“”]+)["“”]/g)].map(
          (match) => String(match[1] || "").trim(),
        );

        // Chuỗi đầu tiên:
        // tên Hội thảo
        if (!eventName && quotedValues.length >= 1) {
          eventName = quotedValues[0];
        }

        // Chuỗi thứ hai:
        // Sự kiện/Triển lãm cha
        if (!parentEventName && quotedValues.length >= 2) {
          parentEventName = quotedValues[1];
        }
      }
      // ===============================================
      // TÌM "THUỘC SỰ KIỆN / THUỘC TRIỂN LÃM"
      // ===============================================
      if (
        importType === "STARTUP_SEMINAR" &&
        (normalized.includes("thuoc su kien") ||
          normalized.includes("thuoc trien lam"))
      ) {
        const quotedValues = [...raw.matchAll(/["“”]([^"“”]+)["“”]/g)].map(
          (match) => String(match[1] || "").trim(),
        );

        if (quotedValues.length > 0) {
          parentEventName = quotedValues[quotedValues.length - 1];
        }
      }
      // ===================================
      // TÊN SỰ KIỆN / HỘI THẢO
      // ===================================
      if (
        normalized.includes("ten su kien") ||
        normalized.includes("ten hoi thao") ||
        normalized.includes("ten trien lam")
      ) {
        const colonIndex = raw.indexOf(":");

        if (colonIndex !== -1) {
          const value = raw.slice(colonIndex + 1).trim();

          if (value) {
            eventName = value;
          }
        }

        if (!eventName) {
          for (let k = j + 1; k < row.length; k++) {
            const next = String(row[k] ?? "").trim();

            if (next) {
              eventName = next;
              break;
            }
          }
        }
      }

      // ===================================
      // THỜI GIAN
      // ===================================
      if (!schedule && normalized.startsWith("thoi gian")) {
        schedule = stripLeadingMetadataLabel(raw, "thoi gian");
      }

      // ===================================
      // ĐỊA ĐIỂM
      // ===================================
      if (!location && normalized.startsWith("dia diem")) {
        location = stripLeadingMetadataLabel(raw, "dia diem");
      }
    }
  }
  // ======================================
  // FALLBACK TÊN SỰ KIỆN TỪ TÊN SHEET
  //
  // Chỉ dùng khi nội dung sheet không đọc được.
  // Không tự đoán từ event khác.
  // ======================================
  if (!eventName) {
    let fallbackName = String(sheetName || "")
      .replace(/^\s*\d+\s*[-._)]\s*/i, "")
      .trim();

    if (importType === "STARTUP_SEMINAR") {
      fallbackName = fallbackName.replace(/^HT\s+trong\s+TL\s*/i, "").trim();
    }

    if (importType === "STARTUP_EXHIBITION") {
      fallbackName = fallbackName.replace(/^TL\s*/i, "").trim();
    }

    if (fallbackName) {
      eventName = fallbackName;
    }
  }

  return {
    eventName,

    parentEventName,

    schedule,

    location,

    sourceSheetName: sheetName,
  };
}
module.exports = {
  extractEventParticipants,
  validateEventParticipant,
  analyzeEventParticipantDuplicates,
  findParentExhibition,
  extractEventMetadata,
};
