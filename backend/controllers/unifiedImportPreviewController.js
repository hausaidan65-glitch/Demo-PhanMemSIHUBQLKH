const UnifiedImportPreviewService = require("../services/unifiedImportPreviewService");
const UnifiedImportTargetService = require("../services/unifiedImportTargetService");

exports.preview = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một file Excel.",
      });
    }
    const catalog = await UnifiedImportTargetService.getTargetCatalog();
    const data = await UnifiedImportPreviewService.previewFiles(
      req.files,
      catalog,
    );
    data.targetCatalog = catalog;
    return res.json({
      success: true,
      message: "Đã đọc preview; chưa có dữ liệu nào được ghi.",
      data,
    });
  } catch (error) {
    console.error("Unified import preview lỗi:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Không thể tải dữ liệu target hoặc đọc preview. Vui lòng thử lại.",
      code: error?.code || "UNIFIED_PREVIEW_FAILED",
    });
  }
};
