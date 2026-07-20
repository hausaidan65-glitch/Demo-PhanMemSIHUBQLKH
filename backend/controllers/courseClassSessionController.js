const Model = require("../models/courseClassSessionModel");

class CourseClassSessionController {
  static async index(req, res) {
    const data = await Model.getAll();

    res.json({
      success: true,

      total: data.length,

      data,
    });
  }

  static async byClass(req, res) {
    const data = await Model.getByClass(req.params.classId);

    res.json({
      success: true,

      total: data.length,

      data,
    });
  }

  static async store(req, res) {
    const result = await Model.create(req.body);

    res.json({
      success: true,

      id: result.insertId,
    });
  }
}

module.exports = CourseClassSessionController;
