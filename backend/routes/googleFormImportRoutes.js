const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  previewGoogleForm,
  validateGoogleForm,
  commitGoogleForm,
} = require("../controllers/googleFormImportController");

// =====================================================
// GOOGLE FORM UPLOAD
//
// Dùng memoryStorage vì Bước Preview
// chỉ cần đọc file rồi trả metadata.
// Không cần ghi file tạm xuống uploads/excel.
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const filename = String(file.originalname || "").toLowerCase();

    const valid = filename.endsWith(".xlsx") || filename.endsWith(".xls");

    if (!valid) {
      return cb(new Error("Google Form chỉ hỗ trợ file .xlsx hoặc .xls."));
    }

    cb(null, true);
  },
});

// =====================================================
// POST /api/google-form-import/preview
// =====================================================

router.post("/preview", upload.single("file"), previewGoogleForm);
// =====================================================
// POST /api/google-form-import/validate
//
// JSON body, không upload file lại.
// =====================================================

router.post(
  "/validate",
  express.json({
    limit: "15mb",
  }),
  validateGoogleForm,
);
router.post("/commit", commitGoogleForm);

module.exports = router;
