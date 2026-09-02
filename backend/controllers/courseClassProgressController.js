const CourseClassProgressModel = require(
  "../models/courseClassProgressModel",
);

class CourseClassProgressController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseOpeningId(value) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw CourseClassProgressController.validationError(
        "ID đợt tổ chức phải là số nguyên dương.",
      );
    }

    const openingId = Number(rawValue);

    if (!Number.isSafeInteger(openingId) || openingId <= 0) {
      throw CourseClassProgressController.validationError(
        "ID đợt tổ chức phải là số nguyên dương.",
      );
    }

    return openingId;
  }

  static parsePayload(body = {}) {
    if (typeof body.content !== "string") {
      throw CourseClassProgressController.validationError(
        "Nội dung tiến độ là bắt buộc.",
      );
    }

    const content = body.content.trim();

    if (!content) {
      throw CourseClassProgressController.validationError(
        "Nội dung tiến độ không được để trống.",
      );
    }

    if (
      body.note !== undefined &&
      body.note !== null &&
      typeof body.note !== "string"
    ) {
      throw CourseClassProgressController.validationError(
        "Ghi chú quan trọng không hợp lệ.",
      );
    }

    const note =
      body.note === undefined || body.note === null
        ? null
        : body.note.trim() || null;

    return { content, note };
  }

  static async findActiveOpening(openingId) {
    return CourseClassProgressModel.findOpeningById(openingId);
  }

  static async index(req, res) {
    try {
      const openingId = CourseClassProgressController.parseOpeningId(
        req.params.openingId,
      );
      const opening =
        await CourseClassProgressController.findActiveOpening(openingId);

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đợt tổ chức.",
        });
      }

      const history = await CourseClassProgressModel.getHistory(openingId);

      return res.json({
        success: true,
        data: {
          opening,
          latest: history[0] || null,
          history,
        },
      });
    } catch (error) {
      return CourseClassProgressController.handleError(
        res,
        error,
        "Lỗi lấy lịch sử tiến độ đợt tổ chức:",
        "Không thể tải lịch sử tiến độ đợt tổ chức.",
      );
    }
  }

  static async store(req, res) {
    try {
      const openingId = CourseClassProgressController.parseOpeningId(
        req.params.openingId,
      );
      const payload = CourseClassProgressController.parsePayload(req.body);
      const opening =
        await CourseClassProgressController.findActiveOpening(openingId);

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đợt tổ chức.",
        });
      }

      const createdBy = Number(req.admin?.id);

      if (!Number.isSafeInteger(createdBy) || createdBy <= 0) {
        return res.status(401).json({
          success: false,
          message: "Thông tin quản trị viên không hợp lệ.",
        });
      }

      const progress = await CourseClassProgressModel.createProgress({
        openingId,
        content: payload.content,
        note: payload.note,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Cập nhật tiến độ thành công.",
        data: {
          opening,
          progress,
        },
      });
    } catch (error) {
      return CourseClassProgressController.handleError(
        res,
        error,
        "Lỗi cập nhật tiến độ đợt tổ chức:",
        "Không thể cập nhật tiến độ đợt tổ chức.",
      );
    }
  }

  static handleError(res, error, logMessage, clientMessage) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error(logMessage, error);

    return res.status(500).json({
      success: false,
      message: clientMessage,
    });
  }
}

module.exports = CourseClassProgressController;
