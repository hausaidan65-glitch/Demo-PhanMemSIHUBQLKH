const ProgressAttachmentModel = require("../models/progressAttachmentModel");
const ScopeMiddleware = require("./scopeMiddleware");

const scopeByProgressType = Object.freeze({
  TRAINING: "TRAINING",
  STARTUP_CONNECTION: "EVENT",
  NETWORKING: "EVENT",
  INCUBATION: "INCUBATION",
});

async function progressAttachmentAccess(req, res, next) {
  try {
    const rawId = String(req.params.attachmentId || "").trim();

    if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tệp đính kèm.",
      });
    }

    const attachment = await ProgressAttachmentModel.findByIdWithProgress(
      Number(rawId),
    );
    const requiredScope = scopeByProgressType[attachment?.progress_type];

    if (!attachment || !attachment.progress_exists || !requiredScope) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tệp đính kèm.",
      });
    }

    req.progressAttachment = attachment;
    return ScopeMiddleware.allow(requiredScope)(req, res, next);
  } catch (error) {
    console.error("Lỗi kiểm tra quyền truy cập tệp tiến độ:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể mở tệp đính kèm. Vui lòng thử lại.",
    });
  }
}

module.exports = progressAttachmentAccess;
