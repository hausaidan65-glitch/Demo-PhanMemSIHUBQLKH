const express = require("express");

const router = express.Router();

const UserController = require("../controllers/userController");

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
