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

        tp.id AS training_course_id

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

function validateOneTrainingRow({ row, byEmail, byPhone, registeredUserIds }) {
  const data = row?.data || {};

  const fullname = cleanText(data.fullname);

  const email = normalizeEmail(data.email);

  const phone = normalizePhone(data.phone);

  const normalizedName = normalizeText(fullname);

  const userByEmail = email ? byEmail.get(email) || null : null;

  const userByPhone = phone ? byPhone.get(phone) || null : null;

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
  // DB users.phone đang NOT NULL + UNIQUE.
  // ===================================================

  if (!phone) {
    return {
      ...row,

      dbStatus: "CONFLICT",

      conflictCode: "STUDENT_PHONE_REQUIRED",

      dbMessage: "Học viên mới chưa có số điện thoại nên chưa thể tạo hồ sơ.",
    };
  }

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
  if (target.type !== "TRAINING") {
    const error = new Error("Batch Validate hiện mới hỗ trợ Khóa đào tạo.");

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

    await validateTrainingTarget(connection, target);

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

    const registrations = await loadExistingRegistrations(
      connection,
      Number(target.openingId),
      existingUserIds,
    );

    const registeredUserIds = new Set(
      registrations.map((item) => Number(item.user_id)),
    );

    // ===================================================
    // 5. VALIDATE MEMORY
    // ===================================================

    const validatedRows = importableRows.map((row) =>
      validateOneTrainingRow({
        row,
        byEmail,
        byPhone,
        registeredUserIds,
      }),
    );

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
  validateGoogleFormBatch,
};
