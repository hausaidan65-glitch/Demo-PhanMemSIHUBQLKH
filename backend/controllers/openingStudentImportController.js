const OpeningStudentImportService = require("../services/openingStudentImportService");

function parseOpeningId(value) {
  const openingId = Number(value);

  if (!Number.isInteger(openingId) || openingId <= 0) {
    const error = new Error("openingId không hợp lệ.");
    error.status = 400;
    throw error;
  }

  return openingId;
}

class OpeningStudentImportController {
  static async preview(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
      }

      const data = await OpeningStudentImportService.preview(
        parseOpeningId(req.params.openingId),
        req.file,
      );

      return res.json({ success: true, data });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Không thể kiểm tra file import.",
      });
    }
  }

  static async confirm(req, res) {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const data = await OpeningStudentImportService.confirm(
        parseOpeningId(req.params.openingId),
        rows,
      );

      return res.json({ success: true, data });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Không thể import học viên.",
      });
    }
  }
}

module.exports = OpeningStudentImportController;
