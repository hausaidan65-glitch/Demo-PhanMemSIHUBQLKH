const express = require("express");

const router = express.Router();

const AdminActivityLogController = require("../controllers/adminActivityLogController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

// =========================================================
// NHẬT KÝ HOẠT ĐỘNG
// SUPER_ADMIN + ADMIN đều được xem
// =========================================================
router.get("/", verifyToken, allowAdmin, AdminActivityLogController.index);

module.exports = router;
