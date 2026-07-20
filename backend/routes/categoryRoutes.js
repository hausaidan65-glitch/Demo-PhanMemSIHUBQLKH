const express = require("express");

const router = express.Router();

const CategoryController = require("../controllers/categoryController");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");

// Public

router.get("/", CategoryController.index);

router.get("/:id", CategoryController.show);

// Admin

router.post(
  "/",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  CategoryController.store,
);

router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  CategoryController.update,
);

router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN"),
  CategoryController.destroy,
);

module.exports = router;
