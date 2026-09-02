const express = require("express");

const NetworkingReportController = require(
  "../controllers/networkingReportController",
);
const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const ScopeMiddleware = require("../middleware/scopeMiddleware");

const router = express.Router();

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("EVENT"),
);

router.get("/summary", NetworkingReportController.summary);
router.get("/events", NetworkingReportController.events);

module.exports = router;
