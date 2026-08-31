const express = require("express");

const router = express.Router();

const CourseReportController = require("../controllers/courseReportController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("TRAINING"),
);

router.get("/summary", CourseReportController.summary);
router.get("/programs", CourseReportController.programs);
router.get(
  "/programs/:programId/courses",
  CourseReportController.coursesByProgram,
);
router.get(
  "/courses/:courseId/openings",
  CourseReportController.openingsByCourse,
);
router.get(
  "/openings/:openingId/students",
  CourseReportController.studentsByOpening,
);
router.get(
  "/openings/:openingId/students/export",
  CourseReportController.exportOpeningStudents,
);
router.get(
  "/openings/:openingId/students/:registrationId/attendance",
  CourseReportController.studentAttendanceHistory,
);

module.exports = router;
