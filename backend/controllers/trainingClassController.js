const ExcelJS = require("exceljs");

const TrainingClassModel = require("../models/trainingClassModel");
const AdminActivityLogModel = require("../models/adminActivityLogModel");
async function writeAdminActivityLog(req, data) {
  try {
    await AdminActivityLogModel.create({
      admin_id: Number(req.admin?.id) || null,

      admin_username: req.admin?.username || null,

      admin_role: req.admin?.role || null,

      action: data.action,

      entity_type: data.entity_type,

      entity_id: data.entity_id || null,

      entity_name: data.entity_name || null,

      old_data: data.old_data || null,

      new_data: data.new_data || null,

      ip_address: req.ip || null,

      user_agent: req.get("user-agent") || null,
    });
  } catch (error) {
    /*
     * QUAN TRỌNG:
     *
     * Nếu ghi nhật ký lỗi thì KHÔNG được làm hỏng
     * thao tác xóa/khôi phục đang chạy.
     */
    console.error("Lỗi ghi nhật ký hoạt động admin:", error);
  }
}
class TrainingClassController {
  // =========================================================
  // GET /api/classes
  // =========================================================
  static async index(req, res) {
    try {
      const data = await TrainingClassModel.getAll(req.query);

      return res.status(200).json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách lớp học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách lớp học.",
      });
    }
  }
  // =========================================================
  // GET /api/classes/export
  //
  // Xuất Excel theo đúng bộ lọc:
  // - training_course_id
  // - status
  // - year
  // - month
  // - keyword
  // =========================================================
  static async exportExcel(req, res) {
    try {
      // =====================================================

      // =====================================================
      const rows = await TrainingClassModel.exportData(req.query);

      const trainingCourseId = String(
        req.query.training_course_id || "",
      ).trim();

      const status = String(req.query.status || "")
        .trim()
        .toUpperCase();

      const year = String(req.query.year || "").trim();

      const month = String(req.query.month || "").trim();

      const keyword = String(req.query.keyword || "").trim();
      const mission = String(req.query.mission || "").trim();

      const hasFilter = Boolean(
        trainingCourseId || status || year || month || keyword || mission,
      );

      // =====================================================
      // TITLE
      // Chỉ hiện khi Admin đang dùng bộ lọc
      // =====================================================
      const titleParts = ["DANH SÁCH LỚP HỌC"];

      if (month) {
        titleParts.push(`THÁNG ${month}`);
      }

      if (year) {
        titleParts.push(`NĂM ${year}`);
      }

      const title = titleParts.join(" - ");

      const getStatusText = (value) => {
        const labels = {
          OPEN: "Đang mở",
          FULL: "Đã đầy",
          CLOSED: "Đã đóng",
          FINISHED: "Đã kết thúc",
        };

        return labels[value] || value || "";
      };

      const formatDateTime = (value) => {
        if (!value) {
          return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return String(value);
        }

        return date.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      };

      // =====================================================
      // WORKBOOK
      // =====================================================
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "SIHUB";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Danh sách lớp học");

      const columns = [
        { header: "STT", width: 8 },

        {
          header: "Tên lớp học",
          width: 42,
        },

        {
          header: "Khóa đào tạo",
          width: 45,
        },

        {
          header: "Thời lượng",
          width: 18,
        },

        {
          header: "Đối tượng tham gia",
          width: 35,
        },
        {
          header: "Nhiệm vụ",
          width: 48,
        },
        {
          header: "Số đợt tổ chức",
          width: 16,
        },

        {
          header: "Tổng học viên",
          width: 16,
        },

        {
          header: "Tổng lượt đăng ký",
          width: 18,
        },

        {
          header: "Trạng thái",
          width: 16,
        },

        {
          header: "Ngày tạo",
          width: 22,
        },

        {
          header: "Cập nhật lần cuối",
          width: 22,
        },
      ];

      columns.forEach((column, index) => {
        worksheet.getColumn(index + 1).width = column.width;
      });

      // =====================================================
      // TITLE CHỈ KHI CÓ FILTER
      // =====================================================
      let headerRowNumber = 1;

      if (hasFilter) {
        worksheet.mergeCells(1, 1, 1, columns.length);

        const titleCell = worksheet.getCell(1, 1);

        titleCell.value = title;

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

        worksheet.getRow(1).height = 34;

        headerRowNumber = 2;
      }

      // =====================================================
      // HEADER
      // =====================================================
      const headerRow = worksheet.getRow(headerRowNumber);

      columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);

        cell.value = column.header;

        cell.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF16A34A",
          },
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };

        cell.border = {
          top: {
            style: "thin",
            color: { argb: "FFD1D5DB" },
          },
          bottom: {
            style: "thin",
            color: { argb: "FFD1D5DB" },
          },
          left: {
            style: "thin",
            color: { argb: "FFD1D5DB" },
          },
          right: {
            style: "thin",
            color: { argb: "FFD1D5DB" },
          },
        };
      });

      headerRow.height = 30;

      // =====================================================
      // DATA
      // =====================================================
      rows.forEach((item, index) => {
        const row = worksheet.addRow([
          index + 1,

          item.class_name || "",

          item.training_course_name || "",

          item.duration || "",

          item.target_audience || "",
          item.mission || "",
          Number(item.total_class_openings || 0),

          Number(item.total_students || 0),

          Number(item.total_registrations || 0),

          getStatusText(item.status),

          formatDateTime(item.created_at),

          formatDateTime(item.updated_at),
        ]);

        row.alignment = {
          vertical: "top",
          wrapText: true,
        };

        row.eachCell((cell) => {
          cell.border = {
            top: {
              style: "thin",
              color: { argb: "FFE2E8F0" },
            },
            bottom: {
              style: "thin",
              color: { argb: "FFE2E8F0" },
            },
            left: {
              style: "thin",
              color: { argb: "FFE2E8F0" },
            },
            right: {
              style: "thin",
              color: { argb: "FFE2E8F0" },
            },
          };
        });

        row.getCell(1).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        row.getCell(6).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        row.getCell(7).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        row.getCell(8).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        row.getCell(9).alignment = {
          horizontal: "center",
          vertical: "top",
        };
      });

      worksheet.views = [
        {
          state: "frozen",
          ySplit: headerRowNumber,
        },
      ];

      worksheet.autoFilter = {
        from: {
          row: headerRowNumber,
          column: 1,
        },

        to: {
          row: headerRowNumber,
          column: columns.length,
        },
      };

      // =====================================================
      // FILE NAME
      // =====================================================
      let fileName = "danh-sach-lop-hoc";

      if (year) {
        fileName += `-${year}`;
      }

      if (month) {
        fileName += `-thang-${month}`;
      }

      fileName += ".xlsx";

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      return res.send(buffer);
    } catch (error) {
      console.error("Lỗi xuất Excel lớp học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xuất danh sách lớp học.",
      });
    }
  }
  // =========================================================
  // GET /api/classes/:id
  // =========================================================
  static async show(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      const trainingClass = await TrainingClassModel.findById(id);

      if (!trainingClass) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      const classOpenings = await TrainingClassModel.getClassOpenings(id);

      return res.status(200).json({
        success: true,

        data: {
          ...trainingClass,

          class_openings: classOpenings,
        },
      });
    } catch (error) {
      console.error("Lỗi lấy chi tiết lớp học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải chi tiết lớp học.",
      });
    }
  }
  static async storeOpening(req, res) {
    try {
      const courseId = Number(req.params.id);

      // =====================================================
      // VALIDATE ID LỚP HỌC
      // =====================================================
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      const existed = await TrainingClassModel.courseExists(courseId);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      // =====================================================
      // DỮ LIỆU ĐỢT TỔ CHỨC
      // =====================================================
      const className = String(req.body.class_name || "").trim();

      const classCode = String(req.body.class_code || "").trim();

      const intakeName = String(req.body.intake_name || "").trim();

      const trainerName = String(req.body.trainer_name || "").trim();

      const location = String(req.body.location || "").trim();

      const scheduleNote = String(req.body.schedule_note || "").trim();
      let sessions = [];

      if (Array.isArray(req.body.sessions)) {
        sessions = req.body.sessions;
      }
      const registerOpen = req.body.register_open || null;

      const registerClose = req.body.register_close || null;
      const maxStudents =
        req.body.max_students !== undefined
          ? Number(req.body.max_students)
          : 50;
      const currentStudents = 0;
      const status = String(req.body.status || "OPEN")
        .trim()
        .toUpperCase();

      // =====================================================
      // VALIDATE MÃ ĐỢT/LỚP
      // =====================================================
      if (classCode) {
        const duplicated = await TrainingClassModel.findByClassCode(classCode);

        if (duplicated) {
          return res.status(409).json({
            success: false,
            message: "Mã đợt/lớp tổ chức đã tồn tại.",
          });
        }
      }

      // =====================================================
      // VALIDATE SĨ SỐ
      // =====================================================
      if (!Number.isInteger(maxStudents) || maxStudents <= 0) {
        return res.status(400).json({
          success: false,
          message: "Sĩ số tối đa phải lớn hơn 0.",
        });
      }
      if (!Number.isInteger(currentStudents) || currentStudents < 0) {
        return res.status(400).json({
          success: false,
          message: "Số học viên hiện tại không hợp lệ.",
        });
      }
      // =====================================================
      // VALIDATE TRẠNG THÁI
      // =====================================================
      const allowedStatuses = ["OPEN", "FULL", "CLOSED", "FINISHED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái đợt tổ chức không hợp lệ.",
        });
      }

      // =====================================================
      // VALIDATE THỜI GIAN ĐĂNG KÝ
      // =====================================================
      if (registerOpen && registerClose) {
        const openTime = new Date(registerOpen).getTime();

        const closeTime = new Date(registerClose).getTime();

        if (
          !Number.isNaN(openTime) &&
          !Number.isNaN(closeTime) &&
          openTime >= closeTime
        ) {
          return res.status(400).json({
            success: false,
            message: "Thời gian đóng đăng ký phải sau thời gian mở đăng ký.",
          });
        }
      }
      for (let index = 0; index < sessions.length; index += 1) {
        const session = sessions[index];

        if (!session.session_date) {
          return res.status(400).json({
            success: false,
            message: `Buổi ${index + 1} chưa có ngày học.`,
          });
        }

        if (!session.start_time) {
          return res.status(400).json({
            success: false,
            message: `Buổi ${index + 1} chưa có giờ bắt đầu.`,
          });
        }

        if (!session.end_time) {
          return res.status(400).json({
            success: false,
            message: `Buổi ${index + 1} chưa có giờ kết thúc.`,
          });
        }

        if (session.start_time >= session.end_time) {
          return res.status(400).json({
            success: false,
            message: `Giờ kết thúc của Buổi ${index + 1} phải sau giờ bắt đầu.`,
          });
        }

        session.session_no = index + 1;

        session.location =
          String(session.location || location || "").trim() || null;

        session.room = String(session.room || "").trim() || null;

        session.note = String(session.note || "").trim() || null;
      }
      // =====================================================
      // CREATE
      // =====================================================
      const openingId = await TrainingClassModel.addOpeningWithSessions(
        courseId,

        {
          class_code: classCode || null,

          class_name: className || null,

          intake_name: intakeName || null,

          trainer_name: trainerName || null,

          location: location || null,

          register_open: registerOpen,

          register_close: registerClose,

          max_students: maxStudents,

          current_students: currentStudents,

          status,

          schedule_note: scheduleNote || null,
        },

        sessions,
      );

      // =====================================================
      // LẤY LẠI CHI TIẾT LỚP
      // =====================================================
      const trainingClass = await TrainingClassModel.findById(courseId);

      const openings = await TrainingClassModel.getClassOpenings(courseId);
      const createdSessions = await TrainingClassModel.getSessions(openingId);
      return res.status(201).json({
        success: true,

        message: "Thêm đợt tổ chức thành công.",

        data: {
          opening_id: openingId,
          sessions: createdSessions,

          class: {
            ...trainingClass,

            class_openings: openings,
          },
        },
      });
    } catch (error) {
      console.error("Lỗi thêm đợt tổ chức:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể thêm đợt tổ chức.",
      });
    }
  }
  static async getOpeningSessions(req, res) {
    try {
      const courseId = Number(req.params.id);

      const openingId = Number(req.params.openingId);

      if (!Number.isInteger(courseId) || !Number.isInteger(openingId)) {
        return res.status(400).json({
          success: false,
          message: "ID lớp hoặc đợt tổ chức không hợp lệ.",
        });
      }

      const sessions = await TrainingClassModel.getOpeningSessionsForManage(
        courseId,
        openingId,
      );

      return res.status(200).json({
        success: true,

        total: sessions.length,

        data: sessions,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách buổi học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách buổi học.",
      });
    }
  }
  // =========================================================
  // POST /api/classes
  // =========================================================
  static async store(req, res) {
    try {
      // =======================================================
      // DỮ LIỆU LỚP HỌC
      // =======================================================
      const trainingCourseId = Number(req.body.training_course_id);

      const className = String(req.body.class_name || "").trim();

      const shortDescription = String(req.body.short_description || "").trim();

      const description = String(req.body.description || "").trim();

      const duration = String(req.body.duration || "").trim();

      const targetAudience = String(req.body.target_audience || "").trim();

      const learningOutcomes = String(req.body.learning_outcomes || "").trim();
      const mission = String(req.body.mission || "").trim();

      const status = String(req.body.status || "OPEN")
        .trim()
        .toUpperCase();

      // =======================================================
      // VALIDATE KHÓA ĐÀO TẠO
      // =======================================================
      if (!Number.isInteger(trainingCourseId) || trainingCourseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn khóa đào tạo.",
        });
      }

      const trainingCourseExists =
        await TrainingClassModel.trainingCourseExists(trainingCourseId);

      if (!trainingCourseExists) {
        return res.status(404).json({
          success: false,
          message: "Khóa đào tạo không tồn tại.",
        });
      }

      // =======================================================
      // VALIDATE TÊN LỚP
      // =======================================================
      if (!className) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên lớp học.",
        });
      }

      if (className.length > 255) {
        return res.status(400).json({
          success: false,
          message: "Tên lớp học không được vượt quá 255 ký tự.",
        });
      }

      // =======================================================
      // KIỂM TRA TRÙNG TÊN TRONG CÙNG KHÓA
      // =======================================================
      const duplicated = await TrainingClassModel.findByNameInTrainingCourse(
        trainingCourseId,
        className,
      );

      if (duplicated) {
        return res.status(409).json({
          success: false,

          message: "Lớp học này đã tồn tại trong khóa đào tạo.",

          data: {
            existing_class_id: duplicated.id,

            existing_class_name: duplicated.course_name,
          },
        });
      }

      // =======================================================
      // VALIDATE TRẠNG THÁI
      // =======================================================
      const allowedStatuses = ["OPEN", "CLOSED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái lớp học không hợp lệ.",
        });
      }

      // =======================================================
      // SLUG
      // =======================================================
      const slug = await TrainingClassModel.createUniqueSlug(
        className,
        trainingCourseId,
      );

      // =======================================================
      // ẢNH
      // =======================================================
      const thumbnail = req.file
        ? `/uploads/courses/${req.file.filename}`
        : null;

      // =======================================================
      // ĐỢT TỔ CHỨC
      //
      // multipart/form-data nên gửi opening dưới dạng JSON string.
      // =======================================================
      let opening = null;

      if (req.body.opening) {
        try {
          opening =
            typeof req.body.opening === "string"
              ? JSON.parse(req.body.opening)
              : req.body.opening;
        } catch {
          return res.status(400).json({
            success: false,
            message: "Thông tin đợt tổ chức không hợp lệ.",
          });
        }
      }

      // =======================================================
      // VALIDATE ĐỢT TỔ CHỨC
      // =======================================================
      if (opening) {
        opening.class_name = String(
          opening.class_name || `LỚP ${className}`,
        ).trim();

        opening.class_code = String(opening.class_code || "").trim() || null;

        opening.intake_name = String(opening.intake_name || "").trim() || null;

        opening.trainer_name =
          String(opening.trainer_name || "").trim() || null;

        opening.location = String(opening.location || "").trim() || null;

        opening.schedule_note =
          String(opening.schedule_note || "").trim() || null;

        opening.register_open = opening.register_open || null;

        opening.register_close = opening.register_close || null;

        opening.max_students = Number(opening.max_students) || 50;

        opening.status = String(opening.status || "OPEN")
          .trim()
          .toUpperCase();

        // -----------------------------------------------
        // Mã lớp nếu có thì không được trùng
        // -----------------------------------------------
        if (opening.class_code) {
          const duplicatedCode = await TrainingClassModel.findByClassCode(
            opening.class_code,
          );

          if (duplicatedCode) {
            return res.status(409).json({
              success: false,
              message: "Mã đợt/lớp tổ chức đã tồn tại.",
            });
          }
        }

        // -----------------------------------------------
        // Sĩ số
        // -----------------------------------------------
        if (
          !Number.isInteger(opening.max_students) ||
          opening.max_students <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Sĩ số tối đa phải lớn hơn 0.",
          });
        }

        // -----------------------------------------------
        // Thời gian đăng ký
        // -----------------------------------------------
        if (opening.register_open && opening.register_close) {
          const openTime = new Date(opening.register_open).getTime();

          const closeTime = new Date(opening.register_close).getTime();

          if (
            !Number.isNaN(openTime) &&
            !Number.isNaN(closeTime) &&
            openTime >= closeTime
          ) {
            return res.status(400).json({
              success: false,
              message: "Thời gian đóng đăng ký phải sau thời gian mở đăng ký.",
            });
          }
        }

        const allowedOpeningStatuses = ["OPEN", "FULL", "CLOSED", "FINISHED"];

        if (!allowedOpeningStatuses.includes(opening.status)) {
          return res.status(400).json({
            success: false,
            message: "Trạng thái đợt tổ chức không hợp lệ.",
          });
        }
      }

      // =======================================================
      // CREATE
      // =======================================================
      const result = await TrainingClassModel.create({
        training_course_id: trainingCourseId,

        class_name: className,

        slug,

        short_description: shortDescription || null,

        description: description || null,

        thumbnail,

        duration: duration || null,

        target_audience: targetAudience || null,

        learning_outcomes: learningOutcomes || null,
        mission: mission || null,

        status,

        opening,
      });

      // =======================================================
      // LẤY LẠI DỮ LIỆU SAU KHI THÊM
      // =======================================================
      const createdClass = await TrainingClassModel.findById(result.courseId);

      const classOpenings = await TrainingClassModel.getClassOpenings(
        result.courseId,
      );

      return res.status(201).json({
        success: true,

        message: "Thêm lớp học thành công.",

        data: {
          ...createdClass,

          class_openings: classOpenings,
        },
      });
    } catch (error) {
      console.error("Lỗi thêm lớp học:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể thêm lớp học.",
      });
    }
  }
  static async filterOptions(req, res) {
    try {
      const data = await TrainingClassModel.getFilterOptions();

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy bộ lọc lớp học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải dữ liệu bộ lọc.",
      });
    }
  }
  static async updateOpening(req, res) {
    try {
      const courseId = Number(req.params.id);

      const openingId = Number(req.params.openingId);
      const sessions = Array.isArray(req.body.sessions)
        ? req.body.sessions
        : null;
      if (sessions) {
        for (let index = 0; index < sessions.length; index += 1) {
          const session = sessions[index];

          if (!session.session_date) {
            return res.status(400).json({
              success: false,
              message: `Buổi ${index + 1} chưa có ngày học.`,
            });
          }

          if (!session.start_time) {
            return res.status(400).json({
              success: false,
              message: `Buổi ${index + 1} chưa có giờ bắt đầu.`,
            });
          }

          if (!session.end_time) {
            return res.status(400).json({
              success: false,
              message: `Buổi ${index + 1} chưa có giờ kết thúc.`,
            });
          }

          if (session.start_time >= session.end_time) {
            return res.status(400).json({
              success: false,
              message: `Giờ kết thúc của Buổi ${
                index + 1
              } phải sau giờ bắt đầu.`,
            });
          }

          session.id = Number(session.id) || null;

          session.session_no = index + 1;

          session.location =
            String(session.location || req.body.location || "").trim() || null;

          session.room = String(session.room || "").trim() || null;

          session.note = String(session.note || "").trim() || null;
        }
      }
      // =====================================================
      // VALIDATE ID
      // =====================================================
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      if (!Number.isInteger(openingId) || openingId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID đợt tổ chức không hợp lệ.",
        });
      }

      // =====================================================
      // KIỂM TRA LỚP HỌC
      // =====================================================
      const courseExists = await TrainingClassModel.courseExists(courseId);

      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      // =====================================================
      // KIỂM TRA OPENING CÓ THUỘC LỚP NÀY KHÔNG
      // =====================================================
      const existing = await TrainingClassModel.findOpeningById(
        courseId,
        openingId,
      );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đợt tổ chức của lớp học này.",
        });
      }

      // =====================================================
      // LẤY DỮ LIỆU
      //
      // Field nào không gửi lên -> giữ dữ liệu cũ.
      // =====================================================
      const classCode =
        req.body.class_code !== undefined
          ? String(req.body.class_code || "").trim() || null
          : existing.class_code;

      const className =
        req.body.class_name !== undefined
          ? String(req.body.class_name || "").trim() || null
          : existing.class_name;

      const intakeName =
        req.body.intake_name !== undefined
          ? String(req.body.intake_name || "").trim() || null
          : existing.intake_name;

      const trainerName =
        req.body.trainer_name !== undefined
          ? String(req.body.trainer_name || "").trim() || null
          : existing.trainer_name;

      const location =
        req.body.location !== undefined
          ? String(req.body.location || "").trim() || null
          : existing.location;

      const scheduleNote =
        req.body.schedule_note !== undefined
          ? String(req.body.schedule_note || "").trim() || null
          : existing.schedule_note;

      const registerOpen =
        req.body.register_open !== undefined
          ? req.body.register_open || null
          : existing.register_open;

      const registerClose =
        req.body.register_close !== undefined
          ? req.body.register_close || null
          : existing.register_close;

      const maxStudents =
        req.body.max_students !== undefined
          ? Number(req.body.max_students)
          : Number(existing.max_students);
      const currentStudents = Number(existing.current_students) || 0;
      const status =
        req.body.status !== undefined
          ? String(req.body.status).trim().toUpperCase()
          : existing.status;

      // =====================================================
      // MÃ LỚP KHÔNG ĐƯỢC TRÙNG
      // =====================================================
      if (classCode) {
        const duplicatedCode = await TrainingClassModel.findByClassCode(
          classCode,
          openingId,
        );

        if (duplicatedCode) {
          return res.status(409).json({
            success: false,
            message: "Mã đợt/lớp tổ chức đã tồn tại.",
          });
        }
      }

      // =====================================================
      // SĨ SỐ
      // =====================================================
      if (!Number.isInteger(maxStudents) || maxStudents <= 0) {
        return res.status(400).json({
          success: false,
          message: "Sĩ số tối đa phải lớn hơn 0.",
        });
      }

      /*
       * Không được giảm max_students xuống thấp hơn
       * số học viên hiện tại.
       */
      if (maxStudents < Number(existing.current_students)) {
        return res.status(400).json({
          success: false,

          message: `Sĩ số tối đa không được nhỏ hơn số học viên hiện tại (${existing.current_students}).`,
        });
      }

      // =====================================================
      // STATUS
      // =====================================================
      const allowedStatuses = ["OPEN", "FULL", "CLOSED", "FINISHED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái đợt tổ chức không hợp lệ.",
        });
      }

      // =====================================================
      // THỜI GIAN ĐĂNG KÝ
      // =====================================================
      if (registerOpen && registerClose) {
        const openTime = new Date(registerOpen).getTime();

        const closeTime = new Date(registerClose).getTime();

        if (Number.isNaN(openTime) || Number.isNaN(closeTime)) {
          return res.status(400).json({
            success: false,
            message: "Thời gian đăng ký không hợp lệ.",
          });
        }

        if (openTime >= closeTime) {
          return res.status(400).json({
            success: false,
            message: "Thời gian đóng đăng ký phải sau thời gian mở đăng ký.",
          });
        }
      }

      // =====================================================
      // UPDATE
      // =====================================================
      await TrainingClassModel.updateOpeningWithSessionsSafe(
        courseId,

        openingId,

        {
          class_code: classCode,

          class_name: className,

          intake_name: intakeName,

          trainer_name: trainerName,

          location,

          register_open: registerOpen,

          register_close: registerClose,

          max_students: maxStudents,

          current_students: currentStudents,

          status,

          schedule_note: scheduleNote,
        },

        sessions,
      );
      // =====================================================
      // LẤY LẠI OPENING SAU UPDATE
      // =====================================================
      const updatedOpening = await TrainingClassModel.findOpeningById(
        courseId,
        openingId,
      );

      const updatedSessions =
        await TrainingClassModel.getOpeningSessionsForManage(
          courseId,
          openingId,
        );

      return res.status(200).json({
        success: true,

        message: "Cập nhật đợt tổ chức thành công.",

        data: {
          ...updatedOpening,

          sessions: updatedSessions,
        },
      });
    } catch (error) {
      console.error("Lỗi cập nhật đợt tổ chức:", error);

      const businessMessages = [
        "không thể xóa",
        "Không thể thay đổi ngày hoặc giờ học",
        "không thuộc đợt tổ chức này",
        "Không tìm thấy đợt tổ chức",
      ];

      const isBusinessError = businessMessages.some((text) =>
        String(error.message || "").includes(text),
      );

      return res.status(isBusinessError ? 400 : 500).json({
        success: false,

        message: error.message || "Không thể cập nhật đợt tổ chức.",
      });
    }
  }
  // =========================================================
  // PUT /api/classes/:id
  // =========================================================
  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      const existing = await TrainingClassModel.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      const trainingCourseId = Number(req.body.training_course_id);

      const className = String(req.body.class_name || "").trim();

      const status = String(req.body.status || existing.status || "OPEN")
        .trim()
        .toUpperCase();

      if (!Number.isInteger(trainingCourseId) || trainingCourseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn khóa đào tạo.",
        });
      }

      const trainingCourseExists =
        await TrainingClassModel.trainingCourseExists(trainingCourseId);

      if (!trainingCourseExists) {
        return res.status(404).json({
          success: false,
          message: "Khóa đào tạo không tồn tại.",
        });
      }

      if (!className) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên lớp học.",
        });
      }

      const duplicated =
        await TrainingClassModel.findByNameInTrainingCourseForUpdate(
          trainingCourseId,
          className,
          id,
        );

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Tên lớp học đã tồn tại trong khóa đào tạo này.",
        });
      }

      if (!["OPEN", "CLOSED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái lớp học không hợp lệ.",
        });
      }

      const slug =
        className === existing.class_name
          ? existing.slug
          : await TrainingClassModel.createUniqueSlug(
              className,
              trainingCourseId,
            );

      const thumbnail = req.file
        ? `/uploads/courses/${req.file.filename}`
        : existing.thumbnail;

      await TrainingClassModel.updateCourse(id, {
        training_course_id: trainingCourseId,

        class_name: className,

        slug,

        short_description:
          String(req.body.short_description || "").trim() || null,

        description: String(req.body.description || "").trim() || null,

        thumbnail,

        duration: String(req.body.duration || "").trim() || null,

        target_audience: String(req.body.target_audience || "").trim() || null,

        learning_outcomes:
          String(req.body.learning_outcomes || "").trim() || null,
        mission: String(req.body.mission || "").trim() || null,

        status,
      });

      const updatedClass = await TrainingClassModel.findById(id);

      const openings = await TrainingClassModel.getClassOpenings(id);

      return res.status(200).json({
        success: true,

        message: "Cập nhật lớp học thành công.",

        data: {
          ...updatedClass,
          class_openings: openings,
        },
      });
    } catch (error) {
      console.error("Lỗi cập nhật lớp học:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể cập nhật lớp học.",
      });
    }
  }
  static async destroyOpening(req, res) {
    try {
      const courseId = Number(req.params.id);

      const openingId = Number(req.params.openingId);

      // =====================================================
      // VALIDATE ID
      // =====================================================
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      if (!Number.isInteger(openingId) || openingId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID đợt tổ chức không hợp lệ.",
        });
      }

      // =====================================================
      // KIỂM TRA LỚP
      // =====================================================
      const courseExists = await TrainingClassModel.courseExists(courseId);

      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      // =====================================================
      // KIỂM TRA OPENING
      // =====================================================
      const opening = await TrainingClassModel.findOpeningById(
        courseId,
        openingId,
      );

      if (!opening) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đợt tổ chức của lớp học này.",
        });
      }

      // =====================================================
      // KIỂM TRA HỌC VIÊN
      // =====================================================
      const totalRegistrations =
        await TrainingClassModel.countOpeningRegistrations(courseId, openingId);

      if (totalRegistrations > 0) {
        return res.status(409).json({
          success: false,

          message:
            `Đợt tổ chức đang có ${totalRegistrations} học viên đăng ký. ` +
            "Không thể xóa đợt tổ chức này.",

          data: {
            opening_id: openingId,
            total_registrations: totalRegistrations,
          },
        });
      }

      // =====================================================
      // SOFT DELETE
      // =====================================================
      const adminId = Number(req.admin?.id);

      if (!Number.isInteger(adminId) || adminId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Không xác định được tài khoản quản trị.",
        });
      }

      const affectedRows = await TrainingClassModel.softDeleteOpening(
        courseId,
        openingId,
        adminId,
      );
      if (affectedRows) {
        await writeAdminActivityLog(req, {
          action: "DELETE",

          entity_type: "TRAINING_CLASS_OPENING",

          entity_id: openingId,

          entity_name:
            opening.class_name ||
            opening.class_code ||
            `Đợt tổ chức #${openingId}`,

          old_data: opening,

          new_data: {
            deleted: true,
            deleted_by: adminId,
          },
        });
      }
      // =====================================================
      // LẤY LẠI LỚP SAU KHI XÓA
      // =====================================================
      const trainingClass = await TrainingClassModel.findById(courseId);

      const openings = await TrainingClassModel.getClassOpenings(courseId);

      return res.status(200).json({
        success: true,

        message: "Xóa đợt tổ chức thành công.",

        data: {
          ...trainingClass,

          class_openings: openings,
        },
      });
    } catch (error) {
      console.error("Lỗi xóa đợt tổ chức:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể xóa đợt tổ chức.",
      });
    }
  }
  // =========================================================
  // DELETE /api/classes/:id
  // =========================================================
  static async destroy(req, res) {
    try {
      const courseId = Number(req.params.id);

      // =====================================================
      // VALIDATE ID
      // =====================================================
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      // =====================================================
      // KIỂM TRA LỚP TỒN TẠI
      // =====================================================
      const existing = await TrainingClassModel.findById(courseId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học.",
        });
      }

      // =====================================================
      // KIỂM TRA TOÀN BỘ ĐĂNG KÝ
      // =====================================================
      const totalRegistrations =
        await TrainingClassModel.countCourseRegistrations(courseId);

      // =====================================================
      // ĐÃ CÓ HỌC VIÊN → KHÔNG CHO XÓA
      // =====================================================
      if (totalRegistrations > 0) {
        return res.status(409).json({
          success: false,

          message:
            `Lớp học đang có ${totalRegistrations} lượt đăng ký. ` +
            "Không thể xóa lớp học này.",

          data: {
            class_id: courseId,

            class_name: existing.class_name,

            total_registrations: totalRegistrations,
          },
        });
      }

      // =====================================================
      // XÓA
      // =====================================================
      // =====================================================
      // SOFT DELETE
      // =====================================================
      const adminId = Number(req.admin?.id);

      if (!Number.isInteger(adminId) || adminId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Không xác định được tài khoản quản trị.",
        });
      }

      const affectedRows = await TrainingClassModel.softDeleteCourse(
        courseId,
        adminId,
      );

      if (!affectedRows) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học để xóa.",
        });
      }
      await writeAdminActivityLog(req, {
        action: "DELETE",

        entity_type: "TRAINING_CLASS",

        entity_id: courseId,

        entity_name: existing.class_name || `Lớp học #${courseId}`,

        old_data: existing,

        new_data: {
          deleted: true,
          deleted_by: adminId,
        },
      });
      return res.status(200).json({
        success: true,

        message: "Xóa lớp học thành công.",

        data: {
          id: courseId,

          class_name: existing.class_name,
        },
      });
    } catch (error) {
      console.error("Lỗi xóa lớp học:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể xóa lớp học.",
      });
    }
  }
  // =========================================================
  // GET /api/classes/trash
  // DANH SÁCH LỚP HỌC ĐÃ XÓA
  // =========================================================
  static async trash(req, res) {
    try {
      const data = await TrainingClassModel.getDeletedCourses();

      return res.status(200).json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy thùng rác lớp học:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách lớp học đã xóa.",
      });
    }
  }
  // =========================================================
  // PATCH /api/classes/:id/restore
  // KHÔI PHỤC LỚP HỌC
  // =========================================================
  static async restore(req, res) {
    try {
      const courseId = Number(req.params.id);

      // =====================================================
      // VALIDATE ID
      // =====================================================
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lớp học không hợp lệ.",
        });
      }

      // =====================================================
      // ADMIN ĐANG THAO TÁC
      // =====================================================
      const adminId = Number(req.admin?.id);

      if (!Number.isInteger(adminId) || adminId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Không xác định được tài khoản quản trị.",
        });
      }

      // =====================================================
      // RESTORE
      // =====================================================
      const result = await TrainingClassModel.restoreCourse(courseId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lớp học trong thùng rác.",
        });
      }
      await writeAdminActivityLog(req, {
        action: "RESTORE",

        entity_type: "TRAINING_CLASS",

        entity_id: courseId,

        entity_name: result.course?.course_name || `Lớp học #${courseId}`,

        old_data: result.course || null,

        new_data: {
          restored: true,
          restored_by: adminId,
        },
      });

      return res.status(200).json({
        success: true,

        message: "Khôi phục lớp học thành công.",

        data: {
          id: courseId,

          course_name: result.course?.course_name || null,

          restored_by: adminId,
        },
      });
    } catch (error) {
      console.error("Lỗi khôi phục lớp học:", error);

      return res.status(500).json({
        success: false,

        message: error.message || "Không thể khôi phục lớp học.",
      });
    }
  }
}

module.exports = TrainingClassController;
