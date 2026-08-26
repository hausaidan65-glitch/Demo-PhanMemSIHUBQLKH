const express = require("express");

const router = express.Router();

const Controller = require("../controllers/classContentController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// PUBLIC

router.get("/class/:classId", Controller.byClass);

// ADMIN

router.post(
  "/class/:classId",
  verifyToken,
  allowAdmin,
  allowTraining,
  Controller.store,
);

router.put("/:id", verifyToken, allowAdmin, allowTraining, Controller.update);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  Controller.destroy,
);

module.exports = router;
