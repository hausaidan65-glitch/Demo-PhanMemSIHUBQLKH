const db = require("../config/db");

class AdminModel {
  static async getAll() {
    const [rows] = await db.query(`
    SELECT
      id,
      fullname,
      username,
      email,
      role,
      avatar,
      status,
      last_login,
      must_change_password,
      created_at,
      updated_at
    FROM admins
    ORDER BY id DESC
  `);

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
    SELECT
      id,
      fullname,
      username,
      email,
      role,
      avatar,
      status,
      last_login,
      must_change_password,
      created_at,
      updated_at
    FROM admins
    WHERE id = ?
    LIMIT 1
    `,
      [id],
    );

    return rows[0] || null;
  }

  static async findByUsernameAnyStatus(username) {
    const [rows] = await db.query(
      `
    SELECT *
    FROM admins
    WHERE username = ?
    LIMIT 1
    `,
      [username],
    );

    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await db.query(
      `
    SELECT id
    FROM admins
    WHERE email = ?
    LIMIT 1
    `,
      [email],
    );

    return rows[0] || null;
  }
  static async replaceScopes(connection, adminId, scopes) {
    await connection.query(
      `
    DELETE FROM admin_scopes
    WHERE admin_id = ?
    `,
      [adminId],
    );

    for (const scope of scopes) {
      await connection.query(
        `
      INSERT INTO admin_scopes (
        admin_id,
        scope_code
      )
      VALUES (?, ?)
      `,
        [adminId, scope],
      );
    }
  }
  static async getScopes(adminId) {
    const [rows] = await db.query(
      `
    SELECT scope_code
    FROM admin_scopes
    WHERE admin_id = ?
    ORDER BY scope_code
    `,
      [adminId],
    );

    return rows.map((item) => item.scope_code);
  }
  static async create(data) {
    const [result] = await db.query(
      `
    INSERT INTO admins (
      fullname,
      username,
      email,
      password,
      role,
      status,
      must_change_password
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.fullname,
        data.username,
        data.email || null,
        data.password,
        data.role,
        data.status || "ACTIVE",
        data.must_change_password ?? 1,
      ],
    );

    return result.insertId;
  }

  static async update(id, data) {
    const [result] = await db.query(
      `
    UPDATE admins
    SET
      fullname = ?,
      email = ?,
      role = ?,
      status = ?
    WHERE id = ?
    `,
      [data.fullname, data.email || null, data.role, data.status, id],
    );

    return result;
  }

  static async updateStatus(id, status) {
    const [result] = await db.query(
      `
    UPDATE admins
    SET status = ?
    WHERE id = ?
    `,
      [status, id],
    );

    return result;
  }

  static async updatePassword(id, hashedPassword, mustChangePassword = 1) {
    const [result] = await db.query(
      `
    UPDATE admins
    SET
      password = ?,
      must_change_password = ?
    WHERE id = ?
    `,
      [hashedPassword, mustChangePassword, id],
    );

    return result;
  }
  static async findByUsername(username) {
    const [rows] = await db.query(
      `
    SELECT *
    FROM admins
    WHERE username = ?
    LIMIT 1
    `,
      [username],
    );

    return rows[0] || null;
  }

  static async updateLastLogin(id) {
    await db.query(
      `
            UPDATE admins

            SET last_login=NOW()

            WHERE id=?
            `,

      [id],
    );
  }
}

module.exports = AdminModel;
