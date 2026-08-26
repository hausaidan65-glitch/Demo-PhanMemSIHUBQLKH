const db = require("../config/db");

class EmailLogModel {
  // ============================
  // Lưu lịch sử gửi email
  // ============================
  static async create(data) {
    const sql = `
      INSERT INTO email_logs(

        registration_id,

        email,

        subject,

        content,

        status,

        sent_at

      )

      VALUES(

        ?,?,?,?,?,NOW()

      )
    `;

    const [result] = await db.query(sql, [
      data.registration_id,

      data.email,

      data.subject,

      data.content,

      data.status || "SUCCESS",
    ]);

    return result;
  }
}

module.exports = EmailLogModel;
