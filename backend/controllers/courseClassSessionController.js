const Model = require("../models/courseClassSessionModel");

class CourseClassSessionController {
  static async index(req, res) {
    try {
      const data = await Model.getAll();

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách buổi học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách buổi học.",
      });
    }
  }

  static async byClass(req, res) {
    try {
      const classId = Number(req.params.classId);

      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp học không hợp lệ.",
        });
      }

      const data = await Model.getByClass(classId);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy lịch học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy lịch học.",
      });
    }
  }

  static async store(req, res) {
    try {
      const classId = Number(req.body.class_id);

      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn lớp học.",
        });
      }

      if (!req.body.session_date) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn ngày học.",
        });
      }

      if (
        req.body.start_time &&
        req.body.end_time &&
        req.body.start_time >= req.body.end_time
      ) {
        return res.status(400).json({
          success: false,
          message: "Giờ kết thúc phải sau giờ bắt đầu.",
        });
      }

      const result = await Model.create({
        ...req.body,
        class_id: classId,
      });

      return res.status(201).json({
        success: true,
        message: "Đã thêm buổi học.",
        id: result.insertId,
      });
    } catch (error) {
      console.error("Lỗi thêm buổi học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể thêm buổi học.",
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã buổi học không hợp lệ.",
        });
      }

      if (!req.body.session_date) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn ngày học.",
        });
      }

      if (
        req.body.start_time &&
        req.body.end_time &&
        req.body.start_time >= req.body.end_time
      ) {
        return res.status(400).json({
          success: false,
          message: "Giờ kết thúc phải sau giờ bắt đầu.",
        });
      }

      const existed = await Model.getById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy buổi học.",
        });
      }

      await Model.update(id, req.body);

      return res.json({
        success: true,
        message: "Đã cập nhật buổi học.",
      });
    } catch (error) {
      console.error("Lỗi cập nhật buổi học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật buổi học.",
      });
    }
  }

  static async destroy(req, res) {
    try {
      const id = Number(req.params.id);

      const existed = await Model.getById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy buổi học.",
        });
      }

      await Model.delete(id);

      return res.json({
        success: true,
        message: "Đã xóa buổi học.",
      });
    } catch (error) {
      console.error("Lỗi xóa buổi học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xóa buổi học.",
      });
    }
  }
}

module.exports = CourseClassSessionController;
