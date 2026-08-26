const db = require("../config/db");

const CourseClassModel = require("../models/courseClassModel");
const ClassContentModel = require("../models/classContentModel");
const CourseClassSessionModel = require("../models/courseClassSessionModel");

class CourseClassService {
  // ============================
  // CHUẨN HÓA + VALIDATE PAYLOAD
  // ============================

  static normalizePayload(data = {}) {
    const courseId = Number(data.course_id);
    const className = String(data.class_name || "").trim();
    const classCode = String(data.class_code || "").trim();
    const maxStudents = Number(data.max_students) || 50;

    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new Error("Vui lòng chọn khóa học.");
    }

    if (!className) {
      throw new Error("Vui lòng nhập tên lớp học.");
    }

    if (
      data.register_open &&
      data.register_close &&
      new Date(data.register_open) >= new Date(data.register_close)
    ) {
      throw new Error("Thời gian đóng đăng ký phải sau thời gian mở đăng ký.");
    }

    if (maxStudents <= 0) {
      throw new Error("Số lượng học viên tối đa phải lớn hơn 0.");
    }

    // ============================
    // CHUẨN HÓA NỘI DUNG HỌC
    // ============================

    const contents = Array.isArray(data.contents) ? data.contents : [];

    const normalizedContents = contents
      .map((item, index) => ({
        content_title: String(item.content_title || "").trim(),

        content_description:
          String(item.content_description || "").trim() || null,

        display_order: Number(item.display_order) || index + 1,

        status: item.status || "ACTIVE",
      }))
      .filter((item) => item.content_title);

    if (normalizedContents.length === 0) {
      throw new Error("Vui lòng thêm ít nhất một nội dung học.");
    }

    const contentTitleSet = new Set();

    for (const item of normalizedContents) {
      const normalizedTitle = item.content_title.toLowerCase();

      if (contentTitleSet.has(normalizedTitle)) {
        throw new Error(`Nội dung "${item.content_title}" đang bị trùng.`);
      }

      contentTitleSet.add(normalizedTitle);
    }

    // ============================
    // CHUẨN HÓA BUỔI HỌC
    // ============================

    const sessions = Array.isArray(data.sessions) ? data.sessions : [];

    const normalizedSessions = sessions
      .map((item, index) => ({
        session_no: Number(item.session_no) || index + 1,

        session_date: item.session_date || null,

        start_time: item.start_time || null,

        end_time: item.end_time || null,

        location:
          String(item.location || "").trim() ||
          String(data.location || "").trim() ||
          null,

        room: String(item.room || "").trim() || null,

        note: String(item.note || "").trim() || null,
      }))
      .filter((item) => item.session_date);

    if (normalizedSessions.length === 0) {
      throw new Error("Vui lòng thêm ít nhất một buổi học.");
    }

    const sessionKeySet = new Set();

    for (const session of normalizedSessions) {
      if (
        session.start_time &&
        session.end_time &&
        session.start_time >= session.end_time
      ) {
        throw new Error(
          `Giờ kết thúc của buổi ${session.session_no} phải sau giờ bắt đầu.`,
        );
      }

      const sessionKey = [
        session.session_date,
        session.start_time || "",
        session.end_time || "",
      ].join("|");

      if (sessionKeySet.has(sessionKey)) {
        throw new Error(`Buổi học ngày ${session.session_date} đang bị trùng.`);
      }

      sessionKeySet.add(sessionKey);
    }

