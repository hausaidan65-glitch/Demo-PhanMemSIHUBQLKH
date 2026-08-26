const express = require("express");

const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const uploadEventImage = require("../middleware/uploadEventImage");

const router = express.Router();

router.post(
  "/upload",
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  uploadEventImage.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tải ảnh thành công.",
      data: {
        filename: req.file.filename,
        thumbnail: `/uploads/events/${req.file.filename}`,
      },
    });
  },
);

module.exports = router;
