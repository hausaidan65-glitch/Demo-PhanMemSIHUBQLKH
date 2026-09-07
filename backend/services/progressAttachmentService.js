const fs = require("fs/promises");
const path = require("path");
const db = require("../config/db");

const PROGRESS_TYPES = Object.freeze({
  TRAINING: "TRAINING",
  STARTUP_CONNECTION: "STARTUP_CONNECTION",
  NETWORKING: "NETWORKING",
  INCUBATION: "INCUBATION",
});

function normalizeAttachment(row) {
  return {
    id: Number(row.id),
    original_name: row.original_name,
    mime_type: row.mime_type,
    file_size: Number(row.file_size),
  };
}

function safeOriginalName(file) {
  return path.basename(String(file.originalname || "attachment"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 255);
}

async function cleanupFiles(files = []) {
  await Promise.all(
    files.map((file) => fs.unlink(file.path).catch(() => undefined)),
  );
}

async function findForReports(executor, progressType, progressReportIds) {
  if (!progressReportIds.length) return [];

  const placeholders = progressReportIds.map(() => "?").join(", ");
  const [rows] = await executor.query(
    `
    SELECT id, progress_report_id, original_name, mime_type, file_size
    FROM progress_attachments
    WHERE progress_type = ?
      AND progress_report_id IN (${placeholders})
    ORDER BY id ASC
    `,
    [progressType, ...progressReportIds],
  );

  return rows;
}

async function hydrateHistory(progressType, history) {
  const safeHistory = Array.isArray(history) ? history : [];
  if (!safeHistory.length) return safeHistory;

  const rows = await findForReports(
    db,
    progressType,
    safeHistory.map((item) => item.id),
  );
  const attachmentsByReport = new Map();

  rows.forEach((row) => {
    const reportId = Number(row.progress_report_id);
    const current = attachmentsByReport.get(reportId) || [];
    current.push(normalizeAttachment(row));
    attachmentsByReport.set(reportId, current);
  });

  return safeHistory.map((item) => ({
    ...item,
    attachments: attachmentsByReport.get(Number(item.id)) || [],
  }));
}

async function createProgressWithAttachments({
  progressType,
  files = [],
  uploadedBy,
  createProgress,
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const progress = await createProgress(connection);

    if (files.length) {
      const values = files.map((file) => [
        progressType,
        progress.id,
        safeOriginalName(file),
        file.filename,
        `/uploads/progress/${file.filename}`,
        file.mimetype,
        file.size,
        uploadedBy,
      ]);

      await connection.query(
        `
        INSERT INTO progress_attachments
          (progress_type, progress_report_id, original_name, stored_name,
           file_path, mime_type, file_size, uploaded_by)
        VALUES ?
        `,
        [values],
      );
    }

    const attachmentRows = await findForReports(connection, progressType, [
      progress.id,
    ]);
    await connection.commit();

    return {
      ...progress,
      attachments: attachmentRows.map(normalizeAttachment),
    };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    await cleanupFiles(files);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  PROGRESS_TYPES,
  cleanupFiles,
  createProgressWithAttachments,
  hydrateHistory,
};
