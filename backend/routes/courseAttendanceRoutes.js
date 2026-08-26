const express = require("express");

const CourseAttendanceController = require("../controllers/courseAttendanceController");

const router = express.Router();

// ============================
// Preview QR
// Chưa check-in
// ============================
router.post("/qr/preview", CourseAttendanceController.previewQr);
router.post("/check-in", CourseAttendanceController.checkIn);
router.get(
  "/class/:classId/sessions",
  CourseAttendanceController.classSessions,
);
router.get(
  "/session/:sessionId/attendance",
  CourseAttendanceController.sessionAttendance,
);

module.exports = router;
