const EventReportModel = require("../models/eventReportModel");
const SeminarParticipantExportService = require(
  "../services/eventReport/seminarParticipantExportService",
);

class EventReportController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseInteger(value, name, minimum, maximum) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw EventReportController.validationError(
        `${name} phải là số nguyên từ ${minimum} đến ${maximum}.`,
      );
    }

    const parsedValue = Number(rawValue);

    if (parsedValue < minimum || parsedValue > maximum) {
      throw EventReportController.validationError(
        `${name} phải là số nguyên từ ${minimum} đến ${maximum}.`,
      );
    }

    return parsedValue;
  }

  static formatDate(year, month, day) {
    return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join(
      "-",
    );
  }

  static lastDayOfMonth(year, month) {
    if (month === 2) {
      const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      return isLeapYear ? 29 : 28;
    }

    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }

  static resolvePeriod(query) {
    const year = EventReportController.parseInteger(query.year, "Năm", 2000, 2100);
    const hasQuarter = query.quarter !== undefined && String(query.quarter).trim() !== "";
    const hasMonth = query.month !== undefined && String(query.month).trim() !== "";

    if (hasQuarter && hasMonth) {
      throw EventReportController.validationError(
        "Không thể lọc đồng thời theo quý và tháng.",
      );
    }

    let type = "YEAR";
    let quarter = null;
    let month = null;
    let startMonth = 1;
    let endMonth = 12;

    if (hasQuarter) {
      type = "QUARTER";
      quarter = EventReportController.parseInteger(query.quarter, "Quý", 1, 4);
      startMonth = (quarter - 1) * 3 + 1;
      endMonth = startMonth + 2;
    } else if (hasMonth) {
      type = "MONTH";
      month = EventReportController.parseInteger(query.month, "Tháng", 1, 12);
      startMonth = month;
      endMonth = month;
    }

    const startDate = EventReportController.formatDate(year, startMonth, 1);
    const endDate = EventReportController.formatDate(
      year,
      endMonth,
      EventReportController.lastDayOfMonth(year, endMonth),
    );

    return {
      type,
      year,
      quarter,
      month,
      start_date: startDate,
      end_date: endDate,
      report_start: `${startDate} 00:00:00`,
      report_end: `${endDate} 23:59:59`,
    };
  }

  static parsePositiveId(value, name) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw EventReportController.validationError(
        `${name} phải là số nguyên dương.`,
      );
    }

    const parsedValue = Number(rawValue);

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
      throw EventReportController.validationError(
        `${name} phải là số nguyên dương.`,
      );
    }

    return parsedValue;
  }

  static async seminarSummary(req, res) {
    try {
      const period = EventReportController.resolvePeriod(req.query);
      const summary = await EventReportModel.getSeminarSummary(period);

      return res.json({
        success: true,
        data: {
          period,
          ...summary,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo tổng quan Hội thảo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo tổng quan Hội thảo.",
      });
    }
  }

  static async seminars(req, res) {
    try {
      const period = EventReportController.resolvePeriod(req.query);
      const seminars = await EventReportModel.getSeminars(period);

      return res.json({
        success: true,
        data: {
          period,
          seminars,
        },
      });
    } catch (error) {
      return EventReportController.handleError(
        res,
        error,
        "Lỗi lấy danh sách báo cáo Hội thảo:",
        "Không thể tải danh sách báo cáo Hội thảo.",
      );
    }
  }

  static async seminarParticipants(req, res) {
    try {
      const seminarId = EventReportController.parsePositiveId(
        req.params.seminarId,
        "ID Hội thảo",
      );
      const seminar = await EventReportModel.findSeminarById(seminarId);

      if (!seminar) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Hội thảo.",
        });
      }

      const participants =
        await EventReportModel.getSeminarParticipants(seminarId);

      return res.json({
        success: true,
        data: {
          seminar,
          participants,
        },
      });
    } catch (error) {
      return EventReportController.handleError(
        res,
        error,
        "Lỗi lấy người tham gia Hội thảo:",
        "Không thể tải danh sách người tham gia Hội thảo.",
      );
    }
  }

  static async exportSeminarParticipants(req, res) {
    try {
      const seminarId = EventReportController.parsePositiveId(
        req.params.seminarId,
        "ID Hội thảo",
      );
      const options = SeminarParticipantExportService.parseExportQuery(
        req.query,
      );
      const seminar = await EventReportModel.findSeminarById(seminarId);

      if (!seminar) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Hội thảo.",
        });
      }

      const participants =
        await EventReportModel.getSeminarParticipants(seminarId);
      const result = await SeminarParticipantExportService.buildExport({
        seminar,
        participants,
        options,
      });

      res.setHeader(
        "Content-Type",
        SeminarParticipantExportService.XLSX_CONTENT_TYPE,
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );

      return res.send(result.buffer);
    } catch (error) {
      return EventReportController.handleError(
        res,
        error,
        "Lỗi xuất danh sách người tham gia Hội thảo:",
        "Không thể xuất danh sách người tham gia Hội thảo.",
      );
    }
  }

  static async seminarParticipantDetail(req, res) {
    try {
      const seminarId = EventReportController.parsePositiveId(
        req.params.seminarId,
        "ID Hội thảo",
      );
      const participantId = EventReportController.parsePositiveId(
        req.params.participantId,
        "ID người tham gia",
      );
      const seminar = await EventReportModel.findSeminarById(seminarId);

      if (!seminar) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Hội thảo.",
        });
      }

      const participant = await EventReportModel.getSeminarParticipantDetail(
        seminarId,
        participantId,
      );

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người tham gia trong Hội thảo.",
        });
      }

      return res.json({
        success: true,
        data: {
          seminar,
          participant,
        },
      });
    } catch (error) {
      return EventReportController.handleError(
        res,
        error,
        "Lỗi lấy chi tiết người tham gia Hội thảo:",
        "Không thể tải chi tiết người tham gia Hội thảo.",
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

module.exports = EventReportController;
