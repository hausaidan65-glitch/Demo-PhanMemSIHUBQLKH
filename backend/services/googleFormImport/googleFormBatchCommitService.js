const db = require("../../config/db");

const RegistrationModel = require("../../models/registrationModel");

const generateQrToken = require("../../utils/generateQrToken");

const {
  sanitizeExhibitionSurveyData,
  validateGoogleFormBatch,
} = require("./googleFormBatchValidator");
const crypto = require("crypto");

// =====================================================
// BASIC HELPERS
// =====================================================

function cleanValue(value) {
  const result = String(value ?? "").trim();

  return result || null;
}

function normalizeEmail(value) {
  const email = cleanValue(value);

  if (!email) {
    return null;
  }

  return email.toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);

  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(value) {
  const raw = cleanValue(value);

  if (!raw) {
    return null;
  }

  let phone = raw.replace(/\D/g, "");

  if (phone.startsWith("84") && phone.length >= 10) {
    phone = `0${phone.slice(2)}`;
  }

  return phone || null;
}

// =====================================================
// GENDER
// =====================================================

function normalizeGender(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  if (text === "male" || text === "nam" || text === "m" || text === "1") {
    return "MALE";
  }

  if (
    text === "female" ||
    text === "nữ" ||
    text === "nu" ||
    text === "f" ||
    text === "0"
  ) {
    return "FEMALE";
  }

  return "OTHER";
}

// =====================================================
// USER TYPE
// Google Form đang dùng participant_group.
//
// Khi ghi users:
// participant_group -> user_type
// =====================================================

function normalizeUserType(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "OTHER";
  }

  const text = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (
    text.includes("startup") ||
    text.includes("khoi nghiep") ||
    text.includes("du an")
  ) {
    return "STARTUP";
  }

  if (
    text.includes("doanh nghiep") ||
    text.includes("business") ||
    text.includes("chu doanh nghiep")
  ) {
    return "BUSINESS";
  }

  if (
    text.includes("sinh vien") ||
    text.includes("hoc sinh") ||
    text.includes("student")
  ) {
    return "STUDENT";
  }

  if (
    text.includes("truong") ||
    text.includes("giang vien") ||
    text.includes("giao vien") ||
    text.includes("university")
  ) {
    return "UNIVERSITY";
  }

  return "OTHER";
}

// =====================================================
// BOOLEAN
// =====================================================

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === 0 || value === "0") {
    return false;
  }

  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (["co", "yes", "true", "x"].includes(text)
    || text.includes("da co y tuong")
    || text.includes("da co du an")) {
    return true;
  }

  if (["khong", "no", "false"].includes(text)
    || text.includes("chua co y tuong")
    || text.includes("chua co du an")) {
    return false;
  }

  return null;
}

// =====================================================
// CREATE USER
//
// QUAN TRỌNG:
// Không dùng UserModel.create() ở đây vì UserModel.create()
// đang dùng db global.
//
// Batch Commit cần toàn bộ INSERT nằm cùng transaction.
// =====================================================

async function createUserWithConnection(connection, rowData, openingId) {
  const fullname = cleanValue(rowData.fullname);

  const phone = normalizePhone(rowData.phone) || `GF-${openingId}-${crypto
    .createHash("sha256")
    .update(`${openingId}|${String(rowData.fullname || "").trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 16)}`;

  let email = normalizeEmail(rowData.email);

  /*
   * Email Google Form sai định dạng:
   *
   * Ví dụ:
   * hallowin.com.vn
   *
   * Không đưa chuỗi sai vào users.email.
   * Original vẫn được giữ trong rawExtras.
   */
  if (email && !isValidEmail(email)) {
    email = null;
  }

  const company = cleanValue(rowData.organization || rowData.company);

  const position = cleanValue(rowData.position);

  const gender = normalizeGender(rowData.gender);

  const ageGroup = cleanValue(rowData.age_group);

  const userType = normalizeUserType(
    rowData.participant_group || rowData.user_type,
  );

  if (!fullname) {
    throw new Error("Không thể tạo user vì thiếu họ tên.");
  }

  const [result] = await connection.query(
    `
      INSERT INTO users
      (
        fullname,
        phone,
        email,
        gender,
        age_group,
        company,
        position,
        user_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [fullname, phone, email, gender, ageGroup, company, position, userType],
  );

  return result.insertId;
}

