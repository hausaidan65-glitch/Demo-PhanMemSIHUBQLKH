const fs = require("fs/promises");
const path = require("path");

const progressUploadDirectory = path.resolve(__dirname, "../uploads/progress");

class ProgressAttachmentController {
  static async download(req, res) {
    try {
      const attachment = req.progressAttachment;
      const storedName = path.basename(String(attachment.stored_name || ""));
      const filePath = path.resolve(progressUploadDirectory, storedName);

      if (
        !storedName ||
        storedName !== attachment.stored_name ||
        path.dirname(filePath) !== progressUploadDirectory
      ) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tệp đính kèm.",
        });
      }

      await fs.access(filePath);

      await new Promise((resolve, reject) => {
        res.download(
          filePath,
          attachment.original_name,
          {
            headers: {
              "Content-Type": attachment.mime_type,
              "X-Content-Type-Options": "nosniff",
            },
          },
          (downloadError) =>
            downloadError ? reject(downloadError) : resolve(),
        );
      });

      return undefined;
    } catch (error) {
      if (res.headersSent) return res.end();

      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tệp đính kèm.",
        });
      }

      console.error("Lỗi mở tệp đính kèm tiến độ:", error);
      return res.status(500).json({
        success: false,
        message: "Không thể mở tệp đính kèm. Vui lòng thử lại.",
      });
    }
  }
}

module.exports = ProgressAttachmentController;
