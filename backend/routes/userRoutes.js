const express = require("express");

const router = express.Router();

const UserController = require("../controllers/userController");

// ============================
// Kiểm tra hồ sơ bằng email/phone
// ============================
router.post("/resolve-identity", UserController.resolveIdentity);

// ============================
// Cập nhật email nhận thông báo
// ============================
router.patch("/:id/primary-email", UserController.updatePrimaryEmail);

// ============================
// Thống kê
// ============================
router.get("/statistics", UserController.statistics);

// ============================
// Danh sách học viên
// ============================
router.get("/", UserController.index);

// ============================
// Chi tiết học viên
// ============================
router.get("/:id", UserController.show);

module.exports = router;
