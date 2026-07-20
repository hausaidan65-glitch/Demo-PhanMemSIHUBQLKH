const express = require("express");

const router = express.Router();

const CourseClassController = require("../controllers/courseClassController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");

// Public

router.get("/", CourseClassController.index);

router.get("/course/:courseId", CourseClassController.getByCourse);

router.get("/:id", CourseClassController.show);

// Admin

router.post(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  CourseClassController.store,
);

router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  CourseClassController.update,
);

router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  CourseClassController.destroy,
);

module.exports = router;
