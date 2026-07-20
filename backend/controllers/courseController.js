const Course = require("../models/courseModel");

class CourseController {
  static async index(req, res) {
    try {
      const data = await Course.getAll();

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
      const data = await Course.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy khóa học",
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

  static async byActivity(req, res) {
    try {
      const data = await Course.getByActivity(req.params.activityId);

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

  static async store(req, res) {
    try {
      const result = await Course.create(req.body);

      res.status(201).json({
        success: true,

        id: result.insertId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  }

  static async update(req, res) {
    try {
      await Course.update(req.params.id, req.body);

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
      await Course.delete(req.params.id);

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

module.exports = CourseController;
