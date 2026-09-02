const IncubationProgramProgressModel = require(
  "../models/incubationProgramProgressModel",
);

class IncubationProgramProgressController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseProgramId(value) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw IncubationProgramProgressController.validationError(
        "ID chương trình phải là số nguyên dương.",
      );
    }

    const programId = Number(rawValue);

    if (!Number.isSafeInteger(programId) || programId <= 0) {
      throw IncubationProgramProgressController.validationError(
        "ID chương trình phải là số nguyên dương.",
      );
    }

    return programId;
  }

  static parsePayload(body = {}) {
    if (typeof body.content !== "string") {
      throw IncubationProgramProgressController.validationError(
        "Nội dung tiến độ là bắt buộc.",
      );
    }

    const content = body.content.trim();

    if (!content) {
      throw IncubationProgramProgressController.validationError(
        "Nội dung tiến độ không được để trống.",
      );
    }

    if (
      body.note !== undefined &&
      body.note !== null &&
      typeof body.note !== "string"
    ) {
      throw IncubationProgramProgressController.validationError(
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
      const programId = IncubationProgramProgressController.parseProgramId(
        req.params.programId,
      );
      const program =
        await IncubationProgramProgressModel.findProgramById(programId);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      const history =
        await IncubationProgramProgressModel.getHistory(programId);

      return res.json({
        success: true,
        data: {
          program,
          latest: history[0] || null,
          history,
        },
      });
    } catch (error) {
      return IncubationProgramProgressController.handleError(
        res,
        error,
        "Lỗi lấy lịch sử tiến độ Chương trình ươm tạo:",
        "Không thể tải lịch sử tiến độ Chương trình ươm tạo.",
      );
    }
  }

  static async store(req, res) {
    try {
      const programId = IncubationProgramProgressController.parseProgramId(
        req.params.programId,
      );
      const payload = IncubationProgramProgressController.parsePayload(req.body);
      const program =
        await IncubationProgramProgressModel.findProgramById(programId);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      const createdBy = Number(req.admin?.id);

      if (!Number.isSafeInteger(createdBy) || createdBy <= 0) {
        return res.status(401).json({
          success: false,
          message: "Thông tin quản trị viên không hợp lệ.",
        });
      }

      const progress = await IncubationProgramProgressModel.createProgress({
        programId,
        content: payload.content,
        note: payload.note,
        createdBy,
      });

      return res.status(201).json({
        success: true,
        message: "Cập nhật tiến độ thành công.",
        data: {
          program,
          progress,
        },
      });
    } catch (error) {
      return IncubationProgramProgressController.handleError(
        res,
        error,
        "Lỗi cập nhật tiến độ Chương trình ươm tạo:",
        "Không thể cập nhật tiến độ Chương trình ươm tạo.",
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

module.exports = IncubationProgramProgressController;
