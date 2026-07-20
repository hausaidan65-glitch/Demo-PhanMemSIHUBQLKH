const express = require("express");

const router = express.Router();

const CourseController = require("../controllers/courseController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");

// ============================
// Public
// ============================

// Lấy tất cả khóa học
router.get("/", CourseController.index);

// Lấy theo Activity
router.get("/activity/:activityId", CourseController.byActivity);

// Lấy chi tiết khóa học
router.get("/:id", CourseController.show);

// ============================
// Admin
// ============================

// Thêm khóa học

router.post(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  CourseController.store,
);

// Cập nhật khóa học

router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  CourseController.update,
);

// Xóa khóa học

router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  CourseController.destroy,
);

module.exports = router;
