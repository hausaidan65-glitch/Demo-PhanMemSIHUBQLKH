const db = require("../../config/db");

// =====================================================
// BASIC NORMALIZE
// =====================================================

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function normalizePhone(value) {
  const raw = cleanText(value);

  if (!raw) {
    return "";
  }

  const possiblePhones = raw.match(/0\d[\d\s.-]{7,}/g);

  if (possiblePhones && possiblePhones.length > 0) {
    return possiblePhones[0].replace(/\D/g, "");
  }

  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("84") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }

  return digits;
}

// =====================================================
// HELPER IN(...)
// =====================================================

function buildPlaceholders(values = []) {
  return values.map(() => "?").join(",");
}

// =====================================================
// LOAD USERS BATCH
// =====================================================

async function loadUsersByIdentities(connection, rows = []) {
  const emails = [
    ...new Set(
      rows.map((row) => normalizeEmail(row?.data?.email)).filter(Boolean),
    ),
  ];

  const phones = [
    ...new Set(
      rows.map((row) => normalizePhone(row?.data?.phone)).filter(Boolean),
    ),
  ];

  if (emails.length === 0 && phones.length === 0) {
    return [];
  }

  const conditions = [];

  const params = [];

  if (emails.length > 0) {
    conditions.push(`LOWER(TRIM(email)) IN (${buildPlaceholders(emails)})`);

    params.push(...emails);
  }

  if (phones.length > 0) {
    conditions.push(
      `REPLACE(REPLACE(REPLACE(REPLACE(
        phone,
        ' ',
        ''
      ), '.', ''), '-', ''), '+', '')
      IN (${buildPlaceholders(phones)})`,
    );

    params.push(...phones);
  }

  const [users] = await connection.query(
    `
      SELECT
        id,
        fullname,
        email,
        phone,
        gender,
        age_group,
        company,
        position,
        user_type
      FROM users
      WHERE ${conditions.join(" OR ")}
    `,
    params,
  );

  return users;
}

// =====================================================
// LOAD REGISTRATIONS BATCH
//
// registrations.class_id
//     → course_classes.id
// =====================================================

async function loadExistingRegistrations(connection, openingId, userIds = []) {
  if (!openingId || userIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const [rows] = await connection.query(
    `
      SELECT
        id,
        user_id,
        class_id,
        register_status
      FROM registrations
      WHERE class_id = ?
        AND user_id IN (
          ${buildPlaceholders(uniqueIds)}
        )
    `,
    [openingId, ...uniqueIds],
  );

  return rows;
}

async function loadNamesRegisteredAtTarget(connection, openingId) {
  const [rows] = await connection.query(
    `SELECT u.id, u.fullname, u.email, u.phone
       FROM registrations r
       INNER JOIN users u ON u.id = r.user_id
      WHERE r.class_id = ?`,
    [openingId],
  );
  return new Map(rows.map((user) => [normalizeText(user.fullname), user]));
}

async function loadEventParticipants(connection, eventId, userIds = []) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  if (!eventId || !uniqueIds.length) return [];
  const [rows] = await connection.query(
    `SELECT id, user_id FROM startup_connection_participants
      WHERE event_id = ? AND user_id IN (${buildPlaceholders(uniqueIds)})`,
    [eventId, ...uniqueIds],
  );
  return rows;
}

async function loadNamesAtEvent(connection, eventId) {
  const [rows] = await connection.query(
    `SELECT u.id, u.fullname, u.email, u.phone
       FROM startup_connection_participants p
       INNER JOIN users u ON u.id = p.user_id
      WHERE p.event_id = ?`,
    [eventId],
  );
  return new Map(rows.map((user) => [normalizeText(user.fullname), user]));
}

async function loadNetworkingParticipants(connection, eventId, userIds = []) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  if (!eventId || !uniqueIds.length) return [];
  const [rows] = await connection.query(
    `SELECT id, user_id FROM networking_event_participants
      WHERE event_id = ? AND user_id IN (${buildPlaceholders(uniqueIds)})`,
    [eventId, ...uniqueIds],
  );
  return rows;
}