// =====================================================
// BUILD REGISTRATION DATA
// =====================================================

function buildRegistrationData(rowData) {
  const hasProject = normalizeBoolean(rowData.has_project);
  const preserveProjectData = hasProject !== false;

  return {
    has_project: hasProject,

    project_name: preserveProjectData ? cleanValue(rowData.project_name) : null,

    project_field: preserveProjectData ? cleanValue(rowData.project_field) : null,

    startup_stage: preserveProjectData
      ? cleanValue(rowData.project_stage || rowData.startup_stage)
      : null,

    project_description: preserveProjectData
      ? cleanValue(rowData.project_description)
      : null,

    female_founder:
      rowData.female_founder === null ||
      rowData.female_founder === undefined ||
      rowData.female_founder === ""
        ? null
        : normalizeBoolean(rowData.female_founder),

    team_size: preserveProjectData ? cleanValue(rowData.team_size) : null,

    incubation_status: preserveProjectData
      ? cleanValue(rowData.incubation_status)
      : null,

    program_selection_status: cleanValue(
      rowData.nq20_status || rowData.program_selection_status,
    ),

    support_needs: cleanValue(rowData.support_needs),

    organizer_question: cleanValue(rowData.organizer_question),

    commitment_file: null,
  };
}

// =====================================================
// SAVE RAW EXTRA
// =====================================================

