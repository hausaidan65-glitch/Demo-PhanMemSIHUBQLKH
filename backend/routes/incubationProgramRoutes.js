const express = require("express");

const router = express.Router();

const IncubationProgramController = require("../controllers/incubationProgramController");
const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowIncubation = ScopeMiddleware.allow("INCUBATION");

router.get("/", IncubationProgramController.index);

// PUBLIC
router.get("/", IncubationProgramController.index);

router.post("/:id/apply", IncubationProgramController.apply);

// ADMIN
router.get(
  "/statistics",
  verifyToken,
  allowAdmin,
  allowIncubation,
  IncubationProgramController.statistics,
);

router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowIncubation,
  IncubationProgramController.create,
);

router.get(
  "/:id/profiles",
  verifyToken,
  allowAdmin,
  allowIncubation,
  IncubationProgramController.profiles,
);

// PUBLIC DETAIL
router.get("/:id", IncubationProgramController.show);

router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowIncubation,
  IncubationProgramController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowIncubation,
  IncubationProgramController.destroy,
);
module.exports = router;
