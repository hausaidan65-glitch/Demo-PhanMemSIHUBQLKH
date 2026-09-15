const express = require("express");

const MissionController = require("../controllers/missionController");
const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
const verifyToken = AuthMiddleware.verifyToken;
const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");
const allowSuperAdmin = RoleMiddleware.allow("SUPER_ADMIN");

router.get("/", verifyToken, allowAdmin, MissionController.index);
router.get("/:id", verifyToken, allowAdmin, MissionController.show);
router.post("/", verifyToken, allowSuperAdmin, MissionController.store);
router.put("/:id", verifyToken, allowSuperAdmin, MissionController.update);
router.patch(
  "/:id/status",
  verifyToken,
  allowSuperAdmin,
  MissionController.changeStatus,
);

module.exports = router;
