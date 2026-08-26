const db = require("../config/db");
// =====================================
// Chuẩn hóa tên phục vụ đối chiếu
// =====================================
function normalizeBusinessText(value) {
  if (!value) return "";

  return (
    value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")

      // Bỏ tiền tố mô tả trong file Excel
      .replace(/^thuoc\s+/i, "")

      // Đồng nhất hai cách viết
      .replace(/doi moi sang tao/g, "dmst")

      // Bỏ ký tự đặc biệt và khoảng trắng dư
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}
async function findUserByEmail(connection, email) {
  if (!email) {
    return undefined;
  }

  const [rows] = await connection.query(
    `
      SELECT *
      FROM users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
      ORDER BY id DESC
      LIMIT 1
    `,
    [email],
  );

  return rows[0];
}
async function findUserByEmailAndPhone(connection, email, phone) {
  if (!email || !phone) {
    return null;
  }

  const [rows] = await connection.query(
    `
      SELECT *
      FROM users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        AND phone = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [email, phone],
  );

  return rows[0] || null;
}

async function findClassByCourseName(connection, courseName) {
  const cleanName = courseName?.toString().trim();

  if (!cleanName) {
    return undefined;
  }

  const [rows] = await connection.query(
    `
      SELECT
        cc.id AS class_id,
        c.course_name,
        cc.class_name
      FROM course_classes cc
      INNER JOIN courses c
        ON cc.course_id = c.id
      WHERE
        LOWER(TRIM(c.course_name)) = LOWER(?)
        OR LOWER(TRIM(c.course_name)) LIKE LOWER(CONCAT('%', ?, '%'))
        OR LOWER(?) LIKE LOWER(CONCAT('%', TRIM(c.course_name), '%'))
      ORDER BY
        CASE
          WHEN LOWER(TRIM(c.course_name)) = LOWER(?) THEN 1
          WHEN LOWER(TRIM(c.course_name)) LIKE LOWER(CONCAT('%', ?, '%')) THEN 2
          ELSE 3
        END
      LIMIT 1
    `,
    [cleanName, cleanName, cleanName, cleanName, cleanName],
  );

  return rows[0];
}
async function findCourseBySlug(connection, slug) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        program_id,
        course_name,
        slug,
        status
      FROM courses
      WHERE slug = ?
      LIMIT 1
    `,
    [slug],
  );

  return rows[0] || null;
}
//=======================
// CREATE USER
//=======================

async function createUser(connection, data) {
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
            user_type,
            role
        )

        VALUES
        (?,?,?,?,?,?,?,?,?)
        `,
    [
      data.fullname,
      data.phone,
      data.email,
      data.gender || "OTHER",
      data.age_group || null,
      data.company || null,
      data.position || null,
      data.user_type || "OTHER",
      "USER",
    ],
  );

  return result.insertId;
}

async function createRegistration(connection, data) {
  await connection.query(
    `
      INSERT INTO registrations
      (
        user_id,
        class_id,
        project_field,
        startup_stage
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      data.user_id,
      data.class_id,
      data.project_field || null,
      data.startup_stage || null,
    ],
  );
}
//=======================
// FIND USER BY PHONE
//=======================

