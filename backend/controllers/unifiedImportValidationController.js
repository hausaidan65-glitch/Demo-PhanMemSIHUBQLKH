const ValidationService = require("../services/unifiedImportValidationService");
const LookupService = require("../services/unifiedImportValidationLookupService");

exports.validate = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!Array.isArray(payload.sheets))
      return res
        .status(400)
        .json({ success: false, message: "Danh sách sheet không hợp lệ." });
    const snapshot = await LookupService.loadSnapshot(payload.sheets);
    const data = await ValidationService.validateBatch(payload, snapshot);
    return res.json({
      success: true,
      message: "Đã validate read-only; chưa ghi dữ liệu.",
      data,
    });
  } catch (error) {
    console.error("UNIFIED VALIDATE ERROR:");
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể validate batch.",
    });
  }
};
