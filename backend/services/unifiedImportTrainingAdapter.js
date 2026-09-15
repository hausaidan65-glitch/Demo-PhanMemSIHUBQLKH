const ImportModel = require("../models/importModel");

function cleanValue(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function normalizeEmail(value) {
  const result = cleanValue(value);
  return result ? result.toLowerCase() : null;
}

function normalizePhone(value) {
  const result = cleanValue(value);

  if (!result) {
    return null;
  }

  const possiblePhones = result.match(/0\d[\d\s.-]{7,}/g);

  if (possiblePhones?.length) {
    return possiblePhones[0].replace(/\D/g, "");
  }

  const digits = result.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function createAdapterError(message, code, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

async function resolveTrainingUser(connection, values, source) {
  const fullname = cleanValue(values.fullname);
  const email = normalizeEmail(values.email);
  const phone = normalizePhone(values.phone);

  if (!fullname) {
    throw createAdapterError(
      "Học viên chưa có họ và tên.",
      "STUDENT_NAME_REQUIRED",
      { source },
    );
  }

  if (!email && !phone) {
    throw createAdapterError(
      `Học viên "${fullname}" chưa có số điện thoại hoặc email.`,
      "STUDENT_CONTACT_REQUIRED",
      {
        source,
        fullname,
      },
    );
  }

  /*
   * Recheck ngay trong transaction.
   * Không tin hoàn toàn snapshot ở bước validation.
   */
  const userByEmail = email
    ? await ImportModel.findUserByEmail(connection, email)
    : null;

  const userByPhone = phone
    ? await ImportModel.findUserByPhone(connection, phone)
    : null;

  if (
    userByEmail &&
    userByPhone &&
    Number(userByEmail.id) !== Number(userByPhone.id)
  ) {
    throw createAdapterError(
      "Email và số điện thoại đang thuộc hai hồ sơ khác nhau.",
      "STUDENT_IDENTITY_CONFLICT",
      {
        source,
        fullname,
        email,
        phone,
        emailUserId: userByEmail.id,
        phoneUserId: userByPhone.id,
      },
    );
  }

  if (
    !userByEmail &&
    userByPhone &&
    email &&
    userByPhone.email &&
    normalizeEmail(userByPhone.email) !== email
  ) {
    throw createAdapterError(
      "Số điện thoại đã thuộc một học viên khác nhưng email không khớp.",
      "STUDENT_PHONE_CONFLICT",
      {
        source,
        fullname,
        email,
        phone,
        phoneUserId: userByPhone.id,
      },
    );
  }

  if (
    userByEmail &&
    userByPhone &&
    Number(userByEmail.id) === Number(userByPhone.id) &&
    userByEmail.fullname &&
    normalizeText(userByEmail.fullname) !== normalizeText(fullname)
  ) {
    throw createAdapterError(
      "Email và số điện thoại đã tồn tại nhưng họ tên học viên không khớp.",
      "STUDENT_NAME_CONFLICT",
      {
        source,
        fullname,
        email,
        phone,
        existingUserId: userByEmail.id,
      },
    );
  }

  const existedUser = userByEmail || userByPhone;

  if (existedUser) {
    return {
      userId: existedUser.id,
      created: false,
    };
  }

  /*
   * Giữ đúng legacy:
   * user mới bắt buộc phải có phone vì users.phone NOT NULL.
   */
  if (!phone) {
    throw createAdapterError(
      `Học viên mới "${fullname}" chưa có số điện thoại.`,
      "STUDENT_PHONE_REQUIRED",
      {
        source,
        fullname,
        email,
      },
    );
  }

  const userId = await ImportModel.createUser(connection, {
    fullname,
    email,
    phone,
    gender: cleanValue(values.gender) || "OTHER",
    age_group: cleanValue(values.age_group),
    company: cleanValue(values.organization),
    position: cleanValue(values.position),
    user_type: cleanValue(values.user_type) || "OTHER",
  });

  return {
    userId,
    created: true,
  };
}

async function importRow(connection, row, target) {
  if (!row?.commitEligible || row.status !== "VALID") {
    return {
      source: row?.source,
      status: "FAILED",
      reason: "ROW_NOT_COMMIT_ELIGIBLE",
    };
  }

  const openingId = Number(target?.openingId);

  if (!Number.isInteger(openingId) || openingId <= 0) {
    throw createAdapterError("Đợt tổ chức không hợp lệ.", "TARGET_REQUIRED", {
      source: row.source,
    });
  }

  const resolved = await resolveTrainingUser(
    connection,
    row.values || {},
    row.source,
  );

  /*
   * Recheck duplicate ngay trước INSERT để giảm race
   * giữa validation và commit.
   */
  const registered = await ImportModel.checkRegistration(
    connection,
    resolved.userId,
    openingId,
  );

  if (registered) {
    return {
      source: row.source,
      status: "SKIPPED_DUPLICATE",
      userId: resolved.userId,
      userCreated: resolved.created,
      openingId,
      reason: "EXISTING_DB_TARGET_REGISTRATION",
    };
  }

  await ImportModel.createRegistration(connection, {
    user_id: resolved.userId,
    class_id: openingId,
    project_field: cleanValue(row.values?.project_field),
    startup_stage: cleanValue(row.values?.startup_stage),
  });

  return {
    source: row.source,
    status: "IMPORTED",
    userId: resolved.userId,
    userCreated: resolved.created,
    openingId,
  };
}

async function importSheet(connection, sheet) {
  if (sheet?.module !== "TRAINING") {
    throw createAdapterError(
      "Adapter Training chỉ xử lý module TRAINING.",
      "MODULE_INVALID",
      {
        source: sheet?.source,
      },
    );
  }

  if (sheet.validationReady !== true) {
    throw createAdapterError(
      "Sheet chưa đủ điều kiện commit.",
      "SHEET_NOT_COMMIT_READY",
      {
        source: sheet.source,
      },
    );
  }

  const target = sheet.target || {};

  if (!target.trainingProgramId || !target.courseId || !target.openingId) {
    throw createAdapterError("Thiếu target Training.", "TARGET_REQUIRED", {
      source: sheet.source,
    });
  }

  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];

  const results = [];

  for (const row of rows) {
    /*
     * Plan có thể chứa cả row blocked để FE xem kết quả,
     * nhưng adapter tuyệt đối không ghi các row đó.
     */
    if (!row.commitEligible || row.status !== "VALID") {
      continue;
    }

    const result = await importRow(connection, row, target);

    results.push(result);
  }

  /*
   * Đồng bộ lại current_students giống legacy.
   */
  if (results.length > 0) {
    await ImportModel.updateCurrentStudents(
      connection,
      Number(target.openingId),
    );
  }

  return {
    source: sheet.source,
    module: "TRAINING",
    target,
    status: "IMPORTED",
    totalEligibleRows: results.length,
    importedRows: results.filter((item) => item.status === "IMPORTED").length,
    skippedDuplicateRows: results.filter(
      (item) => item.status === "SKIPPED_DUPLICATE",
    ).length,
    rows: results,
  };
}

module.exports = {
  cleanValue,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  resolveTrainingUser,
  importRow,
  importSheet,
};
