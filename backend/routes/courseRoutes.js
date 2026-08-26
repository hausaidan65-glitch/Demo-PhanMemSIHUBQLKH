const express = require("express");

const router = express.Router();

const CourseController = require("../controllers/courseController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const ScopeMiddleware = require("../middleware/scopeMiddleware");

const uploadCourseImage = require("../middleware/uploadCourseImage");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// ===============================
// PUBLIC
// ===============================

router.get("/", CourseController.index);

router.get("/program/:programId", CourseController.byProgram);

router.get("/:id", CourseController.show);

// ===============================
// ADMIN - TRAINING
// ===============================

router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowTraining,
  uploadCourseImage.single("thumbnail"),
  CourseController.store,
);

router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  uploadCourseImage.single("thumbnail"),
  CourseController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseController.destroy,
);

module.exports = router;
