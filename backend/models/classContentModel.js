const db = require("../config/db");


class ClassContentModel {
  static async getByClass(classId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM class_contents
      WHERE class_id=?
      ORDER BY display_order,id
      `,
      [classId],
    );

    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM class_contents
      WHERE id=?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  } // ============================
  // Tạo nội dung bằng transaction
  // ============================

  static async createWithConnection(connection, data) {
    const [result] = await connection.query(
      `
      INSERT INTO class_contents(
        class_id,
        content_title,
        content_description,
        display_order,
        status
      )
      VALUES(?,?,?,?,?)
    `,
      [
        data.class_id,
        data.content_title,
        data.content_description || null,
        Number(data.display_order) || 1,
        data.status || "ACTIVE",
      ],
    );

    return result;
  }

  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO class_contents
      (
        class_id,
        content_title,
        content_description,
        display_order,
        status
      )
      VALUES(?,?,?,?,?)
      `,
      [
        data.class_id,
        data.content_title,
        data.content_description || null,
        data.display_order || 1,
        data.status || "ACTIVE",
      ],
    );

    return result;
  }

  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE class_contents
      SET
        content_title=?,
        content_description=?,
        display_order=?,
        status=?
      WHERE id=?
      `,
      [
        data.content_title,
        data.content_description || null,
        data.display_order || 1,
        data.status || "ACTIVE",
        id,
      ],
    );

    return result;
  }

  static async delete(id) {
    const [result] = await db.query(
      `
      DELETE FROM class_contents
      WHERE id=?
      `,
      [id],
    );

    return result;
  }
}

module.exports = ClassContentModel;
