const db = require("../config/db");
const UnifiedImportCommitService = require("../services/unifiedImportCommitService");

exports.commit = async (req, res) => {
  try {
    const payload = req.body || {};

    if (!Array.isArray(payload.sheets)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách sheet không hợp lệ.",
      });
    }

    if (payload.sheets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có sheet nào để import.",
      });
    }

    /*
     * executeCommit luôn:
     * 1. lookup DB mới nhất
     * 2. validate server-side lại
     * 3. build commit plan
     * 4. transaction từng sheet
     *
     * Không tin status/validationReady từ frontend.
     */
    const data = await UnifiedImportCommitService.executeCommit(payload, db);

    const committedSheets =
      Number(data.execution?.summary?.committedSheets) || 0;

    const failedSheets = Number(data.execution?.summary?.failedSheets) || 0;

    return res.json({
      success: failedSheets === 0,
      message:
        failedSheets > 0
          ? `Import hoàn tất một phần: ${committedSheets} sheet thành công, ${failedSheets} sheet thất bại.`
          : committedSheets > 0
            ? `Import thành công ${committedSheets} sheet.`
            : "Không có dữ liệu hợp lệ để ghi.",
      data,
    });
  } catch (error) {
    console.error("Unified import commit lỗi:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể thực hiện import dữ liệu.",
      code: error.code || "UNIFIED_IMPORT_COMMIT_FAILED",
    });
  }
};