async function loadNamesAtNetworkingEvent(connection, eventId) {
  const [rows] = await connection.query(
    `SELECT u.id, u.fullname, u.email, u.phone
       FROM networking_event_participants p
       INNER JOIN users u ON u.id = p.user_id
      WHERE p.event_id = ?`,
    [eventId],
  );
  return new Map(rows.map((user) => [normalizeText(user.fullname), user]));
}

async function validateExhibitionTarget(connection, target) {
  const eventId = Number(target?.eventId);
  if (!eventId) {
    const error = new Error("Thiếu Triển lãm nhận dữ liệu.");
    error.status = 400;
    throw error;
  }
  const [rows] = await connection.query(
    `SELECT id, event_name, event_type, year, location
       FROM startup_connection_events
      WHERE id = ? AND event_type = 'EXHIBITION' LIMIT 1`,
    [eventId],
  );
  if (!rows[0]) {
    const error = new Error("Target không tồn tại hoặc không phải Triển lãm.");
    error.status = 422;
    throw error;
  }
  return rows[0];
}

function validateExhibitionMetadata(target, dbTarget) {
  const metadata = target?.metadata || {};
  if (metadata.year != null && dbTarget.year != null
    && Number(dbTarget.year) !== Number(metadata.year)) {
    const error = new Error("Năm trong file không khớp Triển lãm đã chọn.");
    error.status = 422;
    throw error;
  }
}

const EXHIBITION_SURVEY_NUMERIC_FIELDS = Object.freeze([
  "exhibition_product_quantity",
  "sold_or_ordered_quantity",
  "visitor_count",
  "b2b_matching_count",
  "public_sector_connection_count",
  "mou_count",
  "exhibition_revenue",
]);

function normalizeExhibitionSurveyNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function normalizeExhibitionSurveyNumericData(data = {}) {
  const normalized = { ...data };
  EXHIBITION_SURVEY_NUMERIC_FIELDS.forEach((field) => {
    normalized[field] = normalizeExhibitionSurveyNumber(data[field]);
  });
  return normalized;
}

function normalizeExhibitionRequiredText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function sanitizeExhibitionSurveyData(data = {}) {
  return {
    ...normalizeExhibitionSurveyNumericData(data),
    fullname: normalizeExhibitionRequiredText(data.fullname),
    position: normalizeExhibitionRequiredText(data.position),
    organization: normalizeExhibitionRequiredText(data.organization),
    phone: normalizeExhibitionRequiredText(data.phone),
    email: normalizeExhibitionRequiredText(data.email),
    project_field: normalizeExhibitionRequiredText(data.project_field, "Không có dữ liệu"),
    exhibition_product_name: normalizeExhibitionRequiredText(
      data.exhibition_product_name,
      "Không có dữ liệu",
    ),
    highlight_impression: normalizeExhibitionRequiredText(
      data.highlight_impression,
      "Không có dữ liệu",
    ),
    want_to_join_again: normalizeExhibitionRequiredText(
      data.want_to_join_again,
      "Không có dữ liệu",
    ),
  };
}

function getExhibitionSurveyRequiredErrors(data = {}) {
  const errors = [];
  if (!String(data.fullname ?? "").trim()) errors.push("Thiếu Họ và tên.");
  return errors;
}

async function validateNetworkingTarget(connection, target) {
  const eventId = Number(target?.eventId);
  if (!eventId) {
    const error = new Error("Thiếu Sự kiện kết nối nhận dữ liệu.");
    error.status = 400;
    throw error;
  }
  const [rows] = await connection.query(
    `SELECT id, event_name, year, location, start_datetime, end_datetime
       FROM networking_events WHERE id = ? LIMIT 1`,
    [eventId],
  );
  if (!rows[0]) {
    const error = new Error("Sự kiện kết nối không tồn tại.");
    error.status = 422;
    throw error;
  }
  return rows[0];
}

function validateNetworkingMetadata(target, dbTarget) {
  const metadata = target?.metadata || {};
  if (!metadata.networkingEventName || !Number.isInteger(Number(metadata.year))) {
    const error = new Error("Metadata Sự kiện kết nối cần Admin xác nhận tên và năm.");
    error.status = 422;
    error.code = "NEEDS_ADMIN_CONFIRMATION";
    throw error;
  }
  if (normalizeText(dbTarget.event_name) !== normalizeText(metadata.networkingEventName)) {
    const error = new Error("Tên trong file không khớp Sự kiện kết nối đã chọn.");
    error.status = 422;
    throw error;
  }
  if (dbTarget.year != null && Number(dbTarget.year) !== Number(metadata.year)) {
    const error = new Error("Năm trong file không khớp Sự kiện kết nối đã chọn.");
    error.status = 422;
    throw error;
  }
}

