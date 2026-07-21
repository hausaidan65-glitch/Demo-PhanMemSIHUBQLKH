const express = require("express");

const router = express.Router();

const RegistrationController = require("../controllers/registrationController");

// ============================
// Danh sách đăng ký
// ============================

router.get("/", RegistrationController.index);
router.get("/export", RegistrationController.export);
router.get("/:id", RegistrationController.show);

// ============================
// Đăng ký
// ============================

router.post("/", RegistrationController.register);
// ============================
// Quản lý đăng ký
// ============================

router.patch("/:id/confirm", RegistrationController.confirm);

router.patch("/:id/reject", RegistrationController.reject);

router.patch("/:id/cancel", RegistrationController.cancel);

router.patch("/:id/checkin", RegistrationController.checkin);
module.exports = router;
