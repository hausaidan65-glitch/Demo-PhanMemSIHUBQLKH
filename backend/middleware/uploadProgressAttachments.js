const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const MAX_PROGRESS_FILES = 5;
const MAX_PROGRESS_FILE_SIZE = 10 * 1024 * 1024;
const uploadDirectory = path.join(__dirname, "../uploads/progress");

const allowedMimeTypesByExtension = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDirectory),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const randomPart = crypto.randomBytes(12).toString("hex");
    callback(null, `progress-${Date.now()}-${randomPart}${extension}`);
  },
});

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedMimeTypesByExtension[extension];

  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error("Định dạng tệp không được hỗ trợ.");
    error.code = "INVALID_PROGRESS_FILE_TYPE";
    return callback(error);
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_PROGRESS_FILE_SIZE,
    files: MAX_PROGRESS_FILES,
  },
}).array("files", MAX_PROGRESS_FILES);

function uploadProgressAttachments(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();

    let message = "Không thể tải tệp đính kèm. Vui lòng thử lại.";

    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Tệp vượt quá dung lượng cho phép.";
    } else if (error.code === "LIMIT_FILE_COUNT") {
      message = `Chỉ được đính kèm tối đa ${MAX_PROGRESS_FILES} tệp.`;
    } else if (error.code === "INVALID_PROGRESS_FILE_TYPE") {
      message = error.message;
    }

    return res.status(400).json({ success: false, message });
  });
}

module.exports = {
  MAX_PROGRESS_FILES,
  MAX_PROGRESS_FILE_SIZE,
  uploadProgressAttachments,
};
