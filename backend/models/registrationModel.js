const db = require("../config/db");

// ============================
// Chuyển query nhiều giá trị thành mảng
// Ví dụ: "18-25,26-35"
// ============================

function parseMultiValue(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ============================
// Thêm điều kiện IN (?, ?, ?)
// ============================

function addInFilter({ sql, params, column, values }) {
  if (values.length === 0) {
    return sql;
  }

  const placeholders = values.map(() => "?").join(", ");

  params.push(...values);

  return `
    ${sql}
    AND ${column} IN (${placeholders})
  `;
}

// ============================
// Tạo toàn bộ điều kiện lọc dùng chung
// ============================

function buildRegistrationFilters(query = {}) {
  let whereSql = `
    WHERE 1 = 1
  `;

  const params = [];
  // ============================
  // NHIỆM VỤ LỚP HỌC
  // ============================
  if (query.mission) {
    const mission = `%${String(query.mission).trim()}%`;

    whereSql += `
    AND c.mission LIKE ?
  `;

    params.push(mission);
  }
  // ============================
  // Tìm kiếm
  // ============================
  if (query.keyword) {
    const keyword = `%${String(query.keyword).trim()}%`;

    whereSql += `
    AND (
      u.fullname LIKE ?
      OR u.email LIKE ?
      OR u.phone LIKE ?
      OR u.company LIKE ?
      OR u.position LIKE ?
      OR tp.program_name LIKE ?
      OR c.course_name LIKE ?
      OR cc.class_name LIKE ?
      OR c.mission LIKE ?
    )
  `;

    params.push(
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
    );
  }

  // Nhóm tuổi

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "u.age_group",
    values: parseMultiValue(query.age_groups),
  });

  // Giới tính

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "u.gender",
    values: parseMultiValue(query.genders),
  });

  // Đơn vị

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "u.company",
    values: parseMultiValue(query.companies),
  });

  // Nhóm đối tượng

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "u.user_type",
    values: parseMultiValue(query.user_types),
  });

  // Lĩnh vực dự án

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "r.project_field",
    values: parseMultiValue(query.project_fields),
  });

  // Giai đoạn startup

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "r.startup_stage",
    values: parseMultiValue(query.startup_stages),
  });
  // ============================
  // Một khóa đào tạo
  // training_programs
  // ============================

  if (query.training_course_id) {
    const trainingCourseId = Number(query.training_course_id);

    if (Number.isInteger(trainingCourseId) && trainingCourseId > 0) {
      whereSql += `
      AND tp.id = ?
    `;

      params.push(trainingCourseId);
    }
  }

  // Một khóa học

  if (query.course_id) {
    whereSql += `
      AND c.id = ?
    `;

    params.push(Number(query.course_id));
  }

  // Nhiều khóa học

  const courseIds = parseMultiValue(query.course_ids)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "c.id",
    values: courseIds,
  });

  // Một lớp

  if (query.class_id) {
    whereSql += `
      AND cc.id = ?
    `;

    params.push(Number(query.class_id));
  }

  // Nhiều lớp

  const classIds = parseMultiValue(query.class_ids)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "cc.id",
    values: classIds,
  });
  // ============================
  // Lọc theo năm của đợt tổ chức
  // ============================

  if (query.year) {
    const year = Number(query.year);

    if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
      whereSql += `
      AND (
        YEAR(cc.register_open) = ?

        OR YEAR(cc.register_close) = ?

        OR (
          cc.register_open IS NULL
          AND cc.register_close IS NULL
          AND cc.schedule_note IS NOT NULL
          AND cc.schedule_note LIKE ?
        )
      )
    `;

      params.push(year, year, `%${year}%`);
    }
  }

  // ============================
  // Lọc theo tháng của đợt tổ chức
  // ============================

  if (query.month) {
    const month = Number(query.month);

    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      const monthRegex = `[0-9]{1,2}/0?${month}([^0-9]|$)`;

      whereSql += `
      AND (
        MONTH(cc.register_open) = ?

        OR MONTH(cc.register_close) = ?

        OR (
          cc.register_open IS NULL
          AND cc.register_close IS NULL
          AND cc.schedule_note IS NOT NULL

          AND (
            cc.schedule_note REGEXP ?
            OR LOWER(cc.schedule_note) LIKE ?
          )
        )
      )
    `;

      params.push(month, month, monthRegex, `%tháng ${month}%`);
    }
  }
  // Trạng thái đăng ký

  whereSql = addInFilter({
    sql: whereSql,
    params,
    column: "r.register_status",
    values: parseMultiValue(query.statuses || query.status),
  });

  // Có nữ founder/co-founder

  if (query.female_founder === "0" || query.female_founder === "1") {
    whereSql += `
      AND r.female_founder = ?
    `;

    params.push(Number(query.female_founder));
  }

  // Có dự án

  if (query.has_project === "0" || query.has_project === "1") {
    whereSql += `
      AND r.has_project = ?
    `;

    params.push(Number(query.has_project));
  }

  // Check-in

  if (query.checked_in === "0" || query.checked_in === "1") {
    whereSql += `
      AND r.checked_in = ?
    `;

    params.push(Number(query.checked_in));
  }

  // Từ ngày

  if (query.date_from) {
    whereSql += `
      AND r.created_at >= ?
    `;

    params.push(query.date_from);
  }

  // Đến ngày

  if (query.date_to) {
    whereSql += `
      AND r.created_at <= ?
    `;

    params.push(query.date_to);
  }

  return {
    whereSql,
    params,
  };
}
class RegistrationModel {
  static async checkRegistered(connection, userId, classId) {
    const [rows] = await connection.query(
      `
            SELECT id
            FROM registrations
            WHERE user_id = ?
            AND class_id = ?
            `,
      [userId, classId],
    );

    return rows.length > 0;
  }

