const express = require("express");

const router = express.Router();

const multer = require("multer");

const {
  previewExcel,
  confirmImport,
} = require("../controllers/importController");

// nơi lưu file tạm

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/excel/");
  },

  filename: (req, file, cb) => {
    const name = Date.now() + "-" + file.originalname;

    cb(null, name);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [".xlsx", ".xls"];

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file Excel"));
    }
  },
});

router.post(
  "/preview",

  upload.single("file"),

  previewExcel,
);
router.post("/confirm", confirmImport);
module.exports = router;
