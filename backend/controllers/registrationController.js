const ExcelJS = require("exceljs");
const RegistrationService = require("../services/registrationService");
const RegistrationModel = require("../models/registrationModel");

class RegistrationController {
  // ============================
  // Danh sách đăng ký
  // ============================

  static async index(req, res) {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);

      const requestedLimit = Number(req.query.limit) || 10;

      const limit = Math.min(Math.max(requestedLimit, 1), 100);

      // ============================
      // Chế độ học viên CRM
      // ============================

      if (req.query.view === "students") {
        const [data, total] = await Promise.all([
          RegistrationModel.getStudentsView(req.query),

          RegistrationModel.countStudentsView(req.query),
        ]);

        return res.json({
          success: true,
          view: "students",
          total,
          page,
          limit,
          total_pages: total === 0 ? 1 : Math.ceil(total / limit),
          data,
        });
      }

      // ============================
      // Chế độ registration thường
      // ============================

      const [data, total] = await Promise.all([
        RegistrationModel.getAll(req.query),

        RegistrationModel.countAll(req.query),
      ]);

      return res.json({
        success: true,
        view: "registrations",
        total,
        page,
        limit,
        total_pages: total === 0 ? 1 : Math.ceil(total / limit),
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách đăng ký:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách đăng ký.",
      });
    }
  }

  // ============================
  // Đăng ký khóa học
  // ============================

  static async register(req, res) {
    try {
      const result = await RegistrationService.register(req.body);

      res.json({
        success: true,

        data: result,

        message: result.emailSent
          ? "Đăng ký thành công. Mã QR điểm danh đã được gửi đến email của bạn."
          : "Đăng ký thành công nhưng chưa thể gửi email QR. Vui lòng liên hệ SIHUB để được hỗ trợ.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Xác nhận đăng ký
  // ============================

  static async confirm(req, res) {
    try {
      await RegistrationService.confirm(req.params.id);

      res.json({
        success: true,
        message: "Đã xác nhận học viên.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Chi tiết đăng ký
  // ============================

  static async show(req, res) {
    try {
      const data = await RegistrationModel.findById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hồ sơ.",
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Từ chối đăng ký
  // ============================

  static async reject(req, res) {
    try {
      await RegistrationService.reject(req.params.id, req.body.note || null);

      res.json({
        success: true,
        message: "Đã từ chối đăng ký.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Hủy đăng ký
  // ============================

  static async cancel(req, res) {
    try {
      await RegistrationService.cancel(req.params.id, req.body.note || null);

      res.json({
        success: true,
        message: "Đã hủy đăng ký.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Checkin học viên
  // ============================

  static async checkin(req, res) {
    try {
      await RegistrationService.checkin(req.params.id);

      res.json({
        success: true,
        message: "Checkin thành công.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // ============================
  // Lấy danh sách tùy chọn bộ lọc
  // ============================
  static async filterOptions(req, res) {
    try {
      const data = await RegistrationModel.getFilterOptions();

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy tùy chọn bộ lọc:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy dữ liệu bộ lọc.",
      });
    }
  }
  // ============================
  // Thống kê và biểu đồ
  // ============================
  static async statistics(req, res) {
    try {
      const data = await RegistrationModel.statistics(req.query);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi thống kê đăng ký:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy dữ liệu thống kê.",
      });
    }
  }
  // ============================
  // Export Excel theo bộ lọc
  // ============================
  static async export(req, res) {
    try {
      const data = await RegistrationModel.exportData(req.query);
      // =====================================================
      // TIÊU ĐỀ EXCEL THEO BỘ LỌC
      // KHÔNG thay đổi logic export/filter hiện tại
      // =====================================================

      const year = String(req.query.year || "").trim();

      const month = String(req.query.month || "").trim();

      const keyword = String(req.query.keyword || "").trim();
      const mission = String(req.query.mission || "").trim();

      const trainingCourseId = String(
        req.query.training_course_id || "",
      ).trim();

      const courseId = String(req.query.course_id || "").trim();

      const classId = String(req.query.class_id || "").trim();

      const hasOtherFilters = [
        "age_groups",
        "genders",
        "companies",
        "user_types",
        "project_fields",
        "startup_stages",
        "statuses",
        "female_founder",
        "has_project",
        "checked_in",
        "date_from",
        "date_to",
      ].some((key) => {
        const value = req.query[key];

        return (
          value !== undefined && value !== null && String(value).trim() !== ""
        );
      });

      const hasFilter = Boolean(
        year ||
        month ||
        keyword ||
        mission ||
        trainingCourseId ||
        courseId ||
        classId ||
        hasOtherFilters,
      );

      const titleParts = ["DANH SÁCH HỌC VIÊN"];

      if (month) {
        titleParts.push(`THÁNG ${month}`);
      }

      if (year) {
        titleParts.push(`NĂM ${year}`);
      }

      const exportTitle = titleParts.join(" - ");
      // ============================
      // Gom học viên theo email
      // Mỗi email chỉ xuất hiện một lần
      // ============================
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "SIHUB";
      workbook.created = new Date();
      // ============================
      // Gom học viên theo hồ sơ người dùng
      // Mỗi user_id chỉ xuất hiện một lần
      // ============================

      const studentMap = new Map();

      data.forEach((item) => {
        const userId = Number(item.user_id);

        if (!userId) {
          return;
        }

        if (!studentMap.has(userId)) {
          studentMap.set(userId, {
            user_id: userId,

            fullname: item.fullname || "",
            email: item.email || "",
            phone: item.phone || "",
            company: item.company || "",
            position: item.position || "",

            training_courses: new Set(),
            classes: new Set(),
            openings: new Set(),
            project_fields: new Set(),

            registration_ids: new Set(),
          });
        }

        const student = studentMap.get(userId);

        if (item.registration_id) {
          student.registration_ids.add(item.registration_id);
        }

        if (item.training_course_name) {
          student.training_courses.add(item.training_course_name);
        }

        if (item.training_class_name) {
          student.classes.add(item.training_class_name);
        }

        const openingName =
          item.intake_name || item.opening_name || item.class_code || "";

        if (openingName) {
          student.openings.add(openingName);
        }

        if (item.project_field) {
          student.project_fields.add(item.project_field);
        }
      });

      const uniqueStudents = Array.from(studentMap.values()).map((item) => ({
        ...item,

        email: item.email || "",

        phone: item.phone || "",

        total_registrations: item.registration_ids.size,
        training_courses: Array.from(item.training_courses).join("\n"),
        classes: Array.from(item.classes).join("\n"),
        openings: Array.from(item.openings).join("\n"),
        project_fields: Array.from(item.project_fields).join(", "),
      }));
      // ============================
      // Sheet danh sách gửi email
      // Mỗi học viên chỉ một dòng
      // ============================

      const emailSheet = workbook.addWorksheet("Danh sách gửi email");

      emailSheet.columns = [
        {
          header: "STT",
          key: "stt",
          width: 8,
        },
        {
          header: "Mã học viên",
          key: "user_id",
          width: 14,
        },
        {
          header: "Họ và tên",
          key: "fullname",
          width: 26,
        },
        {
          header: "Email",
          key: "email",
          width: 34,
        },
        {
          header: "Điện thoại",
          key: "phone",
          width: 18,
        },
        {
          header: "Đơn vị",
          key: "company",
          width: 28,
        },
        {
          header: "Chức vụ",
          key: "position",
          width: 24,
        },
        {
          header: "Số lượt đăng ký",
          key: "total_registrations",
          width: 18,
        },
        {
          header: "Khóa đào tạo",
          key: "training_courses",
          width: 42,
        },
        {
          header: "Lớp học",
          key: "classes",
          width: 42,
        },
        {
          header: "Đợt tổ chức",
          key: "openings",
          width: 34,
        },
        {
          header: "Lĩnh vực dự án",
          key: "project_fields",
          width: 32,
        },
      ];

      uniqueStudents.forEach((item, index) => {
        emailSheet.addRow({
          stt: index + 1,
          user_id: item.user_id,

          fullname: item.fullname,

          email: item.email,

          phone: item.phone,

          company: item.company,

          position: item.position,

          total_registrations: item.total_registrations,

          training_courses: item.training_courses,
          classes: item.classes,
          openings: item.openings,

          project_fields: item.project_fields,
        });
      });
      let emailHeaderRowNumber = 1;

      if (hasFilter) {
        emailSheet.insertRow(1, []);

        emailSheet.mergeCells(1, 1, 1, emailSheet.columnCount);

        const titleCell = emailSheet.getCell(1, 1);

        titleCell.value = exportTitle;

        titleCell.font = {
          bold: true,
          size: 16,
          color: {
            argb: "FFFFFFFF",
          },
        };

        titleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF15803D",
          },
        };

        titleCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        emailSheet.getRow(1).height = 34;

        emailHeaderRowNumber = 2;
      }
      const emailHeaderRow = emailSheet.getRow(emailHeaderRowNumber);

      emailHeaderRow.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      emailHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15803D",
        },
      };

      emailHeaderRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      emailHeaderRow.height = 28;

      emailSheet.eachRow(
        {
          includeEmpty: false,
        },
        (row, rowNumber) => {
          if (rowNumber > emailHeaderRowNumber) {
            row.alignment = {
              vertical: "top",
              wrapText: true,
            };
          }
        },
      );

      emailSheet.views = [
        {
          state: "frozen",
          ySplit: emailHeaderRowNumber,
        },
      ];

      emailSheet.autoFilter = {
        from: {
          row: emailHeaderRowNumber,
          column: 1,
        },
        to: {
          row: emailHeaderRowNumber,
          column: emailSheet.columnCount,
        },
      };

      const detailSheet = workbook.addWorksheet("Chi tiết đăng ký");
      detailSheet.columns = [
        {
          header: "STT",
          key: "stt",
          width: 8,
        },
        {
          header: "Mã đăng ký",
          key: "registration_id",
          width: 14,
        },
        {
          header: "Nhiệm vụ",
          key: "mission",
          width: 48,
        },
        {
          header: "Họ và tên",
          key: "fullname",
          width: 25,
        },
        {
          header: "Email",
          key: "email",
          width: 30,
        },
        {
          header: "Điện thoại",
          key: "phone",
          width: 16,
        },
        {
          header: "Giới tính",
          key: "gender",
          width: 12,
        },
        {
          header: "Nhóm tuổi",
          key: "age_group",
          width: 14,
        },
        {
          header: "Đơn vị",
          key: "company",
          width: 28,
        },
        {
          header: "Chức vụ",
          key: "position",
          width: 22,
        },
        {
          header: "Nhóm đối tượng",
          key: "user_type",
          width: 20,
        },
        {
          header: "Khóa đào tạo",
          key: "training_course_name",
          width: 42,
        },
        {
          header: "Lớp học",
          key: "training_class_name",
          width: 38,
        },
        {
          header: "Đợt tổ chức",
          key: "opening_name",
          width: 34,
        },
        {
          header: "Có dự án",
          key: "has_project",
          width: 13,
        },
        {
          header: "Tên dự án",
          key: "project_name",
          width: 28,
        },
        {
          header: "Lĩnh vực dự án",
          key: "project_field",
          width: 28,
        },
        {
          header: "Giai đoạn Startup",
          key: "startup_stage",
          width: 28,
        },
        {
          header: "Có nữ Founder",
          key: "female_founder",
          width: 18,
        },
        {
          header: "Quy mô nhân sự",
          key: "team_size",
          width: 18,
        },
        {
          header: "Tình trạng ươm tạo",
          key: "incubation_status",
          width: 25,
        },
        {
          header: "Trạng thái đăng ký",
          key: "register_status",
          width: 20,
        },
        {
          header: "Check-in",
          key: "checked_in",
          width: 14,
        },
        {
          header: "Thời gian check-in",
          key: "checked_in_at",
          width: 22,
        },
        {
          header: "Ngày đăng ký",
          key: "created_at",
          width: 22,
        },
        {
          header: "Tuyển chọn chương trình NQ20",
          key: "program_selection_status",
          width: 32,
        },
        {
          header: "Nhu cầu cần hỗ trợ",
          key: "support_needs",
          width: 35,
        },
        {
          header: "Ghi chú",
          key: "note",
          width: 30,
        },
      ];

      const genderLabels = {
        MALE: "Nam",
        FEMALE: "Nữ",
        OTHER: "Khác",
      };

      const userTypeLabels = {
        STARTUP: "Startup",
        STUDENT: "Sinh viên",
        BUSINESS: "Doanh nghiệp",
        UNIVERSITY: "Trường đại học",
        OTHER: "Khác",
      };

      const statusLabels = {
        PENDING: "Chờ duyệt",
        CONFIRMED: "Đã xác nhận",
        REJECTED: "Đã từ chối",
        CANCELLED: "Đã hủy",
      };

      data.forEach((item, index) => {
        detailSheet.addRow({
          stt: index + 1,
          registration_id: item.registration_id,
          mission: item.mission || "",
          fullname: item.fullname,
          email: item.email,
          phone: item.phone,

          gender: genderLabels[item.gender] || item.gender || "",

          age_group: item.age_group || "",
          company: item.company || "",
          position: item.position || "",

          user_type: userTypeLabels[item.user_type] || item.user_type || "",

          training_course_name: item.training_course_name || "",

          training_class_name: item.training_class_name || "",

          opening_name:
            item.intake_name || item.opening_name || item.class_code || "",

          has_project: item.has_project ? "Có" : "Không",

          project_name: item.project_name || "",

          project_field: item.project_field || "",

          startup_stage: item.startup_stage || "",

          female_founder:
            item.female_founder === null || item.female_founder === undefined
              ? "Chưa cung cấp"
              : item.female_founder
                ? "Có"
                : "Không",

          team_size: item.team_size || "",

          incubation_status: item.incubation_status || "",

          register_status:
            statusLabels[item.register_status] || item.register_status,

          checked_in: item.checked_in ? "Đã check-in" : "Chưa check-in",

          checked_in_at: item.checked_in_at || "",

          created_at: item.created_at,
          program_selection_status: item.program_selection_status || "",

          support_needs: item.support_needs || "",

          note: item.note || "",
        });
      });
      let detailHeaderRowNumber = 1;

      if (hasFilter) {
        detailSheet.insertRow(1, []);

        detailSheet.mergeCells(1, 1, 1, detailSheet.columnCount);

        const titleCell = detailSheet.getCell(1, 1);

        titleCell.value = exportTitle;

        titleCell.font = {
          bold: true,
          size: 16,
          color: {
            argb: "FFFFFFFF",
          },
        };

        titleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF15803D",
          },
        };

        titleCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        detailSheet.getRow(1).height = 34;

        detailHeaderRowNumber = 2;
      }
      // Định dạng hàng tiêu đề
      const headerRow = detailSheet.getRow(detailHeaderRowNumber);

      headerRow.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15803D",
        },
      };

      headerRow.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      headerRow.height = 28;

      // Căn nội dung và bật xuống dòng
      detailSheet.eachRow(
        {
          includeEmpty: false,
        },
        (row, rowNumber) => {
          if (rowNumber > detailHeaderRowNumber) {
            row.alignment = {
              vertical: "top",
              wrapText: true,
            };
          }
        },
      );

      // Đóng băng hàng tiêu đề
      detailSheet.views = [
        {
          state: "frozen",
          ySplit: detailHeaderRowNumber,
        },
      ];

      // Bật bộ lọc Excel
      detailSheet.autoFilter = {
        from: {
          row: detailHeaderRowNumber,
          column: 1,
        },
        to: {
          row: detailHeaderRowNumber,
          column: detailSheet.columnCount,
        },
      };

      const now = new Date();

      const dateText = now.toISOString().slice(0, 10);

      const filename = `danh-sach-dang-ky-${dateText}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );

      await workbook.xlsx.write(res);

      res.end();
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Không thể xuất danh sách đăng ký.",
        });
      }
    }
  }
}

module.exports = RegistrationController;
