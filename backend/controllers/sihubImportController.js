const path = require("path");

const { readSihubExcel } = require("../services/sihubExcelImportService");
const {
  importSihubExcel,
  createCourseAndContinueImport,
} = require("../services/sihubImportService");
// =================================
// Tạo khóa còn thiếu và tiếp tục import
// =================================
exports.createCourseAndContinueImport = async (req, res) => {
  try {
    const { fileData, programId } = req.body;

    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu file đang chờ import.",
      });
    }

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu chương trình đào tạo.",
      });
    }

    const result = await createCourseAndContinueImport({
      fileData,
      programId,
    });

    return res.json({
      success: true,

      message: result.createdCourse
        ? "Đã tạo khóa học mới và tiếp tục import thành công."
        : "Đã sử dụng khóa học hiện có và tiếp tục import thành công.",

      data: result,
    });
  } catch (error) {
    console.error("Tạo khóa và tiếp tục import lỗi:", error);

    return res.status(error.status || 500).json({
      success: false,

      message: error.message || "Không thể tạo khóa và tiếp tục import.",

      code: error.code || "CREATE_COURSE_CONTINUE_IMPORT_ERROR",

      details: error.details || null,
    });
  }
};
// =================================
// Preview Excel SIHUB
// =================================

exports.previewSihubExcel = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file Excel",
      });
    }

    const results = [];

    for (const file of req.files) {
      const sheetItems = await readSihubExcel(file.path, file.originalname);

      results.push(...sheetItems);
    }

    return res.json({
      success: true,

      totalUploadedFiles: req.files.length,

      totalSheets: results.length,

      totalStudents: results.reduce(
        (sum, item) => sum + Number(item.totalStudents || 0),
        0,
      ),

      data: results,
    });
  } catch (error) {
    console.error("Preview SIHUB Excel lỗi:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// =================================
// Confirm Import Excel SIHUB
// =================================

exports.confirmSihubImport = async (req, res) => {
  try {
    const files = req.body.data;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,

        message: "Không có dữ liệu để import",
      });
    }

    const result = await importSihubExcel(files);

    return res.json({
      success: true,

      message: "Import dữ liệu SIHUB thành công",

      data: result,
    });
  } catch (error) {
    console.error("Confirm SIHUB lỗi:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Không thể import dữ liệu SIHUB.",

      code: error.code || "SIHUB_IMPORT_ERROR",

      details: error.details || null,
    });
  }
};
