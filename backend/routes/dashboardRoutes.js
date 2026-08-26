const express = require("express");

const router = express.Router();

const DashboardController = require("../controllers/dashboardController");
const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  DashboardController.dashboard,
);
module.exports = router;