  static async create(connection, data) {
    const [result] = await connection.query(
      `
INSERT INTO registrations(
  user_id,
  class_id,
  commitment_file,

  has_project,
  project_name,
  project_field,
  startup_stage,
  project_description,
  female_founder,
  team_size,
  incubation_status,

  program_selection_status,
  support_needs,
  organizer_question,

  register_status,

  qr_token,
  qr_generated_at
)
VALUES(
  ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW()
)
    `,
      [
        data.user_id,
        data.class_id,
        data.commitment_file || null,

        data.has_project ? 1 : 0,
        data.project_name || null,
        data.project_field || null,
        data.startup_stage || null,
        data.project_description || null,

        data.female_founder === true ||
        data.female_founder === 1 ||
        data.female_founder === "1"
          ? 1
          : data.female_founder === false ||
              data.female_founder === 0 ||
              data.female_founder === "0"
            ? 0
            : null,

        data.team_size || null,
        data.incubation_status || null,

        data.program_selection_status || null,
        data.support_needs || null,
        data.organizer_question || null,

        "CONFIRMED",

        data.qr_token,
      ],
    );

    return result.insertId;
  }
  // ============================
  // Danh sách đăng ký
  // ============================

  // ============================
  // Danh sách đăng ký
  // Có tìm kiếm, lọc nhiều lựa chọn và phân trang
  // ============================

