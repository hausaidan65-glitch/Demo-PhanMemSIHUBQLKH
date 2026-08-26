const express = require("express");

const router = express.Router();

const TrainingClassController = require("../controllers/trainingClassController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const uploadCourseImage = require("../middleware/uploadCourseImage");
const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// =========================================================
// PUBLIC
// =========================================================

// Danh sách lớp
router.get("/", TrainingClassController.index);
router.get("/filter-options", TrainingClassController.filterOptions);
// =========================================================
// ADMIN - XUẤT EXCEL
//
// PHẢI đặt trước "/:id"
// nếu không Express có thể hiểu "export" là id.
// =========================================================
router.get(
  "/export",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.exportExcel,
);
// =========================================================
// THÙNG RÁC LỚP HỌC
// =========================================================
router.get(
  "/trash",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.trash,
);
// =========================================================
// KHÔI PHỤC LỚP HỌC
// =========================================================
router.patch(
  "/:id/restore",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.restore,
);
// Chi tiết lớp
router.get("/:id", TrainingClassController.show);

// =========================================================
// ADMIN
// =========================================================

// Thêm lớp + ảnh
router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowTraining,
  uploadCourseImage.single("thumbnail"),
  TrainingClassController.store,
);
router.post(
  "/:id/openings",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.storeOpening,
);
router.get(
  "/:id/openings/:openingId/sessions",
  verifyToken,
  allowTraining,
  TrainingClassController.getOpeningSessions,
);
// Cập nhật lớp + ảnh
router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  uploadCourseImage.single("thumbnail"),
  TrainingClassController.update,
);
router.put(
  "/:id/openings/:openingId",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.updateOpening,
);
router.delete(
  "/:id/openings/:openingId",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.destroyOpening,
);
// Xóa lớp
router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingClassController.destroy,
);

module.exports = router;
