const db = require("../config/db");

class UserModel {
  static async findByEmailOrPhone(connection, email, phone) {
    const [rows] = await connection.query(
      `
            SELECT *
            FROM users
            WHERE email = ? OR phone = ?
            LIMIT 1
            `,
      [email, phone],
    );

    return rows[0];
  }

  static async create(connection, data) {
    const [result] = await connection.query(
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
        data.gender,
        data.age_group,
        data.company,
        data.position,
        data.user_type,
      ],
    );

    return result.insertId;
  }
}

module.exports = UserModel;
