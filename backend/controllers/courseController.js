const Course = require("../models/courseModel");

class CourseController {
  // =========================================================
  // DANH SÁCH KHÓA HỌC
  // =========================================================

  static async index(req, res) {
    try {
      const data = await Course.getAll(req.query);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("COURSE INDEX ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể tải danh sách khóa học.",
      });
    }
  }

  // =========================================================
  // CHI TIẾT KHÓA HỌC
  // =========================================================

  static async show(req, res) {
    try {
      const data = await Course.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khóa học.",
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("COURSE SHOW ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể tải chi tiết khóa học.",
      });
    }
  }

  // =========================================================
  // LẤY THEO CHƯƠNG TRÌNH
  // =========================================================

  static async byProgram(req, res) {
    try {
      const data = await Course.getByProgram(req.params.programId);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("COURSE BY PROGRAM ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể tải khóa học theo chương trình.",
      });
    }
  }

  // =========================================================
  // THÊM KHÓA HỌC
  // =========================================================

  static async store(req, res) {
    try {
      const {
        program_id,
        course_name,
        slug,
        short_description,
        description,
        duration,
        target_audience,
        learning_outcomes,
        status,
      } = req.body;

      if (!program_id) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn chương trình.",
        });
      }

      if (!course_name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên khóa học.",
        });
      }

      const programExists = await Course.programExists(program_id);

      if (!programExists) {
        return res.status(400).json({
          success: false,
          message: "Chương trình không tồn tại.",
        });
      }

      const duplicate = await Course.findByName(course_name.trim(), program_id);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Tên khóa học đã tồn tại trong chương trình.",
        });
      }

      const thumbnail = req.file
        ? `/uploads/courses/${req.file.filename}`
        : req.body.thumbnail?.trim() || null;

      const result = await Course.create({
        program_id: Number(program_id),
        course_name: course_name.trim(),
        slug: slug?.trim() || null,
        short_description: short_description?.trim() || null,
        description: description?.trim() || null,
        thumbnail,
        duration: duration?.trim() || null,
        target_audience: target_audience?.trim() || null,
        learning_outcomes: learning_outcomes?.trim() || null,
        status: status || "OPEN",
      });

      const course = await Course.getById(result.insertId);

      return res.status(201).json({
        success: true,
        message: "Thêm khóa học thành công.",
        data: course,
      });
    } catch (error) {
      console.error("COURSE STORE ERROR:", error);

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ảnh khóa học không được vượt quá dung lượng cho phép.",
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể thêm khóa học.",
      });
    }
  }

  // =========================================================
  // CẬP NHẬT KHÓA HỌC
  // =========================================================

  static async update(req, res) {
    try {
      const id = req.params.id;

      const existed = await Course.getById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khóa học.",
        });
      }

      const {
        program_id,
        course_name,
        slug,
        short_description,
        description,
        duration,
        target_audience,
        learning_outcomes,
        status,
      } = req.body;

      if (!program_id) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn chương trình.",
        });
      }

      if (!course_name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên khóa học.",
        });
      }

      const programExists = await Course.programExists(program_id);

      if (!programExists) {
        return res.status(400).json({
          success: false,
          message: "Chương trình không tồn tại.",
        });
      }

      const duplicate = await Course.findByName(
        course_name.trim(),
        program_id,
        id,
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Tên khóa học đã tồn tại trong chương trình.",
        });
      }

      /*
       * Có ảnh mới:
       *   dùng file vừa upload.
       *
       * Không có ảnh mới:
       *   giữ thumbnail hiện tại trong database.
       */
      const thumbnail = req.file
        ? `/uploads/courses/${req.file.filename}`
        : existed.thumbnail || null;

      await Course.update(id, {
        program_id: Number(program_id),
        course_name: course_name.trim(),
        slug: slug?.trim() || null,
        short_description: short_description?.trim() || null,
        description: description?.trim() || null,
        thumbnail,
        duration: duration?.trim() || null,
        target_audience: target_audience?.trim() || null,
        learning_outcomes: learning_outcomes?.trim() || null,
        status: status || existed.status || "OPEN",
      });

      const data = await Course.getById(id);

      return res.json({
        success: true,
        message: "Cập nhật khóa học thành công.",
        data,
      });
    } catch (error) {
      console.error("COURSE UPDATE ERROR:", error);

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ảnh khóa học không được vượt quá dung lượng cho phép.",
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể cập nhật khóa học.",
      });
    }
  }

  // =========================================================
  // XÓA KHÓA HỌC
  // =========================================================

  static async destroy(req, res) {
    try {
      const id = req.params.id;

      const existed = await Course.getById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khóa học.",
        });
      }

      const total = await Course.countClasses(id);

      if (total > 0) {
        return res.status(409).json({
          success: false,
          message: `Khóa học đang có ${total} lớp. Vui lòng xóa lớp trước.`,
        });
      }

      await Course.delete(id);

      return res.json({
        success: true,
        message: "Xóa khóa học thành công.",
      });
    } catch (error) {
      console.error("COURSE DESTROY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Không thể xóa khóa học.",
      });
    }
  }
}

module.exports = CourseController;
