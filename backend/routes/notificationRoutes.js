const express = require("express");

const router = express.Router();

const NotificationController = require("../controllers/notificationController");

const { verifyToken } = require("../middleware/authMiddleware");

const { allow } = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

router.use(
  verifyToken,
  allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("TRAINING"),
);

router.get("/", NotificationController.getAll);

router.get("/count", NotificationController.count);

router.patch("/:id/read", NotificationController.markRead);

module.exports = router;
