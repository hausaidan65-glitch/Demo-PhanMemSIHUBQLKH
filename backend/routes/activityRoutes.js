const express = require("express");

const router = express.Router();

const ActivityController = require("../controllers/activityController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");

// ========================
// Public API
// ========================

router.get("/", ActivityController.index);

router.get("/:id", ActivityController.show);

// ========================
// Admin API
// ========================

router.post(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  ActivityController.store,
);

router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "TRAINING"),
  ActivityController.update,
);

router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  ActivityController.destroy,
);

module.exports = router;
