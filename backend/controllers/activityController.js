const Activity = require("../models/activityModel");

class ActivityController {
  static async index(req, res) {
    try {
      const data = await Activity.getAll();

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

  static async show(req, res) {
    try {
      const data = await Activity.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hoạt động",
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

  static async store(req, res) {
    try {
      console.log("BODY:", req.body);

      const result = await Activity.create(req.body);

      res.status(201).json({
        success: true,
        id: result.insertId,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async update(req, res) {
    try {
      await Activity.update(req.params.id, req.body);

      res.json({
        success: true,
        message: "Cập nhật thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async destroy(req, res) {
    try {
      await Activity.delete(req.params.id);

      res.json({
        success: true,
        message: "Xóa thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = ActivityController;
