const AdminActivityLogModel = require("../models/adminActivityLogModel");

class AdminActivityLogController {
  // =========================================================
  // GET /api/admin-activity-logs
  // =========================================================
  static async index(req, res) {
    try {
      const data = await AdminActivityLogModel.getAll(req.query);

      return res.status(200).json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy nhật ký hoạt động admin:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải nhật ký hoạt động.",
      });
    }
  }
}

module.exports = AdminActivityLogController;
