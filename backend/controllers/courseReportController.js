const CourseReportModel = require("../models/courseReportModel");
const {
  CourseStudentReportFilterValidationError,
  filterCourseReportStudents,
} = require("../services/courseReport/courseStudentReportFilterService");
const {
  buildCourseStudentReportFilename,
  buildCourseStudentReportWorkbook,
} = require("../services/courseReport/courseStudentReportExportService");

const COURSE_STUDENT_EXPORT_FILTERS = [
  "search",
  "gender",
  "user_type",
  "company",
  "position",
  "register_status",
  "attendance_status",
  "attendance_rate",
  "certificate_eligible",
  "certificate_issued",
];

class CourseReportController {
  static async summary(req, res) {
    try {
      const period = CourseReportController.resolvePeriod(req.query);

      const data = await CourseReportModel.getSummary(
        period.report_start,
        period.report_end,
      );

      return res.json({
        success: true,
        data: {
          period,
          ...data,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo khóa học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo khóa học.",
      });
    }
  }

  static async programs(req, res) {
    try {
      const period = CourseReportController.resolvePeriod(req.query);

      const programs = await CourseReportModel.getPrograms(
        period.report_start,
        period.report_end,
      );

      return res.json({
        success: true,
        data: {
          period,
          programs,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo khóa học theo chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo khóa học theo chương trình.",
      });
    }
  }

  static async coursesByProgram(req, res) {
    try {
      const rawProgramId = String(req.params.programId);

      if (!/^\d+$/.test(rawProgramId)) {
        throw CourseReportController.validationError(
          "ID chương trình phải là số nguyên dương.",
        );
      }

      const programId = Number(rawProgramId);

      if (!Number.isSafeInteger(programId) || programId <= 0) {
        throw CourseReportController.validationError(
          "ID chương trình phải là số nguyên dương.",
        );
      }

      const period = CourseReportController.resolvePeriod(req.query);
      const program = await CourseReportModel.findProgramById(programId);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chương trình đào tạo.",
        });
      }

      const courses = await CourseReportModel.getCoursesByProgram(
        programId,
        period.report_start,
        period.report_end,
      );

      return res.json({
        success: true,
        data: {
          period,
          program,
          courses,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo khóa học của chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo khóa học của chương trình.",
      });
    }
  }

