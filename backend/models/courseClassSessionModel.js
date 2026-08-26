const db = require("../config/db");

class CourseClassSessionModel {
  static async getAll() {
    const sql = `
            SELECT
                s.*,
                c.class_name,
                c.class_code
            FROM course_class_sessions s
            INNER JOIN course_classes c
                ON s.class_id = c.id
            ORDER BY s.session_date ASC
        `;

    const [rows] = await db.query(sql);

    return rows;
  }

  static async getByClass(classId) {
    const sql = `
            SELECT *
            FROM course_class_sessions
            WHERE class_id=?
            ORDER BY session_no ASC
        `;

    const [rows] = await db.query(sql, [classId]);

    return rows;
  }

  static async createWithConnection(connection, data) {
    const sql = `
    INSERT INTO course_class_sessions(
      class_id,
      session_no,
      session_date,
      start_time,
      end_time,
      location,
      room,
      note
    )
    VALUES(?,?,?,?,?,?,?,?)
  `;

    const [result] = await connection.query(sql, [
      data.class_id,
      data.session_no || null,
      data.session_date || null,
      data.start_time || null,
      data.end_time || null,
      data.location || null,
      data.room || null,
      data.note || null,
    ]);

    return result;
  }

  static async create(data) {
    return this.createWithConnection(db, data);
  }
}

module.exports = CourseClassSessionModel;
