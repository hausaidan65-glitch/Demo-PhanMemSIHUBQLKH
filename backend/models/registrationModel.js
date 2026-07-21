const db = require("../config/db");

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
                project_field,
                startup_stage,
                project_description,
                incubation_status,
                register_status

            )

            VALUES(

                ?,?,?,?,?,?,?,?,?

            )
            `,
      [
        data.user_id,
        data.class_id,
        data.commitment_file,
        data.has_project,
        data.project_field,
        data.startup_stage,
        data.project_description,
        data.incubation_status,
        "PENDING",
      ],
    );

    return result.insertId;
  }
  // ============================
  // Danh sách đăng ký
  // ============================

  static async getAll(query) {
    let sql = `

    SELECT

        r.id,

        u.fullname,

        u.email,

        u.phone,

        c.course_name,

        cc.class_name,

        r.register_status,

        r.checked_in,

        r.created_at

    FROM registrations r

    INNER JOIN users u
        ON r.user_id=u.id

    INNER JOIN course_classes cc
        ON r.class_id=cc.id

    INNER JOIN courses c
        ON cc.course_id=c.id

    WHERE 1=1

    `;

    const params = [];
    if (query.keyword) {
      sql += `

    AND(

        u.fullname LIKE ?

        OR u.email LIKE ?

        OR u.phone LIKE ?

    )

    `;

      const keyword = `%${query.keyword}%`;

      params.push(keyword, keyword, keyword);
    }
    if (query.course_id) {
      sql += `

    AND c.id=?

    `;

      params.push(query.course_id);
    }
    if (query.class_id) {
      sql += `

    AND cc.id=?

    `;

      params.push(query.class_id);
    }
    if (query.status) {
      sql += `

    AND r.register_status=?

    `;

      params.push(query.status);
    }
    sql += `

ORDER BY r.created_at DESC

`;
    const page = Number(query.page) || 1;

    const limit = Number(query.limit) || 10;

    const offset = (page - 1) * limit;

    sql += `

LIMIT ?

OFFSET ?

`;

    params.push(limit, offset);

    const [rows] = await db.query(sql, params);

    return rows;
  }
  // ============================
  // Lấy Registration theo ID
  // ============================

  static async findById(connection, id) {
    const [rows] = await connection.query(
      `
    SELECT *
    FROM registrations
    WHERE id = ?
    `,
      [id],
    );

    return rows[0];
  }
  // ============================
  // Xác nhận đăng ký
  // ============================

  static async confirm(id) {
    await db.query(
      `

        UPDATE registrations

        SET register_status='CONFIRMED'

        WHERE id=?

        `,

      [id],
    );
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
  // Export danh sách
  // ============================

  static async exportData() {
    const [rows] = await db.query(`
        SELECT

            u.fullname,
            u.email,
            u.phone,

            c.course_name,

            cc.class_name,

            r.register_status,

            r.checked_in,

            r.created_at

        FROM registrations r

        INNER JOIN users u
            ON r.user_id=u.id

        INNER JOIN course_classes cc
            ON r.class_id=cc.id

        INNER JOIN courses c
            ON cc.course_id=c.id

        ORDER BY r.created_at DESC
    `);

    return rows;
  }
}

module.exports = RegistrationModel;
