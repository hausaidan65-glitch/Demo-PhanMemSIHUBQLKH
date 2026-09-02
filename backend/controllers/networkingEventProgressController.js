const NetworkingEventProgressModel = require(
  "../models/networkingEventProgressModel",
);

class NetworkingEventProgressController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseEventId(value) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw NetworkingEventProgressController.validationError(
        "ID sự kiện phải là số nguyên dương.",
      );
    }

    const eventId = Number(rawValue);

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      throw NetworkingEventProgressController.validationError(
        "ID sự kiện phải là số nguyên dương.",
      );
    }

    return eventId;
  }

  static parsePayload(body = {}) {
    if (typeof body.content !== "string") {
      throw NetworkingEventProgressController.validationError(
        "Nội dung tiến độ là bắt buộc.",
      );
    }

    const content = body.content.trim();

    if (!content) {
      throw NetworkingEventProgressController.validationError(
        "Nội dung tiến độ không được để trống.",
      );
    }

    if (
      body.note !== undefined &&
      body.note !== null &&
      typeof body.note !== "string"
    ) {
      throw NetworkingEventProgressController.validationError(
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
      const eventId = NetworkingEventProgressController.parseEventId(
        req.params.eventId,
      );
      const event = await NetworkingEventProgressModel.findEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sự kiện kết nối.",
        });
      }

      const history = await NetworkingEventProgressModel.getHistory(eventId);

      return res.json({
        success: true,
        data: {
          event,
          latest: history[0] || null,
          history,
        },
      });
    } catch (error) {
      return NetworkingEventProgressController.handleError(
        res,
        error,
        "Lỗi lấy lịch sử tiến độ sự kiện kết nối:",
        "Không thể tải lịch sử tiến độ sự kiện kết nối.",
      );
    }
  }

  static async store(req, res) {
    try {
      const eventId = NetworkingEventProgressController.parseEventId(
        req.params.eventId,
      );
      const payload = NetworkingEventProgressController.parsePayload(req.body);
      const event = await NetworkingEventProgressModel.findEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sự kiện kết nối.",
        });
      }

      const createdBy = Number(req.admin?.id);

      if (!Number.isSafeInteger(createdBy) || createdBy <= 0) {
        return res.status(401).json({
          success: false,
          message: "Thông tin quản trị viên không hợp lệ.",
        });
      }

      const progress = await NetworkingEventProgressModel.createProgress({
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
      return NetworkingEventProgressController.handleError(
        res,
        error,
        "Lỗi cập nhật tiến độ sự kiện kết nối:",
        "Không thể cập nhật tiến độ sự kiện kết nối.",
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

module.exports = NetworkingEventProgressController;