    return {
      courseId,
      className,
      classCode,
      maxStudents,
      normalizedContents,
      normalizedSessions,
    };
  }

  // ============================
  // KIỂM TRA KHÓA HỌC TỒN TẠI
  // ============================

  static async ensureCourseExists(connection, courseId) {
    const [courses] = await connection.query(
      `
        SELECT id
        FROM courses
        WHERE id = ?
        LIMIT 1
      `,
      [courseId],
    );

    if (courses.length === 0) {
      throw new Error("Khóa học không tồn tại.");
    }
  }

  // ============================
  // KIỂM TRA MÃ LỚP TRÙNG
  // ============================

  static async ensureClassCodeAvailable(
    connection,
    classCode,
    excludeClassId = null,
  ) {
    if (!classCode) {
      return;
    }

    let sql = `
      SELECT id
      FROM course_classes
      WHERE class_code = ?
    `;

    const params = [classCode];

    if (excludeClassId) {
      sql += `
        AND id <> ?
      `;

      params.push(excludeClassId);
    }

    sql += `
      LIMIT 1
    `;

    const [rows] = await connection.query(sql, params);

    if (rows.length > 0) {
      throw new Error("Mã lớp học đã tồn tại.");
    }
  }

  // ============================
  // TẠO LỚP HOÀN CHỈNH
  // ============================

  static async createFullClass(data) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        courseId,
        className,
        classCode,
        maxStudents,
        normalizedContents,
        normalizedSessions,
      } = this.normalizePayload(data);

      await this.ensureCourseExists(connection, courseId);

      await this.ensureClassCodeAvailable(connection, classCode);

      const classResult = await CourseClassModel.createWithConnection(
        connection,
        {
          ...data,

          course_id: courseId,

          class_code: classCode || null,

          class_name: className,

          max_students: maxStudents,
        },
      );

      const classId = classResult.insertId;

      for (const content of normalizedContents) {
        await ClassContentModel.createWithConnection(connection, {
          ...content,
          class_id: classId,
        });
      }

      for (const session of normalizedSessions) {
        await CourseClassSessionModel.createWithConnection(connection, {
          ...session,
          class_id: classId,
        });
      }

      await connection.commit();

      return {
        class_id: classId,
        created_contents: normalizedContents.length,
        created_sessions: normalizedSessions.length,
      };
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================
  // CẬP NHẬT LỚP HOÀN CHỈNH
  // ============================

  static async updateFullClass(classId, data) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const normalizedClassId = Number(classId);

      if (!Number.isInteger(normalizedClassId) || normalizedClassId <= 0) {
        throw new Error("Mã lớp học không hợp lệ.");
      }

      const [existingClasses] = await connection.query(
        `
            SELECT
              id,
              current_students
            FROM course_classes
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
          `,
        [normalizedClassId],
      );

      if (existingClasses.length === 0) {
        throw new Error("Không tìm thấy lớp học.");
      }

      const {
        courseId,
        className,
        classCode,
        maxStudents,
        normalizedContents,
        normalizedSessions,
      } = this.normalizePayload(data);

      await this.ensureCourseExists(connection, courseId);

      await this.ensureClassCodeAvailable(
        connection,
        classCode,
        normalizedClassId,
      );

      const currentStudents = Number(existingClasses[0].current_students) || 0;

      if (maxStudents < currentStudents) {
        throw new Error(
          `Số lượng tối đa không được nhỏ hơn sĩ số hiện tại (${currentStudents}).`,
        );
      }

      const [classResult] = await connection.query(
        `
            UPDATE course_classes
            SET
              course_id = ?,
              class_code = ?,
              class_name = ?,
              intake_name = ?,
              trainer_name = ?,
              location = ?,
              schedule_note = ?,
              register_open = ?,
              register_close = ?,
              max_students = ?,
              status = ?
            WHERE id = ?
          `,
        [
          courseId,

          classCode || null,

          className,

          String(data.intake_name || "").trim() || null,

          String(data.trainer_name || "").trim() || null,

          String(data.location || "").trim() || null,

          String(data.schedule_note || "").trim() || null,

          data.register_open || null,

          data.register_close || null,

          maxStudents,

          data.status || "OPEN",

          normalizedClassId,
        ],
      );

      if (classResult.affectedRows === 0) {
        throw new Error("Không thể cập nhật lớp học.");
      }

      // ============================
      // XÓA DỮ LIỆU CON CŨ
      // ============================

      await connection.query(
        `
          DELETE FROM class_contents
          WHERE class_id = ?
        `,
        [normalizedClassId],
      );

      await connection.query(
        `
          DELETE FROM course_class_sessions
          WHERE class_id = ?
        `,
        [normalizedClassId],
      );

      // ============================
      // TẠO LẠI NỘI DUNG
      // ============================

      for (const content of normalizedContents) {
        await ClassContentModel.createWithConnection(connection, {
          ...content,
          class_id: normalizedClassId,
        });
      }

      // ============================
      // TẠO LẠI BUỔI HỌC
      // ============================

      for (const session of normalizedSessions) {
        await CourseClassSessionModel.createWithConnection(connection, {
          ...session,
          class_id: normalizedClassId,
        });
      }

      await connection.commit();

      return {
        class_id: normalizedClassId,

        updated_contents: normalizedContents.length,

        updated_sessions: normalizedSessions.length,
      };
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = CourseClassService;
