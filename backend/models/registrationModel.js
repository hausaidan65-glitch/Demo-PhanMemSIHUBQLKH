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
}

module.exports = RegistrationModel;