function validateRequiredMetadata(target, dbTarget) {
  const metadata = target?.metadata || {};
  const year = Number(metadata.year);
  if (!Number.isInteger(year)) {
    const error = new Error("File cần Admin xác nhận Năm tổ chức.");
    error.status = 422;
    error.code = "NEEDS_ADMIN_CONFIRMATION";
    throw error;
  }
  if (dbTarget.year != null && Number(dbTarget.year) !== year) {
    const error = new Error(`Năm ${year} không khớp năm ${dbTarget.year} của Nhiệm vụ đào tạo đã chọn.`);
    error.status = 422;
    error.code = "TRAINING_PROGRAM_YEAR_MISMATCH";
    throw error;
  }
}

// =====================================================
// VALIDATE TARGET TRAINING
// =====================================================

async function validateTrainingTarget(connection, target) {
  const trainingCourseId = Number(target?.trainingCourseId);

  const courseId = Number(target?.courseId);

  const openingId = Number(target?.openingId);

  if (!trainingCourseId || !courseId || !openingId) {
    const error = new Error("Thiếu Khóa đào tạo, Lớp học hoặc Đợt tổ chức.");

    error.status = 400;

    throw error;
  }

  const [rows] = await connection.query(
    `
      SELECT
        cc.id AS opening_id,
        cc.course_id,

        c.id AS course_id,
        c.program_id,

        tp.id AS training_course_id,
        tp.year

      FROM course_classes cc

      INNER JOIN courses c
        ON c.id = cc.course_id

      INNER JOIN training_programs tp
        ON tp.id = c.program_id

      WHERE cc.id = ?
        AND c.id = ?
        AND tp.id = ?
        AND cc.deleted_at IS NULL

      LIMIT 1
    `,
    [openingId, courseId, trainingCourseId],
  );

  if (!rows[0]) {
    const error = new Error(
      "Khóa đào tạo, Lớp học và Đợt tổ chức không khớp nhau.",
    );

    error.status = 422;

    throw error;
  }

  return rows[0];
}

// =====================================================
// INDEX USERS
// =====================================================

function buildUserIndexes(users = []) {
  const byEmail = new Map();

  const byPhone = new Map();

  users.forEach((user) => {
    const email = normalizeEmail(user.email);

    const phone = normalizePhone(user.phone);

    if (email) {
      byEmail.set(email, user);
    }

    if (phone) {
      byPhone.set(phone, user);
    }
  });

  return {
    byEmail,
    byPhone,
  };
}

// =====================================================
// VALIDATE ONE ROW
// =====================================================

