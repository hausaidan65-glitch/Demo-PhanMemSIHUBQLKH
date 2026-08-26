const CourseAttendanceService = require("../services/courseAttendanceService");

class CourseAttendanceController {
  // ============================
  // Đọc QR và xem thông tin
  // Chưa ghi điểm danh
  // ============================
  static async previewQr(req, res) {
    try {
      const { qr_value, qr_token } = req.body;

      const rawQrValue = qr_value || qr_token;

      const data = await CourseAttendanceService.previewQr(rawQrValue);

      return res.json({
        success: true,
        message: "Đọc mã QR thành công.",
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async checkIn(req, res) {
    try {
      const { qr_value, qr_token, session_id } = req.body;

      const rawQrValue = qr_value || qr_token;

      const data = await CourseAttendanceService.checkInByQr({
        rawQrValue,
        sessionId: Number(session_id),

        // Tạm thời chưa bắt buộc Admin auth
        checkedInBy: req.user?.id || null,
      });

      return res.json({
        success: true,

        message: data.already_checked_in
          ? "Học viên đã điểm danh buổi này."
          : "Điểm danh thành công.",

        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async classSessions(req, res) {
    try {
      const data = await CourseAttendanceService.getClassSessions(
        req.params.classId,
      );

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async sessionAttendance(req, res) {
    try {
      const data = await CourseAttendanceService.getSessionAttendance(
        req.params.sessionId,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = CourseAttendanceController;
