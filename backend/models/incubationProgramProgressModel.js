const db = require("../config/db");

class IncubationProgramProgressModel {
  static async findProgramById(programId) {
    const [rows] = await db.query(
      `
      SELECT
        id AS program_id,
        program_name,
        program_code
      FROM incubation_programs
      WHERE id = ?
      LIMIT 1
      `,
      [programId],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],
      program_id: Number(rows[0].program_id),
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
      FROM incubation_program_progress_reports progress
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

  static async getHistory(programId) {
    const [rows] = await db.query(
      `
      ${this.progressSelectSql()}
      WHERE progress.program_id = ?
      ORDER BY progress.report_time DESC, progress.id DESC
      `,
      [programId],
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

  static async createProgress({ programId, content, note, createdBy }) {
    const [result] = await db.query(
      `
      INSERT INTO incubation_program_progress_reports
        (program_id, content, note, created_by, report_time)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [programId, content, note, createdBy],
    );

    return this.findProgressById(result.insertId);
  }
}

module.exports = IncubationProgramProgressModel;
