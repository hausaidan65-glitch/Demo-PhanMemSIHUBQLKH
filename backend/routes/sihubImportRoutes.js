const express = require("express");

const router = express.Router();

const multer = require("multer");

const {
  previewSihubExcel,
  confirmSihubImport,
  createCourseAndContinueImport,
} = require("../controllers/sihubImportController");

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

// Preview nhiều file

router.post("/preview", upload.array("files", 50), previewSihubExcel);

// Confirm import

router.post("/confirm", confirmSihubImport);

router.post("/create-course-and-continue", createCourseAndContinueImport);
module.exports = router;
