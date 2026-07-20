const db = require("../config/db");

class Category {
  // Lấy tất cả danh mục
  static async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM activity_categories ORDER BY id DESC",
    );
    return rows;
  }

  // Lấy theo ID
  static async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM activity_categories WHERE id = ?",
      [id],
    );

    return rows[0];
  }

  // Thêm mới
  static async create(data) {
    const sql = `
            INSERT INTO activity_categories
            (category_name, description)
            VALUES (?, ?)
        `;

    const [result] = await db.query(sql, [
      data.category_name,
      data.description,
    ]);

    return result;
  }

  // Cập nhật
  static async update(id, data) {
    const sql = `
            UPDATE activity_categories
            SET category_name = ?,
                description = ?
            WHERE id = ?
        `;

    const [result] = await db.query(sql, [
      data.category_name,
      data.description,
      id,
    ]);

    return result;
  }

  // Xóa
  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM activity_categories WHERE id = ?",
      [id],
    );

    return result;
  }
}

module.exports = Category;
