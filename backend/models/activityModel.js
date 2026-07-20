const db = require("../config/db");

class Activity {
  // Lấy tất cả
  static async getAll() {
    const sql = `
      SELECT
        a.*,
        c.category_name
      FROM activities a
      LEFT JOIN activity_categories c
      ON a.category_id = c.id
      ORDER BY a.created_at DESC
    `;

    const [rows] = await db.query(sql);
    return rows;
  }

  // Lấy theo ID
  static async getById(id) {
    const sql = `
      SELECT
        a.*,
        c.category_name
      FROM activities a
      LEFT JOIN activity_categories c
      ON a.category_id = c.id
      WHERE a.id = ?
    `;

    const [rows] = await db.query(sql, [id]);

    return rows[0];
  }

  // Thêm
  static async create(data) {
    const sql = `
      INSERT INTO activities(
        category_id,
        activity_name,
        slug,
        short_description,
        description,
        banner,
        thumbnail,
        organizer,
        speaker,
        target_audience,
        learning_outcomes,
        location,
        max_participants,
        current_participants,
        register_open,
        register_close,
        event_start,
        event_end,
        status,
        created_by
      )
      VALUES(
        ?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?
      )
    `;

    const [result] = await db.query(sql, [
      data.category_id,
      data.activity_name,
      data.slug,
      data.short_description,
      data.description,
      data.banner,
      data.thumbnail,
      data.organizer,
      data.speaker,
      data.target_audience,
      data.learning_outcomes,
      data.location,
      data.max_participants,
      data.current_participants || 0,
      data.register_open,
      data.register_close,
      data.event_start,
      data.event_end,
      data.status,
      data.created_by,
    ]);

    return result;
  }

  // Cập nhật
  static async update(id, data) {
    const sql = `
      UPDATE activities
      SET
        category_id=?,
        activity_name=?,
        slug=?,
        short_description=?,
        description=?,
        banner=?,
        thumbnail=?,
        organizer=?,
        speaker=?,
        target_audience=?,
        learning_outcomes=?,
        location=?,
        max_participants=?,
        current_participants=?,
        register_open=?,
        register_close=?,
        event_start=?,
        event_end=?,
        status=?,
        created_by=?
      WHERE id=?
    `;

    const [result] = await db.query(sql, [
      data.category_id,
      data.activity_name,
      data.slug,
      data.short_description,
      data.description,
      data.banner,
      data.thumbnail,
      data.organizer,
      data.speaker,
      data.target_audience,
      data.learning_outcomes,
      data.location,
      data.max_participants,
      data.current_participants,
      data.register_open,
      data.register_close,
      data.event_start,
      data.event_end,
      data.status,
      data.created_by,
      id,
    ]);

    return result;
  }

  // Xóa
  static async delete(id) {
    const [result] = await db.query("DELETE FROM activities WHERE id=?", [id]);

    return result;
  }
}

module.exports = Activity;
