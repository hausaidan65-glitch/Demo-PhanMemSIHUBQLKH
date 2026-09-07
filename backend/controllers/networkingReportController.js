const NetworkingReportModel = require("../models/networkingReportModel");
const { resolveReportPeriod } = require("../utils/reportPeriod");
const NetworkingParticipantExportService = require(
  "../services/networkingReport/networkingParticipantExportService",
);
const NetworkingSummaryReportExportService = require(
  "../services/networkingReport/networkingSummaryReportExportService",
);
const NetworkingEventListExportService = require(
  "../services/networkingReport/networkingEventListExportService",
);

class NetworkingReportController {
  static validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  static parseInteger(value, name, minimum, maximum) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw NetworkingReportController.validationError(
        `${name} phải là số nguyên từ ${minimum} đến ${maximum}.`,
      );
    }

    const parsedValue = Number(rawValue);

    if (parsedValue < minimum || parsedValue > maximum) {
      throw NetworkingReportController.validationError(
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

  static resolvePeriod(query = {}) {
    const year = NetworkingReportController.parseInteger(
      query.year,
      "Năm",
      2000,
      2100,
    );
    const hasQuarter =
      query.quarter !== undefined && String(query.quarter).trim() !== "";
    const hasMonth = query.month !== undefined && String(query.month).trim() !== "";

    if (hasQuarter && hasMonth) {
      throw NetworkingReportController.validationError(
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
      quarter = NetworkingReportController.parseInteger(
        query.quarter,
        "Quý",
        1,
        4,
      );
      startMonth = (quarter - 1) * 3 + 1;
      endMonth = startMonth + 2;
    } else if (hasMonth) {
      type = "MONTH";
      month = NetworkingReportController.parseInteger(
        query.month,
        "Tháng",
        1,
        12,
      );
      startMonth = month;
      endMonth = month;
    }

    const startDate = NetworkingReportController.formatDate(year, startMonth, 1);
    const endDate = NetworkingReportController.formatDate(
      year,
      endMonth,
      NetworkingReportController.lastDayOfMonth(year, endMonth),
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

  static periodResponse(period) {
    return {
      type: period.type,
      year: period.year,
      quarter: period.quarter,
      month: period.month,
      week: period.week,
      start_date: period.start_date,
      end_date: period.end_date,
    };
  }

  static parsePositiveId(value, name) {
    const rawValue = String(value ?? "").trim();

    if (!/^\d+$/.test(rawValue)) {
      throw NetworkingReportController.validationError(
        `${name} phải là số nguyên dương.`,
      );
    }

    const parsedValue = Number(rawValue);

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
      throw NetworkingReportController.validationError(
        `${name} phải là số nguyên dương.`,
      );
    }

    return parsedValue;
  }

  static async summary(req, res) {
    try {
      const period = resolveReportPeriod(req.query, { includeTime: true });
      const summary = await NetworkingReportModel.getSummary(period);

      return res.json({
        success: true,
        data: {
          period: NetworkingReportController.periodResponse(period),
          summary,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo tổng quan Sự kiện kết nối:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo tổng quan Sự kiện kết nối.",
      });
    }
  }

  static async exportSummary(req, res) {
    try {
      const period = resolveReportPeriod(req.query, { includeTime: true });
      const [summary, events] = await Promise.all([
        NetworkingReportModel.getSummary(period),
        NetworkingReportModel.getEvents(period),
      ]);
      const workbook = NetworkingSummaryReportExportService.buildWorkbook({
        period,
        summary,
        events,
      });
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        NetworkingSummaryReportExportService.XLSX_CONTENT_TYPE,
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${NetworkingSummaryReportExportService.buildFilename(period)}"`,
      );
      return res.send(Buffer.from(buffer));
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }

      console.error("Lỗi xuất báo cáo tổng quan Sự kiện kết nối:", error);
      return res.status(500).json({
        success: false,
        message: "Không thể xuất báo cáo tổng quan Sự kiện kết nối.",
      });
    }
  }

  static async events(req, res) {
    try {
      const period = resolveReportPeriod(req.query, { includeTime: true });
      const events = await NetworkingReportModel.getEvents(period);

      return res.json({
        success: true,
        data: {
          period: NetworkingReportController.periodResponse(period),
          events,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy danh sách báo cáo Sự kiện kết nối:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách báo cáo Sự kiện kết nối.",
      });
    }
  }

  static async exportEvents(req, res) {
    try {
      const period = resolveReportPeriod(req.query, { includeTime: true });
      const options = NetworkingEventListExportService.parseExportQuery(req.query);
      const sourceEvents = await NetworkingReportModel.getEvents(period);
      const events = NetworkingEventListExportService.filterEvents(
        sourceEvents,
        options.scope,
        options.filters,
      );
      const workbook = NetworkingEventListExportService.buildWorkbook({
        period,
        events,
        ...options,
      });
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        NetworkingEventListExportService.XLSX_CONTENT_TYPE,
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${NetworkingEventListExportService.buildFilename(
          period,
          options.scope,
        )}"`,
      );
      return res.send(Buffer.from(buffer));
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Lỗi xuất danh sách Sự kiện kết nối:", error);
      return res.status(500).json({
        success: false,
        message: "Không thể xuất danh sách Sự kiện kết nối.",
      });
    }
  }

  static async eventParticipants(req, res) {
    try {
      const eventId = NetworkingReportController.parsePositiveId(
        req.params.eventId,
        "ID sự kiện",
      );
      const event = await NetworkingReportModel.findEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sự kiện kết nối.",
        });
      }

      const participants =
        await NetworkingReportModel.getEventParticipants(eventId);

      return res.json({
        success: true,
        data: {
          event,
          participants,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy người tham gia Sự kiện kết nối:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách người tham gia Sự kiện kết nối.",
      });
    }
  }

  static async eventParticipantDetail(req, res) {
    try {
      const eventId = NetworkingReportController.parsePositiveId(
        req.params.eventId,
        "ID sự kiện",
      );
      const participantId = NetworkingReportController.parsePositiveId(
        req.params.participantId,
        "ID người tham gia",
      );
      const event = await NetworkingReportModel.findEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sự kiện kết nối.",
        });
      }

      const participant =
        await NetworkingReportModel.getEventParticipantDetail(
          eventId,
          participantId,
        );

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người tham gia trong sự kiện kết nối.",
        });
      }

      return res.json({
        success: true,
        data: {
          event,
          participant,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy chi tiết người tham gia Sự kiện kết nối:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải chi tiết người tham gia Sự kiện kết nối.",
      });
    }
  }

  static async exportEventParticipants(req, res) {
    try {
      const eventId = NetworkingReportController.parsePositiveId(
        req.params.eventId,
        "ID sự kiện",
      );
      const options = NetworkingParticipantExportService.parseExportQuery(
        req.query,
      );
      const event = await NetworkingReportModel.findEventByIdForPeriod(
        eventId,
        options.period,
      );

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sự kiện kết nối trong kỳ báo cáo.",
        });
      }

      const participants =
        await NetworkingReportModel.getEventParticipants(eventId);
      const result = await NetworkingParticipantExportService.buildExport({
        event,
        participants,
        options,
      });

      res.setHeader(
        "Content-Type",
        NetworkingParticipantExportService.XLSX_CONTENT_TYPE,
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      return res.send(result.buffer);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }

      console.error("Lỗi xuất người tham gia Sự kiện kết nối:", error);
      return res.status(500).json({
        success: false,
        message: "Không thể xuất danh sách người tham gia Sự kiện kết nối.",
      });
    }
  }
}

module.exports = NetworkingReportController;
