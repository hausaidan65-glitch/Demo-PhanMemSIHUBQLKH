const db = require("../config/db");

class CourseClassProgressModel {
  static async findOpeningById(openingId) {
    const [rows] = await db.query(
      `
      SELECT
        id AS opening_id,
        class_name,
        class_code
      FROM course_classes
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [openingId],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],
      opening_id: Number(rows[0].opening_id),
    };
  }

  static progressSelectSql() {
    return `
      SELECT
        progress.id,
        progress.content,
        progress.note,
        progress.report_time,
        progress.created_at,
        progress.created_by AS created_by_id,
        admin.username AS created_by_username
      FROM course_class_progress_reports progress
      LEFT JOIN admins admin
        ON admin.id = progress.created_by
    `;
  }

  static normalizeProgress(row) {
    return {
      id: Number(row.id),
      content: row.content,
      note: row.note,
      report_time: row.report_time,
      created_at: row.created_at,
      created_by: {
        id:
          row.created_by_id === null || row.created_by_id === undefined
            ? null
            : Number(row.created_by_id),
        username: row.created_by_username || null,
      },
    };
  }

  static async getHistory(openingId) {
    const [rows] = await db.query(
      `
      ${this.progressSelectSql()}
      WHERE progress.class_id = ?
      ORDER BY progress.report_time DESC, progress.id DESC
      `,
      [openingId],
    );

    return rows.map((row) => this.normalizeProgress(row));
  }

  static async findProgressById(progressId) {
    const [rows] = await db.query(
      `
      ${this.progressSelectSql()}
      WHERE progress.id = ?
      LIMIT 1
      `,
      [progressId],
    );

    return rows.length ? this.normalizeProgress(rows[0]) : null;
  }

  static async createProgress({ openingId, content, note, createdBy }) {
    const [result] = await db.query(
      `
      INSERT INTO course_class_progress_reports
        (class_id, content, note, created_by, report_time)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [openingId, content, note, createdBy],
    );

    return this.findProgressById(result.insertId);
  }
}

module.exports = CourseClassProgressModel;
