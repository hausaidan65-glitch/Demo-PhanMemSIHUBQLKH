const XLSX = require("xlsx");

const db = require("../config/db");
const ClassStatusService = require("./classStatusService");
const generateQrToken = require("../utils/generateQrToken");

const HEADER_ALIASES = {
  fullname: ["fullname", "ho va ten", "họ và tên", "ho ten", "họ tên"],
  phone: ["phone", "so dien thoai", "số điện thoại", "dien thoai"],
  email: ["email"],
  gender: ["gender", "gioi tinh", "giới tính"],
  age_group: ["age_group", "nhom tuoi", "nhóm tuổi"],
  company: ["company", "don vi", "đơn vị", "to chuc", "tổ chức"],
  position: ["position", "chuc vu", "chức vụ"],
  user_type: ["user_type", "nhom doi tuong", "nhóm đối tượng"],
  has_project: ["has_project", "co du an", "có dự án"],
  project_name: ["project_name", "ten du an", "tên dự án"],
  project_field: ["project_field", "linh vuc du an", "lĩnh vực dự án"],
  startup_stage: ["startup_stage", "giai doan startup", "giai đoạn startup"],
  project_description: ["project_description", "mo ta du an", "mô tả dự án"],
  female_founder: ["female_founder", "nu sang lap", "nữ sáng lập"],
  team_size: ["team_size", "quy mo nhom", "quy mô nhóm"],
  incubation_status: ["incubation_status", "tinh trang uom tao", "tình trạng ươm tạo"],
  program_selection_status: [
    "program_selection_status",
    "tinh trang tuyen chon",
    "tình trạng tuyển chọn",
  ],
  support_needs: ["support_needs", "nhu cau ho tro", "nhu cầu hỗ trợ"],
  organizer_question: ["organizer_question", "cau hoi ban to chuc", "câu hỏi ban tổ chức"],
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizePhone(value) {
  let phone = clean(value).replace(/\D/g, "");
  if (phone.startsWith("84") && phone.length === 11) phone = `0${phone.slice(2)}`;
  return phone;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0) return false;

  const normalized = clean(value).toLowerCase();
  if (["1", "true", "yes", "y", "co", "có", "x"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "khong", "không"].includes(normalized)) return false;
  return null;
}

function buildHeaderMap(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const map = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader);
    map[field] = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header));
  }

  return map;
}

function normalizeRow(values, headerMap, rowNumber) {
  const read = (field) => {
    const index = headerMap[field];
    return index >= 0 ? values[index] : "";
  };
  const hasProject = parseBoolean(read("has_project"));
  const femaleFounder = parseBoolean(read("female_founder"));

  return {
    rowNumber,
    fullname: clean(read("fullname")),
    phone: normalizePhone(read("phone")),
    email: normalizeEmail(read("email")),
    gender: clean(read("gender")),
    age_group: clean(read("age_group")),
    company: clean(read("company")),
    position: clean(read("position")),
    user_type: clean(read("user_type")),
    has_project: hasProject,
    project_name: hasProject ? clean(read("project_name")) : "",
    project_field: hasProject ? clean(read("project_field")) : "",
    startup_stage: hasProject ? clean(read("startup_stage")) : "",
    project_description: hasProject ? clean(read("project_description")) : "",
    female_founder: hasProject ? femaleFounder : null,
    team_size: hasProject ? clean(read("team_size")) : "",
    incubation_status: hasProject ? clean(read("incubation_status")) : "",
    program_selection_status: clean(read("program_selection_status")),
    support_needs: clean(read("support_needs")),
    organizer_question: clean(read("organizer_question")),
  };
}

