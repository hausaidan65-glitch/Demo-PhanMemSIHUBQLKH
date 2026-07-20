const express = require("express");

const router = express.Router();

const Controller = require("../controllers/courseClassSessionController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

// ======================
// Public
// ======================

router.get("/", Controller.index);

router.get("/class/:classId", Controller.byClass);

// ======================
// Admin
// ======================

router.post(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  Controller.store,
);

module.exports = router;
