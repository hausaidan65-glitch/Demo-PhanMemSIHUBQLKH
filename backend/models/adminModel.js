const db = require("../config/db");

class AdminModel {
  static async findByUsername(username) {
    const [rows] = await db.query(
      `
            SELECT *

            FROM admins

            WHERE username=?

            AND status='ACTIVE'
            `,

      [username],
    );

    return rows[0];
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
