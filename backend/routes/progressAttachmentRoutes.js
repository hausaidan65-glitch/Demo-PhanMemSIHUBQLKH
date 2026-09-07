const express = require("express");

const ProgressAttachmentController = require(
  "../controllers/progressAttachmentController",
);
const AuthMiddleware = require("../middleware/authMiddleware");
const progressAttachmentAccess = require(
  "../middleware/progressAttachmentAccess",
);
const RoleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/:attachmentId/file",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  progressAttachmentAccess,
  ProgressAttachmentController.download,
);

module.exports = router;
