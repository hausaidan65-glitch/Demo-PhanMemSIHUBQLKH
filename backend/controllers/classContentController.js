const Model = require("../models/classContentModel");

class ClassContentController {
  static async byClass(req, res) {
    try {
      const classId = Number(req.params.classId);

      const data = await Model.getByClass(classId);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async store(req, res) {
    try {
      const classId = Number(req.params.classId);

      if (!req.body.content_title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập nội dung học.",
        });
      }

      const result = await Model.create({
        ...req.body,
        class_id: classId,
      });

      return res.status(201).json({
        success: true,
        id: result.insertId,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      const existed = await Model.getById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy nội dung.",
        });
      }

      await Model.update(id, req.body);

      return res.json({
        success: true,
        message: "Đã cập nhật.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async destroy(req, res) {
    try {
      const id = Number(req.params.id);

      await Model.delete(id);

      return res.json({
        success: true,
        message: "Đã xóa.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = ClassContentController;