async function saveRawExtras(
  connection,
  { registrationId, targetType, source, row },
) {
  const extras = {
    ...(row.rawExtras || {}),
  };

  /*
   * Nếu email gốc không hợp lệ,
   * giữ nguyên bản gốc trong extras.
   */
  if (row.data?.email && !isValidEmail(row.data.email)) {
    extras._invalid_email_original = row.data.email;
  }

  const hasExtras = Object.keys(extras).length > 0;

  const sourceTimestamp =
    cleanValue(row.data?.timestamp) || cleanValue(row.timestamp);

  /*
   * Dù không có extras vẫn có thể lưu metadata nguồn.
   * Điều này giúp truy vết import sau này.
   */
  await connection.query(
    `
      INSERT INTO google_form_import_extras
      (
        registration_id,
        target_type,
        source_file,
        source_sheet,
        source_row,
        source_timestamp,
        extra_answers
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      registrationId,

      targetType,

      cleanValue(source?.fileName),

      cleanValue(source?.sheetName),

      Number(row.rowNumber) || null,

      sourceTimestamp,

      hasExtras ? JSON.stringify(extras) : null,
    ],
  );
}

// =====================================================
// SYNC CURRENT STUDENTS
// Chỉ query một lần sau toàn batch.
// =====================================================

async function syncOpeningStudents(connection, openingId) {
  const [[countRow]] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM registrations
      WHERE class_id = ?
        AND register_status = 'CONFIRMED'
    `,
    [openingId],
  );

  const total = Number(countRow?.total) || 0;

  const [[opening]] = await connection.query(
    `
      SELECT
        id,
        status,
        max_students
      FROM course_classes
      WHERE id = ?
      FOR UPDATE
    `,
    [openingId],
  );

  if (!opening) {
    throw new Error("Không tìm thấy đợt tổ chức.");
  }

  let nextStatus = opening.status;

  /*
   * Không được làm CLOSED / FINISHED quay về OPEN/FULL.
   */
  if (opening.status === "OPEN" || opening.status === "FULL") {
    const maxStudents = Number(opening.max_students) || 0;

    if (maxStudents > 0 && total >= maxStudents) {
      nextStatus = "FULL";
    } else {
      nextStatus = "OPEN";
    }
  }

  await connection.query(
    `
      UPDATE course_classes
      SET
        current_students = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [total, nextStatus, openingId],
  );

  return {
    currentStudents: total,
    status: nextStatus,
  };
}

// =====================================================
// COMMIT TRAINING
// =====================================================

async function commitTrainingBatch({ target, rows, source }) {
  const openingId = Number(target?.openingId);

  if (!openingId) {
    throw new Error("Thiếu đợt tổ chức cần import học viên.");
  }

  // ===================================================
  // 1. VALIDATE LẠI NGAY TRƯỚC COMMIT
  //
  // Không tin dbStatus FE gửi lên.
  // DB có thể đã thay đổi sau lần Admin Validate.
  // ===================================================

  const validation = await validateGoogleFormBatch({
    target,
    rows,
  });

  const rowsReady = (validation.rows || []).filter(
    (row) => row.dbStatus === "NEW" || row.dbStatus === "EXISTING",
  );

  if (rowsReady.length === 0) {
    return {
      success: true,

      targetType: "TRAINING",

      requested: rows.length,

      readyBeforeCommit: 0,

      createdUsers: 0,
      existingUsersUsed: 0,

      createdRegistrations: 0,

      skippedAlreadyRegistered: validation.summary?.alreadyRegistered || 0,

      skippedConflicts: validation.summary?.conflict || 0,

      savedExtraRows: 0,

      currentStudents: null,

      classStatus: null,

      rows: validation.rows || [],
    };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // =================================================
    // 2. LOCK OPENING
    // =================================================

    const [[opening]] = await connection.query(
      `
    SELECT
      cc.id,
      cc.course_id,
      cc.current_students,
      cc.max_students,
      cc.status,

      c.program_id AS training_course_id

    FROM course_classes cc

    INNER JOIN courses c
      ON c.id = cc.course_id

    WHERE cc.id = ?
      AND cc.deleted_at IS NULL

    FOR UPDATE
  `,
      [openingId],
    );

    if (!opening) {
      throw new Error("Đợt tổ chức không tồn tại hoặc đã bị xóa.");
    }

    /*
     * Kiểm tra target hierarchy một lần nữa.
     */
    if (
      target.courseId &&
      Number(target.courseId) !== Number(opening.course_id)
    ) {
      throw new Error("Đợt tổ chức không thuộc lớp học đã chọn.");
    }

    if (
      target.trainingCourseId &&
      Number(target.trainingCourseId) !== Number(opening.training_course_id)
    ) {
      throw new Error("Lớp học không thuộc khóa đào tạo đã chọn.");
    }
    // =====================================================
    // ADMIN IMPORT CAPACITY POLICY
    //
    // Google Form Import là luồng quản trị.
    // Không dùng rule capacity của đăng ký public.
    //
    // Tuy nhiên nếu batch làm vượt max_students,
    // Admin phải xác nhận rõ allowOverCapacity.
    // =====================================================

    const currentStudents = Number(opening.current_students) || 0;

    const maxStudents = Number(opening.max_students) || 0;

    const projectedStudents = currentStudents + rowsReady.length;

    const willExceedCapacity =
      maxStudents > 0 && projectedStudents > maxStudents;

    const allowOverCapacity = source?.allowOverCapacity === true;

    if (willExceedCapacity && !allowOverCapacity) {
      const error = new Error(
        `Batch này sẽ làm sĩ số tăng từ ${currentStudents} lên ${projectedStudents}, vượt giới hạn ${maxStudents}.`,
      );

      error.status = 409;

      error.code = "GOOGLE_FORM_CAPACITY_CONFIRM_REQUIRED";

      error.details = {
        currentStudents,
        maxStudents,
        readyToCommit: rowsReady.length,
        projectedStudents,
      };

      throw error;
    }
    let createdUsers = 0;

    let existingUsersUsed = 0;

    let createdRegistrations = 0;

    let skippedAlreadyRegistered = 0;

    let savedExtraRows = 0;

    const resultRows = [];

    // =================================================
    // 3. COMMIT TỪNG DÒNG TRONG CÙNG TRANSACTION
    // =================================================

    for (const row of rowsReady) {
      const rowData = row.data || {};

      let userId = null;

      let userSource = null;

      // ===============================================
      // EXISTING
      // ===============================================

      if (row.dbStatus === "EXISTING") {
        userId =
          Number(row.existingUser?.id) ||
          Number(row.existing?.user?.id) ||
          Number(row.existing?.id) ||
          null;

        if (!userId) {
          throw new Error(
            `Không xác định được user hiện có ở dòng ${row.rowNumber}.`,
          );
        }

        existingUsersUsed += 1;

        userSource = "EXISTING";
      }

      // ===============================================
      // NEW
      // ===============================================
      else {
        /*
         * Chống race-condition:
         *
         * Validate nói NEW nhưng giữa lúc Validate và
         * lúc transaction chạy có thể user vừa được tạo.
         *
         * Kiểm tra trực tiếp lại trong transaction.
         */

        const normalizedEmail = isValidEmail(rowData.email)
          ? normalizeEmail(rowData.email)
          : null;

        const normalizedPhone = normalizePhone(rowData.phone);

        let userByEmail = null;
        let userByPhone = null;

        if (normalizedEmail) {
          const [emailRows] = await connection.query(
            `
                SELECT
                  id,
                  fullname,
                  email,
                  phone
                FROM users
                WHERE LOWER(TRIM(email)) = ?
                LIMIT 1
                FOR UPDATE
              `,
            [normalizedEmail],
          );

          userByEmail = emailRows[0] || null;
        }

        if (normalizedPhone) {
          const [phoneRows] = await connection.query(
            `
                SELECT
                  id,
                  fullname,
                  email,
                  phone
                FROM users
                WHERE
                  REPLACE(
                    REPLACE(
                      REPLACE(
                        REPLACE(phone, ' ', ''),
                        '.',
                        ''
                      ),
                      '-',
                      ''
                    ),
                    '+84',
                    '0'
                  ) = ?
                LIMIT 1
                FOR UPDATE
              `,
            [normalizedPhone],
          );

          userByPhone = phoneRows[0] || null;
        }

        if (
          userByEmail &&
          userByPhone &&
          Number(userByEmail.id) !== Number(userByPhone.id)
        ) {
          /*
           * DB vừa thay đổi sau Validate.
           * Không commit nhầm người.
           */
          resultRows.push({
            rowNumber: row.rowNumber,

            status: "SKIPPED_CONFLICT",

            message: "Email và số điện thoại hiện thuộc hai hồ sơ khác nhau.",
          });

          continue;
        }

        const racedExistingUser = userByPhone || userByEmail;

        if (racedExistingUser) {
          userId = racedExistingUser.id;

          existingUsersUsed += 1;

          userSource = "EXISTING_AFTER_RECHECK";
        } else {
          userId = await createUserWithConnection(connection, rowData, openingId);

          createdUsers += 1;

          userSource = "NEW";
        }
      }

      // ===============================================
      // 4. CHECK REGISTRATION LẠI TRONG TRANSACTION
      // ===============================================

      const alreadyRegistered = await RegistrationModel.checkRegistered(
        connection,
        userId,
        openingId,
      );

      if (alreadyRegistered) {
        skippedAlreadyRegistered += 1;

        resultRows.push({
          rowNumber: row.rowNumber,

          userId,

          status: "SKIPPED_ALREADY_REGISTERED",
        });

        continue;
      }

      // ===============================================
      // 5. TẠO REGISTRATION
      // ===============================================

      const qrToken = generateQrToken();

      const registrationData = buildRegistrationData(rowData);

      const registrationId = await RegistrationModel.create(connection, {
        ...registrationData,

        preserve_has_project_unknown: true,

        user_id: userId,

        // registrations.class_id
        // = course_classes.id
        class_id: openingId,

        qr_token: qrToken,
      });

      createdRegistrations += 1;

      // ===============================================
      // 6. SAVE GOOGLE FORM EXTRA
      // ===============================================

      await saveRawExtras(connection, {
        registrationId,

        targetType: "TRAINING",

        source,

        row,
      });

      savedExtraRows += 1;

      resultRows.push({
        rowNumber: row.rowNumber,

        userId,
        registrationId,

        userSource,

        status: "IMPORTED",
      });
    }

    // =================================================
    // 7. SYNC SĨ SỐ MỘT LẦN
    // =================================================

    const openingResult = await syncOpeningStudents(connection, openingId);

    // =================================================
    // 8. COMMIT
    // =================================================

    await connection.commit();

    return {
      success: true,

      targetType: "TRAINING",

      requested: rows.length,

      readyBeforeCommit: rowsReady.length,

      createdUsers,

      existingUsersUsed,

      createdRegistrations,

      skippedAlreadyRegistered:
        skippedAlreadyRegistered +
        Number(validation.summary?.alreadyRegistered || 0),

      skippedConflicts: Number(validation.summary?.conflict || 0),

      savedExtraRows,

      currentStudents: openingResult.currentStudents,

      classStatus: openingResult.status,

      rows: resultRows,
      capacity: {
        beforeImport: currentStudents,

        maxStudents,

        projectedBeforeCommit: projectedStudents,

        exceededCapacity: projectedStudents > maxStudents && maxStudents > 0,

        allowOverCapacity,
      },
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

function buildExhibitionInsertValues(eventId, sourceData = {}) {
  const data = sanitizeExhibitionSurveyData(sourceData);
  return [eventId, data.fullname, data.position,
    data.organization, normalizePhone(data.phone) || "", normalizeEmail(data.email) || "",
    data.project_field, data.exhibition_product_name,
    data.exhibition_product_quantity, data.sold_or_ordered_quantity,
    data.visitor_count, data.b2b_matching_count,
    data.public_sector_connection_count, data.mou_count, data.exhibition_revenue,
    data.highlight_impression, data.want_to_join_again,
    cleanValue(data.organizer_feedback), cleanValue(data.other_sharing)];
}

async function commitExhibitionBatch({ target, rows }) {
  const eventId = Number(target?.eventId);
  if (!eventId) throw new Error("Thiếu Triển lãm nhận dữ liệu.");

  const validation = await validateGoogleFormBatch({ target, rows });
  const rowsReady = (validation.rows || []).filter(
    (row) => row.dbStatus === "NEW" || row.dbStatus === "EXISTING",
  );
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [[event]] = await connection.query(
      `SELECT id FROM startup_connection_events
        WHERE id = ? AND event_type = 'EXHIBITION' FOR UPDATE`,
      [eventId],
    );
    if (!event) throw new Error("Triển lãm không tồn tại.");

    let createdSurveys = 0;
    const resultRows = [];

    for (const row of rowsReady) {
      const [insertResult] = await connection.query(
        `INSERT INTO exhibition_surveys
          (event_id, fullname, position, organization, phone, email, project_field,
           exhibition_product_name, exhibition_product_quantity,
           sold_or_ordered_quantity, visitor_count, b2b_matching_count,
           public_sector_connection_count, mou_count, exhibition_revenue,
           highlight_impression, want_to_join_again, organizer_feedback, other_sharing)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        buildExhibitionInsertValues(eventId, row.data),
      );
      createdSurveys += 1;
      resultRows.push({ rowNumber: row.rowNumber, surveyId: insertResult.insertId, status: "IMPORTED" });
    }
    await connection.commit();
    return {
      success: true,
      targetType: "EXHIBITION",
      requested: rows.length,
      readyBeforeCommit: rowsReady.length,
      createdUsers: 0,
      existingUsersUsed: 0,
      createdRegistrations: 0,
      createdSurveys,
      skippedAlreadyRegistered: 0,
      skippedConflicts: Number(validation.summary?.conflict || 0),
      savedExtraRows: 0,
      rows: resultRows,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function commitNetworkingBatch({ target, rows }) {
  const eventId = Number(target?.eventId);
  if (!eventId) throw new Error("Thiếu Sự kiện kết nối nhận dữ liệu.");

  const validation = await validateGoogleFormBatch({ target, rows });
  const rowsReady = (validation.rows || []).filter(
    (row) => row.dbStatus === "NEW" || row.dbStatus === "EXISTING",
  );
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [[event]] = await connection.query(
      "SELECT id FROM networking_events WHERE id = ? FOR UPDATE",
      [eventId],
    );
    if (!event) throw new Error("Sự kiện kết nối không tồn tại.");

    let createdUsers = 0;
    let existingUsersUsed = 0;
    let createdRegistrations = 0;
    let skippedAlreadyRegistered = 0;
    const resultRows = [];

    for (const row of rowsReady) {
      const data = row.data || {};
      let userId = Number(row.existingUser?.id || row.existing?.user?.id || row.existing?.id) || null;
      if (userId) existingUsersUsed += 1;
      else {
        userId = await createUserWithConnection(connection, data, `NW-${eventId}`);
        createdUsers += 1;
      }

      const [[duplicate]] = await connection.query(
        `SELECT id FROM networking_event_participants
          WHERE event_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
        [eventId, userId],
      );
      if (duplicate) {
        skippedAlreadyRegistered += 1;
        resultRows.push({ rowNumber: row.rowNumber, userId, status: "SKIPPED_ALREADY_REGISTERED" });
        continue;
      }

      const hasProject = normalizeBoolean(data.has_project);
      await connection.query(
        `INSERT INTO networking_event_participants
          (event_id, user_id, participant_role, organization, position,
           has_project, project_field, startup_stage, program_selection_status,
           support_needs, organizer_question, note, checked_in, registration_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'CONFIRMED')`,
        [eventId, userId, cleanValue(data.participant_role), cleanValue(data.organization),
          cleanValue(data.position), hasProject ? 1 : 0,
          hasProject ? cleanValue(data.project_field) : null,
          hasProject ? cleanValue(data.startup_stage) : null,
          cleanValue(data.program_selection_status), cleanValue(data.support_needs),
          cleanValue(data.organizer_question), cleanValue(data.note)],
      );
      createdRegistrations += 1;
      resultRows.push({ rowNumber: row.rowNumber, userId, status: "IMPORTED" });
    }

    await connection.query(
      `UPDATE networking_events SET current_participants =
        (SELECT COUNT(*) FROM networking_event_participants WHERE event_id = ?)
       WHERE id = ?`,
      [eventId, eventId],
    );
    await connection.commit();
    return {
      success: true,
      targetType: "NETWORKING",
      requested: rows.length,
      readyBeforeCommit: rowsReady.length,
      createdUsers,
      existingUsersUsed,
      createdRegistrations,
      skippedAlreadyRegistered: skippedAlreadyRegistered + Number(validation.summary?.alreadyRegistered || 0),
      skippedConflicts: Number(validation.summary?.conflict || 0),
      savedExtraRows: 0,
      rows: resultRows,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =====================================================
// MAIN
// =====================================================

async function commitGoogleFormBatch({ target, rows, source }) {
  if (!target?.isComplete) {
    throw new Error("Target import chưa hoàn chỉnh.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Không có dữ liệu để import.");
  }

  const targetType = String(target.type || "").toUpperCase();

  if (targetType === "TRAINING") {
    return commitTrainingBatch({
      target,
      rows,
      source,
    });
  }

  if (targetType === "EXHIBITION") {
    return commitExhibitionBatch({ target, rows, source });
  }

  if (targetType === "NETWORKING") {
    return commitNetworkingBatch({ target, rows, source });
  }

  /*
   * Seminar / Networking làm sau khi Training
   * test DB thành công.
   */
  throw new Error(`Batch Commit chưa hỗ trợ target ${targetType}.`);
}

module.exports = {
  buildExhibitionInsertValues,
  buildRegistrationData,
  commitGoogleFormBatch,
  normalizeBoolean,
};
