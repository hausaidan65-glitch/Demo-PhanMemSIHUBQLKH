const StartupConnectionProgressModel = require(
  "../models/startupConnectionProgressModel",
);

class StartupConnectionProgressController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseEventId(value) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw StartupConnectionProgressController.validationError(
        "ID sự kiện phải là số nguyên dương.",
      );
    }

    const eventId = Number(rawValue);

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      throw StartupConnectionProgressController.validationError(
        "ID sự kiện phải là số nguyên dương.",
      );
    }

    return eventId;
  }

  static parsePayload(body = {}) {
    if (typeof body.content !== "string") {
      throw StartupConnectionProgressController.validationError(
        "Nội dung tiến độ là bắt buộc.",
      );
    }

    const content = body.content.trim();

    if (!content) {
      throw StartupConnectionProgressController.validationError(
        "Nội dung tiến độ không được để trống.",
      );
    }

    if (
      body.note !== undefined &&
      body.note !== null &&
      typeof body.note !== "string"
    ) {
      throw StartupConnectionProgressController.validationError(
        "Ghi chú quan trọng không hợp lệ.",
      );
    }

    const note =
      body.note === undefined || body.note === null
        ? null
        : body.note.trim() || null;

    return { content, note };
  }

  static async index(req, res) {
    try {
      const eventId = StartupConnectionProgressController.parseEventId(
        req.params.eventId,
      );
      const event =
        await StartupConnectionProgressModel.findSupportedEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Hội thảo hoặc Triển lãm.",
        });
      }

      const history = await StartupConnectionProgressModel.getHistory(eventId);

      return res.json({
        success: true,
        data: {
          event,
          latest: history[0] || null,
          history,
        },
      });
    } catch (error) {
      return StartupConnectionProgressController.handleError(
        res,
        error,
        "Lỗi lấy lịch sử tiến độ sự kiện:",
        "Không thể tải lịch sử tiến độ sự kiện.",
      );
    }
  }

  static async store(req, res) {
    try {
      const eventId = StartupConnectionProgressController.parseEventId(
        req.params.eventId,
      );
      const payload = StartupConnectionProgressController.parsePayload(req.body);
      const event =
        await StartupConnectionProgressModel.findSupportedEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Hội thảo hoặc Triển lãm.",
        });
      }

      const createdBy = Number(req.admin?.id);

      if (!Number.isSafeInteger(createdBy) || createdBy <= 0) {
        return res.status(401).json({
          success: false,
          message: "Thông tin quản trị viên không hợp lệ.",
        });
      }

      const progress = await StartupConnectionProgressModel.createProgress({
        eventId,
        content: payload.content,
        note: payload.note,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Cập nhật tiến độ thành công.",
        data: {
          event,
          progress,
        },
      });
    } catch (error) {
      return StartupConnectionProgressController.handleError(
        res,
        error,
        "Lỗi cập nhật tiến độ sự kiện:",
        "Không thể cập nhật tiến độ sự kiện.",
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

module.exports = StartupConnectionProgressController;
