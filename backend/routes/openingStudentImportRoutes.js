const express = require("express");
const multer = require("multer");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const ScopeMiddleware = require("../middleware/scopeMiddleware");
const Controller = require("../controllers/openingStudentImportController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const filename = String(file.originalname || "").toLowerCase();
    const valid = filename.endsWith(".xlsx") || filename.endsWith(".xls");

    callback(valid ? null : new Error("Chỉ chấp nhận file Excel .xlsx hoặc .xls."), valid);
  },
});

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("TRAINING"),
);

router.post("/:openingId/preview", upload.single("file"), Controller.preview);
router.post("/:openingId/confirm", Controller.confirm);

module.exports = router;
