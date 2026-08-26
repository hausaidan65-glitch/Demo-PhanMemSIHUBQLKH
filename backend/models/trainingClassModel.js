const db = require("../config/db");

class TrainingClassModel {
  // =========================================================
  // DANH SÁCH LỚP HỌC
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    conditions.push("c.deleted_at IS NULL");
    const params = [];

    // =========================================================
    // LỌC THEO KHÓA ĐÀO TẠO
    // =========================================================
    if (query.training_course_id) {
      conditions.push("tp.id = ?");
      params.push(Number(query.training_course_id));
    }

    // =========================================================
    // LỌC THEO TRẠNG THÁI
    // =========================================================
    if (query.status) {
      conditions.push("c.status = ?");
      params.push(String(query.status).toUpperCase());
    }
    // =========================================================
    // LỌC THEO NĂM CỦA ĐỢT TỔ CHỨC
    //
    // Ưu tiên:
    // 1. register_open
    // 2. register_close
    // 3. schedule_note của dữ liệu cũ
    // =========================================================
    if (query.year) {
      const year = Number(query.year);

      if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
        conditions.push(`
      EXISTS (
        SELECT 1
        FROM course_classes cc_year

        WHERE cc_year.course_id = c.id

          AND (
            YEAR(cc_year.register_open) = ?

            OR YEAR(cc_year.register_close) = ?

            OR (
              cc_year.register_open IS NULL
              AND cc_year.register_close IS NULL
              AND cc_year.schedule_note IS NOT NULL
              AND cc_year.schedule_note LIKE ?
            )
          )
      )
    `);

        params.push(year, year, `%${year}%`);
      }
    }

    // =========================================================
    // LỌC THEO THÁNG CỦA ĐỢT TỔ CHỨC
    //
    // Dữ liệu mới:
    // register_open / register_close
    //
    // Dữ liệu cũ:
    // schedule_note kiểu:
    // "Ngày 19/8 - 28/8/2025"
    // =========================================================
    if (query.month) {
      const month = Number(query.month);

      if (Number.isInteger(month) && month >= 1 && month <= 12) {
        /*
         * Pattern:
         * ngày/tháng
         *
         * Ví dụ tháng 6:
         * 19/6
         * 19/06
         */
        const monthRegex = `[0-9]{1,2}/0?${month}([^0-9]|$)`;

        conditions.push(`
      EXISTS (
        SELECT 1
        FROM course_classes cc_month

        WHERE cc_month.course_id = c.id

          AND (
            MONTH(cc_month.register_open) = ?

            OR MONTH(cc_month.register_close) = ?

            OR (
              cc_month.register_open IS NULL
              AND cc_month.register_close IS NULL
              AND cc_month.schedule_note IS NOT NULL

              AND (
                cc_month.schedule_note REGEXP ?

                OR LOWER(cc_month.schedule_note)
                  LIKE ?
              )
            )
          )
      )
    `);

        params.push(month, month, monthRegex, `%tháng ${month}%`);
      }
    }
    // =========================================================
    // LỌC THEO NHIỆM VỤ
    // =========================================================
    if (query.mission) {
      const mission = `%${String(query.mission).trim()}%`;

      conditions.push("c.mission LIKE ?");
      params.push(mission);
    }
    // =========================================================
    // TÌM KIẾM THEO TÊN LỚP
    // =========================================================
    if (query.keyword) {
      conditions.push(`
  (
    c.course_name LIKE ?
    OR c.short_description LIKE ?
    OR c.description LIKE ?
    OR c.mission LIKE ?
  )
    `);

      const keyword = `%${String(query.keyword).trim()}%`;

      params.push(keyword, keyword, keyword, keyword);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        c.id,

        c.course_name AS class_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
      c.learning_outcomes,
c.mission,
c.status,  
        c.created_at,
        c.updated_at,

        tp.id AS training_course_id,

        tp.program_name AS training_course_name,

        COUNT(DISTINCT cc.id) AS total_class_openings,

        COALESCE(
          SUM(
            (
              SELECT COUNT(*)
              FROM registrations r
              WHERE r.class_id = cc.id
            )
          ),
          0
        ) AS total_registrations,

        COALESCE(
          SUM(cc.current_students),
          0
        ) AS total_students

      FROM courses c

      INNER JOIN training_programs tp
        ON tp.id = c.program_id
LEFT JOIN course_classes cc
  ON cc.course_id = c.id
 AND cc.deleted_at IS NULL

      ${whereSql}

      GROUP BY
        c.id,
        c.course_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
c.learning_outcomes,
c.mission,
c.status,
        c.created_at,
        c.updated_at,
        tp.id,
        tp.program_name

      ORDER BY c.id DESC
    `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id) || null,

      training_course_id: Number(item.training_course_id) || null,

      total_class_openings: Number(item.total_class_openings) || 0,

      total_registrations: Number(item.total_registrations) || 0,

      total_students: Number(item.total_students) || 0,
    }));
  }
  // =========================================================
  // XUẤT DỮ LIỆU LỚP HỌC THEO ĐÚNG BỘ LỌC
  //
  // Dùng chung getAll(query)
  // để dữ liệu trên màn hình và dữ liệu Excel không bị lệch.
  // =========================================================
  static async exportData(query = {}) {
    return this.getAll(query);
  }
  // =========================================================
  // CHI TIẾT 1 LỚP
  // =========================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        c.id,

        c.course_name AS class_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
        c.learning_outcomes,
        c.mission,
        c.status,
        c.created_at,
        c.updated_at,

        tp.id AS training_course_id,

        tp.program_name AS training_course_name,

        COUNT(DISTINCT cc.id) AS total_class_openings,

        COALESCE(
          SUM(cc.current_students),
          0
        ) AS total_students

      FROM courses c

      INNER JOIN training_programs tp
        ON tp.id = c.program_id

    LEFT JOIN course_classes cc
  ON cc.course_id = c.id
 AND cc.deleted_at IS NULL

     WHERE c.id = ?
  AND c.deleted_at IS NULL

      GROUP BY
        c.id,
        c.course_name,
        c.slug,
        c.short_description,
        c.description,
        c.thumbnail,
        c.duration,
        c.target_audience,
        c.learning_outcomes,
        c.mission,
        c.status,
        c.created_at,
        c.updated_at,
        tp.id,
        tp.program_name

      LIMIT 1
    `,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],

      id: Number(rows[0].id) || null,

      training_course_id: Number(rows[0].training_course_id) || null,

      total_class_openings: Number(rows[0].total_class_openings) || 0,

      total_students: Number(rows[0].total_students) || 0,
    };
  }

  // =========================================================
  // LẤY NỘI DUNG LỚP
  // =========================================================
  static async getContents(classId) {
    const [rows] = await db.query(
      `
        SELECT
          id,
          class_id,
          content_title,
          content_description,
          display_order,
          status,
          created_at,
          updated_at

        FROM class_contents

        WHERE class_id = ?

        ORDER BY display_order ASC, id ASC
      `,
      [classId],
    );

    return rows;
  }

  // =========================================================
  // LẤY CÁC BUỔI HỌC
  // =========================================================
  static async getSessions(classId) {
    const [rows] = await db.query(
      `
        SELECT *
        FROM course_class_sessions

        WHERE class_id = ?

        ORDER BY
          session_date ASC,
          start_time ASC,
          id ASC
      `,
      [classId],
    );

    return rows;
  }

  // =========================================================
  // KIỂM TRA KHÓA ĐÀO TẠO CÓ TỒN TẠI
  // =========================================================
  static async trainingCourseExists(trainingCourseId) {
    const [rows] = await db.query(
      `
        SELECT id
        FROM training_programs
        WHERE id = ?
        LIMIT 1
      `,
      [trainingCourseId],
    );

    return Boolean(rows[0]);
  }

  // =========================================================
  // KIỂM TRA MÃ LỚP TRÙNG
  // =========================================================
  static async findByClassCode(classCode, excludeClassId = null) {
    if (!classCode) {
      return null;
    }

    let sql = `
      SELECT id
      FROM course_classes
      WHERE class_code = ?
    `;

    const params = [classCode];

    if (excludeClassId) {
      sql += ` AND id <> ?`;
      params.push(excludeClassId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return rows[0] || null;
  }

  // =========================================================
  // TẠO RECORD TRUNG GIAN TRONG COURSES
  //
  // Đây là phần quan trọng:
  // FE sau này KHÔNG cần biết bảng courses nữa.
  //
  // Nhưng database cũ vẫn cần course_id để course_classes
  // liên kết được.
  // =========================================================
  //   static async createLegacyCourse(connection, data) {
  //     const slugBase = String(data.class_name || "lop-hoc")
  //       .normalize("NFD")
  //       .replace(/[\u0300-\u036f]/g, "")
  //       .replace(/đ/g, "d")
  //       .replace(/Đ/g, "D")
  //       .toLowerCase()
  //       .trim()
  //       .replace(/[^a-z0-9]+/g, "-")
  //       .replace(/^-+|-+$/g, "");

  //     const slug = `${slugBase}-${Date.now()}`;

  //     const [result] = await connection.query(
  //       `
  //         INSERT INTO courses
  //         (
  //           program_id,
  //           course_name,
  //           slug,
  //           short_description,
  //           description,
  //           thumbnail,
  //           duration,
  //           target_audience,
  //           learning_outcomes,
  //           status
  //         )

  //         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //       `,
  //       [
  //         data.training_course_id,

  //         data.class_name,

  //         slug,

  //         data.short_description || null,

  //         data.description || null,

  //         data.thumbnail || null,

  //         data.duration || null,

  //         data.target_audience || null,

  //         data.learning_outcomes || null,

  //         data.status || "OPEN",
  //       ],
  //     );

  //     return result.insertId;
  //   }
  static makeSlug(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  static async slugExists(slug) {
    const [rows] = await db.query(
      `
      SELECT id
      FROM courses
      WHERE slug = ?
      LIMIT 1
    `,
      [slug],
    );

    return Boolean(rows[0]);
  }
  static async createUniqueSlug(className, trainingCourseId) {
    const baseSlug = this.makeSlug(className) || "lop-hoc";

    let slug = baseSlug;

    let duplicated = await this.slugExists(slug);

    /*
     * Nếu slug đã tồn tại thì thêm training_course_id.
     *
     * Ví dụ:
     * logistics-xuat-nhap-khau
     *
     * nếu đã tồn tại:
     * logistics-xuat-nhap-khau-khoa-2
     */
    if (duplicated) {
      slug = `${baseSlug}-khoa-${trainingCourseId}`;

      duplicated = await this.slugExists(slug);
    }

    /*
     * Trường hợp vẫn trùng thì thêm timestamp.
     */
    if (duplicated) {
      slug = `${baseSlug}-khoa-${trainingCourseId}-${Date.now()}`;
    }

    return slug;
  }
  static async createCourse(connection, data) {
    const [result] = await connection.query(
      `
    INSERT INTO courses
(
  program_id,
  course_name,
  slug,
  short_description,
  description,
  thumbnail,
  duration,
  target_audience,
  learning_outcomes,
  mission,
  status
)

VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  
    `,
      [
        data.training_course_id,

        data.class_name,

        data.slug,

        data.short_description || null,

        data.description || null,

        data.thumbnail || null,

        data.duration || null,

        data.target_audience || null,

        data.learning_outcomes || null,

        data.mission || null,

        data.status || "OPEN",
      ],
    );

    return result.insertId;
  }
  static async createOpening(connection, courseId, opening) {
    const [result] = await connection.query(
      `
      INSERT INTO course_classes
      (
        course_id,
        class_code,
        class_name,
        intake_name,
        trainer_name,
        location,
        register_open,
        register_close,
        max_students,
        current_students,
        status,
        schedule_note
      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        courseId,

        opening.class_code || null,

        opening.class_name || null,

        opening.intake_name || null,

        opening.trainer_name || null,

        opening.location || null,

        opening.register_open || null,

        opening.register_close || null,

        Number(opening.max_students) || 50,

        0,

        opening.status || "OPEN",

        opening.schedule_note || null,
      ],
    );

    return result.insertId;
  }
  static async findByNameInTrainingCourse(trainingCourseId, className) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        program_id,
        course_name

      FROM courses

      WHERE program_id = ?
        AND LOWER(TRIM(course_name)) = LOWER(TRIM(?))

      LIMIT 1
    `,
      [trainingCourseId, className],
    );

    return rows[0] || null;
  }

  // =========================================================
  // TẠO COURSE_CLASS
  // =========================================================
  //   static async createClass(connection, legacyCourseId, data) {
  //     const [result] = await connection.query(
  //       `
  //         INSERT INTO course_classes
  //         (
  //           course_id,
  //           class_code,
  //           class_name,
  //           intake_name,
  //           trainer_name,
  //           location,
  //           schedule_note,
  //           register_open,
  //           register_close,
  //           max_students,
  //           current_students,
  //           status
  //         )

  //         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //       `,
  //       [
  //         legacyCourseId,

  //         data.class_code || null,

  //         data.class_name,

  //         data.intake_name || null,

  //         data.trainer_name || null,

  //         data.location || null,

  //         data.schedule_note || null,

  //         data.register_open || null,

  //         data.register_close || null,

  //         Number(data.max_students) || 50,

  //         0,

  //         data.status || "OPEN",
  //       ],
  //     );

  //     return result.insertId;
  //   }

  // =========================================================
  // THÊM NỘI DUNG LỚP
  // =========================================================
  static async createContent(connection, classId, content, displayOrder) {
    await connection.query(
      `
        INSERT INTO class_contents
        (
          class_id,
          content_title,
          content_description,
          display_order,
          status
        )

        VALUES (?, ?, ?, ?, ?)
      `,
      [
        classId,

        content.content_title,

        content.content_description || null,

        displayOrder,

        content.status || "ACTIVE",
      ],
    );
  }
  static async courseExists(courseId) {
    const [rows] = await db.query(
      `
   SELECT id
FROM courses
WHERE id = ?
  AND deleted_at IS NULL
LIMIT 1
    `,
      [courseId],
    );

    return Boolean(rows[0]);
  }
  static async findByNameInTrainingCourseForUpdate(
    trainingCourseId,
    className,
    excludeCourseId,
  ) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        program_id,
        course_name

      FROM courses

      WHERE program_id = ?
        AND LOWER(TRIM(course_name)) = LOWER(TRIM(?))
        AND id <> ?

      LIMIT 1
    `,
      [trainingCourseId, className, excludeCourseId],
    );

    return rows[0] || null;
  }
  // =========================================================
  // CẬP NHẬT ĐỢT TỔ CHỨC
  // course_classes = Đợt tổ chức
  // =========================================================
  static async updateOpening(courseId, openingId, data) {
    const [result] = await db.query(
      `
    UPDATE course_classes

    SET
      class_code = ?,
      class_name = ?,
      intake_name = ?,
      trainer_name = ?,
      location = ?,
      register_open = ?,
      register_close = ?,
      max_students = ?,
      current_students = ?,
      status = ?,
      schedule_note = ?

    WHERE id = ?
      AND course_id = ?
      AND deleted_at IS NULL
    `,
      [
        data.class_code || null,
        data.class_name || null,
        data.intake_name || null,
        data.trainer_name || null,
        data.location || null,
        data.register_open || null,
        data.register_close || null,

        data.max_students,

        data.current_students,

        data.status || "OPEN",

        data.schedule_note || null,

        openingId,
        courseId,
      ],
    );

    return result.affectedRows;
  }
  static async updateOpeningWithSessions(
    courseId,
    openingId,
    data,
    sessions = [],
  ) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // ============================
      // 1. Update opening
      // ============================

      const [result] = await connection.query(
        `
      UPDATE course_classes

      SET
        class_code = ?,
        class_name = ?,
        intake_name = ?,
        trainer_name = ?,
        location = ?,
        register_open = ?,
        register_close = ?,
        max_students = ?,
        current_students = ?,
        status = ?,
        schedule_note = ?

      WHERE id = ?
        AND course_id = ?
        AND deleted_at IS NULL
      `,
        [
          data.class_code || null,
          data.class_name || null,
          data.intake_name || null,
          data.trainer_name || null,
          data.location || null,

          data.register_open || null,
          data.register_close || null,

          Number(data.max_students) || 50,
          Number(data.current_students) || 0,

          data.status || "OPEN",

          data.schedule_note || null,

          openingId,
          courseId,
        ],
      );

      if (!result.affectedRows) {
        throw new Error("Không tìm thấy đợt tổ chức để cập nhật.");
      }

      // ============================
      // 2. Replace sessions
      // ============================

      await this.replaceSessions(connection, openingId, sessions);

      await connection.commit();

      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // =========================================================
  // CẬP NHẬT THÔNG TIN LỚP HỌC
  //
  // courses = Lớp học
  //
  // Hàm này CHỈ cập nhật thông tin lớp học.
  // KHÔNG đụng tới course_classes (đợt tổ chức).
  // =========================================================
  static async updateCourse(courseId, data) {
    const [result] = await db.query(
      `
      UPDATE courses

      SET
        program_id = ?,
        course_name = ?,
        slug = ?,
        short_description = ?,
        description = ?,
        thumbnail = ?,
        duration = ?,
        target_audience = ?,
        learning_outcomes = ?,
        mission = ?,
        status = ?

      WHERE id = ?
    `,
      [
        data.training_course_id,

        data.class_name,

        data.slug,

        data.short_description || null,

        data.description || null,

        data.thumbnail || null,

        data.duration || null,

        data.target_audience || null,

        data.learning_outcomes || null,
        data.mission || null,

        data.status || "OPEN",

        courseId,
      ],
    );

    return result.affectedRows;
  }
  // =========================================================
  // THÊM BUỔI HỌC
  // =========================================================
  static async createSession(connection, classId, session) {
    await connection.query(
      `
      INSERT INTO course_class_sessions
      (
        class_id,
        session_no,
        session_date,
        start_time,
        end_time,
        location,
        room,
        note
      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        classId,

        session.session_no || null,

        session.session_date || null,

        session.start_time || null,

        session.end_time || null,

        session.location || null,

        session.room || null,

        session.note || null,
      ],
    );
  }
  static async replaceSessions(connection, classId, sessions = []) {
    // ============================
    // Xóa lịch cũ
    // ============================

    await connection.query(
      `
    DELETE FROM course_class_sessions
    WHERE class_id = ?
    `,
      [classId],
    );

    // ============================
    // Không có session mới
    // ============================

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return;
    }

    // ============================
    // Tạo lại từng buổi
    // ============================

    for (let index = 0; index < sessions.length; index += 1) {
      const session = sessions[index];

      await this.createSession(connection, classId, {
        ...session,

        session_no: Number(session.session_no) || index + 1,
      });
    }
  }
  // =========================================================
  // TÌM 1 ĐỢT TỔ CHỨC
  // =========================================================
  static async findOpeningById(courseId, openingId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        course_id,
        class_code,
        class_name,
        intake_name,
        trainer_name,
        location,
        register_open,
        register_close,
        max_students,
        current_students,
        status,
        schedule_note,
        created_at,
        updated_at

      FROM course_classes

    WHERE id = ?
  AND course_id = ?
  AND deleted_at IS NULL
      LIMIT 1
    `,
      [openingId, courseId],
    );

    return rows[0] || null;
  }
  // =========================================================
  // ĐẾM ĐĂNG KÝ CỦA MỘT ĐỢT TỔ CHỨC
  // =========================================================
  static async countOpeningRegistrations(courseId, openingId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(r.id) AS total

      FROM course_classes cc

      LEFT JOIN registrations r
        ON r.class_id = cc.id

      WHERE cc.id = ?
        AND cc.course_id = ?
    `,
      [openingId, courseId],
    );

    return Number(rows[0]?.total) || 0;
  }
  // =========================================================
  // XÓA LỚP HỌC
  //
  // courses = Lớp học
  // course_classes = Các đợt tổ chức
  // =========================================================
  static async softDeleteCourse(courseId, adminId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Soft delete toàn bộ các đợt tổ chức
      await connection.query(
        `
      UPDATE course_classes
      SET
        deleted_at = NOW(),
        deleted_by = ?
      WHERE course_id = ?
        AND deleted_at IS NULL
      `,
        [adminId, courseId],
      );

      // 2. Soft delete lớp học
      const [result] = await connection.query(
        `
      UPDATE courses
      SET
        deleted_at = NOW(),
        deleted_by = ?
      WHERE id = ?
        AND deleted_at IS NULL
      `,
        [adminId, courseId],
      );

      await connection.commit();

      return result.affectedRows;
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  // =========================================================
  // XÓA ĐỢT TỔ CHỨC
  // =========================================================
  static async softDeleteOpening(courseId, openingId, adminId) {
    const [result] = await db.query(
      `
    UPDATE course_classes
    SET
      deleted_at = NOW(),
      deleted_by = ?
    WHERE id = ?
      AND course_id = ?
      AND deleted_at IS NULL
    `,
      [adminId, openingId, courseId],
    );

    return result.affectedRows;
  }
  static async getDeletedCourses() {
    const [rows] = await db.query(
      `
    SELECT
      c.id,
      c.course_name AS class_name,
      c.deleted_at,
      c.deleted_by,

      tp.program_name AS training_course_name,

      a.fullname AS deleted_by_name,
      a.username AS deleted_by_username

    FROM courses c

    LEFT JOIN training_programs tp
      ON tp.id = c.program_id

    LEFT JOIN admins a
      ON a.id = c.deleted_by

    WHERE c.deleted_at IS NOT NULL

    ORDER BY c.deleted_at DESC
    `,
    );

    return rows;
  }
  static async restoreCourse(courseId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `
      UPDATE courses
      SET
        deleted_at = NULL,
        deleted_by = NULL
      WHERE id = ?
        AND deleted_at IS NOT NULL
      `,
        [courseId],
      );

      if (!result.affectedRows) {
        await connection.rollback();

        return 0;
      }

      await connection.query(
        `
      UPDATE course_classes
      SET
        deleted_at = NULL,
        deleted_by = NULL
      WHERE course_id = ?
      `,
        [courseId],
      );

      await connection.commit();

      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // =========================================================
  // ĐẾM TOÀN BỘ HỌC VIÊN/ĐĂNG KÝ CỦA LỚP HỌC
  //
  // courses.id
  //      ↓
  // course_classes.course_id
  //      ↓
  // registrations.class_id
  // =========================================================
  static async countCourseRegistrations(courseId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(r.id) AS total

      FROM course_classes cc

      LEFT JOIN registrations r
        ON r.class_id = cc.id

WHERE cc.course_id = ?
  AND cc.deleted_at IS NULL
    `,
      [courseId],
    );

    return Number(rows[0]?.total) || 0;
  }
  static async getClassOpenings(courseId) {
    const [rows] = await db.query(
      `
      SELECT
        cc.id,

        cc.course_id,

        cc.class_code,
        cc.class_name,
        cc.intake_name,
        cc.trainer_name,
        cc.location,

        cc.register_open,
        cc.register_close,

        cc.max_students,
        cc.current_students,

        cc.status,

        cc.schedule_note,

        cc.created_at,
        cc.updated_at,

        (
          SELECT COUNT(*)
          FROM registrations r
          WHERE r.class_id = cc.id
        ) AS total_registrations
 
     FROM course_classes cc

WHERE cc.course_id = ?
  AND cc.deleted_at IS NULL

ORDER BY cc.id DESC
    `,
      [courseId],
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id) || null,

      course_id: Number(item.course_id) || null,

      max_students: Number(item.max_students) || 0,

      current_students: Number(item.current_students) || 0,

      total_registrations: Number(item.total_registrations) || 0,
    }));
  }
  // =========================================================
  // TẠO LỚP HỌC MỚI
  //
  // courses       = Lớp học
  // course_classes = Đợt tổ chức
  // =========================================================
  static async create(data) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // =====================================================
      // 1. TẠO LỚP HỌC TRONG courses
      // =====================================================
      const courseId = await this.createCourse(connection, data);

      let openingId = null;

      // =====================================================
      // 2. NẾU CÓ ĐỢT TỔ CHỨC THÌ TẠO course_classes
      // =====================================================
      if (data.opening) {
        openingId = await this.createOpening(
          connection,
          courseId,
          data.opening,
        );
      }

      // =====================================================
      // 3. COMMIT
      // =====================================================
      await connection.commit();

      return {
        courseId,
        openingId,
      };
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  static async getOpeningSessionsForManage(courseId, openingId) {
    const [rows] = await db.query(
      `
    SELECT
      ccs.id,
      ccs.class_id,
      ccs.session_no,

      DATE_FORMAT(
        ccs.session_date,
        '%Y-%m-%d'
      ) AS session_date,

      ccs.start_time,
      ccs.end_time,
      ccs.location,
      ccs.room,
      ccs.note,

      (
        SELECT COUNT(*)
        FROM course_class_attendances cca
        WHERE cca.session_id = ccs.id
      ) AS attendance_count

    FROM course_class_sessions ccs

    INNER JOIN course_classes cc
      ON cc.id = ccs.class_id

    WHERE ccs.class_id = ?
      AND cc.course_id = ?

    ORDER BY
      ccs.session_no ASC,
      ccs.session_date ASC
    `,
      [openingId, courseId],
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      class_id: Number(item.class_id),

      session_no: Number(item.session_no) || 0,

      attendance_count: Number(item.attendance_count) || 0,
    }));
  }
  static async updateSession(connection, sessionId, openingId, session) {
    const [result] = await connection.query(
      `
    UPDATE course_class_sessions

    SET
      session_no = ?,
      session_date = ?,
      start_time = ?,
      end_time = ?,
      location = ?,
      room = ?,
      note = ?

    WHERE id = ?
      AND class_id = ?
    `,
      [
        session.session_no,

        session.session_date,

        session.start_time || null,

        session.end_time || null,

        session.location || null,

        session.room || null,

        session.note || null,

        sessionId,

        openingId,
      ],
    );

    return result.affectedRows;
  }
  static async countSessionAttendances(connection, sessionId) {
    const [[row]] = await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM course_class_attendances
      WHERE session_id = ?
      `,
      [sessionId],
    );

    return Number(row?.total) || 0;
  }
  static async deleteSession(connection, sessionId, openingId) {
    const [result] = await connection.query(
      `
      DELETE FROM course_class_sessions

      WHERE id = ?
        AND class_id = ?
      `,
      [sessionId, openingId],
    );

    return result.affectedRows;
  }
  static async syncOpeningSessionsSafely(connection, openingId, sessions = []) {
    // =====================================
    // 1. LOCK danh sách session hiện tại
    // =====================================

    const [currentSessions] = await connection.query(
      `
      SELECT
        id,
        class_id,
        session_no,

        DATE_FORMAT(
          session_date,
          '%Y-%m-%d'
        ) AS session_date,

        start_time,
        end_time,
        location,
        room,
        note

      FROM course_class_sessions

      WHERE class_id = ?

      ORDER BY session_no ASC

      FOR UPDATE
      `,
      [openingId],
    );

    const currentMap = new Map(
      currentSessions.map((session) => [Number(session.id), session]),
    );

    const incomingIds = new Set();

    // =====================================
    // 2. INSERT / UPDATE
    // =====================================

    for (let index = 0; index < sessions.length; index += 1) {
      const session = sessions[index];

      const normalized = {
        session_no: index + 1,

        session_date: session.session_date,

        start_time: session.start_time || null,

        end_time: session.end_time || null,

        location: session.location || null,

        room: session.room || null,

        note: session.note || null,
      };

      const sessionId = Number(session.id) || null;

      // =================================
      // SESSION MỚI
      // =================================

      if (!sessionId) {
        await this.createSession(connection, openingId, normalized);

        continue;
      }

      // =================================
      // SESSION CŨ
      // =================================

      const current = currentMap.get(sessionId);

      if (!current) {
        throw new Error(`Buổi học #${sessionId} không thuộc đợt tổ chức này.`);
      }

      incomingIds.add(sessionId);

      const attendanceCount = await this.countSessionAttendances(
        connection,
        sessionId,
      );

      // =================================
      // ĐÃ CÓ ATTENDANCE:
      // không được đổi ngày / giờ
      // =================================

      if (attendanceCount > 0) {
        const oldDate = String(current.session_date || "").slice(0, 10);

        const newDate = String(normalized.session_date || "").slice(0, 10);

        const oldStart = String(current.start_time || "").slice(0, 5);

        const newStart = String(normalized.start_time || "").slice(0, 5);

        const oldEnd = String(current.end_time || "").slice(0, 5);

        const newEnd = String(normalized.end_time || "").slice(0, 5);

        if (oldDate !== newDate || oldStart !== newStart || oldEnd !== newEnd) {
          throw new Error(
            `Buổi ${current.session_no} đã có dữ liệu điểm danh. ` +
              "Không thể thay đổi ngày hoặc giờ học.",
          );
        }
      }

      await this.updateSession(connection, sessionId, openingId, normalized);
    }

    // =====================================
    // 3. SESSION CŨ KHÔNG CÒN TRONG FORM
    // => user muốn xóa
    // =====================================

    for (const current of currentSessions) {
      const sessionId = Number(current.id);

      if (incomingIds.has(sessionId)) {
        continue;
      }

      const attendanceCount = await this.countSessionAttendances(
        connection,
        sessionId,
      );

      if (attendanceCount > 0) {
        throw new Error(
          `Buổi ${current.session_no} đã có dữ liệu điểm danh nên không thể xóa.`,
        );
      }

      await this.deleteSession(connection, sessionId, openingId);
    }
  }
  static async updateOpeningWithSessionsSafe(
    courseId,
    openingId,
    data,
    sessions,
  ) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // =====================================
      // 1. LOCK OPENING
      // =====================================

      const [[opening]] = await connection.query(
        `
        SELECT id, course_id
        FROM course_classes

        WHERE id = ?
          AND course_id = ?
          AND deleted_at IS NULL

        FOR UPDATE
        `,
        [openingId, courseId],
      );

      if (!opening) {
        throw new Error("Không tìm thấy đợt tổ chức.");
      }

      // =====================================
      // 2. UPDATE OPENING
      // =====================================

      await connection.query(
        `
      UPDATE course_classes

      SET
        class_code = ?,
        class_name = ?,
        intake_name = ?,
        trainer_name = ?,
        location = ?,
        register_open = ?,
        register_close = ?,
        max_students = ?,
        current_students = ?,
        status = ?,
        schedule_note = ?,
        updated_at = NOW()

      WHERE id = ?
        AND course_id = ?
      `,
        [
          data.class_code || null,

          data.class_name || null,

          data.intake_name || null,

          data.trainer_name || null,

          data.location || null,

          data.register_open || null,

          data.register_close || null,

          Number(data.max_students) || 50,

          Number(data.current_students) || 0,

          data.status || "OPEN",

          data.schedule_note || null,

          openingId,

          courseId,
        ],
      );

      // =====================================
      // 3. SAFE SESSION SYNC
      // =====================================

      if (Array.isArray(sessions)) {
        await this.syncOpeningSessionsSafely(connection, openingId, sessions);
      }

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  static async addOpening(courseId, opening) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const openingId = await this.createOpening(connection, courseId, opening);

      await connection.commit();

      return openingId;
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  static async addOpeningWithSessions(courseId, data, sessions = []) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // ============================
      // Tạo opening
      // ============================

      const openingId = await this.createOpening(connection, courseId, data);

      // ============================
      // Tạo sessions
      // ============================

      for (let index = 0; index < sessions.length; index += 1) {
        const session = sessions[index];

        await this.createSession(connection, openingId, {
          ...session,

          session_no: Number(session.session_no) || index + 1,
        });
      }

      await connection.commit();

      return openingId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  static async restoreCourse(courseId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // =====================================================
      // 1. KIỂM TRA LỚP ĐANG NẰM TRONG THÙNG RÁC
      // =====================================================
      const [courses] = await connection.query(
        `
      SELECT
        id,
        course_name,
        deleted_at,
        deleted_by

      FROM courses

      WHERE id = ?
        AND deleted_at IS NOT NULL

      LIMIT 1
      `,
        [courseId],
      );

      if (!courses.length) {
        await connection.rollback();

        return null;
      }

      const deletedCourse = courses[0];

      // =====================================================
      // 2. RESTORE LỚP
      // =====================================================
      const [result] = await connection.query(
        `
      UPDATE courses

      SET
        deleted_at = NULL,
        deleted_by = NULL

      WHERE id = ?
        AND deleted_at IS NOT NULL
      `,
        [courseId],
      );

      // =====================================================
      // 3. RESTORE CÁC ĐỢT BỊ XÓA CÙNG LÚC VỚI LỚP
      // =====================================================
      await connection.query(
        `
      UPDATE course_classes

      SET
        deleted_at = NULL,
        deleted_by = NULL

      WHERE course_id = ?
        AND deleted_at = ?
        AND deleted_by = ?
      `,
        [courseId, deletedCourse.deleted_at, deletedCourse.deleted_by],
      );

      await connection.commit();

      return {
        affectedRows: result.affectedRows,
        course: deletedCourse,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getFilterOptions() {
    const [rows] = await db.query(`
    SELECT
      register_open,
      register_close,
      schedule_note

    FROM course_classes

    WHERE deleted_at IS NULL
  `);

    const years = new Set();

    for (const item of rows) {
      if (item.register_open) {
        years.add(new Date(item.register_open).getFullYear());
      }

      if (item.register_close) {
        years.add(new Date(item.register_close).getFullYear());
      }

      if (item.schedule_note) {
        const matches = String(item.schedule_note).match(/\b(20\d{2})\b/g);

        if (matches) {
          for (const year of matches) {
            years.add(Number(year));
          }
        }
      }
    }

    return {
      years: [...years].sort((a, b) => b - a),
    };
  }
  // =========================================================
  // ĐẾM ĐĂNG KÝ
  // =========================================================
  static async countRegistrations(id) {
    const [rows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM registrations
        WHERE class_id = ?
      `,
      [id],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // XÓA LỚP
  // =========================================================
  //   static async remove(id) {
  //     const connection = await db.getConnection();

  //     try {
  //       await connection.beginTransaction();

  //       const [rows] = await connection.query(
  //         `
  //           SELECT course_id
  //           FROM course_classes
  //           WHERE id = ?
  //           LIMIT 1
  //           FOR UPDATE
  //         `,
  //         [id],
  //       );

  //       if (!rows.length) {
  //         throw new Error("Không tìm thấy lớp học.");
  //       }

  //       const legacyCourseId = Number(rows[0].course_id);

  //       // Xóa dữ liệu con của lớp
  //       await connection.query(
  //         `
  //           DELETE FROM class_contents
  //           WHERE class_id = ?
  //         `,
  //         [id],
  //       );

  //       await connection.query(
  //         `
  //           DELETE FROM course_class_sessions
  //           WHERE class_id = ?
  //         `,
  //         [id],
  //       );

  //       // Xóa lớp
  //       await connection.query(
  //         `
  //           DELETE FROM course_classes
  //           WHERE id = ?
  //         `,
  //         [id],
  //       );

  //       /*
  //        * Record courses mới được API này tạo ra chỉ đại diện
  //        * cho lớp, nên xóa lớp thì xóa luôn record trung gian.
  //        */
  //       await connection.query(
  //         `
  //           DELETE FROM courses
  //           WHERE id = ?
  //         `,
  //         [legacyCourseId],
  //       );

  //       await connection.commit();

  //       return true;
  //     } catch (error) {
  //       await connection.rollback();

  //       throw error;
  //     } finally {
  //       connection.release();
  //     }
  //   }
}

module.exports = TrainingClassModel;