  static async getAll(query = {}) {
    const { whereSql, params } = buildRegistrationFilters(query);

    let sql = `
    SELECT
      r.id,
      r.user_id,
      r.class_id,

      u.fullname,
      u.email,
      u.phone,
      u.gender,
      u.age_group,
      u.company,
      u.position,
      u.user_type,

   tp.id AS training_course_id,
tp.program_name AS training_course_name,

c.id AS course_id,
c.course_name,
c.course_name AS training_class_name,
c.mission,

cc.id AS opening_id,
cc.class_name,
cc.class_name AS opening_name,

cc.intake_name,
cc.trainer_name,
cc.location,
cc.register_open,
cc.register_close,
cc.schedule_note,

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

r.register_status,
r.note,
      r.checked_in,
      r.checked_in_at,
      r.created_at,
      r.updated_at

    FROM registrations r

    INNER JOIN users u
      ON r.user_id = u.id

    INNER JOIN course_classes cc
      ON r.class_id = cc.id

    INNER JOIN courses c
      ON cc.course_id = c.id

      
    INNER JOIN training_programs tp
  ON tp.id = c.program_id

    ${whereSql}
  `;

    switch (query.sort) {
      case "OLDEST":
        sql += `
        ORDER BY r.created_at ASC
      `;
        break;

      case "NAME_AZ":
        sql += `
        ORDER BY u.fullname ASC
      `;
        break;

      case "NAME_ZA":
        sql += `
        ORDER BY u.fullname DESC
      `;
        break;

      default:
        sql += `
        ORDER BY r.created_at DESC
      `;
    }

    const page = Math.max(Number(query.page) || 1, 1);

    const requestedLimit = Number(query.limit) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const offset = (page - 1) * limit;

    sql += `
    LIMIT ?
    OFFSET ?
  `;

    const finalParams = [...params, limit, offset];

    const [rows] = await db.query(sql, finalParams);

    return rows;
  }
  // ============================
  // Đếm tổng số đăng ký sau khi lọc
  // ============================

