const db = require("../config/db");

class AdminActivityLogModel {
  // =========================================================
  // GHI NHẬT KÝ HOẠT ĐỘNG ADMIN
  // =========================================================
  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO admin_activity_logs
      (
        admin_id,
        admin_username,
        admin_role,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_data,
        new_data,
        ip_address,
        user_agent
      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.admin_id || null,
        data.admin_username || null,
        data.admin_role || null,
        data.action,
        data.entity_type,
        data.entity_id || null,
        data.entity_name || null,
        data.old_data ? JSON.stringify(data.old_data) : null,
        data.new_data ? JSON.stringify(data.new_data) : null,
        data.ip_address || null,
        data.user_agent || null,
      ],
    );

    return result.insertId;
  }

  // =========================================================
  // DANH SÁCH NHẬT KÝ
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    if (query.action) {
      conditions.push("l.action = ?");
      params.push(String(query.action).trim().toUpperCase());
    }

    if (query.entity_type) {
      conditions.push("l.entity_type = ?");
      params.push(String(query.entity_type).trim().toUpperCase());
    }

    if (query.admin_id) {
      const adminId = Number(query.admin_id);

      if (Number.isInteger(adminId) && adminId > 0) {
        conditions.push("l.admin_id = ?");
        params.push(adminId);
      }
    }

    if (query.keyword) {
      const keyword = `%${String(query.keyword).trim()}%`;

      conditions.push(`
        (
          l.admin_username LIKE ?
          OR l.entity_name LIKE ?
          OR l.entity_type LIKE ?
          OR l.action LIKE ?
        )
      `);

      params.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);

    const [rows] = await db.query(
      `
      SELECT
        l.id,
        l.admin_id,
        l.admin_username,
        l.admin_role,
        l.action,
        l.entity_type,
        l.entity_id,
        l.entity_name,
        l.old_data,
        l.new_data,
        l.ip_address,
        l.user_agent,
        l.created_at,

        a.fullname AS admin_fullname

      FROM admin_activity_logs l

      LEFT JOIN admins a
        ON a.id = l.admin_id

      ${whereSql}

      ORDER BY l.created_at DESC, l.id DESC

      LIMIT ?
      `,
      [...params, limit],
    );

    return rows;
  }
}

module.exports = AdminActivityLogModel;
