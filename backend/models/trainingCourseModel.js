const db = require("../config/db");

class TrainingCourseModel {
  // =========================================================
  // LẤY DANH SÁCH KHÓA ĐÀO TẠO
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    // ==========================================
    // TÌM KIẾM
    // ==========================================
    const keyword = String(query.keyword || "").trim();

    if (keyword) {
      conditions.push(`
      (
        tp.program_name LIKE ?
        OR tp.description LIKE ?
      )
    `);

      const searchValue = `%${keyword}%`;

      params.push(searchValue, searchValue);
    }

    // ==========================================
    // TRẠNG THÁI
    // ==========================================
    const status = String(query.status || "")
      .trim()
      .toUpperCase();

    if (["ACTIVE", "INACTIVE"].includes(status)) {
      conditions.push(`tp.status = ?`);

      params.push(status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
    SELECT
      tp.id,

      tp.program_name AS training_course_name,
      tp.description,
      tp.status,
      tp.created_at,
      tp.updated_at,

      COUNT(DISTINCT c.id) AS total_course_groups,
      COUNT(DISTINCT cc.id) AS total_classes

    FROM training_programs tp

    LEFT JOIN courses c
      ON c.program_id = tp.id

    LEFT JOIN course_classes cc
      ON cc.course_id = c.id

    ${whereClause}

    GROUP BY
      tp.id,
      tp.program_name,
      tp.description,
      tp.status,
      tp.created_at,
      tp.updated_at

    ORDER BY tp.id DESC
    `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      total_course_groups: Number(item.total_course_groups) || 0,

      total_classes: Number(item.total_classes) || 0,
    }));
  }
  // =========================================================
  // DỮ LIỆU XUẤT EXCEL
  // =========================================================
  static async getExportData(query = {}) {
    return this.getAll(query);
  }
  // =========================================================
  // LẤY CHI TIẾT 1 KHÓA ĐÀO TẠO
  // =========================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        tp.id,

        tp.program_name AS training_course_name,
        tp.description,
        tp.status,
        tp.created_at,
        tp.updated_at,

        COUNT(DISTINCT c.id) AS total_course_groups,
        COUNT(DISTINCT cc.id) AS total_classes

      FROM training_programs tp

      LEFT JOIN courses c
        ON c.program_id = tp.id

      LEFT JOIN course_classes cc
        ON cc.course_id = c.id

      WHERE tp.id = ?

      GROUP BY
        tp.id,
        tp.program_name,
        tp.description,
        tp.status,
        tp.created_at,
        tp.updated_at

      LIMIT 1
      `,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],

      total_course_groups: Number(rows[0].total_course_groups) || 0,

      total_classes: Number(rows[0].total_classes) || 0,
    };
  }

  // =========================================================
  // KIỂM TRA TRÙNG TÊN
  // =========================================================
  static async findByName(trainingCourseName, excludeId = null) {
    let sql = `
      SELECT id
      FROM training_programs
      WHERE LOWER(TRIM(program_name)) = LOWER(TRIM(?))
    `;

    const params = [trainingCourseName];

    if (excludeId) {
      sql += ` AND id <> ?`;

      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return rows[0] || null;
  }

  // =========================================================
  // THÊM KHÓA ĐÀO TẠO
  // =========================================================
  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO training_programs
      (
        program_name,
        description,
        status
      )
      VALUES (?, ?, ?)
      `,
      [
        data.training_course_name,
        data.description || null,
        data.status || "ACTIVE",
      ],
    );

    return result.insertId;
  }

  // =========================================================
  // CẬP NHẬT KHÓA ĐÀO TẠO
  // =========================================================
  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE training_programs

      SET
        program_name = ?,
        description = ?,
        status = ?

      WHERE id = ?
      `,
      [
        data.training_course_name,
        data.description || null,
        data.status || "ACTIVE",
        id,
      ],
    );

    return result.affectedRows;
  }

  // =========================================================
  // ĐẾM SỐ NHÓM DỮ LIỆU CŨ ĐANG THUỘC KHÓA
  // =========================================================
  static async countChildren(id) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM courses
      WHERE program_id = ?
      `,
      [id],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // XÓA KHÓA ĐÀO TẠO
  // =========================================================
  static async remove(id) {
    const [result] = await db.query(
      `
      DELETE FROM training_programs
      WHERE id = ?
      `,
      [id],
    );

    return result.affectedRows;
  }
}

module.exports = TrainingCourseModel;
