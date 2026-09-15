// =====================================================
// GOOGLE FORM AUTO MAPPER
// =====================================================

import { getModuleFieldConfig } from "../../../config/moduleFieldRegistry.js";
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

const EXHIBITION_RESULT_FIELDS = [
  ["exhibition_product_quantity", [
    "so san pham trung bay trien lam",
    "so luong san pham trung bay trien lam",
    "so san pham trung bay trien lam luu y ghi so luong",
  ]],
  ["sold_or_ordered_quantity", [
    "so luong san pham da ban duoc dat hang trong dot trien lam nay",
    "so luong san pham da ban da duoc dat hang trong dot trien lam nay",
  ]],
  ["visitor_count", [
    "so luong khach ghe tham gian hang",
    "so luong khach ghe tham gian hang vui long ghi ro luot vi du 50 luot",
  ]],
  ["b2b_matching_count", [
    "so luot b2b matching",
    "so luot b2b matching ket noi voi khach hang doi tac tiem nang",
  ]],
  ["public_sector_connection_count", [
    "so luot ket noi voi khu vuc cong",
    "so luot ket noi voi khu vuc cong benh vien phuong xa",
  ]],
  ["highlight_impression", [
    "diem dac biet an tuong cua don vi khi tham gia chuong trinh la gi",
    "diem dac biet an tuong cua don vi khi tham gia chuong trinh data ai 2026 la gi",
  ]],
  ["want_to_join_again", [
    "neu co su kien tuong tu don vi co muon tiep tuc tham gia khong",
    "neu co su kien tuong tu don vi cua minh co muon tiep tuc tham gia khong",
  ]],
];

function detectExhibitionResultField(header) {
  const text = normalizeHeader(header)
    .replace(/^[\d\s.)-]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return EXHIBITION_RESULT_FIELDS.find(([, aliases]) =>
    aliases.includes(text),
  )?.[0];
}

// =====================================================
// DETECT
// =====================================================

export function detectGoogleFormField(header, targetType = "") {
  const text = normalizeHeader(header);

  if (!text) {
    return "__EXTRA__";
  }

  const moduleCode = String(targetType).toUpperCase();
  if (moduleCode === "NETWORKING" && text === "linh vuc") {
    return "project_field";
  }
  if (moduleCode === "EXHIBITION") {
    const exhibitionResultField = detectExhibitionResultField(header);
    if (exhibitionResultField) return exhibitionResultField;
  }

  const registryFields = ["EXHIBITION", "NETWORKING"].includes(moduleCode)
    ? getModuleFieldConfig(moduleCode)?.importFields || []
    : [];
  const registryMatch = registryFields.find((field) =>
    (field.aliases || []).some((alias) => normalizeHeader(alias) === text),
  );
  if (registryMatch) return registryMatch.key;

  // ---------------------------------------------------
  // TIMESTAMP
  // ---------------------------------------------------

  if (
    text === "linh vuc" ||
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
    text === "giai doan" ||
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
    text === "cau hoi btc" ||
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

  if (includesAny(text, [
    "don vi cong tac",
    "doanh nghiep/don vi dang cong tac",
    "doanh nghiep don vi dang cong tac",
    "ten don vi cong tac",
    "ten doanh nghiep",
    "ten cong ty",
    "organization",
    "company name",
  ]) || text === "don vi") {
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
    includesAny(text, [
      "du an cua ban co nu la founder co founder",
      "du an cua ban co nu la founder, co-founder",
      "co nu la founder",
      "co nu founder co founder",
      "nu founder co founder",
      "nu sang lap",
    ])
  ) {
    return "female_founder";
  }

  if (
    includesAny(text, ["co du an", "da co du an", "ban co du an", "co y tuong"])
  ) {
    return "has_project";
  }

  if (includesAny(text, ["ten du an", "ten y tuong", "project name"])) {
    return "project_name";
  }

  if (
    includesAny(text, [
      "mo ta ngan ve y tuong du an",
      "mo ta ngan ve y tuong/du an",
      "mo ta ngan y tuong du an",
      "mo ta du an",
      "mo ta y tuong",
      "mo ta san pham dich vu",
    ])
  ) {
    return "project_description";
  }

  if (
    includesAny(text, [
      "co bao nhieu nhan su",
      "bao nhieu nhan su",
      "quy mo nhan su",
      "quy mo doi ngu",
      "so luong thanh vien",
    ])
  ) {
    return "team_size";
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
      "du an/y tuong cua ban thuoc linh vuc",
      "du an y tuong cua ban thuoc linh vuc",
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
      "startup/du an ban o giai doan",
      "du an ban o giai doan",
      "startup stage",
    ])
  ) {
    return moduleCode === "NETWORKING" ? "startup_stage" : "project_stage";
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
    return moduleCode === "NETWORKING"
      ? "program_selection_status"
      : "nq20_status";
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