async function findUserByPhone(connection, phone) {
  if (!phone) {
    return undefined;
  }

  const [rows] = await connection.query(
    `
      SELECT *
      FROM users
      WHERE phone = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [phone],
  );

  return rows[0];
}
async function checkRegistration(connection, user_id, class_id) {
  const [rows] = await connection.query(
    `
        SELECT id
        FROM registrations
        WHERE user_id = ?
        AND class_id = ?
        `,
    [user_id, class_id],
  );

  return rows[0];
}
function normalizeText(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/^lớp\s*/i, "")
    .replace(/^khóa\s*/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function findCourseByName(connection, courseName, programId) {
  const normalizedInput = normalizeBusinessText(courseName);

  if (!normalizedInput || !programId) {
    return null;
  }

  const [rows] = await connection.query(
    `
      SELECT
        id,
        program_id,
        course_name,
        slug,
        status
      FROM courses
      WHERE program_id = ?
      ORDER BY id ASC
    `,
    [programId],
  );

  const exactMatch = rows.find(
    (item) => normalizeBusinessText(item.course_name) === normalizedInput,
  );

  return exactMatch || null;
}
// =======================
// CREATE COURSE
// =======================

async function createCourse(connection, data) {
  const [result] = await connection.query(
    `
        INSERT INTO courses
        (
            program_id,
            course_name,
            slug,
            status
        )

        VALUES
        (?,?,?,?)
        `,
    [
      data.program_id,
      data.course_name,
      data.slug || null,
      data.status || "OPEN",
    ],
  );

  return result.insertId;
}

// =======================
// CREATE CLASS
// =======================

async function createClass(connection, data) {
  const [result] = await connection.query(
    `
        INSERT INTO course_classes
        (
            course_id,
            class_name,
            location,
            schedule_note,
            max_students,
            current_students,
            status
        )

        VALUES
        (?,?,?,?,?,?,?)
        `,
    [
      data.course_id,

      data.class_name,

      data.location || null,

      data.schedule || null,

      50,

      0,

      "OPEN",
    ],
  );

  return result.insertId;
}
// =======================
// FIND CLASS
// =======================

async function findClass(connection, courseId, className, location, schedule) {
  const normalizedClassName = normalizeBusinessText(className);

  const normalizedLocation = normalizeBusinessText(location);

  const normalizedSchedule = normalizeBusinessText(schedule);

  if (!courseId || !normalizedClassName) {
    return null;
  }

  const [rows] = await connection.query(
    `
      SELECT *
      FROM course_classes
      WHERE course_id = ?
      ORDER BY id ASC
    `,
    [courseId],
  );

  const matchedClass = rows.find((item) => {
    const dbClassName = normalizeBusinessText(item.class_name);

    const dbLocation = normalizeBusinessText(item.location);

    const dbSchedule = normalizeBusinessText(item.schedule_note);

    const sameName = dbClassName === normalizedClassName;

    const sameLocation = dbLocation === normalizedLocation;

    const sameSchedule = dbSchedule === normalizedSchedule;

    /*
     * Debug phải nằm trong callback vì biến item
     * chỉ tồn tại ở phạm vi này.
     */
    console.log("COMPARE CLASS:", {
      courseId,

      database: {
        id: item.id,
        className: item.class_name,
        location: item.location,
        schedule: item.schedule_note,

        normalizedClassName: dbClassName,
        normalizedLocation: dbLocation,
        normalizedSchedule: dbSchedule,
      },

      excel: {
        className,
        location,
        schedule,

        normalizedClassName,
        normalizedLocation,
        normalizedSchedule,
      },

      matched: {
        sameName,
        sameLocation,
        sameSchedule,
      },
    });

    return sameName && sameLocation && sameSchedule;
  });

  return matchedClass || null;
}
// =======================
// UPDATE CURRENT STUDENTS
// =======================

async function updateCurrentStudents(connection, classId) {
  const [result] = await connection.query(
    `
        UPDATE course_classes
        SET current_students = (
            SELECT COUNT(*)
            FROM registrations
            WHERE class_id = ?
        )
        WHERE id = ?
        `,
    [classId, classId],
  );

  return result;
}
// =====================================
// Tìm chương trình theo tên đã chuẩn hóa
// Dùng chung connection để nằm trong transaction
// =====================================
async function findProgramByName(connection, programName) {
  if (!programName) {
    return null;
  }

  const inputNormalized = normalizeBusinessText(programName);

  /*
   * Nếu sau chuẩn hóa không còn nội dung,
   * tuyệt đối không tìm tiếp bằng includes("").
   */
  if (!inputNormalized) {
    return null;
  }

  const [rows] = await connection.query(`
    SELECT
      id,
      program_name,
      description,
      status
    FROM training_programs
    ORDER BY id ASC
  `);

  /*
   * Ưu tiên trùng hoàn toàn.
   */
  const exactMatch = rows.find(
    (item) => normalizeBusinessText(item.program_name) === inputNormalized,
  );

  if (exactMatch) {
    return exactMatch;
  }

  /*
   * Chỉ dùng contains sau khi chắc chắn
   * hai chuỗi chuẩn hóa không bị rỗng.
   */
  const partialMatch = rows.find((item) => {
    const databaseNormalized = normalizeBusinessText(item.program_name);

    if (!databaseNormalized) {
      return false;
    }

    return (
      databaseNormalized.includes(inputNormalized) ||
      inputNormalized.includes(databaseNormalized)
    );
  });

  return partialMatch || null;
}

module.exports = {
  findProgramByName,
  findUserByEmail,
  findUserByEmailAndPhone,
  findUserByPhone,

  findClassByCourseName,

  findCourseBySlug,

  findCourseByName,

  findClass,

  checkRegistration,

  createUser,

  createCourse,

  createClass,

  createRegistration,
  updateCurrentStudents,
};
