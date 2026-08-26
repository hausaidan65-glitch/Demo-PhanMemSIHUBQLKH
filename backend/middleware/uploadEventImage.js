const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "../uploads/events");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const fileName = `event-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    callback(null, fileName);
  },
});

const fileFilter = (req, file, callback) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/jfif",
    "application/octet-stream",
  ];

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".jfif"];

  const extension = path.extname(file.originalname).toLowerCase();

  const validMimeType = allowedMimeTypes.includes(file.mimetype);
  const validExtension = allowedExtensions.includes(extension);

  if (!validMimeType || !validExtension) {
    return callback(
      new Error("Ảnh không hợp lệ. Chỉ hỗ trợ JPG, JPEG, PNG, WEBP hoặc JFIF."),
    );
  }

  callback(null, true);
};

const uploadEventImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadEventImage;
