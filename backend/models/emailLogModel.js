const db = require("../config/db");

class EmailLogModel {
  static async create(data) {
    const sql = `

        INSERT INTO email_logs(

            registration_id,

            receiver_email,

            email_type,

            subject,

            content,

            status,

            sent_at

        )

        VALUES(

            ?,?,?,?,?,?,NOW()

        )

        `;

    const [result] = await db.query(sql, [
      data.registration_id,

      data.receiver_email,

      data.email_type,

      data.subject,

      data.content,

      data.status,
    ]);

    return result;
  }
}

module.exports = EmailLogModel;
