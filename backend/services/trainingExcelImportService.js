const {
  normalizeText,
  getRowText,
  findRowIndex,
  normalizeExcelPhone,
} = require("./excelImportHelpers");

// =====================================================
// NHẬN DIỆN TRAINING
// =====================================================
function isTrainingSheet(rows, sheetName = "") {
  const normalizedSheetName = normalizeText(sheetName);

  const metadataText = normalizeText(
    rows
      .slice(0, 30)
      .map((row) => (Array.isArray(row) ? row.join(" ") : ""))
      .join(" "),
  );

  const hasTrainingSheetName =
    normalizedSheetName.includes("khoa hoc") ||
    normalizedSheetName.includes("khoa huan luyen");

  const hasTrainingContent =
    metadataText.includes("ten khoa hoc") ||
    metadataText.includes("ten lop hoc") ||
    metadataText.includes("ten khoa dao tao") ||
    metadataText.includes("danh sach hoc vien") ||
    metadataText.includes("danh sach tham du khoa huan luyen") ||
    metadataText.includes("danh sach tham du lop") ||
    metadataText.includes("danh sach hoc vien tham du");

  // =====================================================
  // FILE TRAINING CŨ CỦA SIHUB
  //
  // Có những sheet chỉ có:
  //
  // DANH SÁCH THAM DỰ
  // Thuộc Chương trình...
  // Thời gian...
  // Địa điểm...
  // STT | Họ và tên | ...
  //
  // Không có dòng tên lớp.
  // Vẫn phải nhận là TRAINING.
  // =====================================================
  const hasGenericParticipantList = metadataText.includes("danh sach tham du");

  const hasTrainingProgram = metadataText.includes("thuoc chuong trinh");

  const hasStudentHeader =
    metadataText.includes("ho va ten") &&
    (metadataText.includes("so dien thoai") ||
      metadataText.includes("email") ||
      metadataText.includes("don vi cong tac"));

  return (
    hasTrainingSheetName ||
    hasTrainingContent ||
    (hasGenericParticipantList && hasTrainingProgram && hasStudentHeader)
  );
}

