const db = require("../config/db");

class Course {
  // Lấy tất cả
  static async getAll() {
    const sql = `
            SELECT
                c.*,
                a.activity_name
            FROM courses c
            LEFT JOIN activities a
            ON c.activity_id = a.id
            ORDER BY c.id DESC
        `;

    const [rows] = await db.query(sql);

    return rows;
  }

  // Theo ID
  static async getById(id) {
    const sql = `
            SELECT
                c.*,
                a.activity_name
            FROM courses c
            LEFT JOIN activities a
            ON c.activity_id=a.id
            WHERE c.id=?
        `;

    const [rows] = await db.query(sql, [id]);

    return rows[0];
  }

  // Theo Activity

  static async getByActivity(activityId) {
    const sql = `
            SELECT *
            FROM courses
            WHERE activity_id=?
            ORDER BY id DESC
        `;

    const [rows] = await db.query(sql, [activityId]);

    return rows;
  }

  // Thêm

  static async create(data) {
    const sql = `
        INSERT INTO courses(

            activity_id,
            course_name,
            slug,
            short_description,
            description,
            thumbnail,
            duration,
            target_audience,
            learning_outcomes,
            status

        )

        VALUES(

            ?,?,?,?,?,?,?,?,?,?

        )
        `;

    const [result] = await db.query(sql, [
      data.activity_id,
      data.course_name,
      data.slug,
      data.short_description,
      data.description,
      data.thumbnail,
      data.duration,
      data.target_audience,
      data.learning_outcomes,
      data.status,
    ]);

    return result;
  }

  // Update

  static async update(id, data) {
    const sql = `

        UPDATE courses

        SET

        activity_id=?,
        course_name=?,
        slug=?,
        short_description=?,
        description=?,
        thumbnail=?,
        duration=?,
        target_audience=?,
        learning_outcomes=?,
        status=?

        WHERE id=?

        `;

    const [result] = await db.query(sql, [
      data.activity_id,
      data.course_name,
      data.slug,
      data.short_description,
      data.description,
      data.thumbnail,
      data.duration,
      data.target_audience,
      data.learning_outcomes,
      data.status,
      id,
    ]);

    return result;
  }

  // Delete

  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM courses WHERE id=?",

      [id],
    );

    return result;
  }
}

module.exports = Course;
