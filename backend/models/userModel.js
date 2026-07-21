const db = require("../config/db");

class UserModel {
  // ============================
  // Danh sách học viên
  // ============================

  static async getAll(query) {
    let sql = `

    SELECT

        u.id,
        u.fullname,
        u.email,
        u.phone,

        COUNT(DISTINCT r.id) total_courses,

        GROUP_CONCAT(
            DISTINCT c.course_name
            ORDER BY c.course_name
            SEPARATOR ', '
        ) courses,

        MAX(r.created_at) latest_register

    FROM users u

    LEFT JOIN registrations r
        ON u.id=r.user_id

    LEFT JOIN course_classes cc
        ON r.class_id=cc.id

    LEFT JOIN courses c
        ON cc.course_id=c.id

    WHERE 1=1

    `;

    const params = [];

    // ============================
    // Search
    // ============================

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

    // ============================
    // Course
    // ============================

    if (query.course_id) {
      sql += `

        AND c.id=?

        `;

      params.push(query.course_id);
    }

    // ============================
    // Class
    // ============================

    if (query.class_id) {
      sql += `

        AND cc.id=?

        `;

      params.push(query.class_id);
    }

    // ============================
    // Registration Status
    // ============================

    if (query.status) {
      sql += `

        AND r.register_status=?

        `;

      params.push(query.status);
    }

    sql += `

    GROUP BY u.id

    `;

    // ============================
    // Sort
    // ============================

    switch (query.sort) {
      case "A-Z":
        sql += " ORDER BY u.fullname ASC";
        break;

      case "Z-A":
        sql += " ORDER BY u.fullname DESC";
        break;

      case "OLDEST":
        sql += " ORDER BY latest_register ASC";
        break;

      default:
        sql += " ORDER BY latest_register DESC";
    }

    const [rows] = await db.query(sql, params);

    return rows;

    // ============================
    // Pagination
    // ============================

    const page = Number(query.page) || 1;

    const limit = Number(query.limit) || 10;

    const offset = (page - 1) * limit;

    sql += `

        LIMIT ?

        OFFSET ?

        `;

    params.push(limit);

    params.push(offset);
  }
  // ============================
  // Chi tiết học viên
  // ============================

  static async getById(id) {
    const [rows] = await db.query(
      `

        SELECT

            u.id,

            u.fullname,

            u.email,

            u.phone,

            c.id course_id,

            c.course_name,

            cc.class_name,

            r.register_status,

            r.created_at

        FROM users u

        LEFT JOIN registrations r

            ON u.id=r.user_id

        LEFT JOIN course_classes cc

            ON r.class_id=cc.id

        LEFT JOIN courses c

            ON cc.course_id=c.id

        WHERE u.id=?

        ORDER BY c.course_name ASC

    `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    const user = {
      id: rows[0].id,

      fullname: rows[0].fullname,

      email: rows[0].email,

      phone: rows[0].phone,

      total_courses: rows.length,

      courses: [],
    };

    rows.forEach((item) => {
      user.courses.push({
        course_id: item.course_id,

        course_name: item.course_name,

        class_name: item.class_name,

        register_status: item.register_status,

        register_date: item.created_at,
      });
    });

    return user;
  }
  // ============================
  // Thống kê học viên
  // ============================

  static async statistics() {
    const [
      [[totalUsers]],

      [[registeredUsers]],

      [[confirmed]],

      [[pending]],

      [[rejected]],

      [[cancelled]],
    ] = await Promise.all([
      db.query(`
            SELECT COUNT(*) total
            FROM users
        `),

      db.query(`
            SELECT COUNT(DISTINCT user_id) total
            FROM registrations
        `),

      db.query(`
            SELECT COUNT(*) total
            FROM registrations
            WHERE register_status='CONFIRMED'
        `),

      db.query(`
            SELECT COUNT(*) total
            FROM registrations
            WHERE register_status='PENDING'
        `),

      db.query(`
            SELECT COUNT(*) total
            FROM registrations
            WHERE register_status='REJECTED'
        `),

      db.query(`
            SELECT COUNT(*) total
            FROM registrations
            WHERE register_status='CANCELLED'
        `),
    ]);

    return {
      total_users: totalUsers.total,

      registered_users: registeredUsers.total,

      not_registered: totalUsers.total - registeredUsers.total,

      confirmed: confirmed.total,

      pending: pending.total,

      rejected: rejected.total,

      cancelled: cancelled.total,
    };
  }
  // ============================
  // Tìm user bằng email
  // ============================

  static async findByEmail(email) {
    const [rows] = await db.query(
      `
        SELECT *
        FROM users
        WHERE email=?
        `,
      [email],
    );

    return rows[0] || null;
  }
  // ============================
  // Tạo học viên
  // ============================

  static async create(data) {
    const [result] = await db.query(
      `
    INSERT INTO users(

        fullname,
        phone,
        email,
        gender,
        age_group,
        company,
        position,
        user_type

    )

    VALUES(?,?,?,?,?,?,?,?)

    `,

      [
        data.fullname,
        data.phone,
        data.email,
        data.gender || "OTHER",
        data.age_group,
        data.company,
        data.position,
        data.user_type || "OTHER",
      ],
    );

    return result.insertId;
  }
}

module.exports = UserModel;