// =====================================================
// LẤY TÊN LỚP / KHÓA ĐÀO TẠO
//
// Ví dụ dữ liệu thật:
//
// DANH SÁCH THAM DỰ
// LỚP KỸ NĂNG THUYẾT TRÌNH CHUYÊN NGHIỆP
// Thuộc Chương trình...
//
// Hoặc:
//
// Tên khóa học: ...
// Tên lớp học: ...
//
// Không suy đoán từ tên sheet.
// =====================================================
function extractClassName(rows) {
  if (!Array.isArray(rows)) {
    return null;
  }

  // =====================================================
  // CÁCH 1:
  // Tìm label rõ ràng:
  //
  // Tên khóa học
  // Tên lớp học
  // Tên khóa đào tạo
  // =====================================================
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    for (let j = 0; j < row.length; j++) {
      const rawValue = String(row[j] ?? "").trim();

      if (!rawValue) {
        continue;
      }

      const normalizedValue = normalizeText(rawValue);

      const isNameLabel =
        normalizedValue.includes("ten khoa hoc") ||
        normalizedValue.includes("ten lop hoc") ||
        normalizedValue.includes("ten khoa dao tao");

      if (!isNameLabel) {
        continue;
      }

      // -----------------------------------
      // Dạng:
      // Tên khóa học: ABC
      // -----------------------------------
      const colonIndex = rawValue.indexOf(":");

      if (colonIndex !== -1) {
        const value = rawValue.slice(colonIndex + 1).trim();

        if (value) {
          return value;
        }
      }

      // -----------------------------------
      // Dạng:
      // A1 = Tên khóa học
      // B1 = ABC
      // -----------------------------------
      for (let nextIndex = j + 1; nextIndex < row.length; nextIndex++) {
        const nextValue = String(row[nextIndex] ?? "").trim();

        if (nextValue) {
          return nextValue;
        }
      }

      // -----------------------------------
      // Tên nằm dòng kế tiếp
      // -----------------------------------
      const nextRow = Array.isArray(rows[i + 1]) ? rows[i + 1] : [];

      for (const nextCell of nextRow) {
        const nextValue = String(nextCell ?? "").trim();

        if (nextValue) {
          return nextValue;
        }
      }
    }
  }

  // =====================================================
  // CÁCH 2:
  // DỮ LIỆU THỰC TẾ SIHUB
  //
  // DANH SÁCH THAM DỰ
  // LỚP KỸ NĂNG THUYẾT TRÌNH CHUYÊN NGHIỆP
  // Thuộc Chương trình...
  // =====================================================
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const currentRow = Array.isArray(rows[i]) ? rows[i] : [];

    const currentText = currentRow
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    const normalizedCurrent = normalizeText(currentText);

    const isParticipantTitle =
      normalizedCurrent.includes("danh sach tham du") ||
      normalizedCurrent.includes("danh sach hoc vien") ||
      normalizedCurrent.includes("danh sach tham gia");

    if (!isParticipantTitle) {
      continue;
    }

    // ===================================================
    // Sau "DANH SÁCH THAM DỰ"
    // dò tối đa 5 dòng tiếp theo.
    // ===================================================
    for (let offset = 1; offset <= 5; offset++) {
      const candidateRow = Array.isArray(rows[i + offset])
        ? rows[i + offset]
        : [];

      if (candidateRow.length === 0) {
        continue;
      }

      const candidateValues = candidateRow
        .map((cell) => String(cell ?? "").trim())
        .filter(Boolean);

      if (candidateValues.length === 0) {
        continue;
      }

      // Có merged cell thì thường chỉ
      // cell đầu chứa nguyên tên lớp.
      const candidateText = candidateValues.join(" ").trim();

      const normalized = normalizeText(candidateText);

      // -----------------------------------
      // Dừng khi đã xuống metadata
      // -----------------------------------
      if (
        normalized.includes("thuoc chuong trinh") ||
        normalized.startsWith("thoi gian") ||
        normalized.startsWith("dia diem")
      ) {
        break;
      }

      // -----------------------------------
      // Bỏ header bảng học viên
      // -----------------------------------
      if (
        normalized.includes("so dien thoai") ||
        normalized.includes("email") ||
        normalized.includes("ho va ten") ||
        normalized === "stt"
      ) {
        continue;
      }

      // =================================================
      // Tên lớp thật.
      //
      // Ví dụ:
      // LỚP KỸ NĂNG THUYẾT TRÌNH CHUYÊN NGHIỆP
      // =================================================
      if (normalized.startsWith("lop ") || normalized.includes(" lop ")) {
        return candidateText;
      }
    }
  }

  // =====================================================
  // CÁCH 3:
  // FALLBACK CUỐI CÙNG.
  //
  // Chỉ tìm tên lớp TRƯỚC header học viên.
  // Không quét bừa toàn bộ 25 dòng.
  // Không lấy dữ liệu rác còn sót phía dưới.
  // =====================================================
  const studentHeaderIndex = findStudentHeader(rows);

  const searchEnd =
    studentHeaderIndex !== -1 ? studentHeaderIndex : Math.min(rows.length, 20);

  for (let i = 0; i < searchEnd; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    const values = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);

    if (values.length === 0) {
      continue;
    }

    const text = values.join(" ").trim();

    const normalized = normalizeText(text);

    // Bỏ các dòng metadata
    if (
      normalized.includes("thuoc chuong trinh") ||
      normalized.startsWith("thoi gian") ||
      normalized.startsWith("dia diem") ||
      normalized.includes("danh sach")
    ) {
      continue;
    }

    if (normalized.startsWith("lop ")) {
      return text;
    }
  }

  return null;
}
// =====================================================
// CHƯƠNG TRÌNH / KHÓA ĐÀO TẠO
// =====================================================
function extractProgramName(rows) {
  const index = findRowIndex(rows, "thuoc chuong trinh");

  if (index === -1) {
    return null;
  }

  return getRowText(rows[index])
    .replace(/thuoc chuong trinh/gi, "")
    .replace(/:/g, "")
    .trim();
}

function extractSchedule(rows) {
  const index = findRowIndex(rows, "thoi gian");

  if (index === -1) {
    return null;
  }

  return getRowText(rows[index])
    .replace(/thoi gian/gi, "")
    .replace(":", "")
    .trim();
}

