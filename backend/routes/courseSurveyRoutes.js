const express = require("express");

const router = express.Router();

const CourseSurveyController = require("../controllers/courseSurveyController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// PUBLIC — liên kết khảo sát theo lớp (không đổi)

router.get("/classes/:classId/:token", CourseSurveyController.resolveClass);

router.post("/classes/:classId/:token", CourseSurveyController.submitSurvey);

// ADMIN

router.get(
  "/export",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseSurveyController.exportExcel,
);

router.get("/", verifyToken, allowAdmin, allowTraining, CourseSurveyController.index);

router.get(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseSurveyController.show,
);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseSurveyController.destroy,
);

module.exports = router;