function validateOneTrainingRow({ row, byEmail, byPhone, byNameAtTarget, registeredUserIds }) {
  const data = row?.data || {};

  const fullname = cleanText(data.fullname);

  const email = normalizeEmail(data.email);

  const phone = normalizePhone(data.phone);

  const normalizedName = normalizeText(fullname);

  const userByEmail = email ? byEmail.get(email) || null : null;

  const userByPhone = phone ? byPhone.get(phone) || null : null;

  if (!email && !phone && normalizedName && byNameAtTarget.has(normalizedName)) {
    return {
      ...row,
      dbStatus: "ALREADY_REGISTERED",
      dbMessage: "Học viên cùng họ tên đã có trong Khóa đào tạo này.",
      existingUser: byNameAtTarget.get(normalizedName),
    };
  }

  // ===================================================
  // 1. EMAIL + PHONE THUỘC 2 USER KHÁC NHAU
  // ===================================================

  if (
    userByEmail &&
    userByPhone &&
    Number(userByEmail.id) !== Number(userByPhone.id)
  ) {
    return {
      ...row,

      dbStatus: "CONFLICT",

      conflictCode: "STUDENT_IDENTITY_CONFLICT",

      dbMessage: "Email và số điện thoại đang thuộc hai hồ sơ khác nhau.",

      existing: {
        emailUser: userByEmail,
        phoneUser: userByPhone,
      },
    };
  }

  // ===================================================
  // 2. PHONE CÓ USER NHƯNG EMAIL KHÁC
  //
  // Giữ cùng rule import cũ.
  // ===================================================

  if (
    !userByEmail &&
    userByPhone &&
    email &&
    userByPhone.email &&
    normalizeEmail(userByPhone.email) !== email
  ) {
    return {
      ...row,

      dbStatus: "CONFLICT",

      conflictCode: "STUDENT_PHONE_CONFLICT",

      dbMessage:
        "Số điện thoại đã thuộc một hồ sơ khác nhưng email không khớp.",

      existing: {
        user: userByPhone,
      },
    };
  }

  // ===================================================
  // 3. EMAIL + PHONE CÙNG USER NHƯNG NAME KHÁC
  // ===================================================

  if (
    userByEmail &&
    userByPhone &&
    Number(userByEmail.id) === Number(userByPhone.id) &&
    normalizedName &&
    userByEmail.fullname &&
    normalizeText(userByEmail.fullname) !== normalizedName
  ) {
    return {
      ...row,

      dbStatus: "CONFLICT",

      conflictCode: "STUDENT_NAME_CONFLICT",

      dbMessage: "Email và số điện thoại đã tồn tại nhưng họ tên không khớp.",

      existing: {
        user: userByEmail,
      },
    };
  }

  // ===================================================
  // 4. EXISTING USER
  // ===================================================

  const existedUser = userByEmail || userByPhone;

  if (existedUser) {
    const alreadyRegistered = registeredUserIds.has(Number(existedUser.id));

    if (alreadyRegistered) {
      return {
        ...row,

        dbStatus: "ALREADY_REGISTERED",

        dbMessage: "Học viên đã đăng ký Đợt tổ chức này.",

        existingUser: existedUser,
      };
    }

    return {
      ...row,

      dbStatus: "EXISTING",

      dbMessage: "Đã có hồ sơ SIHUB, có thể thêm đăng ký vào Đợt tổ chức.",

      existingUser: existedUser,
    };
  }

  // ===================================================
  // 5. NEW USER
  //
  // Google Form permits a fullname-only participant. Commit uses a stable,
  // target-scoped technical key so it never merges people globally by name.
  // ===================================================

  return {
    ...row,

    dbStatus: "NEW",

    dbMessage: "Học viên mới, sẵn sàng tạo hồ sơ và đăng ký.",
  };
}

// =====================================================
// MAIN
// =====================================================

