const NotificationModel = require("../models/notificationModel");

class NotificationController {
  static async getAll(req, res) {
    try {
      const data = await NotificationModel.getAll();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Lỗi lấy thông báo",
      });
    }
  }

  static async count(req, res) {
    try {
      const total = await NotificationModel.countUnread();

      res.json({
        success: true,
        total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
      });
    }
  }

  static async markRead(req, res) {
    try {
      await NotificationModel.markRead(req.params.id);

      res.json({
        success: true,
        message: "Đã đọc",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
      });
    }
  }
  static async countUnread(req, res) {
    try {
      const total = await NotificationModel.countUnread();

      res.json({
        success: true,
        total,
      });
    } catch (error) {
      console.error("Lỗi đếm notification:", error);

      res.status(500).json({
        success: false,
        message: "Không thể lấy số thông báo chưa đọc.",
      });
    }
  }
}

module.exports = NotificationController;
