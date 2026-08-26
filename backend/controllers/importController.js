const { validateExcel } = require("../services/excelImportService");

const { importStudents } = require("../services/importService");
const { createImportHistory } = require("../models/importHistoryModel");

// =======================
// PREVIEW EXCEL
// =======================

const previewExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,

        message: "Vui lòng chọn file Excel",
      });
    }

    const result = await validateExcel(req.file.path);
    const allRowsAlreadyImported =
      result.createdUsers === 0 &&
      result.createdRegistrations === 0 &&
      result.failedCount > 0 &&
      result.failed.every(
        (item) => item.error === "Học viên đã đăng ký lớp này",
      );

    if (allRowsAlreadyImported) {
      return res.status(409).json({
        success: false,
        message:
          "Dữ liệu trong file đã được thêm trước đó. Không có đăng ký mới nào được tạo.",
        data: result,
      });
    }

    return res.json({
      success: true,

      message: "Kiểm tra dữ liệu thành công",

      data: result,
    });
  } catch (error) {
    console.log("Lỗi preview Excel:", error);

    return res.status(500).json({
      success: false,

      message: "Không đọc được file Excel",
    });
  }
};

// =======================
// CONFIRM IMPORT
// =======================

const confirmImport = async (req, res) => {
  try {
    const result = await importStudents(req.body.rows);
    await createImportHistory({
      filename: req.body.filename || "unknown.xlsx",

      total_rows: req.body.totalRows || 0,

      success_rows: result.createdRegistrations,

      failed_rows: result.failedCount,

      status: result.failedCount > 0 ? "PARTIAL" : "SUCCESS",
    });
    return res.json({
      success: true,

      message: "Import thành công",

      data: result,
    });
  } catch (error) {
    console.log("Lỗi import:", error);

    return res.status(500).json({
      success: false,

      message: "Import thất bại",
    });
  }
};

module.exports = {
  previewExcel,

  confirmImport,
};
