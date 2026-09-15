const express = require("express");

const router = express.Router();

const multer = require("multer");

const {
  previewSihubExcel,
  confirmSihubImport,
  createCourseAndContinueImport,
} = require("../controllers/sihubImportController");
const UnifiedImportPreviewController = require("../controllers/unifiedImportPreviewController");
const UnifiedImportValidationController = require("../controllers/unifiedImportValidationController");
const UnifiedImportCommitController = require("../controllers/unifiedImportCommitController");
// lưu file tạm

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/excel");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const previewOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) =>
    cb(null, /\.(xlsx|xls)$/i.test(file.originalname)),
});

// Preview nhiều file

router.post("/preview", upload.array("files", 50), previewSihubExcel);
router.post(
  "/unified-preview",
  previewOnlyUpload.array("files", 50),
  UnifiedImportPreviewController.preview,
);
router.post("/unified-validate", UnifiedImportValidationController.validate);
router.post("/unified-commit", UnifiedImportCommitController.commit);
// Confirm import

router.post("/confirm", confirmSihubImport);

router.post("/create-course-and-continue", createCourseAndContinueImport);
module.exports = router;
