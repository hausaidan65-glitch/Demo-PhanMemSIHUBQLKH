const db = require("../config/db");

const UserModel = require("../models/userModel");
const RegistrationModel = require("../models/registrationModel");
const CourseClassModel = require("../models/courseClassModel");
const ClassStatusService = require("./classStatusService");
const generateQrToken = require("../utils/generateQrToken");

// ============================
// Email
// NOTE:
// Không require trong function.
// NodeJS chỉ load module một lần.
// ============================
const EmailService = require("./emailService");
const EmailLogModel = require("../models/emailLogModel");
const NotificationModel = require("../models/notificationModel");

class RegistrationService {
  static async refreshClassStatus(connection, classId) {
    const [[courseClass]] = await connection.query(
      `
      SELECT *
      FROM course_classes
      WHERE id = ?
      FOR UPDATE
      `,
      [classId],
    );

    if (!courseClass) {
      return null;
    }

    const firstSession = await CourseClassModel.getFirstSession(
      connection,
      classId,
    );
    const lastSession = await CourseClassModel.getLastSession(
      connection,
      classId,
    );

    const effectiveStatus = ClassStatusService.resolveEffectiveStatus({
      status: courseClass.status === "FULL" ? "OPEN" : courseClass.status,

      currentStudents: courseClass.current_students,

      maxStudents: courseClass.max_students,

      registerClose: courseClass.register_close,

      firstSessionAt: firstSession?.first_session_at,
      lastSessionAt: lastSession?.last_session_at,
    });

    await connection.query(
      `
    UPDATE course_classes
    SET status = ?
    WHERE id = ?
    `,
      [effectiveStatus, classId],
    );

    return effectiveStatus;
  }
  static async register(data) {
    // Lấy connection để sử dụng Transaction
    const connection = await db.getConnection();

    try {
      // ============================
      // 1. Validate dữ liệu đầu vào
      // ============================

      if (!data.class_id) {
        throw new Error("Thiếu lớp học.");
      }

      if (!data.fullname || data.fullname.trim() === "") {
        throw new Error("Vui lòng nhập họ tên.");
      }

      if (!data.phone || data.phone.trim() === "") {
        throw new Error("Vui lòng nhập số điện thoại.");
      }

      if (!data.email || data.email.trim() === "") {
        throw new Error("Vui lòng nhập email.");
      }
      if (!data.company || String(data.company).trim() === "") {
        throw new Error("Vui lòng nhập đơn vị.");
      }

      if (!data.position || String(data.position).trim() === "") {
        throw new Error("Vui lòng nhập chức vụ.");
      }

      if (!data.gender) {
        throw new Error("Vui lòng chọn giới tính.");
      }

      if (!data.age_group) {
        throw new Error("Vui lòng chọn nhóm tuổi.");
      }

      if (!data.user_type) {
        throw new Error("Vui lòng chọn nhóm đối tượng.");
      }

      const hasProject =
        data.has_project === true ||
        data.has_project === 1 ||
        data.has_project === "1" ||
        data.has_project === "true";
      data.has_project = hasProject;
      if (
        data.has_project === undefined ||
        data.has_project === null ||
        data.has_project === ""
      ) {
        throw new Error("Vui lòng cho biết bạn có dự án khởi nghiệp hay chưa.");
      }

      if (hasProject) {
        if (!data.project_field) {
          throw new Error("Vui lòng chọn lĩnh vực dự án.");
        }

        if (!data.startup_stage) {
          throw new Error("Vui lòng chọn giai đoạn của dự án/Startup.");
        }
      }
      if (!hasProject) {
        data.project_name = null;
        data.project_field = null;
        data.startup_stage = null;
        data.project_description = null;
        data.female_founder = null;
        data.team_size = null;
        data.incubation_status = null;
      }
      if (
        data.program_selection_status === undefined ||
        data.program_selection_status === null ||
        data.program_selection_status === ""
      ) {
        throw new Error(
          "Vui lòng cho biết tình trạng tuyển chọn vào chương trình ươm tạo/tăng tốc.",
        );
      }
      // ============================
      // Chuẩn hóa dữ liệu
      // NOTE:
      // Loại bỏ khoảng trắng.
      // Email luôn lưu chữ thường.
      // ============================
      data.fullname = String(data.fullname || "").trim();

      data.phone = String(data.phone || "").replace(/\D/g, "");

      data.email = String(data.email || "")
        .trim()
        .toLowerCase();

      // ============================
      // Validate Email
      // ============================

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(data.email)) {
        throw new Error("Email không hợp lệ.");
      }

      // ============================
      // Validate Phone
      // ============================

      const phoneRegex = /^0[0-9]{9}$/;

      if (!phoneRegex.test(data.phone)) {
        throw new Error(
          "Số điện thoại không hợp lệ. Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.",
        );
      }

      // Bắt đầu Transaction
      await connection.beginTransaction();

      // ============================
      // 2. Kiểm tra lớp học
      // ============================

      const [classes] = await connection.query(
        `
                  SELECT *
                  FROM course_classes
                  WHERE id = ?
                  FOR UPDATE
                  `,
        [data.class_id],
      );

      if (classes.length === 0) {
        throw new Error("Lớp học không tồn tại.");
      }

      const courseClass = classes[0];
      const firstSession = await CourseClassModel.getFirstSession(
        connection,
        data.class_id,
      );
      const lastSession = await CourseClassModel.getLastSession(
        connection,
        data.class_id,
      );
      const effectiveStatus = ClassStatusService.resolveEffectiveStatus({
        status: courseClass.status,

        currentStudents: courseClass.current_students,

        maxStudents: courseClass.max_students,

        registerClose: courseClass.register_close,

        firstSessionAt: firstSession?.first_session_at,

        lastSessionAt: lastSession?.last_session_at,
      });
      // ============================
      // 3. Kiểm tra trạng thái thực tế
      // ============================

      if (effectiveStatus === "CLOSED") {
        throw new Error("Lớp học đã đóng đăng ký.");
      }

      if (effectiveStatus === "FINISHED") {
        throw new Error("Lớp học đã kết thúc.");
      }

      if (effectiveStatus === "FULL") {
        throw new Error("Lớp học đã đủ số lượng học viên.");
      }
      // ============================
      // 4. Kiểm tra thời gian đăng ký
      // ============================

      const now = new Date();

      if (
        courseClass.register_open &&
        now < new Date(courseClass.register_open)
      ) {
        throw new Error("Chưa đến thời gian đăng ký.");
      }

      // ============================
      // 6. Kiểm tra và nhận diện học viên
      // ============================

      const userByEmail = await UserModel.findByEmail(data.email);
      const userByPhone = await UserModel.findByPhone(data.phone);

      let userId;
      let notificationEmail;
      let notificationName;

      // ============================
      // Ưu tiên nhận diện theo số điện thoại
      // ============================

      if (userByPhone) {
        userId = userByPhone.id;

        if (userByEmail && Number(userByEmail.id) !== Number(userByPhone.id)) {
          throw new Error(
            "Email đã được sử dụng bởi một hồ sơ khác. Vui lòng kiểm tra lại thông tin.",
          );
        }

        await UserModel.updateProfile(userId, data);

        if (
          data.email &&
          String(userByPhone.email || "").toLowerCase() !== data.email
        ) {
          await UserModel.updatePrimaryEmail(userId, data.email);
        }

        notificationEmail = data.email;
        notificationName = data.fullname;
      }

      // ============================
      // Số điện thoại mới nhưng email đã thuộc hồ sơ khác
      // ============================
      else if (userByEmail) {
        throw new Error(
          "Email đã tồn tại với một số điện thoại khác. Vui lòng kiểm tra lại thông tin.",
        );
      }

      // ============================
      // Cả phone và email đều chưa tồn tại
      // ============================
      else {
        userId = await UserModel.create(data);

        notificationEmail = data.email;

        notificationName = data.fullname;
      }
      // ============================
      // 7. Kiểm tra đã đăng ký chưa
      // ============================

      const registered = await RegistrationModel.checkRegistered(
        connection,

        userId,

        data.class_id,
      );

      if (registered) {
        throw new Error("Bạn đã đăng ký lớp này.");
      }

      // ============================
      // 8. Tạo QR token
      // ============================

      const qrToken = generateQrToken();

      // ============================
      // 9. Tạo Registration
      // ============================

      const registrationId = await RegistrationModel.create(connection, {
        ...data,
        user_id: userId,
        qr_token: qrToken,
      });
      // ============================
      // 9. Tăng số lượng học viên
      // ============================

      await connection.query(
        `
                  UPDATE course_classes

                  SET current_students =
                      current_students + 1

                  WHERE id=?
                  `,

        [data.class_id],
      );

      // ============================
      // 10. Kiểm tra lớp đã FULL chưa
      // ============================

      const [[updatedClass]] = await connection.query(
        `
                      SELECT

                      current_students,

                      max_students

                      FROM course_classes

                      WHERE id=?
                      `,

        [data.class_id],
      );

      let classStatus = "OPEN";

      if (updatedClass.current_students >= updatedClass.max_students) {
        await connection.query(
          `
                      UPDATE course_classes

                      SET status='FULL'

                      WHERE id=?
                      `,

          [data.class_id],
        );

        classStatus = "FULL";
      }

      // ============================
      // 11. Commit Transaction
      // ============================

      await connection.commit();

      let emailSent = false;

      try {
        const emailResult = await EmailService.sendRegisterMail(
          notificationEmail,
          data.fullname,
          courseClass.class_name,
          qrToken,
        );

        emailSent = true;

        await EmailLogModel.create({
          registration_id: registrationId,
          email: notificationEmail,
          subject: emailResult.subject,
          content: emailResult.html,
          status: "SUCCESS",
        });
      } catch (err) {
        console.error("Send mail error:", err);
      }
      try {
        await NotificationModel.create({
          type: "NEW_REGISTER",

          title: "Có học viên mới đăng ký",

          message: `${notificationName} vừa đăng ký lớp ${courseClass.class_name}`,

          reference_id: registrationId,

          registration_id: registrationId,

          class_id: data.class_id,
        });
      } catch (error) {
        console.error("Create notification error:", error);
      }

      // ============================
      // 12. Sau này gửi Email
      // ============================

      // await EmailService.sendRegistration(...);

      // ============================
      // 13. Trả dữ liệu
      // ============================

      return {
        registrationId,
        userId,
        classStatus,
        registerStatus: "CONFIRMED",
        notificationEmail,
        emailSent,
      };
    } catch (error) {
      // ============================
      // Rollback Transaction
      //
      // NOTE:
      //
      // Nếu đang có Transaction
      // thì rollback.
      //
      // Sau đó ném lỗi về Controller.
      // ============================

      await connection.rollback();

      throw error;
    } finally {
      // Luôn trả connection về pool

      connection.release();
    }
  }
  // ============================
  // Xác nhận đăng ký
  // ============================

  static async confirm(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const registration = await RegistrationModel.findByIdWithConnection(
        connection,
        id,
      );

      if (!registration) {
        throw new Error("Không tìm thấy hồ sơ.");
      }

      if (registration.register_status === "CONFIRMED") {
        throw new Error("Học viên đã được xác nhận.");
      }

      if (registration.register_status === "CANCELLED") {
        throw new Error("Đăng ký đã bị hủy.");
      }

      if (registration.register_status === "REJECTED") {
        throw new Error("Không thể xác nhận hồ sơ đã bị từ chối.");
      }

      await RegistrationModel.confirm(connection, id);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  // ============================
  // Từ chối đăng ký
  // ============================

  // ============================
  // Từ chối đăng ký
  // Chỉ áp dụng cho hồ sơ PENDING cũ
  // ============================
  static async reject(id, note) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const registration = await RegistrationModel.findByIdWithConnection(
        connection,
        id,
      );

      if (!registration) {
        throw new Error("Không tìm thấy hồ sơ.");
      }

      if (registration.register_status === "REJECTED") {
        throw new Error("Hồ sơ đã bị từ chối.");
      }

      if (registration.register_status === "CANCELLED") {
        throw new Error("Đăng ký đã bị hủy.");
      }

      if (registration.register_status === "CONFIRMED") {
        throw new Error(
          "Hồ sơ đã xác nhận. Vui lòng sử dụng chức năng hủy đăng ký.",
        );
      }

      await RegistrationModel.reject(connection, id, note);

      // Registration được tính sĩ số ngay khi tạo,
      // nên từ chối hồ sơ PENDING phải giảm lại 1.
      await connection.query(
        `
        UPDATE course_classes

        SET current_students =
          GREATEST(current_students - 1, 0)

        WHERE id = ?
      `,
        [registration.class_id],
      );

      // Nếu trước đó lớp FULL, sau khi giảm thì mở lại.
      await this.refreshClassStatus(connection, registration.class_id);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // ============================
  // Hủy đăng ký
  // ============================
  static async cancel(id, note) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const registration = await RegistrationModel.findByIdWithConnection(
        connection,
        id,
      );

      if (!registration) {
        throw new Error("Không tìm thấy hồ sơ.");
      }

      if (registration.register_status === "CANCELLED") {
        throw new Error("Đăng ký đã được hủy.");
      }

      if (registration.register_status === "REJECTED") {
        throw new Error("Không thể hủy hồ sơ đã bị từ chối.");
      }

      await RegistrationModel.cancel(connection, id, note);

      await connection.query(
        `
        UPDATE course_classes

        SET current_students =
          GREATEST(current_students - 1, 0)

        WHERE id = ?
      `,
        [registration.class_id],
      );

      await this.refreshClassStatus(connection, registration.class_id);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // ============================
  // Checkin học viên
  // ============================

  static async checkin(id) {
    const registration = await RegistrationModel.findById(id);

    if (!registration) {
      throw new Error("Không tìm thấy hồ sơ.");
    }

    if (registration.register_status !== "CONFIRMED") {
      throw new Error("Chỉ học viên đã xác nhận mới được checkin.");
    }

    if (registration.checked_in) {
      throw new Error("Học viên đã checkin.");
    }

    await RegistrationModel.checkin(id);
  }
}

module.exports = RegistrationService;
