const CourseClassModel = require("../models/courseClassModel");

class CourseClassController {
  static async index(req, res) {
    try {
      const data = await CourseClassModel.getAll();

      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  static async show(req, res) {
    try {
      const data = await CourseClassModel.getById(req.params.id);

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  static async getByCourse(req, res) {
    try {
      const data = await CourseClassModel.getByCourse(req.params.courseId);

      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  static async store(req, res) {
    try {
      const result = await CourseClassModel.create(req.body);

      res.json({
        success: true,
        id: result.insertId,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  static async update(req, res) {
    try {
      await CourseClassModel.update(
        req.params.id,

        req.body,
      );

      res.json({
        success: true,
        message: "Updated successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  static async destroy(req, res) {
    try {
      await CourseClassModel.delete(req.params.id);

      res.json({
        success: true,
        message: "Deleted successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = CourseClassController;