function validateRow(row) {
  const errors = [];
  const required = [
    ["fullname", "Họ tên"],
    ["phone", "Số điện thoại"],
    ["email", "Email"],
    ["company", "Đơn vị"],
    ["position", "Chức vụ"],
    ["gender", "Giới tính"],
    ["age_group", "Nhóm tuổi"],
    ["user_type", "Nhóm đối tượng"],
    ["program_selection_status", "Tình trạng tuyển chọn"],
  ];

  for (const [field, label] of required) {
    if (!row[field]) errors.push(`${label} là bắt buộc.`);
  }
  if (row.has_project === null) errors.push("Có dự án phải là Có/Không.");
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push("Email không hợp lệ.");
  }
  if (row.phone && !/^0\d{9}$/.test(row.phone)) {
    errors.push("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
  }
  if (row.has_project && !row.project_field) errors.push("Lĩnh vực dự án là bắt buộc.");
  if (row.has_project && !row.startup_stage) errors.push("Giai đoạn startup là bắt buộc.");

  return errors;
}

function readRows(file) {
  const workbook = XLSX.read(file.buffer, { type: "buffer", raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

  if (matrix.length < 2) {
    const error = new Error("File Excel không có dữ liệu học viên.");
    error.status = 400;
    throw error;
  }

  const headerMap = buildHeaderMap(matrix[0]);
  const rows = matrix
    .slice(1)
    .map((values, index) => normalizeRow(values, headerMap, index + 2))
    .filter((row) => row.fullname || row.phone || row.email);

  if (rows.length === 0) {
    const error = new Error("File Excel không có dòng học viên hợp lệ để kiểm tra.");
    error.status = 400;
    throw error;
  }

  return rows;
}

async function loadOpening(connection, openingId, lock = false) {
  const [rows] = await connection.query(
    `
      SELECT
        cc.*,
        (
          SELECT MIN(TIMESTAMP(s.session_date, COALESCE(s.start_time, '00:00:00')))
          FROM course_class_sessions s
          WHERE s.class_id = cc.id
        ) AS first_session_at,
        (
          SELECT MAX(TIMESTAMP(s.session_date, COALESCE(s.end_time, s.start_time, '23:59:59')))
          FROM course_class_sessions s
          WHERE s.class_id = cc.id
        ) AS last_session_at
      FROM course_classes cc
      WHERE cc.id = ?
        AND cc.deleted_at IS NULL
      ${lock ? "FOR UPDATE" : ""}
    `,
    [openingId],
  );

  if (!rows[0]) {
    const error = new Error("Không tìm thấy Đợt tổ chức.");
    error.status = 404;
    throw error;
  }

  const opening = rows[0];
  opening.effective_status = ClassStatusService.resolveEffectiveStatus({
    status: opening.status === "FULL" ? "OPEN" : opening.status,
    currentStudents: opening.current_students,
    maxStudents: opening.max_students,
    registerClose: opening.register_close,
    organizationStartDate: opening.organization_start_date,
    organizationEndDate: opening.organization_end_date,
    firstSessionAt: opening.first_session_at,
    lastSessionAt: opening.last_session_at,
  });

  return opening;
}

async function findUsers(connection, row, lock = false) {
  const suffix = lock ? " FOR UPDATE" : "";
  const [phoneRows] = await connection.query(
    `SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', ''), '+84', '0') = ? LIMIT 1${suffix}`,
    [row.phone],
  );
  const [emailRows] = await connection.query(
    `SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1${suffix}`,
    [row.email],
  );

  return { byPhone: phoneRows[0] || null, byEmail: emailRows[0] || null };
}

function resolveUserMatch(matches) {
  const { byPhone, byEmail } = matches;
  if (byPhone && byEmail && Number(byPhone.id) === Number(byEmail.id)) {
    return { type: "EXISTING", user: byPhone };
  }
  if (byPhone && byEmail) {
    return { type: "CONFLICT", user: null };
  }
  if (byPhone) {
    return { type: "EXISTING_PHONE_MISMATCH", user: byPhone };
  }
  if (byEmail) {
    return { type: "NEEDS_REVIEW", user: byEmail };
  }
  return { type: "NEW", user: null };
}

async function isRegistered(connection, userId, openingId, lock = false) {
  const [rows] = await connection.query(
    `SELECT id, register_status FROM registrations WHERE user_id = ? AND class_id = ?${lock ? " FOR UPDATE" : ""}`,
    [userId, openingId],
  );
  return rows[0] || null;
}

function openingWarnings(opening, projectedStudents) {
  const warnings = [];
  if (["FULL", "CLOSED"].includes(opening.effective_status)) {
    warnings.push(`Đợt tổ chức đang ở trạng thái ${opening.effective_status}.`);
  }
  if (Number(opening.max_students) > 0 && projectedStudents > Number(opening.max_students)) {
    warnings.push(`Sĩ số dự kiến ${projectedStudents} vượt giới hạn ${opening.max_students}.`);
  }
  return warnings;
}

async function reviewRows(connection, openingId, rows, lock = false) {
  const results = [];
  const seenIdentities = new Set();
  const seenPhones = new Map();
  const seenEmails = new Map();

  for (const row of rows) {
    const errors = validateRow(row);
    const identityKey = `${row.phone}|${row.email}`;
    if (!errors.length && seenIdentities.has(identityKey)) {
      results.push({ ...row, status: "SKIPPED_DUPLICATE_BATCH", errors: [], warnings: ["Dòng trùng trong cùng file."] });
      continue;
    }

    if (
      !errors.length &&
      ((seenPhones.has(row.phone) && seenPhones.get(row.phone) !== row.email) ||
        (seenEmails.has(row.email) && seenEmails.get(row.email) !== row.phone))
    ) {
      results.push({ ...row, status: "CONFLICT", errors: ["Số điện thoại hoặc email bị dùng cho hồ sơ khác trong cùng file."], warnings: [] });
      continue;
    }

    seenIdentities.add(identityKey);
    seenPhones.set(row.phone, row.email);
    seenEmails.set(row.email, row.phone);

    if (errors.length) {
      results.push({ ...row, status: "ERROR", errors, warnings: [] });
      continue;
    }

    const match = resolveUserMatch(await findUsers(connection, row, lock));
    if (match.type === "CONFLICT") {
      results.push({ ...row, status: "CONFLICT", errors: ["Số điện thoại và email đang thuộc hai hồ sơ khác nhau."], warnings: [] });
      continue;
    }
    if (match.type === "NEEDS_REVIEW") {
      results.push({ ...row, status: "NEEDS_REVIEW", errors: ["Email đã tồn tại nhưng số điện thoại không khớp; cần review thủ công."], warnings: [] });
      continue;
    }
    if (
      (match.type === "EXISTING" || match.type === "EXISTING_PHONE_MISMATCH") &&
      (await isRegistered(connection, match.user.id, openingId, lock))
    ) {
      results.push({ ...row, status: "SKIPPED_DUPLICATE", errors: [], warnings: ["Học viên đã có registration tại Đợt tổ chức này."] });
      continue;
    }

    results.push({
      ...row,
      status:
        match.type === "EXISTING" || match.type === "EXISTING_PHONE_MISMATCH"
          ? "READY_EXISTING"
          : "READY_NEW",
      existingUserId: match.user?.id || null,
      errors: [],
      warnings:
        match.type === "EXISTING_PHONE_MISMATCH"
          ? ["Đã nhận diện học viên theo số điện thoại; email trong Excel khác email hồ sơ và sẽ không được cập nhật."]
          : [],
    });
  }

  return results;
}

function summarize(rows) {
  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "READY_NEW" || row.status === "READY_EXISTING").length,
    skipped: rows.filter((row) => row.status.startsWith("SKIPPED")).length,
    conflicts: rows.filter((row) => row.status === "CONFLICT").length,
    needsReview: rows.filter((row) => row.status === "NEEDS_REVIEW").length,
    errors: rows.filter((row) => row.status === "ERROR").length,
  };
}

