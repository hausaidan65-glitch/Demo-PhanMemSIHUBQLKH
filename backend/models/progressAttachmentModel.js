const db = require("../config/db");

class ProgressAttachmentModel {
  static async findByIdWithProgress(attachmentId) {
    const [rows] = await db.query(
      `
      SELECT
        attachment.id,
        attachment.progress_type,
        attachment.progress_report_id,
        attachment.original_name,
        attachment.stored_name,
        attachment.mime_type,
        attachment.file_size,
        CASE attachment.progress_type
          WHEN 'TRAINING' THEN EXISTS (
            SELECT 1 FROM course_class_progress_reports progress
            WHERE progress.id = attachment.progress_report_id
          )
          WHEN 'STARTUP_CONNECTION' THEN EXISTS (
            SELECT 1 FROM startup_connection_event_progress_reports progress
            WHERE progress.id = attachment.progress_report_id
          )
          WHEN 'NETWORKING' THEN EXISTS (
            SELECT 1 FROM networking_event_progress_reports progress
            WHERE progress.id = attachment.progress_report_id
          )
          WHEN 'INCUBATION' THEN EXISTS (
            SELECT 1 FROM incubation_program_progress_reports progress
            WHERE progress.id = attachment.progress_report_id
          )
          ELSE 0
        END AS progress_exists
      FROM progress_attachments attachment
      WHERE attachment.id = ?
      LIMIT 1
      `,
      [attachmentId],
    );

    return rows[0] || null;
  }
}

module.exports = ProgressAttachmentModel;
