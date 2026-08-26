const db = require("../config/db");

async function createImportHistory(data) {
  const [result] = await db.query(
    `
INSERT INTO import_history
(
 filename,
 total_rows,
 success_rows,
 failed_rows,
 status
)

VALUES
(?,?,?,?,?)
`,
    [
      data.filename,

      data.total_rows,

      data.success_rows,

      data.failed_rows,

      data.status,
    ],
  );

  return result.insertId;
}

module.exports = {
  createImportHistory,
};