async function createUser(connection, row) {
  const [result] = await connection.query(
    `INSERT INTO users (fullname, phone, email, gender, age_group, company, position, user_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.fullname, row.phone, row.email, row.gender, row.age_group, row.company, row.position, row.user_type],
  );
  return result.insertId;
}

async function createRegistration(connection, openingId, userId, row) {
  const qrToken = generateQrToken();
  const [result] = await connection.query(
    `INSERT INTO registrations (
      user_id, class_id, has_project, project_name, project_field, startup_stage,
      project_description, female_founder, team_size, incubation_status,
      program_selection_status, support_needs, organizer_question,
      register_status, qr_token, qr_generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, NOW())`,
    [
      userId, openingId, row.has_project ? 1 : 0, row.project_name || null,
      row.project_field || null, row.startup_stage || null,
      row.project_description || null, row.female_founder,
      row.team_size || null, row.incubation_status || null,
      row.program_selection_status || null, row.support_needs || null,
      row.organizer_question || null, qrToken,
    ],
  );
  return { registrationId: result.insertId, qrToken };
}

class OpeningStudentImportService {
  static async preview(openingId, file) {
    const rows = readRows(file);
    const connection = await db.getConnection();
    try {
      const opening = await loadOpening(connection, openingId);
      if (opening.effective_status === "FINISHED") {
        const error = new Error("Không thể import vào Đợt tổ chức đã FINISHED.");
        error.status = 409;
        throw error;
      }
      const reviewedRows = await reviewRows(connection, openingId, rows);
      const summary = summarize(reviewedRows);
      return {
        opening: { id: opening.id, class_name: opening.class_name, status: opening.effective_status, current_students: Number(opening.current_students) || 0, max_students: Number(opening.max_students) || 0 },
        warnings: openingWarnings(opening, Number(opening.current_students) + summary.ready),
        summary,
        rows: reviewedRows,
      };
    } finally {
      connection.release();
    }
  }

  static async confirm(openingId, submittedRows) {
    if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
      const error = new Error("Không có dữ liệu preview để confirm.");
      error.status = 400;
      throw error;
    }

    const rows = submittedRows.map((row, index) => ({ ...row, rowNumber: Number(row.rowNumber) || index + 2 }));
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const opening = await loadOpening(connection, openingId, true);
      if (opening.effective_status === "FINISHED") {
        const error = new Error("Không thể import vào Đợt tổ chức đã FINISHED.");
        error.status = 409;
        throw error;
      }

      const reviewedRows = await reviewRows(connection, openingId, rows, true);
      const results = [];
      let imported = 0;

      for (const row of reviewedRows) {
        if (row.status !== "READY_NEW" && row.status !== "READY_EXISTING") {
          results.push(row);
          continue;
        }
        const userId = row.status === "READY_EXISTING"
          ? row.existingUserId
          : await createUser(connection, row);
        const registration = await createRegistration(connection, openingId, userId, row);
        imported += 1;
        results.push({ ...row, status: "IMPORTED", userId, ...registration });
      }

      if (imported > 0) {
        await connection.query(
          `UPDATE course_classes
           SET current_students = current_students + ?,
               status = CASE
                 WHEN status = 'OPEN' AND max_students > 0 AND current_students + ? >= max_students THEN 'FULL'
                 ELSE status
               END
           WHERE id = ?`,
          [imported, imported, openingId],
        );
      }

      await connection.commit();
      const summary = summarize(results);
      summary.imported = imported;
      summary.ready = 0;
      const currentStudents = Number(opening.current_students) + imported;
      return {
        opening: { id: opening.id, current_students: currentStudents, max_students: Number(opening.max_students) || 0 },
        warnings: openingWarnings(opening, currentStudents),
        summary,
        rows: results,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = OpeningStudentImportService;
module.exports._test = { normalizeRow, validateRow, resolveUserMatch, summarize };
