const NetworkingReportModel = require("../models/networkingReportModel");

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
      start_date: period.start_date,
      end_date: period.end_date,
    };
  }

  static async summary(req, res) {
    try {
      const period = NetworkingReportController.resolvePeriod(req.query);
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

  static async events(req, res) {
    try {
      const period = NetworkingReportController.resolvePeriod(req.query);
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
}

module.exports = NetworkingReportController;