  static async countAll(query = {}) {
    const { whereSql, params } = buildRegistrationFilters(query);

    const sql = `
    SELECT
      COUNT(*) AS total

    FROM registrations r

    INNER JOIN users u
      ON r.user_id = u.id

    INNER JOIN course_classes cc
      ON r.class_id = cc.id

    INNER JOIN courses c
      ON cc.course_id = c.id
      INNER JOIN training_programs tp
  ON tp.id = c.program_id

    ${whereSql}
  `;

    const [rows] = await db.query(sql, params);

    return Number(rows[0]?.total || 0);
  }
  // ============================
  // Danh sách học viên đã đăng ký
  // Lọc dựa trên registrations
  // Nhưng mỗi học viên chỉ hiển thị một dòng
  // ============================
  static async getStudentsView(query = {}) {
    const { whereSql, params } = buildRegistrationFilters(query);

    let sql = `
    SELECT

      MAX(r.id) AS registration_id,

      u.id AS user_id,

      u.fullname,
      u.email,
      u.phone,
      u.gender,
      u.age_group,
      u.company,
      u.position,
      u.user_type,

      COUNT(DISTINCT r.id)
        AS matched_registrations,

      COUNT(DISTINCT c.id)
        AS matched_courses,
        GROUP_CONCAT(
  DISTINCT tp.program_name
  ORDER BY tp.program_name
  SEPARATOR ' | '
) AS matched_training_course_names,

GROUP_CONCAT(
  DISTINCT c.course_name
  ORDER BY c.course_name
  SEPARATOR ' | '
) AS matched_training_class_names,

GROUP_CONCAT(
  DISTINCT COALESCE(
    cc.intake_name,
    cc.class_name
  )
  ORDER BY COALESCE(
    cc.intake_name,
    cc.class_name
  )
  SEPARATOR ' | '
) AS matched_opening_names,

      GROUP_CONCAT(
        DISTINCT c.course_name
        ORDER BY c.course_name
        SEPARATOR ', '
      ) AS matched_course_names,

      GROUP_CONCAT(
        DISTINCT cc.class_name
        ORDER BY cc.class_name
        SEPARATOR ', '
      ) AS matched_class_names,

      GROUP_CONCAT(
        DISTINCT r.project_field
        ORDER BY r.project_field
        SEPARATOR ', '
      ) AS matched_project_fields,

      MAX(r.created_at)
        AS latest_register,

      (
        SELECT COUNT(DISTINCT r_all.id)

        FROM registrations r_all

        WHERE r_all.user_id = u.id
      ) AS total_all_registrations,

      (
        SELECT COUNT(
          DISTINCT cc_all.course_id
        )

        FROM registrations r_all

        INNER JOIN course_classes cc_all
          ON cc_all.id = r_all.class_id

        WHERE r_all.user_id = u.id
      ) AS total_all_courses

    FROM registrations r

    INNER JOIN users u
      ON r.user_id = u.id

    INNER JOIN course_classes cc
      ON r.class_id = cc.id

    INNER JOIN courses c
      ON cc.course_id = c.id
INNER JOIN training_programs tp
  ON tp.id = c.program_id
    ${whereSql}

    GROUP BY
      u.id,
      u.fullname,
      u.email,
      u.phone,
      u.gender,
      u.age_group,
      u.company,
      u.position,
      u.user_type
  `;

    switch (query.sort) {
      case "OLDEST":
        sql += `
        ORDER BY latest_register ASC
      `;
        break;

      case "NAME_AZ":
        sql += `
        ORDER BY u.fullname ASC
      `;
        break;

      case "NAME_ZA":
        sql += `
        ORDER BY u.fullname DESC
      `;
        break;

      default:
        sql += `
        ORDER BY latest_register DESC
      `;
    }

    const page = Math.max(Number(query.page) || 1, 1);

    const requestedLimit = Number(query.limit) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const offset = (page - 1) * limit;

    sql += `
    LIMIT ?
    OFFSET ?
  `;

    const finalParams = [...params, limit, offset];

    const [rows] = await db.query(sql, finalParams);

    return rows.map((item) => ({
      ...item,

      matched_registrations: Number(item.matched_registrations) || 0,

      matched_courses: Number(item.matched_courses) || 0,

      total_all_registrations: Number(item.total_all_registrations) || 0,

      total_all_courses: Number(item.total_all_courses) || 0,
    }));
  }
  // ============================
  // Đếm số học viên phù hợp bộ lọc
  // ============================
  static async countStudentsView(query = {}) {
    const { whereSql, params } = buildRegistrationFilters(query);

    const sql = `
    SELECT
      COUNT(DISTINCT u.id) AS total

    FROM registrations r

    INNER JOIN users u
      ON r.user_id = u.id

    INNER JOIN course_classes cc
      ON r.class_id = cc.id

    INNER JOIN courses c
      ON cc.course_id = c.id

    INNER JOIN training_programs tp
  ON tp.id = c.program_id
    ${whereSql}
  `;

    const [rows] = await db.query(sql, params);

    return Number(rows[0]?.total || 0);
  }
  // ============================
  // Lấy Registration theo ID
  // ============================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM registrations
      WHERE id = ?
      LIMIT 1
    `,
      [id],
    );

    return rows[0] || null;
  }
  // ============================
  // Lấy Registration theo ID với khóa
  // ============================
  static async findByIdWithConnection(connection, id) {
    const [rows] = await connection.query(
      `
      SELECT *
      FROM registrations
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
      [id],
    );

    return rows[0] || null;
  }

  // ============================
  // Xác nhận đăng ký
  // ============================

  static async confirm(connection, id) {
    const [result] = await connection.query(
      `
      UPDATE registrations

      SET register_status = 'CONFIRMED'

      WHERE id = ?
    `,
      [id],
    );

    return result;
  }
  // ============================
  // Từ chối đăng ký
  // ============================

  static async reject(connection, id, note) {
    const [result] = await connection.query(
      `
    UPDATE registrations
    SET
        register_status = 'REJECTED',
        note = ?
    WHERE id = ?
    `,
      [note, id],
    );

    return result;
  }

  // ============================
  static async cancel(connection, id, note) {
    const [result] = await connection.query(
      `
    UPDATE registrations

    SET
        register_status='CANCELLED',
        note=?

    WHERE id=?
    `,
      [note, id],
    );

    return result;
  }
  // ============================
  // Checkin học viên
  // ============================

  static async checkin(id) {
    await db.query(
      `

        UPDATE registrations

        SET

            checked_in=1,

            checked_in_at=NOW()

        WHERE id=?

        `,

      [id],
    );
  }
  // ============================
  // Thống kê đăng ký theo bộ lọc
  // ============================
  static async statistics(query = {}) {
    const { whereSql, params } = buildRegistrationFilters(query);

    const baseJoin = `
   FROM registrations r

INNER JOIN users u
  ON r.user_id = u.id

INNER JOIN course_classes cc
  ON r.class_id = cc.id

INNER JOIN courses c
  ON cc.course_id = c.id

INNER JOIN training_programs tp
  ON tp.id = c.program_id

${whereSql}
  `;

    const [
      [summaryRows],
      [genderRows],
      [ageRows],
      [genderAgeRows],
      [fieldRows],
      [stageRows],
      [founderRows],
      [courseRows],
      [statusRows],
      [classRows],
      [timelineRows],
      [topicRows],
      [classTopicRows],
    ] = await Promise.all([
      // Tổng quan
      db.query(
        `
        SELECT
          COUNT(*) AS total_registrations,
          COUNT(DISTINCT r.user_id) AS total_users,

          SUM(
            r.register_status = 'PENDING'
          ) AS pending,

          SUM(
            r.register_status = 'CONFIRMED'
          ) AS confirmed,

          SUM(
            r.register_status = 'REJECTED'
          ) AS rejected,

          SUM(
            r.register_status = 'CANCELLED'
          ) AS cancelled,

          SUM(
            r.checked_in = 1
          ) AS checked_in

        ${baseJoin}
      `,
        [...params],
      ),

      // Giới tính - đếm học viên, không đếm trùng lượt đăng ký
      db.query(
        `
  SELECT
    COALESCE(u.gender, 'UNKNOWN') AS name,
    COUNT(DISTINCT r.user_id) AS value

  ${baseJoin}

  GROUP BY u.gender
  ORDER BY value DESC
`,
        [...params],
      ),

      // Nhóm tuổi - đếm học viên, không đếm trùng lượt đăng ký
      db.query(
        `
  SELECT
    COALESCE(
      u.age_group,
      'Chưa xác định'
    ) AS name,

    COUNT(DISTINCT r.user_id) AS value

  ${baseJoin}

  GROUP BY u.age_group

  ORDER BY
    CASE u.age_group
      WHEN '18-25' THEN 1
      WHEN '26-35' THEN 2
      WHEN '36-45' THEN 3
      ELSE 4
    END
`,
        [...params],
      ),
      // ============================
      // Nhóm tuổi theo từng giới tính
      // Dùng cho drill-down:
      // click Nam/Nữ -> xem số người theo độ tuổi
      // ============================
      db.query(
        `
  SELECT
    COALESCE(
      u.gender,
      'UNKNOWN'
    ) AS gender,

    COALESCE(
      u.age_group,
      'Chưa xác định'
    ) AS age_group,

    COUNT(DISTINCT r.user_id) AS value

  ${baseJoin}

  GROUP BY
    u.gender,
    u.age_group

  ORDER BY
    CASE u.gender
      WHEN 'MALE' THEN 1
      WHEN 'FEMALE' THEN 2
      WHEN 'OTHER' THEN 3
      ELSE 4
    END,

    CASE u.age_group
      WHEN '18-25' THEN 1
      WHEN '26-35' THEN 2
      WHEN '36-45' THEN 3
      ELSE 4
    END
`,
        [...params],
      ),

      // Lĩnh vực dự án
      db.query(
        `
        SELECT
          COALESCE(
            r.project_field,
            'Chưa có dự án'
          ) AS name,

          COUNT(*) AS value

        ${baseJoin}

        GROUP BY r.project_field
        ORDER BY value DESC
      `,
        [...params],
      ),

      // Giai đoạn startup
      db.query(
        `
        SELECT
          COALESCE(
            r.startup_stage,
            'Chưa xác định'
          ) AS name,

          COUNT(*) AS value

        ${baseJoin}

        GROUP BY r.startup_stage
        ORDER BY value DESC
      `,
        [...params],
      ),

      // Nữ founder/co-founder
      db.query(
        `
        SELECT
          CASE
            WHEN r.female_founder = 1
              THEN 'Có'
            WHEN r.female_founder = 0
              THEN 'Không'
            ELSE 'Chưa cung cấp'
          END AS name,

          COUNT(*) AS value

        ${baseJoin}

        GROUP BY r.female_founder
        ORDER BY value DESC
      `,
        [...params],
      ),

      // ============================
      // Thống kê theo khóa học
      // ============================

      db.query(
        `
SELECT

c.course_name AS name,

COUNT(DISTINCT r.user_id) AS value


${baseJoin}


GROUP BY

c.id,
c.course_name


ORDER BY value DESC

`,
        [...params],
      ),

      // Trạng thái
      db.query(
        `
        SELECT
          r.register_status AS name,
          COUNT(*) AS value

        ${baseJoin}

        GROUP BY r.register_status
        ORDER BY value DESC
      `,
        [...params],
      ),
      // ============================
      // Thống kê lớp học
      // ============================

      db.query(
        `
SELECT

cc.class_name AS name,

COUNT(DISTINCT r.user_id) AS value


${baseJoin}


GROUP BY

cc.id,
cc.class_name


ORDER BY value DESC

`,
        [...params],
      ),

      // ============================
      // Xu hướng đăng ký theo thời gian
      // ============================

      db.query(
        `
SELECT

DATE_FORMAT(
r.created_at,
'%d/%m'
) AS name,


COUNT(DISTINCT r.user_id)
AS value


${baseJoin}


GROUP BY name


ORDER BY name ASC

`,
        [...params],
      ),
      // ============================
      // Thống kê theo chủ đề
      // ============================

      db.query(
        `
  SELECT
    CONCAT(c.course_name, ' - ', cc.class_name) AS name,
    c.course_name,
    cc.class_name,
    COUNT(DISTINCT r.user_id) AS value

  ${baseJoin}

  GROUP BY
    c.id,
    c.course_name,
    cc.id,
    cc.class_name

  ORDER BY value DESC
  `,
        [...params],
      ),
      db.query(
        `
  SELECT
    c.course_name,
    cc.class_name,
    COUNT(DISTINCT r.user_id) AS value

  ${baseJoin}

  GROUP BY
    c.id,
    c.course_name,
    cc.id,
    cc.class_name

  ORDER BY value DESC
  `,
        [...params],
      ),
    ]);

    const summary = summaryRows[0] || {};

    return {
      summary: {
        total_registrations: Number(summary.total_registrations) || 0,

        total_users: Number(summary.total_users) || 0,

        pending: Number(summary.pending) || 0,

        confirmed: Number(summary.confirmed) || 0,

        rejected: Number(summary.rejected) || 0,

        cancelled: Number(summary.cancelled) || 0,

        checked_in: Number(summary.checked_in) || 0,
      },

      charts: {
        genders: genderRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        age_groups: ageRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),
        gender_age_groups: genderAgeRows.map((item) => ({
          gender: item.gender,
          age_group: item.age_group,
          value: Number(item.value),
        })),
        project_fields: fieldRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        startup_stages: stageRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        female_founders: founderRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        courses: courseRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        classes: classRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        statuses: statusRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),

        timeline: timelineRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),
        topics: topicRows.map((item) => ({
          name: item.name,
          value: Number(item.value),
        })),
        class_topics: classTopicRows.map((item) => ({
          course: item.course_name,

          class: item.class_name,

          value: Number(item.value),
        })),
      },
    };
  }
  // ============================
  // Lấy dữ liệu cho bộ lọc Admin
  // ============================
  // ============================
  // Lấy dữ liệu cho bộ lọc Admin
  //
  // NGHIỆP VỤ MỚI:
  // training_courses = Khóa đào tạo
  // classes          = Lớp học
  // openings         = Đợt tổ chức
  // ============================
  static async getFilterOptions() {
    const [
      [ageGroups],
      [genders],
      [companies],
      [userTypes],
      [projectFields],
      [startupStages],
      [trainingCourses],
      [classes],
      [openings],
      [timeRows],
    ] = await Promise.all([
      // =====================================================
      // NHÓM TUỔI
      // =====================================================
      db.query(`
      SELECT DISTINCT
        age_group AS value

      FROM users

      WHERE age_group IS NOT NULL
        AND TRIM(age_group) <> ''

      ORDER BY age_group
    `),

      // =====================================================
      // GIỚI TÍNH
      // =====================================================
      db.query(`
      SELECT DISTINCT
        gender AS value

      FROM users

      WHERE gender IS NOT NULL
        AND TRIM(gender) <> ''

      ORDER BY gender
    `),

      // =====================================================
      // ĐƠN VỊ
      // =====================================================
      db.query(`
      SELECT DISTINCT
        company AS value

      FROM users

      WHERE company IS NOT NULL
        AND TRIM(company) <> ''

      ORDER BY company
    `),

      // =====================================================
      // NHÓM ĐỐI TƯỢNG
      // =====================================================
      db.query(`
      SELECT DISTINCT
        user_type AS value

      FROM users

      WHERE user_type IS NOT NULL
        AND TRIM(user_type) <> ''

      ORDER BY user_type
    `),

      // =====================================================
      // LĨNH VỰC DỰ ÁN
      // =====================================================
      db.query(`
      SELECT DISTINCT
        project_field AS value

      FROM registrations

      WHERE project_field IS NOT NULL
        AND TRIM(project_field) <> ''

      ORDER BY project_field
    `),

      // =====================================================
      // GIAI ĐOẠN STARTUP
      // =====================================================
      db.query(`
      SELECT DISTINCT
        startup_stage AS value

      FROM registrations

      WHERE startup_stage IS NOT NULL
        AND TRIM(startup_stage) <> ''

      ORDER BY startup_stage
    `),

      // =====================================================
      // KHÓA ĐÀO TẠO
      // training_programs
      // =====================================================
      db.query(`
      SELECT
        tp.id,
        tp.program_name AS name,
        tp.status

      FROM training_programs tp

      ORDER BY tp.program_name
    `),

      // =====================================================
      // LỚP HỌC
      // courses
      // =====================================================
      db.query(`
      SELECT
        c.id,
        c.course_name AS name,

        c.program_id AS training_course_id,

        tp.program_name AS training_course_name,

        c.status

      FROM courses c

      INNER JOIN training_programs tp
        ON tp.id = c.program_id

      ORDER BY
        tp.program_name,
        c.course_name
    `),

      // =====================================================
      // ĐỢT TỔ CHỨC
      // course_classes
      // =====================================================
      db.query(`
      SELECT
        cc.id,

        cc.course_id,

        c.program_id AS training_course_id,

        COALESCE(
          NULLIF(TRIM(cc.intake_name), ''),
          NULLIF(TRIM(cc.class_name), ''),
          CONCAT('Đợt #', cc.id)
        ) AS name,

        cc.class_name,

        cc.intake_name,

        cc.class_code,

        cc.trainer_name,

        cc.location,

        cc.register_open,

        cc.register_close,

        cc.schedule_note,

        cc.status,

        c.course_name AS class_name_parent,

        tp.program_name AS training_course_name

      FROM course_classes cc

      INNER JOIN courses c
        ON c.id = cc.course_id

      INNER JOIN training_programs tp
        ON tp.id = c.program_id

      ORDER BY
        tp.program_name,
        c.course_name,
        cc.id DESC
    `),

      // =====================================================
      // DỮ LIỆU ĐỂ LẤY NĂM
      // =====================================================
      db.query(`
      SELECT
        register_open,
        register_close,
        schedule_note

      FROM course_classes
    `),
    ]);

    // =======================================================
    // LẤY DANH SÁCH NĂM ĐỘNG
    //
    // Dữ liệu mới:
    // register_open/register_close
    //
    // Dữ liệu cũ:
    // schedule_note
    // =======================================================

    const yearSet = new Set();

    for (const item of timeRows) {
      if (item.register_open) {
        const date = new Date(item.register_open);

        if (!Number.isNaN(date.getTime())) {
          yearSet.add(date.getFullYear());
        }
      }

      if (item.register_close) {
        const date = new Date(item.register_close);

        if (!Number.isNaN(date.getTime())) {
          yearSet.add(date.getFullYear());
        }
      }

      if (item.schedule_note) {
        const matches = String(item.schedule_note).match(/\b(20\d{2})\b/g);

        if (matches) {
          for (const year of matches) {
            yearSet.add(Number(year));
          }
        }
      }
    }

    const years = [...yearSet].sort((a, b) => b - a);

    // =======================================================
    // RESPONSE
    // =======================================================

    return {
      age_groups: ageGroups.map((item) => item.value),

      genders: genders.map((item) => item.value),

      companies: companies.map((item) => item.value),

      user_types: userTypes.map((item) => item.value),

      project_fields: projectFields.map((item) => item.value),

      startup_stages: startupStages.map((item) => item.value),

      // NGHIỆP VỤ MỚI
      training_courses: trainingCourses,

      classes,

      openings,

      years,

      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

      registration_statuses: ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"],

      // =====================================================
      // TẠM GIỮ TƯƠNG THÍCH FE CŨ
      //
      // Sau khi FE mới chạy ổn mình xóa 2 field này sau.
      // =====================================================
      courses: classes,

      legacy_classes: openings,
    };
  }
  // ============================
  // Xuất danh sách theo bộ lọc
  // Không áp dụng pagination
  // ============================
  static async exportData(query = {}) {
    const filterResult = buildRegistrationFilters(query);

    let whereSql = filterResult.whereSql;

    const params = [...filterResult.params];

    // ============================
    // Lọc theo một học viên
    // ============================

    if (query.user_id) {
      const userId = Number(query.user_id);

      if (Number.isInteger(userId) && userId > 0) {
        whereSql += `
        AND u.id = ?
      `;

        params.push(userId);
      }
    }

    const sql = `
    SELECT
      r.id AS registration_id,

      u.id AS user_id,
      u.fullname,
      u.email,
      u.phone,
      u.gender,
      u.age_group,
      u.company,
      u.position,
      u.user_type,

      tp.id AS training_course_id,
      tp.program_name
        AS training_course_name,

   c.id AS course_id,
c.course_name
  AS training_class_name,
c.mission,

cc.id AS opening_id,
      cc.class_name
        AS opening_name,
      cc.intake_name,
      cc.class_code,
      cc.trainer_name,
      cc.location,
      cc.register_open,
      cc.register_close,
      cc.schedule_note,

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
r.register_status,
      r.note,
      r.checked_in,
      r.checked_in_at,
      r.created_at

    FROM registrations r

    INNER JOIN users u
      ON r.user_id = u.id

    INNER JOIN course_classes cc
      ON r.class_id = cc.id

    INNER JOIN courses c
      ON cc.course_id = c.id

    INNER JOIN training_programs tp
      ON tp.id = c.program_id

    ${whereSql}

    ORDER BY r.created_at DESC
  `;

    const [rows] = await db.query(sql, params);

    return rows;
  }
}

module.exports = RegistrationModel;
