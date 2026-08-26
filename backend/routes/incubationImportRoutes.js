const express = require("express");

const multer = require("multer");

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const {
  preview,
  confirm,
} = require("../controllers/incubationImportController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/excel");
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const fileName = String(file.originalname || "").toLowerCase();

    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isExcel) {
      return cb(new Error("Chỉ chấp nhận file Excel .xlsx hoặc .xls."));
    }

    return cb(null, true);
  },
});

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("INCUBATION"),
);

router.post("/preview", upload.array("files", 20), preview);

router.post("/confirm", confirm);

module.exports = router;
