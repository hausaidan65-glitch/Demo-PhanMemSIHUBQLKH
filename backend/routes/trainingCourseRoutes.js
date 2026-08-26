const express = require("express");

const router = express.Router();

const TrainingCourseController = require("../controllers/trainingCourseController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// =========================================================
// PUBLIC
// =========================================================

// Danh sách khóa đào tạo
router.get("/", TrainingCourseController.index);

// =========================================================
// ADMIN - EXPORT
// =========================================================

router.get(
  "/export",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingCourseController.exportExcel,
);

// =========================================================
// PUBLIC DETAIL
// =========================================================

router.get("/:id", TrainingCourseController.show);

// =========================================================
// ADMIN
// =========================================================

// Thêm khóa đào tạo
router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingCourseController.store,
);

// Cập nhật khóa đào tạo
router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingCourseController.update,
);

// Xóa
// Hiện tại ADMIN có TRAINING cũng được thao tác.
// Sau này controller này sẽ đổi thành soft delete.
router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingCourseController.destroy,
);

module.exports = router;
