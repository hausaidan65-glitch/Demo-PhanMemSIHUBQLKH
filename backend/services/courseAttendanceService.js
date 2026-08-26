const db = require("../config/db");
const CourseAttendanceModel = require("../models/courseAttendanceModel");

class CourseAttendanceService {
  // ============================
  // Chuẩn hóa token lấy từ QR
  // ============================
  static normalizeQrToken(rawValue) {
    if (!rawValue) {
      throw new Error("Thiếu mã QR.");
    }

    const value = String(rawValue).trim();

    const prefix = "SIHUB:CHECKIN:";

    if (value.startsWith(prefix)) {
      return value.slice(prefix.length).trim();
    }

    return value;
  }

  // ============================
  // Preview thông tin QR
  // Chưa check-in
  // ============================
  static async previewQr(rawQrValue) {
    const qrToken = this.normalizeQrToken(rawQrValue);

    if (!qrToken) {
      throw new Error("Mã QR không hợp lệ.");
    }

    const registration =
      await CourseAttendanceModel.findRegistrationByQrToken(qrToken);

    if (!registration) {
      throw new Error("Mã QR không hợp lệ hoặc không tồn tại.");
    }

    if (registration.register_status !== "CONFIRMED") {
      throw new Error("Hồ sơ đăng ký này không ở trạng thái đã xác nhận.");
    }

    return {
      registration: {
        id: registration.registration_id,
        status: registration.register_status,
        registered_at: registration.registered_at,
        checked_in: Boolean(registration.checked_in),
        checked_in_at: registration.checked_in_at,
      },

      student: {
        id: registration.user_id,
        fullname: registration.fullname,
        email: registration.email,
        phone: registration.phone,
        gender: registration.gender,
        age_group: registration.age_group,
        company: registration.company,
        position: registration.position,
        user_type: registration.user_type,
      },

      project: {
        has_project: Boolean(registration.has_project),
        project_name: registration.project_name,
        project_field: registration.project_field,
        startup_stage: registration.startup_stage,
        project_description: registration.project_description,
        female_founder: registration.female_founder,
        team_size: registration.team_size,
        incubation_status: registration.incubation_status,
        program_selection_status: registration.program_selection_status,
        support_needs: registration.support_needs,
        organizer_question: registration.organizer_question,
      },

      training: {
        training_program_id: registration.training_program_id,
        training_program_name: registration.training_program_name,

        course_id: registration.course_id,
        course_name: registration.course_name,
        mission: registration.mission,

        class_id: registration.class_id,
        class_name: registration.class_name,
        intake_name: registration.intake_name,
        class_code: registration.class_code,
        trainer_name: registration.trainer_name,
        location: registration.location,
        register_open: registration.register_open,
        register_close: registration.register_close,
        schedule_note: registration.schedule_note,
        class_status: registration.class_status,
      },
    };
  }
  static async checkInByQr({ rawQrValue, sessionId, checkedInBy = null }) {
    if (!sessionId) {
      throw new Error("Thiếu buổi học.");
    }

    const qrToken = this.normalizeQrToken(rawQrValue);

    if (!qrToken) {
      throw new Error("Mã QR không hợp lệ.");
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Lấy registration theo QR
      const [registrationRows] = await connection.query(
        `
        SELECT
          r.id AS registration_id,
          r.user_id,
          r.class_id,
          r.register_status,
          r.checked_in,
          r.checked_in_at,

          u.fullname,
          u.email,
          u.phone,
          u.user_type,
          u.company,
          u.position,

          cc.class_name,

          c.course_name

        FROM registrations r

        INNER JOIN users u
          ON u.id = r.user_id

        INNER JOIN course_classes cc
          ON cc.id = r.class_id

        INNER JOIN courses c
          ON c.id = cc.course_id

        WHERE r.qr_token = ?

        LIMIT 1

        FOR UPDATE
        `,
        [qrToken],
      );

      const registration = registrationRows[0];

      if (!registration) {
        throw new Error("Mã QR không hợp lệ hoặc không tồn tại.");
      }

      // 2. Registration phải CONFIRMED
      if (registration.register_status !== "CONFIRMED") {
        throw new Error("Chỉ học viên đã xác nhận mới được điểm danh.");
      }

      // 3. Lấy session
      const [sessionRows] = await connection.query(
        `
        SELECT
          id,
          class_id,
          session_no,
          session_date,
          start_time,
          end_time,
          location,
          room,
          note

        FROM course_class_sessions

        WHERE id = ?

        LIMIT 1

        FOR UPDATE
        `,
        [sessionId],
      );

      const session = sessionRows[0];

      if (!session) {
        throw new Error("Không tìm thấy buổi học.");
      }

      // 4. Session phải thuộc đúng lớp
      if (Number(session.class_id) !== Number(registration.class_id)) {
        throw new Error("Học viên không thuộc lớp của buổi học này.");
      }

      // 5. Kiểm tra đã điểm danh chưa
      const existingAttendance = await CourseAttendanceModel.findAttendance(
        connection,
        registration.registration_id,
        session.id,
      );

      if (existingAttendance) {
        await connection.commit();

        return {
          already_checked_in: true,

          student: {
            id: registration.user_id,
            fullname: registration.fullname,
            email: registration.email,
            phone: registration.phone,
            user_type: registration.user_type,
            company: registration.company,
            position: registration.position,
          },

          training: {
            class_id: registration.class_id,
            class_name: registration.class_name,
            course_name: registration.course_name,
          },

          session: {
            id: session.id,
            session_no: session.session_no,
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time,
          },

          attendance: {
            id: existingAttendance.id,
            checked_in_at: existingAttendance.checked_in_at,
            method: existingAttendance.checkin_method,
          },
        };
      }

      // 6. Insert attendance
      const attendanceId = await CourseAttendanceModel.createAttendance(
        connection,
        {
          registrationId: registration.registration_id,

          sessionId: session.id,

          checkedInBy,
        },
      );

      // 7. Update field cũ trong registrations
      await CourseAttendanceModel.markRegistrationCheckedIn(
        connection,
        registration.registration_id,
      );

      // 8. Lấy thời gian check-in vừa tạo
      const [attendanceRows] = await connection.query(
        `
        SELECT
          id,
          checked_in_at,
          checkin_method

        FROM course_class_attendances

        WHERE id = ?

        LIMIT 1
        `,
        [attendanceId],
      );

      const attendance = attendanceRows[0];

      await connection.commit();

      return {
        already_checked_in: false,

        student: {
          id: registration.user_id,
          fullname: registration.fullname,
          email: registration.email,
          phone: registration.phone,
          user_type: registration.user_type,
          company: registration.company,
          position: registration.position,
        },

        training: {
          class_id: registration.class_id,
          class_name: registration.class_name,
          course_name: registration.course_name,
        },

        session: {
          id: session.id,
          session_no: session.session_no,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
        },

        attendance: {
          id: attendance.id,
          checked_in_at: attendance.checked_in_at,
          method: attendance.checkin_method,
        },
      };
    } catch (error) {
      await connection.rollback();

      if (error.code === "ER_DUP_ENTRY") {
        throw new Error("Học viên đã được điểm danh buổi này.");
      }

      throw error;
    } finally {
      connection.release();
    }
  }
  static async getClassSessions(classId) {
    const id = Number(classId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("ID lớp học không hợp lệ.");
    }

    const sessions = await CourseAttendanceModel.getSessionsByClassId(id);

    return sessions.map((item) => {
      const totalRegistered = Number(item.total_registered) || 0;

      const totalCheckedIn = Number(item.total_checked_in) || 0;

      const totalAbsent = Math.max(totalRegistered - totalCheckedIn, 0);

      const attendanceRate =
        totalRegistered > 0
          ? Number(((totalCheckedIn / totalRegistered) * 100).toFixed(2))
          : 0;

      return {
        id: item.id,
        class_id: item.class_id,
        session_no: item.session_no,

        session_date: item.session_date,
        start_time: item.start_time,
        end_time: item.end_time,

        location: item.location,
        room: item.room,
        note: item.note,

        attendance: {
          registered: totalRegistered,
          checked_in: totalCheckedIn,
          absent: totalAbsent,
          rate: attendanceRate,
        },
      };
    });
  }
  static async getSessionAttendance(sessionId) {
    const id = Number(sessionId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("ID buổi học không hợp lệ.");
    }

    const session = await CourseAttendanceModel.findSessionById(id);

    if (!session) {
      throw new Error("Không tìm thấy buổi học.");
    }

    const rows = await CourseAttendanceModel.getSessionAttendanceList(id);

    const students = rows.map((item) => ({
      registration_id: item.registration_id,

      student: {
        id: item.user_id,
        fullname: item.fullname,
        email: item.email,
        phone: item.phone,
        company: item.company,
        position: item.position,
        user_type: item.user_type,
      },

      attendance: {
        checked_in: Boolean(item.checked_in),
        attendance_id: item.attendance_id,
        checked_in_at: item.checked_in_at,
        method: item.checkin_method,
        checked_in_by: item.checked_in_by,
      },
    }));

    const checkedIn = students.filter(
      (item) => item.attendance.checked_in,
    ).length;

    const registered = students.length;

    return {
      session: {
        id: session.id,
        class_id: session.class_id,
        session_no: session.session_no,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.location,
        room: session.room,
        note: session.note,
      },

      summary: {
        registered,
        checked_in: checkedIn,
        absent: registered - checkedIn,

        rate:
          registered > 0
            ? Number(((checkedIn / registered) * 100).toFixed(2))
            : 0,
      },

      students,
    };
  }
}

module.exports = CourseAttendanceService;
