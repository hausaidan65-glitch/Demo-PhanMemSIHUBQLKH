const db = require("../config/db");

class CourseClassModel {
  // Lấy tất cả lớp
  static async getAll() {
    const sql = `
            SELECT
                cc.*,
                c.course_name
            FROM course_classes cc
            LEFT JOIN courses c
                ON cc.course_id = c.id
            ORDER BY cc.id DESC
        `;

    const [rows] = await db.query(sql);

    return rows;
  }

  // Chi tiết
  static async getById(id) {
    const sql = `
            SELECT
                cc.*,
                c.course_name
            FROM course_classes cc
            LEFT JOIN courses c
                ON cc.course_id = c.id
            WHERE cc.id = ?
        `;

    const [rows] = await db.query(sql, [id]);

    return rows[0];
  }

  // Theo Course
  static async getByCourse(courseId) {
    const sql = `
            SELECT *
            FROM course_classes
            WHERE course_id = ?
            ORDER BY created_at DESC
        `;

    const [rows] = await db.query(sql, [courseId]);

    return rows;
  }

  // Thêm
  static async create(data) {
    const sql = `
            INSERT INTO course_classes(

                course_id,
                class_code,
                class_name,
                trainer,
                location,
                register_open,
                register_close,
                max_students,
                current_students,
                status

            )

            VALUES(

                ?,?,?,?,?,?,?,?,?,?

            )
        `;

    const [result] = await db.query(sql, [
      data.course_id,
      data.class_code,
      data.class_name,
      data.trainer,
      data.location,
      data.register_open,
      data.register_close,
      data.max_students,
      data.current_students,
      data.status,
    ]);

    return result;
  }

  // Update
  static async update(id, data) {
    const sql = `
            UPDATE course_classes

            SET

                course_id=?,
                class_code=?,
                class_name=?,
                trainer=?,
                location=?,
                register_open=?,
                register_close=?,
                max_students=?,
                current_students=?,
                status=?

            WHERE id=?
        `;

    const [result] = await db.query(sql, [
      data.course_id,
      data.class_code,
      data.class_name,
      data.trainer,
      data.location,
      data.register_open,
      data.register_close,
      data.max_students,
      data.current_students,
      data.status,
      id,
    ]);

    return result;
  }

  // Delete
  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM course_classes WHERE id=?",

      [id],
    );

    return result;
  }
}

module.exports = CourseClassModel;
