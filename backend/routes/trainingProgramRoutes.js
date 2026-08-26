const express = require("express");

const router = express.Router();

const TrainingProgramController = require("../controllers/trainingProgramController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// =========================================================
// PUBLIC
// =========================================================

// API cây dữ liệu
router.get("/tree", TrainingProgramController.getTree);

// Danh sách chương trình
router.get("/", TrainingProgramController.getAll);

// Chi tiết
router.get("/:id", TrainingProgramController.getById);

// =========================================================
// ADMIN - TRAINING
// =========================================================

router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingProgramController.create,
);

router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingProgramController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  TrainingProgramController.remove,
);

module.exports = router;
