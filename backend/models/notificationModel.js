const db = require("../config/db");

class NotificationModel {
  // ==========================
  // Tạo thông báo
  // ==========================

  static async create(data) {
    const [result] = await db.query(
      `
            INSERT INTO notifications
(
    type,
    title,
    message,
    reference_id,
    registration_id,
    class_id
)

VALUES (?,?,?,?,?,?)
            `,
      [
        data.type,
        data.title,
        data.message,
        data.reference_id || null,
        data.registration_id || null,
        data.class_id || null,
      ],
    );

    return result.insertId;
  }

  // ==========================
  // Lấy thông báo admin
  // ==========================

  static async getAll() {
    const [rows] = await db.query(
      `
            SELECT

                id,
                type,
                title,
                message,
                reference_id,
                is_read,
                created_at

            FROM notifications

            ORDER BY created_at DESC

            LIMIT 50

            `,
    );

    return rows;
  }

  // ==========================
  // Đếm chưa đọc
  // ==========================

  static async countUnread() {
    const [rows] = await db.query(
      `
            SELECT COUNT(*) AS total

            FROM notifications

            WHERE is_read = 0
            `,
    );

    return Number(rows[0].total || 0);
  }

  // ==========================
  // Đánh dấu đã đọc
  // ==========================

  static async markRead(id) {
    await db.query(
      `
            UPDATE notifications

            SET is_read = 1

            WHERE id = ?
            `,
      [id],
    );
  }
}

module.exports = NotificationModel;
