const ExcelJS = require("exceljs");
const RegistrationService = require("../services/registrationService");
const RegistrationModel = require("../models/registrationModel");

class RegistrationController {
  // ============================
  // Danh sách đăng ký
  // ============================

  static async index(req, res) {
    try {
      const data = await RegistrationModel.getAll(req.query);

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
  // Đăng ký khóa học
  // ============================

  static async register(req, res) {
    try {
      const result = await RegistrationService.register(req.body);

      res.json({
        success: true,
        data: result,
        message: "Đăng ký thành công.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Xác nhận đăng ký
  // ============================

  static async confirm(req, res) {
    try {
      await RegistrationService.confirm(req.params.id);

      res.json({
        success: true,
        message: "Đã xác nhận học viên.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Chi tiết đăng ký
  // ============================

  static async show(req, res) {
    try {
      const data = await RegistrationModel.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hồ sơ.",
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
  // Từ chối đăng ký
  // ============================

  static async reject(req, res) {
    try {
      await RegistrationService.reject(req.params.id, req.body.note || null);

      res.json({
        success: true,
        message: "Đã từ chối đăng ký.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Hủy đăng ký
  // ============================

  static async cancel(req, res) {
    try {
      await RegistrationService.cancel(req.params.id, req.body.note || null);

      res.json({
        success: true,
        message: "Đã hủy đăng ký.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Checkin học viên
  // ============================

  static async checkin(req, res) {
    try {
      await RegistrationService.checkin(req.params.id);

      res.json({
        success: true,
        message: "Checkin thành công.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Export Excel
  // ============================

  static async export(req, res) {
    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Registrations");

    sheet.columns = [
      { header: "Họ tên", key: "fullname", width: 25 },

      { header: "Email", key: "email", width: 30 },

      { header: "Điện thoại", key: "phone", width: 20 },

      { header: "Khóa học", key: "course_name", width: 30 },

      { header: "Lớp học", key: "class_name", width: 30 },

      { header: "Trạng thái", key: "register_status", width: 18 },

      { header: "Checkin", key: "checked_in", width: 12 },

      { header: "Ngày đăng ký", key: "created_at", width: 25 },
    ];

    const data = await RegistrationModel.exportData();

    data.forEach((item) => {
      sheet.addRow({
        ...item,

        checked_in: item.checked_in ? "YES" : "NO",
      });
    });

    res.setHeader(
      "Content-Type",

      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",

      "attachment; filename=registrations.xlsx",
    );

    await workbook.xlsx.write(res);

    res.end();
  }
}

module.exports = RegistrationController;
