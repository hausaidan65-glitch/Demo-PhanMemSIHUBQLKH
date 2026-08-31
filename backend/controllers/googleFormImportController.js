const {
  readGoogleFormWorkbook,
} = require("../services/googleFormImport/googleFormExcelReader");
const {
  validateGoogleFormBatch,
} = require("../services/googleFormImport/googleFormBatchValidator");
const {
  commitGoogleFormBatch,
} = require("../services/googleFormImport/googleFormBatchCommitService");
// =====================================================
// PREVIEW GOOGLE FORM
//
// Chỉ:
// - đọc workbook
// - trả danh sách sheet
// - headers
// - sample rows
//
// KHÔNG import DB.
// =====================================================

exports.previewGoogleForm = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel Google Form.",
      });
    }

    const result = readGoogleFormWorkbook(req.file);

    return res.json({
      success: true,

      message: "Đã đọc file Google Form.",

      data: result,
    });
  } catch (error) {
    console.error("Preview Google Form lỗi:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Không thể đọc file Google Form.",
    });
  }
};
// =====================================================
// VALIDATE GOOGLE FORM VỚI DATABASE
//
// KHÔNG INSERT.
// KHÔNG UPDATE.
// =====================================================

exports.validateGoogleForm = async (req, res) => {
  try {
    const { target, rows } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Thiếu nơi nhận dữ liệu.",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để kiểm tra.",
      });
    }

    const result = await validateGoogleFormBatch({
      target,
      rows,
    });

    return res.json({
      success: true,

      message: "Đã kiểm tra dữ liệu với Database.",

      data: result,
    });
  } catch (error) {
    console.error("Validate Google Form lỗi:", error);

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "Không thể kiểm tra dữ liệu.",

      code: error.code || "GOOGLE_FORM_VALIDATE_ERROR",
    });
  }
};
// =====================================================
// COMMIT GOOGLE FORM
// POST /api/google-form-import/commit
// =====================================================

exports.commitGoogleForm = async (req, res) => {
  try {
    const { target, rows, source } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Thiếu target import.",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để import.",
      });
    }

    const result = await commitGoogleFormBatch({
      target,
      rows,
      source,
    });

    return res.status(200).json({
      success: true,

      message:
        result.createdRegistrations > 0
          ? `Đã import ${result.createdRegistrations} người vào SIHUB.`
          : "Không có dữ liệu mới cần import.",

      data: result,
    });
  } catch (error) {
    console.error("Commit Google Form lỗi:", error);

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "Không thể import dữ liệu Google Form.",

      code: error.code || "GOOGLE_FORM_COMMIT_ERROR",

      details: error.details || null,
    });
  }
};
