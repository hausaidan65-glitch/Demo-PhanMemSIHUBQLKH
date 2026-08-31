const db = require("../config/db");

const PARTICIPANT_GROUPS = [
  { code: "STARTUP", name: "Startup" },
  { code: "STUDENT", name: "Sinh viên" },
  { code: "LECTURER", name: "Giảng viên" },
  { code: "COOPERATIVE", name: "HTX" },
  { code: "OTHER", name: "Nhóm khác" },
];

class CourseReportModel {
  static async getSummary(reportStart, reportEnd) {
    const filteredOpeningsSql = `
      SELECT
        cc.id,
        cc.course_id,
        cc.organization_start_date,
        cc.organization_end_date

      FROM course_classes cc

      INNER JOIN courses c
        ON c.id = cc.course_id

      WHERE cc.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND cc.organization_start_date IS NOT NULL
        AND cc.organization_end_date IS NOT NULL
        AND cc.organization_start_date <= cc.organization_end_date
        AND cc.organization_start_date <= ?
        AND cc.organization_end_date >= ?
    `;

    const [summaryRows] = await db.query(
      `
        WITH filtered_openings AS (
          ${filteredOpeningsSql}
        )

        SELECT
          (SELECT COUNT(DISTINCT course_id) FROM filtered_openings)
            AS total_courses,

          (SELECT COUNT(*) FROM filtered_openings)
            AS total_openings,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_end_date < CURRENT_DATE()
          ) AS finished_openings,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_start_date <= CURRENT_DATE()
              AND organization_end_date >= CURRENT_DATE()
          ) AS ongoing_openings,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_start_date > CURRENT_DATE()
          ) AS upcoming_openings,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM registrations r
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
            WHERE r.register_status IN ('PENDING', 'CONFIRMED')
              AND r.user_id IS NOT NULL
          ) AS total_students_registered,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM course_class_attendances a
            INNER JOIN registrations r
              ON r.id = a.registration_id
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
          ) AS total_students_attended,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM course_certificates cert
            INNER JOIN registrations r
              ON r.id = cert.registration_id
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
            WHERE cert.issued = 1
          ) AS total_certificates_issued
      `,
      [reportEnd, reportStart],
    );

    const [participantRows] = await db.query(
      `
        WITH filtered_openings AS (
          ${filteredOpeningsSql}
        ),

        registered_students AS (
          SELECT DISTINCT
            r.user_id

          FROM registrations r

          INNER JOIN filtered_openings fo
            ON fo.id = r.class_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL
        )

        SELECT
          CASE
            WHEN UPPER(TRIM(COALESCE(u.user_type, ''))) = 'STARTUP'
              THEN 'STARTUP'

            WHEN UPPER(TRIM(COALESCE(u.user_type, ''))) = 'STUDENT'
              THEN 'STUDENT'

            ELSE 'OTHER'
          END AS code,

          COUNT(*) AS value

        FROM registered_students rs

        LEFT JOIN users u
          ON u.id = rs.user_id

        GROUP BY code
      `,
      [reportEnd, reportStart],
    );

    const summaryRow = summaryRows[0] || {};
    const participantValueMap = new Map(
      participantRows.map((item) => [item.code, Number(item.value) || 0]),
    );

    return {
      summary: {
        total_courses: Number(summaryRow.total_courses) || 0,
        total_openings: Number(summaryRow.total_openings) || 0,
        finished_openings: Number(summaryRow.finished_openings) || 0,
        ongoing_openings: Number(summaryRow.ongoing_openings) || 0,
        upcoming_openings: Number(summaryRow.upcoming_openings) || 0,
        total_students_registered:
          Number(summaryRow.total_students_registered) || 0,
        total_students_attended:
          Number(summaryRow.total_students_attended) || 0,
        total_certificates_issued:
          Number(summaryRow.total_certificates_issued) || 0,
      },
      participant_groups: PARTICIPANT_GROUPS.map((group) => ({
        ...group,
        value: participantValueMap.get(group.code) || 0,
      })),
    };
  }

  static async getPrograms(reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            c.id AS course_id,
            c.program_id,
            tp.program_name

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          INNER JOIN training_programs tp
            ON tp.id = c.program_id

          WHERE cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        openings_by_program AS (
          SELECT
            program_id,
            program_name,
            COUNT(DISTINCT course_id) AS total_courses,
            COUNT(DISTINCT opening_id) AS total_openings

          FROM filtered_openings

          GROUP BY program_id, program_name
        ),

        registered_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.program_id
        ),

