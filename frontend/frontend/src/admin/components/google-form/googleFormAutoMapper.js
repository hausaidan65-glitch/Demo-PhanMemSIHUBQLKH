// =====================================================
// GOOGLE FORM AUTO MAPPER
// =====================================================
//
// Nhiệm vụ:
// - Nhận tên cột từ Google Form.
// - Tự đoán field tương ứng của SIHUB.
// - Không nhận diện được => __EXTRA__.
//
// QUAN TRỌNG:
// Không tự bỏ dữ liệu nghiệp vụ.
// Chỉ GoogleFormFieldMapping mới quyết định __IGNORE__
// đối với các cột kỹ thuật / cột trống.
// =====================================================

// =====================================================
// NORMALIZE
// =====================================================

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// MATCH HELPERS
// =====================================================

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

// =====================================================
// DETECT
// =====================================================

export function detectGoogleFormField(header) {
  const text = normalizeHeader(header);

  if (!text) {
    return "__EXTRA__";
  }

  // ---------------------------------------------------
  // TIMESTAMP
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "dau thoi gian",
      "timestamp",
      "thoi gian gui",
      "ngay gui",
    ])
  ) {
    return "timestamp";
  }

  // ---------------------------------------------------
  // FULLNAME
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "ho va ten",
      "ho ten",
      "ho & ten",
      "fullname",
      "full name",
    ])
  ) {
    return "fullname";
  }

  // ---------------------------------------------------
  // PHONE
  // ---------------------------------------------------

  if (
    includesAny(text, ["so dien thoai", "dien thoai", "sdt", "phone", "mobile"])
  ) {
    return "phone";
  }

  // ---------------------------------------------------
  // EMAIL
  // ---------------------------------------------------

  if (
    includesAny(text, ["email lien he", "dia chi email", "email", "e-mail"])
  ) {
    return "email";
  }

  // ---------------------------------------------------
  // POSITION
  // ---------------------------------------------------

  if (includesAny(text, ["chuc vu", "vi tri cong tac", "position"])) {
    return "position";
  }
  // ---------------------------------------------------
  // TRAINING COMMITMENT
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "cam ket tham gia",
      "tham gia day du 100%",
      "tham gia 100% khoa hoc",
      "chac chan tham gia 100%",
    ])
  ) {
    return "__EXTRA__";
  }
  // ---------------------------------------------------
  // ORGANIZATION
  //
  // Không dùng keyword quá rộng như:
  // - "doanh nghiep"
  // - "cong ty"
  // - "don vi"
  //
  // Vì Google Form có rất nhiều câu hỏi chứa các từ này.
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "don vi cong tac",
      "ten don vi cong tac",
      "ten doanh nghiep",
      "ten cong ty",
      "organization",
      "company name",
    ])
  ) {
    return "organization";
  }

  // ---------------------------------------------------
  // GENDER
  // ---------------------------------------------------

  if (includesAny(text, ["gioi tinh", "gender"])) {
    return "gender";
  }

  // ---------------------------------------------------
  // AGE GROUP
  // ---------------------------------------------------

  if (includesAny(text, ["nhom tuoi", "do tuoi", "age group"])) {
    return "age_group";
  }

  // ---------------------------------------------------
  // PARTICIPANT GROUP / ROLE
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "nhom doi tuong",
      "doi tuong tham gia",
      "doi tuong",
      "participant group",
    ])
  ) {
    return "participant_group";
  }

  // ---------------------------------------------------
  // HAS PROJECT
  // ---------------------------------------------------

  if (
    includesAny(text, ["co du an", "da co du an", "ban co du an", "co y tuong"])
  ) {
    return "has_project";
  }

  // ---------------------------------------------------
  // PROJECT FIELD
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "du an thuoc linh vuc nao",
      "linh vuc du an",
      "linh vuc y tuong",
      "du an/ y tuong thuoc linh vuc",
      "du an/y tuong thuoc linh vuc",
      "project field",
    ])
  ) {
    return "project_field";
  }

  // ---------------------------------------------------
  // STARTUP STAGE
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "giai doan startup",
      "giai doan du an",
      "giai doan khoi nghiep",
      "startup stage",
    ])
  ) {
    return "startup_stage";
  }

  // ---------------------------------------------------
  // PROGRAM SELECTION STATUS
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "nghi quyet 20",
      "nq20",
      "tuyen chon chuong trinh",
      "trang thai tuyen chon",
    ])
  ) {
    return "program_selection_status";
  }

  // ---------------------------------------------------
  // SUPPORT NEEDS
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "nhu cau ho tro",
      "mong muon ho tro",
      "can ho tro",
      "support needs",
    ])
  ) {
    return "support_needs";
  }

  // ---------------------------------------------------
  // ORGANIZER QUESTION
  // ---------------------------------------------------

  if (
    includesAny(text, [
      "cau hoi danh cho btc",
      "cau hoi cho btc",
      "cau hoi danh cho ban to chuc",
      "cau hoi cho ban to chuc",
    ])
  ) {
    return "organizer_question";
  }

  // ===================================================
  // KHÔNG NHẬN DIỆN
  //
  // Không được IGNORE.
  // Giữ nguyên làm dữ liệu bổ sung.
  // ===================================================

  return "__EXTRA__";
}
