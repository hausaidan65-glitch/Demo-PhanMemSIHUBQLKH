const TrainingCourseModel = require("../models/trainingCourseModel");
const ExcelJS = require("exceljs");
function getStatusLabel(status) {
  const labels = {
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Ngừng hoạt động",
  };

  return labels[status] || status || "";
}
class TrainingCourseController {
  // =========================================================
  // GET /api/training-courses
  // =========================================================
  static async index(req, res) {
    try {
      const data = await TrainingCourseModel.getAll(req.query);

      return res.status(200).json({
        success: true,

        total: data.length,

        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách khóa đào tạo:", error);

      return res.status(500).json({
        success: false,

        message: "Không thể tải danh sách khóa đào tạo.",
      });
    }
  }
  // =========================================================
  // GET /api/training-courses/export
  // =========================================================
  static async exportExcel(req, res) {
    try {
      const data = await TrainingCourseModel.getExportData(req.query);

      if (!data.length) {
        return res.status(404).json({
          success: false,
          message: "Không có khóa đào tạo phù hợp để xuất Excel.",
        });
      }

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "SIHUB";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Khóa đào tạo");

      sheet.columns = [
        {
          header: "STT",
          key: "stt",
          width: 8,
        },
        {
          header: "Tên khóa đào tạo",
          key: "training_course_name",
          width: 50,
        },
        {
          header: "Mô tả",
          key: "description",
          width: 55,
        },
        {
          header: "Số lớp học",
          key: "total_course_groups",
          width: 18,
        },
        {
          header: "Số đợt tổ chức",
          key: "total_classes",
          width: 20,
        },
        {
          header: "Trạng thái",
          key: "status",
          width: 20,
        },
        {
          header: "Ngày tạo",
          key: "created_at",
          width: 20,
        },
        {
          header: "Ngày cập nhật",
          key: "updated_at",
          width: 20,
        },
      ];

      data.forEach((item, index) => {
        sheet.addRow({
          stt: index + 1,

          training_course_name: item.training_course_name || "",

          description: item.description || "",

          total_course_groups: Number(item.total_course_groups) || 0,

          total_classes: Number(item.total_classes) || 0,

          status: getStatusLabel(item.status),

          created_at: item.created_at ? new Date(item.created_at) : null,

          updated_at: item.updated_at ? new Date(item.updated_at) : null,
        });
      });

      // ==========================================
      // STYLE
      // ==========================================

      const headerRow = sheet.getRow(1);

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
          argb: "FF16A34A",
        },
      };

      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      headerRow.height = 30;

      sheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      sheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: sheet.columnCount,
        },
      };

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }

        row.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });

      sheet.getColumn("created_at").numFmt = "dd/mm/yyyy hh:mm";

      sheet.getColumn("updated_at").numFmt = "dd/mm/yyyy hh:mm";

      const dateText = new Date().toISOString().slice(0, 10);

      const filename = `khoa-dao-tao-${dateText}.xlsx`;

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
      console.error("Lỗi xuất Excel khóa đào tạo:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Không thể xuất Excel khóa đào tạo.",
        });
      }
    }
  }
  // =========================================================
  // GET /api/training-courses/:id
  // =========================================================
  static async show(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,

          message: "ID khóa đào tạo không hợp lệ.",
        });
      }

      const trainingCourse = await TrainingCourseModel.findById(id);

      if (!trainingCourse) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy khóa đào tạo.",
        });
      }

      return res.status(200).json({
        success: true,

        data: trainingCourse,
      });
    } catch (error) {
      console.error("Lỗi lấy chi tiết khóa đào tạo:", error);

      return res.status(500).json({
        success: false,

        message: "Không thể tải thông tin khóa đào tạo.",
      });
    }
  }

  // =========================================================
  // POST /api/training-courses
  // =========================================================
  static async store(req, res) {
    try {
      const trainingCourseName = String(
        req.body.training_course_name || "",
      ).trim();

      const description = String(req.body.description || "").trim();

      const status = String(req.body.status || "ACTIVE")
        .trim()
        .toUpperCase();

      // -------------------------
      // Validate tên
      // -------------------------
      if (!trainingCourseName) {
        return res.status(400).json({
          success: false,

          message: "Vui lòng nhập tên khóa đào tạo.",
        });
      }

      if (trainingCourseName.length > 255) {
        return res.status(400).json({
          success: false,

          message: "Tên khóa đào tạo không được vượt quá 255 ký tự.",
        });
      }

      // -------------------------
      // Validate status
      // -------------------------
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,

          message: "Trạng thái khóa đào tạo không hợp lệ.",
        });
      }

      // -------------------------
      // Kiểm tra trùng tên
      // -------------------------
      const duplicated =
        await TrainingCourseModel.findByName(trainingCourseName);

      if (duplicated) {
        return res.status(409).json({
          success: false,

          message: "Tên khóa đào tạo đã tồn tại.",
        });
      }

      // -------------------------
      // Insert
      // -------------------------
      const id = await TrainingCourseModel.create({
        training_course_name: trainingCourseName,

        description,

        status,
      });

      const createdTrainingCourse = await TrainingCourseModel.findById(id);

      return res.status(201).json({
        success: true,

        message: "Thêm khóa đào tạo thành công.",

        data: createdTrainingCourse,
      });
    } catch (error) {
      console.error("Lỗi thêm khóa đào tạo:", error);

      return res.status(500).json({
        success: false,

        message: "Không thể thêm khóa đào tạo.",
      });
    }
  }

  // =========================================================
  // PUT /api/training-courses/:id
  // =========================================================
  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,

          message: "ID khóa đào tạo không hợp lệ.",
        });
      }

      const existed = await TrainingCourseModel.findById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy khóa đào tạo.",
        });
      }

      const trainingCourseName = String(
        req.body.training_course_name || "",
      ).trim();

      const description = String(req.body.description || "").trim();

      const status = String(req.body.status || existed.status || "ACTIVE")
        .trim()
        .toUpperCase();

      // -------------------------
      // Validate tên
      // -------------------------
      if (!trainingCourseName) {
        return res.status(400).json({
          success: false,

          message: "Vui lòng nhập tên khóa đào tạo.",
        });
      }

      if (trainingCourseName.length > 255) {
        return res.status(400).json({
          success: false,

          message: "Tên khóa đào tạo không được vượt quá 255 ký tự.",
        });
      }

      // -------------------------
      // Validate trạng thái
      // -------------------------
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,

          message: "Trạng thái khóa đào tạo không hợp lệ.",
        });
      }

      // -------------------------
      // Kiểm tra trùng
      // -------------------------
      const duplicated = await TrainingCourseModel.findByName(
        trainingCourseName,
        id,
      );

      if (duplicated) {
        return res.status(409).json({
          success: false,

          message: "Tên khóa đào tạo đã tồn tại.",
        });
      }

      // -------------------------
      // Update
      // -------------------------
      await TrainingCourseModel.update(id, {
        training_course_name: trainingCourseName,

        description,

        status,
      });

      const updatedTrainingCourse = await TrainingCourseModel.findById(id);

      return res.status(200).json({
        success: true,

        message: "Cập nhật khóa đào tạo thành công.",

        data: updatedTrainingCourse,
      });
    } catch (error) {
      console.error("Lỗi cập nhật khóa đào tạo:", error);

      return res.status(500).json({
        success: false,

        message: "Không thể cập nhật khóa đào tạo.",
      });
    }
  }

  // =========================================================
  // DELETE /api/training-courses/:id
  // =========================================================
  static async destroy(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,

          message: "ID khóa đào tạo không hợp lệ.",
        });
      }

      const existed = await TrainingCourseModel.findById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy khóa đào tạo.",
        });
      }

      /*
       * Bảng courses hiện tại vẫn là tầng trung gian
       * của dữ liệu cũ.
       *
       * Nếu khóa đã có dữ liệu bên dưới thì chưa cho xóa
       * để tránh mất toàn bộ lớp và học viên.
       */
      const totalChildren = await TrainingCourseModel.countChildren(id);

      if (totalChildren > 0) {
        return res.status(409).json({
          success: false,

          message:
            "Khóa đào tạo này đang có lớp học. " +
            "Vui lòng xử lý các lớp học trước khi xóa.",
        });
      }

      await TrainingCourseModel.remove(id);

      return res.status(200).json({
        success: true,

        message: "Xóa khóa đào tạo thành công.",
      });
    } catch (error) {
      console.error("Lỗi xóa khóa đào tạo:", error);

      return res.status(500).json({
        success: false,

        message: "Không thể xóa khóa đào tạo.",
      });
    }
  }
}

module.exports = TrainingCourseController;