        attended_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.program_id
        ),

        certificates_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.program_id
        )

        SELECT
          op.program_id,
          op.program_name,
          op.total_courses,
          op.total_openings,
          COALESCE(rp.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(ap.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(cp.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM openings_by_program op

        LEFT JOIN registered_by_program rp
          ON rp.program_id = op.program_id

        LEFT JOIN attended_by_program ap
          ON ap.program_id = op.program_id

        LEFT JOIN certificates_by_program cp
          ON cp.program_id = op.program_id

        ORDER BY op.program_id ASC
      `,
      [reportEnd, reportStart],
    );

    return rows.map((item) => ({
      program_id: Number(item.program_id),
      program_name: item.program_name,
      total_courses: Number(item.total_courses) || 0,
      total_openings: Number(item.total_openings) || 0,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async findProgramById(programId) {
    const [rows] = await db.query(
      `
        SELECT
          id AS program_id,
          program_name

        FROM training_programs

        WHERE id = ?

        LIMIT 1
      `,
      [programId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      program_id: Number(rows[0].program_id),
      program_name: rows[0].program_name,
    };
  }

  static async getCoursesByProgram(programId, reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            c.id AS course_id,
            c.course_name

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          WHERE cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND c.program_id = ?
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        openings_by_course AS (
          SELECT
            course_id,
            course_name,
            COUNT(DISTINCT opening_id) AS total_openings

          FROM filtered_openings

          GROUP BY course_id, course_name
        ),

        registered_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.course_id
        ),

        attended_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.course_id
        ),

        certificates_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.course_id
        )

        SELECT
          oc.course_id,
          oc.course_name,
          oc.total_openings,
          COALESCE(rc.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(ac.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(cc.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM openings_by_course oc

        LEFT JOIN registered_by_course rc
          ON rc.course_id = oc.course_id

        LEFT JOIN attended_by_course ac
          ON ac.course_id = oc.course_id

        LEFT JOIN certificates_by_course cc
          ON cc.course_id = oc.course_id

        ORDER BY oc.course_id ASC
      `,
      [programId, reportEnd, reportStart],
    );

    return rows.map((item) => ({
      course_id: Number(item.course_id),
      course_name: item.course_name,
      total_openings: Number(item.total_openings) || 0,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async findCourseById(courseId) {
    const [rows] = await db.query(
      `
        SELECT
          id AS course_id,
          course_name

        FROM courses

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [courseId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      course_id: Number(rows[0].course_id),
      course_name: rows[0].course_name,
    };
  }

  static async getOpeningsByCourse(courseId, reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            cc.class_name,
            cc.class_code,
            cc.organization_start_date,
            cc.organization_end_date,
            cc.location,
            cc.status AS operational_status

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          WHERE cc.course_id = ?
            AND cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        registered_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.opening_id
        ),

        attended_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.opening_id
        ),

        certificates_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.opening_id
        )

        SELECT
          fo.opening_id,
          fo.class_name,
          fo.class_code,
          DATE_FORMAT(fo.organization_start_date, '%Y-%m-%d')
            AS organization_start_date,
          DATE_FORMAT(fo.organization_end_date, '%Y-%m-%d')
            AS organization_end_date,
          fo.location,
          fo.operational_status,
          CASE
            WHEN fo.organization_end_date < CURRENT_DATE()
              THEN 'FINISHED'
            WHEN fo.organization_start_date <= CURRENT_DATE()
              AND fo.organization_end_date >= CURRENT_DATE()
              THEN 'ONGOING'
            WHEN fo.organization_start_date > CURRENT_DATE()
              THEN 'UPCOMING'
          END AS organization_status,
          COALESCE(ro.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(ao.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(co.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM filtered_openings fo

        LEFT JOIN registered_by_opening ro
          ON ro.opening_id = fo.opening_id

        LEFT JOIN attended_by_opening ao
          ON ao.opening_id = fo.opening_id

        LEFT JOIN certificates_by_opening co
          ON co.opening_id = fo.opening_id

        ORDER BY fo.opening_id ASC
      `,
      [courseId, reportEnd, reportStart],
    );

    return rows.map((item) => ({
      opening_id: Number(item.opening_id),
      class_name: item.class_name,
      class_code: item.class_code,
      organization_start_date: item.organization_start_date,
      organization_end_date: item.organization_end_date,
      location: item.location,
      operational_status: item.operational_status,
      organization_status: item.organization_status,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async findOpeningById(openingId) {
    const [rows] = await db.query(
      `
        SELECT
          cc.id AS opening_id,
          c.id AS course_id,
          c.course_name,
          cc.class_name,
          cc.class_code,
          DATE_FORMAT(cc.organization_start_date, '%Y-%m-%d')
            AS organization_start_date,
          DATE_FORMAT(cc.organization_end_date, '%Y-%m-%d')
            AS organization_end_date,
          cc.location

        FROM course_classes cc

        INNER JOIN courses c
          ON c.id = cc.course_id

        WHERE cc.id = ?
          AND cc.deleted_at IS NULL
          AND c.deleted_at IS NULL

        LIMIT 1
      `,
      [openingId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      opening_id: Number(rows[0].opening_id),
      course_id: Number(rows[0].course_id),
      course_name: rows[0].course_name,
      class_name: rows[0].class_name,
      class_code: rows[0].class_code,
      organization_start_date: rows[0].organization_start_date,
      organization_end_date: rows[0].organization_end_date,
      location: rows[0].location,
    };
  }

  static async getStudentsByOpening(openingId) {
    const [rows] = await db.query(
      `
        WITH session_count AS (
          SELECT
            COUNT(DISTINCT id) AS total_sessions

          FROM course_class_sessions

          WHERE class_id = ?
        ),

        attendance_by_registration AS (
          SELECT
            a.registration_id,
            COUNT(DISTINCT a.session_id) AS attended_sessions

          FROM course_class_attendances a

          INNER JOIN course_class_sessions s
            ON s.id = a.session_id
            AND s.class_id = ?

          GROUP BY a.registration_id
        ),

        certificate_by_registration AS (
          SELECT
            cert.registration_id,
            MAX(cert.eligible) AS certificate_eligible,
            MAX(cert.issued) AS certificate_issued,
            MAX(cert.certificate_no) AS certificate_no

          FROM course_certificates cert

          GROUP BY cert.registration_id
        )

        SELECT
          r.id AS registration_id,
          r.user_id,
          u.fullname AS full_name,
          u.email,
          u.phone,
          u.gender,
          u.user_type,
          u.company,
          u.position,
          r.register_status,
          CASE
            WHEN COALESCE(ar.attended_sessions, 0) > 0 THEN 1
            ELSE 0
          END AS attended,
          COALESCE(ar.attended_sessions, 0) AS attended_sessions,
          sc.total_sessions,
          CASE
            WHEN sc.total_sessions > 0 THEN ROUND(
              COALESCE(ar.attended_sessions, 0) * 100.0 / sc.total_sessions,
              2
            )
            ELSE 0
          END AS attendance_rate,
          COALESCE(cr.certificate_eligible, 0) AS certificate_eligible,
          COALESCE(cr.certificate_issued, 0) AS certificate_issued,
          cr.certificate_no

        FROM registrations r

        CROSS JOIN session_count sc

        LEFT JOIN users u
          ON u.id = r.user_id

        LEFT JOIN attendance_by_registration ar
          ON ar.registration_id = r.id

        LEFT JOIN certificate_by_registration cr
          ON cr.registration_id = r.id

        WHERE r.class_id = ?
          AND r.register_status IN ('PENDING', 'CONFIRMED')
          AND r.user_id IS NOT NULL

        ORDER BY u.fullname ASC, r.id ASC
      `,
      [openingId, openingId, openingId],
    );

    return rows.map((item) => ({
      registration_id: Number(item.registration_id),
      user_id: Number(item.user_id),
      full_name: item.full_name,
      email: item.email,
      phone: item.phone,
      gender: item.gender,
      user_type: item.user_type,
      company: item.company,
      position: item.position,
      register_status: item.register_status,
      attended: Boolean(Number(item.attended)),
      attended_sessions: Number(item.attended_sessions) || 0,
      total_sessions: Number(item.total_sessions) || 0,
      attendance_rate: Number(item.attendance_rate) || 0,
      certificate_eligible: Boolean(Number(item.certificate_eligible)),
      certificate_issued: Boolean(Number(item.certificate_issued)),
      certificate_no: item.certificate_no,
    }));
  }

  static async findStudentRegistration(openingId, registrationId) {
    const [rows] = await db.query(
      `
        SELECT
          r.id AS registration_id,
          r.user_id,
          u.fullname AS full_name,
          u.email,
          u.phone,
          r.register_status

        FROM registrations r

        LEFT JOIN users u
          ON u.id = r.user_id

        WHERE r.id = ?
          AND r.class_id = ?
          AND r.register_status IN ('PENDING', 'CONFIRMED')
          AND r.user_id IS NOT NULL

        LIMIT 1
      `,
      [registrationId, openingId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      registration_id: Number(rows[0].registration_id),
      user_id: Number(rows[0].user_id),
      full_name: rows[0].full_name,
      email: rows[0].email,
      phone: rows[0].phone,
      register_status: rows[0].register_status,
    };
  }

  static async getAttendanceHistory(openingId, registrationId) {
    const [rows] = await db.query(
      `
        SELECT
          s.id AS session_id,
          s.session_no,
          DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
          TIME_FORMAT(s.start_time, '%H:%i:%s') AS start_time,
          TIME_FORMAT(s.end_time, '%H:%i:%s') AS end_time,
          s.location,
          s.room,
          s.note,
          CASE
            WHEN a.id IS NOT NULL THEN 1
            ELSE 0
          END AS checked_in,
          DATE_FORMAT(a.checked_in_at, '%Y-%m-%d %H:%i:%s')
            AS checked_in_at,
          a.checkin_method

        FROM course_class_sessions s

        LEFT JOIN course_class_attendances a
          ON a.session_id = s.id
          AND a.registration_id = ?

        WHERE s.class_id = ?

        ORDER BY
          s.session_no ASC,
          s.session_date ASC,
          s.start_time ASC,
          s.id ASC
      `,
      [registrationId, openingId],
    );

    return rows.map((item) => ({
      session_id: Number(item.session_id),
      session_no:
        item.session_no === null ? null : Number(item.session_no),
      session_date: item.session_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      room: item.room,
      note: item.note,
      checked_in: Boolean(Number(item.checked_in)),
      checked_in_at: item.checked_in_at,
      checkin_method: item.checkin_method,
    }));
  }
}

module.exports = CourseReportModel;