  static async openingsByCourse(req, res) {
    try {
      const rawCourseId = String(req.params.courseId);

      if (!/^\d+$/.test(rawCourseId)) {
        throw CourseReportController.validationError(
          "ID khóa học phải là số nguyên dương.",
        );
      }

      const courseId = Number(rawCourseId);

      if (!Number.isSafeInteger(courseId) || courseId <= 0) {
        throw CourseReportController.validationError(
          "ID khóa học phải là số nguyên dương.",
        );
      }

      const period = CourseReportController.resolvePeriod(req.query);
      const course = await CourseReportModel.findCourseById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khóa học.",
        });
      }

      const openings = await CourseReportModel.getOpeningsByCourse(
        courseId,
        period.report_start,
        period.report_end,
      );

      return res.json({
        success: true,
        data: {
          period,
          course,
          openings,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy báo cáo lớp mở của khóa học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải báo cáo lớp mở của khóa học.",
      });
    }
  }

  static async studentsByOpening(req, res) {
    try {
      const rawOpeningId = String(req.params.openingId);

      if (!/^\d+$/.test(rawOpeningId)) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      const openingId = Number(rawOpeningId);

      if (!Number.isSafeInteger(openingId) || openingId <= 0) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      const opening = await CourseReportModel.findOpeningById(openingId);

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp mở.",
        });
      }

      const students = await CourseReportModel.getStudentsByOpening(openingId);

      return res.json({
        success: true,
        data: {
          opening,
          students,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy danh sách học viên của lớp mở:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách học viên của lớp mở.",
      });
    }
  }

  static async exportOpeningStudents(req, res) {
    try {
      const rawOpeningId = String(req.params.openingId);

      if (!/^\d+$/.test(rawOpeningId)) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      const openingId = Number(rawOpeningId);

      if (!Number.isSafeInteger(openingId) || openingId <= 0) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      const scope = String(req.query.scope ?? "").trim();

      if (scope !== "ALL" && scope !== "FILTERED") {
        throw new CourseStudentReportFilterValidationError(
          "Phạm vi xuất báo cáo không hợp lệ.",
        );
      }

      const filters = COURSE_STUDENT_EXPORT_FILTERS.reduce(
        (result, name) => {
          if (Object.prototype.hasOwnProperty.call(req.query, name)) {
            result[name] = req.query[name];
          }

          return result;
        },
        {},
      );
      const period = CourseReportController.resolveOptionalPeriodMetadata(
        req.query,
      );
      const opening = await CourseReportModel.findOpeningById(openingId);

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp mở.",
        });
      }

      const students = await CourseReportModel.getStudentsByOpening(openingId);
      const filteredStudents = filterCourseReportStudents(
        students,
        scope,
        filters,
      );
      const workbook = buildCourseStudentReportWorkbook({
        opening,
        students: filteredStudents,
        scope,
        filters,
        period,
      });
      const filename = buildCourseStudentReportFilename(opening);
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );

      return res.send(Buffer.from(buffer));
    } catch (error) {
      if (
        error instanceof CourseStudentReportFilterValidationError ||
        error.statusCode === 400
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi xuất báo cáo học viên của lớp mở:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xuất báo cáo học viên của lớp mở.",
      });
    }
  }

  static async studentAttendanceHistory(req, res) {
    try {
      const rawOpeningId = String(req.params.openingId);
      const rawRegistrationId = String(req.params.registrationId);

      if (!/^\d+$/.test(rawOpeningId)) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      if (!/^\d+$/.test(rawRegistrationId)) {
        throw CourseReportController.validationError(
          "ID đăng ký phải là số nguyên dương.",
        );
      }

      const openingId = Number(rawOpeningId);
      const registrationId = Number(rawRegistrationId);

      if (!Number.isSafeInteger(openingId) || openingId <= 0) {
        throw CourseReportController.validationError(
          "ID lớp mở phải là số nguyên dương.",
        );
      }

      if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
        throw CourseReportController.validationError(
          "ID đăng ký phải là số nguyên dương.",
        );
      }

      const opening = await CourseReportModel.findOpeningById(openingId);

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp mở.",
        });
      }

      const student = await CourseReportModel.findStudentRegistration(
        openingId,
        registrationId,
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đăng ký học viên trong lớp mở.",
        });
      }

      const attendanceHistory = await CourseReportModel.getAttendanceHistory(
        openingId,
        registrationId,
      );
      const totalSessions = attendanceHistory.length;
      const attendedSessions = attendanceHistory.filter(
        (item) => item.checked_in,
      ).length;
      const attendanceRate = totalSessions
        ? Math.round((attendedSessions * 10000) / totalSessions) / 100
        : 0;

      return res.json({
        success: true,
        data: {
          opening,
          student,
          summary: {
            total_sessions: totalSessions,
            attended_sessions: attendedSessions,
            attendance_rate: attendanceRate,
          },
          attendance_history: attendanceHistory,
        },
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Lỗi lấy lịch sử điểm danh học viên:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải lịch sử điểm danh học viên.",
      });
    }
  }

  static resolvePeriod(query = {}) {
    const hasYear = Object.prototype.hasOwnProperty.call(query, "year");
    const hasQuarter = Object.prototype.hasOwnProperty.call(query, "quarter");
    const hasMonth = Object.prototype.hasOwnProperty.call(query, "month");

    if (!hasYear || !/^\d+$/.test(String(query.year))) {
      throw CourseReportController.validationError(
        "Năm báo cáo là bắt buộc và phải là số nguyên hợp lệ.",
      );
    }

    if (hasQuarter && hasMonth) {
      throw CourseReportController.validationError(
        "Không được sử dụng đồng thời bộ lọc quý và tháng.",
      );
    }

    const year = Number(query.year);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw CourseReportController.validationError(
        "Năm báo cáo phải nằm trong khoảng từ 2000 đến 2100.",
      );
    }

    let type = "YEAR";
    let quarter = null;
    let month = null;
    let startMonth = 1;
    let endMonth = 12;

    if (hasQuarter) {
      if (!/^\d+$/.test(String(query.quarter))) {
        throw CourseReportController.validationError(
          "Quý báo cáo phải là số nguyên từ 1 đến 4.",
        );
      }

      quarter = Number(query.quarter);

      if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
        throw CourseReportController.validationError(
          "Quý báo cáo phải nằm trong khoảng từ 1 đến 4.",
        );
      }

      type = "QUARTER";
      startMonth = (quarter - 1) * 3 + 1;
      endMonth = startMonth + 2;
    }

    if (hasMonth) {
      if (!/^\d+$/.test(String(query.month))) {
        throw CourseReportController.validationError(
          "Tháng báo cáo phải là số nguyên từ 1 đến 12.",
        );
      }

      month = Number(query.month);

      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw CourseReportController.validationError(
          "Tháng báo cáo phải nằm trong khoảng từ 1 đến 12.",
        );
      }

      type = "MONTH";
      startMonth = month;
      endMonth = month;
    }

    const endDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
    const formatPart = (value) => String(value).padStart(2, "0");

    return {
      type,
      year,
      quarter,
      month,
      report_start: `${year}-${formatPart(startMonth)}-01`,
      report_end: `${year}-${formatPart(endMonth)}-${formatPart(endDay)}`,
    };
  }

  static resolveOptionalPeriodMetadata(query = {}) {
    const hasYear = Object.prototype.hasOwnProperty.call(query, "year");
    const hasQuarter = Object.prototype.hasOwnProperty.call(query, "quarter");
    const hasMonth = Object.prototype.hasOwnProperty.call(query, "month");

    if (!hasYear && !hasQuarter && !hasMonth) {
      return undefined;
    }

    const period = CourseReportController.resolvePeriod(query);

    return {
      type: period.type,
      year: period.year,
      quarter: period.quarter,
      month: period.month,
    };
  }

  static validationError(message) {
    const error = new Error(message);

    error.statusCode = 400;

    return error;
  }
}

module.exports = CourseReportController;
