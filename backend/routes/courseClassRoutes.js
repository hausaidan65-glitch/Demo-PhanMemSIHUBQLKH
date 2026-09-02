const express = require("express");

const router = express.Router();

const CourseClassController = require("../controllers/courseClassController");
const CourseClassProgressController = require(
  "../controllers/courseClassProgressController",
);

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowTraining = ScopeMiddleware.allow("TRAINING");

// PUBLIC

router.get("/", CourseClassController.index);

router.get("/course/:courseId", CourseClassController.getByCourse);

router.get(
  "/:openingId/progress",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseClassProgressController.index,
);

router.post(
  "/:openingId/progress",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseClassProgressController.store,
);

router.get("/:id", CourseClassController.show);

// ADMIN

router.post(
  "/",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseClassController.store,
);

router.put(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseClassController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowAdmin,
  allowTraining,
  CourseClassController.destroy,
);

module.exports = router;
