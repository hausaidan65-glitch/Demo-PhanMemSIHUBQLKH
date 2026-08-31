const db = require("../config/db");

class CourseClassModel {
  // Lấy tất cả lớp
  static async getAll() {
    const sql = `
    SELECT
      cc.*,
      c.course_name,

      CASE
        WHEN cc.status = 'FINISHED' THEN 'FINISHED'
        WHEN cc.status = 'CLOSED' THEN 'CLOSED'

        WHEN cc.max_students > 0
          AND cc.current_students >= cc.max_students
          THEN 'FULL'

        WHEN cc.register_close IS NOT NULL
          AND cc.register_close <= NOW()
          THEN 'CLOSED'

        WHEN cc.register_close IS NULL
          AND first_session.first_session_at IS NOT NULL
          AND first_session.first_session_at <= NOW()
          THEN 'CLOSED'

        ELSE 'OPEN'
      END AS effective_status

    FROM course_classes cc

    LEFT JOIN courses c
      ON cc.course_id = c.id

    LEFT JOIN (
      SELECT
        class_id,
        MIN(
          TIMESTAMP(
            session_date,
            COALESCE(start_time, '00:00:00')
          )
        ) AS first_session_at
      FROM course_class_sessions
      GROUP BY class_id
    ) first_session
      ON first_session.class_id = cc.id

    ORDER BY cc.id DESC
  `;

    const [rows] = await db.query(sql);

    return rows;
  }

  // Chi tiết
  static async getById(id) {
    const sql = `
    SELECT
      cc.*,
      c.course_name,

      CASE
        WHEN cc.status = 'FINISHED' THEN 'FINISHED'
        WHEN cc.status = 'CLOSED' THEN 'CLOSED'

        WHEN cc.max_students > 0
          AND cc.current_students >= cc.max_students
          THEN 'FULL'

        WHEN cc.register_close IS NOT NULL
          AND cc.register_close <= NOW()
          THEN 'CLOSED'

        WHEN cc.register_close IS NULL
          AND first_session.first_session_at IS NOT NULL
          AND first_session.first_session_at <= NOW()
          THEN 'CLOSED'

        ELSE 'OPEN'
      END AS effective_status

    FROM course_classes cc

    LEFT JOIN courses c
      ON cc.course_id = c.id

    LEFT JOIN (
      SELECT
        class_id,
        MIN(
          TIMESTAMP(
            session_date,
            COALESCE(start_time, '00:00:00')
          )
        ) AS first_session_at
      FROM course_class_sessions
      GROUP BY class_id
    ) first_session
      ON first_session.class_id = cc.id

    WHERE cc.id = ?
  `;

    const [rows] = await db.query(sql, [id]);

    return rows[0];
  }
  // Theo Course
  static async getByCourse(courseId) {
    const sql = `
    SELECT
      cc.*,

      CASE
        WHEN cc.status = 'FINISHED' THEN 'FINISHED'
        WHEN cc.status = 'CLOSED' THEN 'CLOSED'

        WHEN cc.max_students > 0
          AND cc.current_students >= cc.max_students
          THEN 'FULL'

        WHEN cc.register_close IS NOT NULL
          AND cc.register_close <= NOW()
          THEN 'CLOSED'

        WHEN cc.register_close IS NULL
          AND first_session.first_session_at IS NOT NULL
          AND first_session.first_session_at <= NOW()
          THEN 'CLOSED'

        ELSE 'OPEN'
      END AS effective_status

    FROM course_classes cc

    LEFT JOIN (
      SELECT
        class_id,
        MIN(
          TIMESTAMP(
            session_date,
            COALESCE(start_time, '00:00:00')
          )
        ) AS first_session_at
      FROM course_class_sessions
      GROUP BY class_id
    ) first_session
      ON first_session.class_id = cc.id

    WHERE cc.course_id = ?

    ORDER BY cc.created_at DESC
  `;

    const [rows] = await db.query(sql, [courseId]);

    return rows;
  }
  static async getFirstSession(connection, classId) {
    const [rows] = await connection.query(
      `
    SELECT
      id,
      session_date,
      start_time,

      TIMESTAMP(
        session_date,
        COALESCE(start_time, '00:00:00')
      ) AS first_session_at

    FROM course_class_sessions

    WHERE class_id = ?

    ORDER BY
      session_date ASC,
      start_time ASC,
      session_no ASC

    LIMIT 1
    `,
      [classId],
    );

    return rows[0] || null;
  }
  static async getLastSession(connection, classId) {
    const [[row]] = await connection.query(
      `
      SELECT
        MAX(
          TIMESTAMP(
            session_date,
            COALESCE(
              end_time,
              start_time,
              '23:59:59'
            )
          )
        ) AS last_session_at

      FROM course_class_sessions

      WHERE class_id = ?
      `,
      [classId],
    );

    return row || null;
  }
  // ============================
  // Tạo lớp bằng transaction
  // ============================

