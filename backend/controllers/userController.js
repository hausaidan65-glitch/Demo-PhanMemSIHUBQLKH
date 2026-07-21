const UserModel = require("../models/userModel");

class UserController {
  // ============================
  // Danh sách học viên
  // ============================

  static async index(req, res) {
    try {
      const data = await UserModel.getAll(req.query);

      res.json({
        success: true,

        total: data.length,

        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  }

  // ============================
  // Chi tiết học viên
  // ============================

  static async show(req, res) {
    try {
      const data = await UserModel.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy học viên.",
        });
      }

      res.json({
        success: true,

        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  }
  // ============================
  // Thống kê học viên
  // ============================
  static async statistics(req, res) {
    try {
      const data = await UserModel.statistics();

      res.json({
        success: true,

        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  }
}

module.exports = UserController;
