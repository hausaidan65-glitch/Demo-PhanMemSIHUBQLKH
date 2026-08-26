const express = require("express");

const router = express.Router();

const RegistrationController = require("../controllers/registrationController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

// =============================================
// PUBLIC
// =============================================

router.post("/", RegistrationController.register);

// =============================================
// TỪ ĐÂY TRỞ XUỐNG:
// ADMIN + TRAINING
// =============================================

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("TRAINING"),
);

router.get("/", RegistrationController.index);

router.get("/filter-options", RegistrationController.filterOptions);

router.get("/statistics", RegistrationController.statistics);

router.get("/export", RegistrationController.export);

router.get("/:id", RegistrationController.show);

router.patch("/:id/confirm", RegistrationController.confirm);

router.patch("/:id/reject", RegistrationController.reject);

router.patch("/:id/cancel", RegistrationController.cancel);

router.patch("/:id/checkin", RegistrationController.checkin);

module.exports = router;
