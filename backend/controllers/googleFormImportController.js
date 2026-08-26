const {
  readGoogleFormWorkbook,
} = require("../services/googleFormImport/googleFormExcelReader");

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