async function validateGoogleFormBatch({ target, rows = [] }) {
  if (!target?.type) {
    const error = new Error("Thiếu loại dữ liệu cần import.");

    error.status = 400;

    throw error;
  }

  /*
   * Phase hiện tại chỉ nối TRAINING trước.
   * Seminar / Networking sẽ dùng adapter riêng sau.
   */
  const targetType = String(target.type).toUpperCase();
  if (!["TRAINING", "EXHIBITION", "NETWORKING"].includes(targetType)) {
    const error = new Error("Batch Validate chưa hỗ trợ loại target này.");

    error.status = 400;

    throw error;
  }

  const importableRows = Array.isArray(rows)
    ? rows.filter((row) => row?.status === "READY" || row?.status === "WARNING")
    : [];

  if (importableRows.length === 0) {
    const error = new Error("Không có dòng hợp lệ để kiểm tra Database.");

    error.status = 400;

    throw error;
  }

  const connection = await db.getConnection();

  try {
    // ===================================================
    // 1. CHECK TARGET
    // ===================================================

    const dbTarget = targetType === "EXHIBITION"
      ? await validateExhibitionTarget(connection, target)
      : targetType === "NETWORKING"
        ? await validateNetworkingTarget(connection, target)
        : await validateTrainingTarget(connection, target);
    if (targetType === "EXHIBITION") validateExhibitionMetadata(target, dbTarget);
    else if (targetType === "NETWORKING") validateNetworkingMetadata(target, dbTarget);
    else validateRequiredMetadata(target, dbTarget);

    // Exhibition survey responses are independent from event participants.
    // The existing survey business flow does not require or persist a user_id.
    if (targetType === "EXHIBITION") {
      const validatedRows = importableRows.map((row) => {
        const data = sanitizeExhibitionSurveyData(row.data);
        const errors = getExhibitionSurveyRequiredErrors(data);
        return errors.length
          ? { ...row, data, dbStatus: "CONFLICT", dbMessage: errors.join(" ") }
          : { ...row, data, dbStatus: "NEW", dbMessage: "Phản hồi khảo sát sẵn sàng ghi vào Triển lãm." };
      });
      const readyToCommit = validatedRows.filter((row) => row.dbStatus === "NEW").length;
      return {
        target,
        summary: {
          total: validatedRows.length,
          new: readyToCommit,
          existing: 0,
          alreadyRegistered: 0,
          conflict: validatedRows.length - readyToCommit,
          readyToCommit,
        },
        rows: validatedRows,
      };
    }

    // ===================================================
    // 2. QUERY USERS 1 LẦN
    // ===================================================

    const users = await loadUsersByIdentities(connection, importableRows);

    const { byEmail, byPhone } = buildUserIndexes(users);

    // ===================================================
    // 3. COLLECT EXISTING USER IDS
    // ===================================================

    const existingUserIds = [
      ...new Set(users.map((user) => Number(user.id)).filter(Boolean)),
    ];

    // ===================================================
    // 4. QUERY REGISTRATIONS 1 LẦN
    // ===================================================

    const targetId = targetType === "TRAINING" ? Number(target.openingId) : Number(target.eventId);
    const registrations = targetType === "EXHIBITION"
      ? await loadEventParticipants(connection, targetId, existingUserIds)
      : targetType === "NETWORKING"
        ? await loadNetworkingParticipants(connection, targetId, existingUserIds)
        : await loadExistingRegistrations(connection, targetId, existingUserIds);

    const registeredUserIds = new Set(
      registrations.map((item) => Number(item.user_id)),
    );
    const byNameAtTarget = targetType === "EXHIBITION"
      ? await loadNamesAtEvent(connection, targetId)
      : targetType === "NETWORKING"
        ? await loadNamesAtNetworkingEvent(connection, targetId)
        : await loadNamesRegisteredAtTarget(connection, targetId);
    const seen = new Set();

    // ===================================================
    // 5. VALIDATE MEMORY
    // ===================================================

    const validatedRows = importableRows.map((row) => {
      const email = normalizeEmail(row?.data?.email);
      const phone = normalizePhone(row?.data?.phone);
      const name = normalizeText(row?.data?.fullname);
      const key = email ? `email:${email}` : phone ? `phone:${phone}` : `${targetType.toLowerCase()}:${targetId}|fullname:${name}`;
      if (seen.has(key)) return { ...row, dbStatus: "ALREADY_REGISTERED", dbMessage: "Trùng học viên trong file/batch hiện tại." };
      seen.add(key);
      return validateOneTrainingRow({
        row,
        byEmail,
        byPhone,
        byNameAtTarget,
        registeredUserIds,
      });
    });

    // ===================================================
    // SUMMARY
    // ===================================================

    const summary = {
      total: validatedRows.length,

      new: 0,

      existing: 0,

      alreadyRegistered: 0,

      conflict: 0,

      readyToCommit: 0,
    };

    for (const row of validatedRows) {
      switch (row.dbStatus) {
        case "NEW":
          summary.new += 1;
          summary.readyToCommit += 1;
          break;

        case "EXISTING":
          summary.existing += 1;
          summary.readyToCommit += 1;
          break;

        case "ALREADY_REGISTERED":
          summary.alreadyRegistered += 1;
          break;

        case "CONFLICT":
          summary.conflict += 1;
          break;

        default:
          break;
      }
    }

    return {
      target,

      summary,

      rows: validatedRows,
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  EXHIBITION_SURVEY_NUMERIC_FIELDS,
  getExhibitionSurveyRequiredErrors,
  normalizeExhibitionSurveyNumber,
  normalizeExhibitionSurveyNumericData,
  sanitizeExhibitionSurveyData,
  validateGoogleFormBatch,
  validateOneTrainingRow,
  validateRequiredMetadata,
};
