const db = require("../config/db");

class StartupConnectionProgressModel {
  static async findSupportedEventById(eventId) {
    const [rows] = await db.query(
      `
      SELECT
        id AS event_id,
        event_name,
        event_code,
        event_type
      FROM startup_connection_events
      WHERE id = ?
        AND event_type IN ('SEMINAR', 'EXHIBITION')
      LIMIT 1
      `,
      [eventId],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],
      event_id: Number(rows[0].event_id),
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
      FROM startup_connection_event_progress_reports progress
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

  static async getHistory(eventId) {
    const [rows] = await db.query(
      `
      ${this.progressSelectSql()}
      WHERE progress.event_id = ?
      ORDER BY progress.report_time DESC, progress.id DESC
      `,
      [eventId],
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

  static async createProgress({ eventId, content, note, createdBy }) {
    const [result] = await db.query(
      `
      INSERT INTO startup_connection_event_progress_reports
        (event_id, content, note, created_by, report_time)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [eventId, content, note, createdBy],
    );

    return this.findProgressById(result.insertId);
  }
}

module.exports = StartupConnectionProgressModel;
