const express = require("express");

const router = express.Router();

const IncubationProfileController = require("../controllers/incubationProfileController");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("INCUBATION"),
);

router.get("/", IncubationProfileController.index);

router.post("/", IncubationProfileController.create);

router.get("/filter-options", IncubationProfileController.filterOptions);

router.get("/statistics", IncubationProfileController.statistics);

router.get("/export", IncubationProfileController.exportExcel);

router.get("/:id", IncubationProfileController.show);

router.put("/:id", IncubationProfileController.update);

router.delete("/:id", IncubationProfileController.destroy);

module.exports = router;
