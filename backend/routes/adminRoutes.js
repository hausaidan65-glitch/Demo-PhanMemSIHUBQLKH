const express = require("express");

const router = express.Router();

const AdminController = require("../controllers/adminController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// TẤT CẢ API NÀY CHỈ SUPER ADMIN
// ==========================================

router.use(AuthMiddleware.verifyToken, RoleMiddleware.allow("SUPER_ADMIN"));

router.get("/", AdminController.index);

router.get("/:id", AdminController.show);

router.post("/", AdminController.create);

router.put("/:id", AdminController.update);

router.patch("/:id/status", AdminController.changeStatus);

router.patch("/:id/reset-password", AdminController.resetPassword);

module.exports = router;
