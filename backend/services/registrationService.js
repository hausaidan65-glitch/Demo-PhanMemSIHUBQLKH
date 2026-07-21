const db = require("../config/db");

const UserModel = require("../models/userModel");
const RegistrationModel = require("../models/registrationModel");

// ============================
// Email
// NOTE:
// Không require trong function.
// NodeJS chỉ load module một lần.
// ============================

const EmailService = require("./emailService");
const EmailLogModel = require("../models/emailLogModel");

class RegistrationService {
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
      // ============================
      // Chuẩn hóa dữ liệu
      // NOTE:
      // Loại bỏ khoảng trắng.
      // Email luôn lưu chữ thường.
      // ============================

      data.fullname = data.fullname.trim();

      data.phone = data.phone.trim();

      data.email = data.email.trim().toLowerCase();

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

      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

      if (!phoneRegex.test(data.phone)) {
        throw new Error("Số điện thoại không hợp lệ.");
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
                  `,
        [data.class_id],
      );

      if (classes.length === 0) {
        throw new Error("Lớp học không tồn tại.");
      }

      const courseClass = classes[0];

      // ============================
      // 3. Kiểm tra trạng thái lớp
      // ============================

      if (courseClass.status === "CLOSED") {
        throw new Error("Lớp học đã đóng.");
      }

      if (courseClass.status === "FINISHED") {
        throw new Error("Lớp học đã kết thúc.");
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

      if (
        courseClass.register_close &&
        now > new Date(courseClass.register_close)
      ) {
        throw new Error("Đã hết thời gian đăng ký.");
      }

      // ============================
      // 5. Kiểm tra lớp còn chỗ không
      // ============================

      if (courseClass.current_students >= courseClass.max_students) {
        throw new Error("Lớp học đã đầy.");
      }

      // ============================
      // 6. Kiểm tra User
      // ============================

      let user = await UserModel.findByEmailOrPhone(
        connection,

        data.email,

        data.phone,
      );

      let userId;

      // Nếu chưa có thì tạo mới

      if (!user) {
        userId = await UserModel.create(
          connection,

          data,
        );
      } else {
        userId = user.id;
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
      // 8. Tạo Registration
      // ============================

      const registrationId = await RegistrationModel.create(
        connection,

        {
          ...data,

          user_id: userId,
        },
      );

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

      try {
        const emailResult = await EmailService.sendRegisterMail(
          data.email,
          data.fullname,
          courseClass.class_name,
        );

        await EmailLogModel.create({
          registration_id: registrationId,

          receiver_email: data.email,

          email_type: "REGISTER_SUCCESS",

          subject: emailResult.subject,

          content: emailResult.html,

          status: "SUCCESS",
        });
      } catch (err) {
        console.error("Send mail error:", err);
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

        classStatus,
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

      const registration = await RegistrationModel.findById(connection, id);

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

  static async reject(id, note) {
    const connection = await db.getConnection();

    try {
      // ============================
      // Transaction
      // ============================

      await connection.beginTransaction();

      const registration = await RegistrationModel.findById(connection, id);

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
        throw new Error("Không thể từ chối hồ sơ đã xác nhận.");
      }

      // ============================
      // Cập nhật trạng thái
      // ============================

      await RegistrationModel.reject(connection, id, note);

      // ============================
      // Giảm số lượng học viên
      // Vì khi đăng ký đã tăng +1
      // ============================

      await connection.query(
        `
        UPDATE course_classes
        SET current_students = current_students - 1
        WHERE id = ?
        `,
        [registration.class_id],
      );

      // ============================
      // Nếu lớp đang FULL thì mở lại
      // ============================

      const [[courseClass]] = await connection.query(
        `
        SELECT
            current_students,
            max_students,
            status
        FROM course_classes
        WHERE id = ?
        `,
        [registration.class_id],
      );

      if (
        courseClass.status === "FULL" &&
        courseClass.current_students < courseClass.max_students
      ) {
        await connection.query(
          `
          UPDATE course_classes
          SET status='OPEN'
          WHERE id=?
          `,
          [registration.class_id],
        );
      }

      // ============================
      // Commit
      // ============================

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
  // ============================
  // Hủy đăng ký
  // ============================

  static async cancel(id, note) {
    const connection = await db.getConnection();

    try {
      // ============================
      // Transaction
      // ============================

      await connection.beginTransaction();

      const registration = await RegistrationModel.findById(connection, id);

      if (!registration) {
        throw new Error("Không tìm thấy hồ sơ.");
      }

      if (registration.register_status === "CANCELLED") {
        throw new Error("Đăng ký đã được hủy.");
      }

      // ============================
      // Hủy đăng ký
      // ============================

      await RegistrationModel.cancel(connection, id, note);

      // ============================
      // Giảm số lượng học viên
      // ============================

      await connection.query(
        `
        UPDATE course_classes
        SET current_students = current_students - 1
        WHERE id = ?
        `,
        [registration.class_id],
      );

      // ============================
      // Nếu lớp FULL thì mở lại
      // ============================

      const [[courseClass]] = await connection.query(
        `
        SELECT
            current_students,
            max_students,
            status
        FROM course_classes
        WHERE id = ?
        `,
        [registration.class_id],
      );

      if (
        courseClass.status === "FULL" &&
        courseClass.current_students < courseClass.max_students
      ) {
        await connection.query(
          `
          UPDATE course_classes
          SET status='OPEN'
          WHERE id=?
          `,
          [registration.class_id],
        );
      }

      // ============================

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