  static async createWithConnection(connection, data) {
    const sql = `
    INSERT INTO course_classes(
      course_id,
      class_code,
      class_name,
      intake_name,
      trainer_name,
      location,
      schedule_note,
      register_open,
      register_close,
      max_students,
      current_students,
      status
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
  `;

    const [result] = await connection.query(sql, [
      data.course_id,
      data.class_code || null,
      data.class_name,
      data.intake_name || null,
      data.trainer_name || null,
      data.location || null,
      data.schedule_note || null,
      data.register_open || null,
      data.register_close || null,
      Number(data.max_students) || 50,
      0,
      data.status || "OPEN",
    ]);

    return result;
  }

  // Thêm
  static async create(data) {
    const sql = `
    INSERT INTO course_classes(
      course_id,
      class_code,
      class_name,
      trainer_name,
      location,
      schedule_note,
      register_open,
      register_close,
      max_students,
      current_students,
      status
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
  `;

    const [result] = await db.query(sql, [
      data.course_id,
      data.class_code || null,
      data.class_name,
      data.trainer || null,
      data.location || null,
      data.schedule_note || null,
      data.register_open || null,
      data.register_close || null,
      Number(data.max_students) || 50,
      Number(data.current_students) || 0,
      data.status || "OPEN",
    ]);

    return result;
  }

  // Update
  static async update(id, data) {
    const sql = `
    UPDATE course_classes
    SET
      course_id = ?,
      class_code = ?,
      class_name = ?,

      trainer_name = ?,
      location = ?,
      schedule_note = ?,
      register_open = ?,
      register_close = ?,
      max_students = ?,
      status = ?
    WHERE id = ?
  `;

    const [result] = await db.query(sql, [
      data.course_id,
      data.class_code || null,
      data.class_name,
      data.trainer || null,
      data.location || null,
      data.schedule_note || null,
      data.register_open || null,
      data.register_close || null,
      Number(data.max_students) || 50,
      data.status || "OPEN",
      id,
    ]);

    return result;
  }
  static async getEffectiveOrganizationPeriod(connection, classId) {
    const [[row]] = await connection.query(
      `
    SELECT
      cc.id,

      cc.organization_start_date,
      cc.organization_end_date,

      COALESCE(
        sessions.first_session_at,

        CASE
          WHEN cc.organization_start_date IS NOT NULL
          THEN TIMESTAMP(
            cc.organization_start_date,
            '00:00:00'
          )
          ELSE NULL
        END
      ) AS organization_start_at,

      COALESCE(
        sessions.last_session_at,

        CASE
          WHEN cc.organization_end_date IS NOT NULL
          THEN TIMESTAMP(
            cc.organization_end_date,
            '23:59:59'
          )
          ELSE NULL
        END
      ) AS organization_end_at

    FROM course_classes cc

    LEFT JOIN (
      SELECT
        class_id,

        MIN(
          TIMESTAMP(
            session_date,
            COALESCE(start_time, '00:00:00')
          )
        ) AS first_session_at,

        MAX(
          TIMESTAMP(
            session_date,
            COALESCE(
              end_time,
              start_time,
              '23:59:59'
            )
          )
        ) AS last_session_at

      FROM course_class_sessions

      GROUP BY class_id
    ) sessions
      ON sessions.class_id = cc.id

    WHERE cc.id = ?

    LIMIT 1
    `,
      [classId],
    );

    return row || null;
  }
  // Delete
  static async delete(id, adminId) {
    const [result] = await db.query(
      `
    UPDATE course_classes
    SET
      deleted_at = NOW(),
      deleted_by = ?
    WHERE id = ?
      AND deleted_at IS NULL
    `,
      [adminId, id],
    );

    return result;
  }
}

module.exports = CourseClassModel;