function extractLocation(rows) {
  const index = findRowIndex(rows, "dia diem");

  if (index === -1) {
    return null;
  }

  return getRowText(rows[index])
    .replace(/dia diem/gi, "")
    .replace(":", "")
    .trim();
}
function findStudentHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    const headers = row.map((cell) => normalizeText(cell));

    const hasName = headers.some(
      (header) =>
        header === "ho" ||
        header === "ten" ||
        header === "ho ten" ||
        header === "ho va ten" ||
        header.includes("ho ten") ||
        header.includes("ho va ten"),
    );

    const hasStudentInfo = headers.some(
      (header) =>
        header.includes("email") ||
        header.includes("dien thoai") ||
        header === "sdt" ||
        header === "so dt" ||
        header.includes("don vi") ||
        header.includes("cong ty"),
    );

    if (hasName && hasStudentInfo) {
      return i;
    }
  }

  return -1;
}
function extractStudents(rows) {
  const headerIndex = findStudentHeader(rows);

  if (headerIndex === -1) {
    return [];
  }

  const headers = rows[headerIndex].map((header) => normalizeText(header));

  const students = [];

  const hoIndex = headers.findIndex((h) => h === "ho");

  const tenIndex = headers.findIndex((h) => h === "ten");

  const fullNameIndex = headers.findIndex(
    (h) => h === "ho ten" || h === "ho va ten",
  );

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];

    const student = {};

    // =====================================
    // HỌ TÊN
    // =====================================
    if (fullNameIndex !== -1) {
      student.fullname = String(row[fullNameIndex] ?? "").trim();
    } else if (hoIndex !== -1 && tenIndex !== -1) {
      const ho = String(row[hoIndex] ?? "").trim();

      const ten = String(row[tenIndex] ?? "").trim();

      student.fullname = `${ho} ${ten}`.trim();
    } else if (tenIndex !== -1) {
      student.fullname = String(row[tenIndex] ?? "").trim();
    }

    // =====================================
    // FIELD KHÁC
    // =====================================
    row.forEach((value, index) => {
      const key = headers[index] || "";

      const text =
        value === undefined || value === null ? "" : String(value).trim();

      if (key === "email" || key.includes("email")) {
        student.email = text;
      }

      if (
        key === "sdt" ||
        key === "so dt" ||
        key === "phone" ||
        key.includes("dien thoai") ||
        key.includes("so dien thoai")
      ) {
        student.phone = normalizeExcelPhone(value);
      }

      // =====================================
      // ĐƠN VỊ / CÔNG TY
      // =====================================
      if (
        key === "don vi" ||
        key === "don vi cong tac" ||
        key === "to chuc" ||
        key === "cong ty" ||
        key === "ten cong ty" ||
        key === "co quan" ||
        key.includes("don vi") ||
        key.includes("cong ty") ||
        key.includes("co quan")
      ) {
        student.organization = text;
      }

      // =====================================
      // CHỨC VỤ / VỊ TRÍ
      // =====================================
      if (
        key === "chuc vu" ||
        key === "vi tri" ||
        key === "position" ||
        key.includes("chuc vu") ||
        key.includes("vi tri")
      ) {
        student.position = text;
      }
    });
    // =====================================================
    // SỬA TRƯỜNG HỢP FILE EXCEL ĐẢO
    // "ĐƠN VỊ" và "CHỨC VỤ"
    //
    // Chỉ hoán đổi khi tín hiệu rất rõ.
    // =====================================================
    const positionText = String(student.position || "").trim();

    const organizationText = String(student.organization || "").trim();

    const normalizedPosition = normalizeText(positionText);

    const normalizedOrganization = normalizeText(organizationText);

    const looksLikeOrganization =
      normalizedPosition.includes("cong ty") ||
      normalizedPosition.includes("cty") ||
      normalizedPosition.includes("trung tam") ||
      normalizedPosition.includes("truong") ||
      normalizedPosition.includes("vien ") ||
      normalizedPosition.includes("hoc vien") ||
      normalizedPosition.includes("dai hoc");

    const looksLikePosition =
      normalizedOrganization.includes("giam doc") ||
      normalizedOrganization.includes("nhan vien") ||
      normalizedOrganization.includes("truong phong") ||
      normalizedOrganization.includes("pho giam doc") ||
      normalizedOrganization.includes("quan ly") ||
      normalizedOrganization.includes("chuyen vien") ||
      normalizedOrganization.includes("founder") ||
      normalizedOrganization.includes("ceo");

    if (looksLikeOrganization && looksLikePosition) {
      student.position = organizationText;

      student.organization = positionText;
    }
    const fullname = String(student.fullname || "").trim();

    if (!fullname) {
      continue;
    }

    const normalizedFullname = normalizeText(fullname);

    if (
      normalizedFullname === "ten" ||
      normalizedFullname === "ho" ||
      normalizedFullname === "ho ten" ||
      normalizedFullname === "ho va ten"
    ) {
      continue;
    }

    students.push(student);
  }

  return students;
}
function parseTrainingSheet({ rows, sheetName, previousClassData = null }) {
  if (!isTrainingSheet(rows, sheetName)) {
    return null;
  }

  let classData = {
    className: extractClassName(rows, sheetName),

    programName: extractProgramName(rows),

    schedule: extractSchedule(rows),

    location: extractLocation(rows),
  };

  const students = extractStudents(rows);

  // Chỉ kế thừa metadata phụ.
  // KHÔNG kế thừa className.
  if (previousClassData && students.length > 0) {
    classData = {
      className: classData.className || null,

      programName: classData.programName || previousClassData.programName,

      schedule: classData.schedule || previousClassData.schedule,

      location: classData.location || previousClassData.location,
    };
  }

  return {
    importType: "TRAINING",

    importTypeLabel: "Khóa đào tạo",

    needTypeConfirm: false,

    confidence: "MEDIUM",

    detectionReason: "Phát hiện dữ liệu Khóa đào tạo/Lớp học.",

    class: classData,

    event: null,

    students,

    totalStudents: students.length,

    totalParticipants: 0,

    participantAnalysis: null,

    participantValidation: null,
  };
}

module.exports = {
  isTrainingSheet,
  parseTrainingSheet,
  extractStudents,
  extractClassName,
};
