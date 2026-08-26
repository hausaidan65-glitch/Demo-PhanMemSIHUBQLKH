const db = require("../config/db");

class Course {
  // =========================================================
  // LẤY DANH SÁCH KHÓA HỌC
  // Có thể lọc theo program_id, status
  // =========================================================
  static async getAll(query = {}) {
    const conditions = ["c.deleted_at IS NULL"];

    const params = [];

    if (query.program_id) {
      conditions.push("c.program_id = ?");
      params.push(Number(query.program_id));
    }

    if (query.status) {
      conditions.push("c.status = ?");
      params.push(query.status);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
        SELECT
    c.id,
    c.program_id,
    c.course_name,
    c.slug,
    c.short_description,
    c.description,
    c.thumbnail,
    c.duration,
    c.target_audience,
    c.learning_outcomes,
    c.status,
    c.created_at,
    c.updated_at,

    tp.program_name,

 COUNT(DISTINCT cc.id) AS total_classes,

COALESCE(SUM(cc.current_students), 0) AS total_students,

COALESCE(SUM(cc.max_students), 0) AS total_capacity

FROM courses c

LEFT JOIN training_programs tp
ON tp.id = c.program_id
LEFT JOIN course_classes cc
ON cc.course_id = c.id
AND cc.deleted_at IS NULL
      ${whereSql}

      GROUP BY
        c.id,
        c.program_id,
        c.course_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
        c.learning_outcomes,
        c.status,
        c.created_at,
        c.updated_at,
        tp.program_name

      ORDER BY c.id DESC
    `;

    const [rows] = await db.query(sql, params);

    return rows.map((item) => ({
      ...item,

      total_classes: Number(item.total_classes) || 0,

      total_students: Number(item.total_students) || 0,

      total_capacity: Number(item.total_capacity) || 0,
    }));
  }

  // =========================================================
  // LẤY KHÓA HỌC THEO ID
  // =========================================================

  static async getById(id) {
    const sql = `
      SELECT
        c.id,
        c.program_id,
        c.course_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
        c.learning_outcomes,
        c.status,
        c.created_at,
        c.updated_at,

        tp.program_name,

       (
  SELECT COUNT(*)
  FROM course_classes cc
  WHERE cc.course_id = c.id
    AND cc.deleted_at IS NULL
) AS total_classes

      FROM courses c

      LEFT JOIN training_programs tp
        ON tp.id = c.program_id

  

WHERE c.id = ?
  AND c.deleted_at IS NULL

      LIMIT 1
    `;

    const [rows] = await db.query(sql, [id]);

    if (!rows[0]) {
      return null;
    }

    return {
      ...rows[0],
      total_classes: Number(rows[0].total_classes) || 0,
    };
  }

  // =========================================================
  // LẤY KHÓA HỌC THEO PROGRAM
  // =========================================================

  static async getByProgram(programId) {
    const sql = `
      SELECT
        c.id,
        c.program_id,
        c.course_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
        c.learning_outcomes,
        c.status,
        c.created_at,
        c.updated_at,

        tp.program_name,
       

     (
  SELECT COUNT(*)
  FROM course_classes cc
  WHERE cc.course_id = c.id
    AND cc.deleted_at IS NULL
) AS total_classes

      FROM courses c

      LEFT JOIN training_programs tp
        ON tp.id = c.program_id

 

     WHERE c.program_id = ?
  AND c.deleted_at IS NULL
      ORDER BY c.id DESC
    `;

    const [rows] = await db.query(sql, [programId]);

    return rows.map((item) => ({
      ...item,
      total_classes: Number(item.total_classes) || 0,
    }));
  }

  // =========================================================
  // KIỂM TRA PROGRAM CÓ TỒN TẠI KHÔNG
  // =========================================================

  static async programExists(programId) {
    const [rows] = await db.query(
      `
        SELECT id
        FROM training_programs
        WHERE id = ?
        LIMIT 1
      `,
      [programId],
    );

    return Boolean(rows[0]);
  }

  // =========================================================
  // KIỂM TRA TRÙNG TÊN KHÓA HỌC TRONG CÙNG PROGRAM
  // =========================================================

  static async findByName(courseName, programId, excludeId = null) {
    let sql = `
      SELECT id
      FROM courses

      WHERE LOWER(TRIM(course_name))
        = LOWER(TRIM(?))

      AND program_id = ?
      AND deleted_at IS NULL
    `;

    const params = [courseName, programId];

    if (excludeId) {
      sql += ` AND id <> ?`;

      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return rows[0] || null;
  }

  // =========================================================
  // THÊM KHÓA HỌC
  // =========================================================

  static async create(data) {
    const sql = `
      INSERT INTO courses
      (
        program_id,
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
      VALUES
      (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const [result] = await db.query(sql, [
      data.program_id,
      data.course_name,
      data.slug || null,
      data.short_description || null,
      data.description || null,
      data.thumbnail || null,
      data.duration || null,
      data.target_audience || null,
      data.learning_outcomes || null,
      data.status || "OPEN",
    ]);

    return result;
  }

  // =========================================================
  // CẬP NHẬT KHÓA HỌC
  // =========================================================

  static async update(id, data) {
    const sql = `
      UPDATE courses

      SET
        program_id = ?,
        course_name = ?,
        slug = ?,
        short_description = ?,
        description = ?,
        thumbnail = ?,
        duration = ?,
        target_audience = ?,
        learning_outcomes = ?,
        status = ?

      WHERE id = ?
    `;

    const [result] = await db.query(sql, [
      data.program_id,
      data.course_name,
      data.slug || null,
      data.short_description || null,
      data.description || null,
      data.thumbnail || null,
      data.duration || null,
      data.target_audience || null,
      data.learning_outcomes || null,
      data.status || "OPEN",
      id,
    ]);

    return result;
  }

  // =========================================================
  // ĐẾM SỐ LỚP THUỘC KHÓA HỌC
  // =========================================================

  static async countClasses(id) {
    const [rows] = await db.query(
      `
       SELECT COUNT(*) AS total
FROM course_classes
WHERE course_id = ?
  AND deleted_at IS NULL
      `,
      [id],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // XÓA KHÓA HỌC
  // =========================================================

  static async delete(id) {
    const [result] = await db.query(
      `
        DELETE FROM courses
        WHERE id = ?
      `,
      [id],
    );

    return result;
  }
}

module.exports = Course;
