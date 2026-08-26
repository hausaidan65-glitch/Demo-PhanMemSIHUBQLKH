const db = require("../config/db");

class CourseAttendanceModel {
  // ============================
  // Tìm registration theo QR token
  // ============================
  static async findRegistrationByQrToken(qrToken) {
    const [rows] = await db.query(
      `
      SELECT
        r.id AS registration_id,
        r.user_id,
        r.class_id,
        r.register_status,
        r.checked_in,
        r.checked_in_at,
        r.created_at AS registered_at,

        r.has_project,
        r.project_name,
        r.project_field,
        r.startup_stage,
        r.project_description,
        r.female_founder,
        r.team_size,
        r.incubation_status,
        r.program_selection_status,
        r.support_needs,
        r.organizer_question,

        u.fullname,
        u.email,
        u.phone,
        u.gender,
        u.age_group,
        u.company,
        u.position,
        u.user_type,

        cc.id AS opening_id,
        cc.class_name,
        cc.intake_name,
        cc.class_code,
        cc.trainer_name,
        cc.location,
        cc.register_open,
        cc.register_close,
        cc.schedule_note,
        cc.status AS class_status,

        c.id AS course_id,
        c.course_name,
        c.mission,

        tp.id AS training_program_id,
        tp.program_name AS training_program_name

      FROM registrations r

      INNER JOIN users u
        ON u.id = r.user_id

      INNER JOIN course_classes cc
        ON cc.id = r.class_id

      INNER JOIN courses c
        ON c.id = cc.course_id

      INNER JOIN training_programs tp
        ON tp.id = c.program_id

      WHERE r.qr_token = ?

      LIMIT 1
      `,
      [qrToken],
    );

    return rows[0] || null;
  }
  static async findSessionById(sessionId) {
    const [rows] = await db.query(
      `
    SELECT
      id,
      class_id,
      session_no,

      DATE_FORMAT(
        session_date,
        '%Y-%m-%d'
      ) AS session_date,

      TIME_FORMAT(
        start_time,
        '%H:%i:%s'
      ) AS start_time,

      TIME_FORMAT(
        end_time,
        '%H:%i:%s'
      ) AS end_time,

      location,
      room,
      note

    FROM course_class_sessions

    WHERE id = ?

    LIMIT 1
    `,
      [sessionId],
    );

    return rows[0] || null;
  }
  static async findAttendance(connection, registrationId, sessionId) {
    const [rows] = await connection.query(
      `
    SELECT
      id,
      registration_id,
      session_id,
      checked_in_at,
      checkin_method,
      checked_in_by
    FROM course_class_attendances
    WHERE registration_id = ?
      AND session_id = ?
    LIMIT 1
    `,
      [registrationId, sessionId],
    );

    return rows[0] || null;
  }
  static async createAttendance(
    connection,
    { registrationId, sessionId, checkedInBy = null },
  ) {
    const [result] = await connection.query(
      `
    INSERT INTO course_class_attendances
    (
      registration_id,
      session_id,
      checked_in_at,
      checkin_method,
      checked_in_by
    )
    VALUES (?, ?, NOW(), 'QR', ?)
    `,
      [registrationId, sessionId, checkedInBy],
    );

    return result.insertId;
  }
  static async markRegistrationCheckedIn(connection, registrationId) {
    await connection.query(
      `
    UPDATE registrations
    SET
      checked_in = 1,
      checked_in_at = COALESCE(
        checked_in_at,
        NOW()
      )
    WHERE id = ?
    `,
      [registrationId],
    );
  }
  static async getSessionsByClassId(classId) {
    const [rows] = await db.query(
      `
    SELECT
      s.id,
      s.class_id,
      s.session_no,

      DATE_FORMAT(
        s.session_date,
        '%Y-%m-%d'
      ) AS session_date,

      TIME_FORMAT(
        s.start_time,
        '%H:%i:%s'
      ) AS start_time,

      TIME_FORMAT(
        s.end_time,
        '%H:%i:%s'
      ) AS end_time,

      s.location,
      s.room,
      s.note,

      COUNT(
        DISTINCT CASE
          WHEN r.register_status = 'CONFIRMED'
          THEN r.id
        END
      ) AS total_registered,

      COUNT(
        DISTINCT a.registration_id
      ) AS total_checked_in

    FROM course_class_sessions s

    LEFT JOIN registrations r
      ON r.class_id = s.class_id
      AND r.register_status = 'CONFIRMED'

    LEFT JOIN course_class_attendances a
      ON a.registration_id = r.id
      AND a.session_id = s.id

    WHERE s.class_id = ?

    GROUP BY
      s.id,
      s.class_id,
      s.session_no,
      s.session_date,
      s.start_time,
      s.end_time,
      s.location,
      s.room,
      s.note

    ORDER BY
      s.session_no ASC,
      s.session_date ASC
    `,
      [classId],
    );

    return rows;
  }
  static async getSessionAttendanceList(sessionId) {
    const [rows] = await db.query(
      `
    SELECT
      r.id AS registration_id,

      u.id AS user_id,
      u.fullname,
      u.email,
      u.phone,
      u.company,
      u.position,
      u.user_type,

      CASE
        WHEN a.id IS NOT NULL THEN 1
        ELSE 0
      END AS checked_in,

      a.id AS attendance_id,

      DATE_FORMAT(
        a.checked_in_at,
        '%Y-%m-%d %H:%i:%s'
      ) AS checked_in_at,

      a.checkin_method,
      a.checked_in_by

    FROM course_class_sessions s

    INNER JOIN registrations r
      ON r.class_id = s.class_id
      AND r.register_status = 'CONFIRMED'

    INNER JOIN users u
      ON u.id = r.user_id

    LEFT JOIN course_class_attendances a
      ON a.registration_id = r.id
      AND a.session_id = s.id

    WHERE s.id = ?

    ORDER BY
      checked_in DESC,
      u.fullname ASC
    `,
      [sessionId],
    );

    return rows;
  }
}

module.exports = CourseAttendanceModel;
