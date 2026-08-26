const {
  readIncubationExcel,
} = require("../services/incubationExcelImportService");

const {
  importIncubationProfiles,
} = require("../services/incubationImportService");

class IncubationImportController {
  // =====================================================
  // PREVIEW EXCEL
  // =====================================================
  static async preview(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn file Excel hồ sơ ươm tạo.",
        });
      }

      const results = [];

      for (const file of req.files) {
        const result = readIncubationExcel(file);

        results.push(result);
      }

      const totalRows = results.reduce(
        (sum, item) => sum + Number(item.totalRows || 0),
        0,
      );

      const validRows = results.reduce(
        (sum, item) => sum + Number(item.validRows || 0),
        0,
      );

      const invalidRows = results.reduce(
        (sum, item) => sum + Number(item.invalidRows || 0),
        0,
      );

      const warningRows = results.reduce(
        (sum, item) => sum + Number(item.warningRows || 0),
        0,
      );

      return res.json({
        success: true,

        message: "Đọc file Excel hồ sơ ươm tạo thành công.",

        data: {
          total_files: req.files.length,

          total_rows: totalRows,

          valid_rows: validRows,

          invalid_rows: invalidRows,

          warning_rows: warningRows,

          files: results,
        },
      });
    } catch (error) {
      console.error("INCUBATION IMPORT PREVIEW ERROR:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể đọc file Excel hồ sơ ươm tạo.",
      });
    }
  }

  // =====================================================
  // CONFIRM IMPORT
  // =====================================================
  static async confirm(req, res) {
    try {
      const body = req.body || {};

      const programId = Number(body.program_id);

      const profiles = Array.isArray(body.profiles) ? body.profiles : [];

      if (!Number.isInteger(programId) || programId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID Chương trình ươm tạo không hợp lệ.",
        });
      }

      if (!profiles.length) {
        return res.status(422).json({
          success: false,
          message: "Không có hồ sơ hợp lệ để import.",
        });
      }

      const result = await importIncubationProfiles({
        programId,
        profiles,
      });

      return res.json({
        success: true,

        message: "Import hồ sơ Chương trình ươm tạo thành công.",

        data: result,
      });
    } catch (error) {
      console.error("INCUBATION IMPORT CONFIRM ERROR:", error);

      return res.status(error.status || 500).json({
        success: false,

        message:
          error.message || "Không thể import hồ sơ Chương trình ươm tạo.",

        code: error.code || "INCUBATION_IMPORT_ERROR",

        details: error.details || null,
      });
    }
  }
}

module.exports = IncubationImportController;
