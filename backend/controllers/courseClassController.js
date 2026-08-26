const CourseClassModel = require("../models/courseClassModel");
const CourseClassService = require("../services/courseClassService");
class CourseClassController {
  static async index(req, res) {
    try {
      const data = await CourseClassModel.getAll();

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách lớp học.",
      });
    }
  }

  static async show(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      const data = await CourseClassModel.getById(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy chi tiết lớp học.",
      });
    }
  }

  static async getByCourse(req, res) {
    try {
      const courseId = Number(req.params.courseId);

      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Khóa học không hợp lệ.",
        });
      }

      const data = await CourseClassModel.getByCourse(courseId);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách lớp.",
      });
    }
  }

  static async store(req, res) {
    try {
      const result = await CourseClassService.createFullClass(req.body);

      return res.status(201).json({
        success: true,
        message: "Tạo lớp học thành công.",
        data: result,
      });
    } catch (error) {
      console.error("Lỗi tạo lớp học:", error);

      const businessMessages = [
        "Vui lòng",
        "không tồn tại",
        "đã tồn tại",
        "bị trùng",
        "phải lớn hơn",
        "phải sau",
      ];

      const isBusinessError = businessMessages.some((text) =>
        error.message.includes(text),
      );

      return res.status(isBusinessError ? 400 : 500).json({
        success: false,
        message: error.message || "Không thể tạo lớp học.",
      });
    }
  }

  static async update(req, res) {
    try {
      const result = await CourseClassService.updateFullClass(
        req.params.id,
        req.body,
      );

      return res.json({
        success: true,
        message: "Cập nhật lớp học thành công.",
        data: result,
      });
    } catch (error) {
      console.error("Lỗi cập nhật lớp học:", error);

      const businessMessages = [
        "Vui lòng",
        "không hợp lệ",
        "không tồn tại",
        "Không tìm thấy",
        "đã tồn tại",
        "bị trùng",
        "phải lớn hơn",
        "phải sau",
        "không được nhỏ hơn",
      ];

      const isBusinessError = businessMessages.some((text) =>
        error.message.includes(text),
      );

      return res.status(isBusinessError ? 400 : 500).json({
        success: false,
        message: error.message || "Không thể cập nhật lớp học.",
      });
    }
  }

  static async destroy(req, res) {
    try {
      const id = Number(req.params.id);

      const data = await CourseClassModel.getById(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }
      await CourseClassModel.delete(id, req.admin.id);

      return res.json({
        success: true,
        message: "Xóa lớp học thành công.",
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

module.exports = CourseClassController;
