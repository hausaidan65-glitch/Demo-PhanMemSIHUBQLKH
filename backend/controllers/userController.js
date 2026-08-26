const UserModel = require("../models/userModel");
function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function maskEmail(email = "") {
  const [username, domain] = String(email).split("@");

  if (!username || !domain) {
    return "";
  }

  const firstCharacter = username.charAt(0);

  return `${firstCharacter}${"*".repeat(
    Math.max(username.length - 1, 3),
  )}@${domain}`;
}
class UserController {
  // ============================
  // Danh sách học viên
  // ============================

  // ============================
  // Danh sách học viên
  // ============================

  static async index(req, res) {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);

      const requestedLimit = Number(req.query.limit) || 10;

      const limit = Math.min(Math.max(requestedLimit, 1), 100);

      const [data, total] = await Promise.all([
        UserModel.getAll({
          ...req.query,
          page,
          limit,
        }),

        UserModel.countAll(req.query),
      ]);

      return res.json({
        success: true,

        total,

        page,

        limit,

        total_pages: total === 0 ? 1 : Math.ceil(total / limit),

        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách học viên:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách học viên.",
      });
    }
  }
  // ============================
  // Chi tiết học viên
  // ============================

  static async show(req, res) {
    try {
      const data = await UserModel.getById(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,

          message: "Không tìm thấy học viên.",
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
  // Kiểm tra hồ sơ học viên cũ
  // ============================
  static async resolveIdentity(req, res) {
    try {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const phone = normalizePhone(req.body.phone);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập email.",
        });
      }

      /*
       * Tìm cả email và số điện thoại để phát hiện
       * trường hợp dữ liệu thuộc hai user khác nhau.
       */
      const [userByEmail, userByPhone] = await Promise.all([
        UserModel.findByEmail(email),
        phone ? UserModel.findByPhone(phone) : null,
      ]);

      // ============================
      // Email và phone thuộc 2 người khác nhau
      // ============================
      if (userByEmail && userByPhone && userByEmail.id !== userByPhone.id) {
        return res.status(409).json({
          success: false,
          code: "IDENTITY_CONFLICT",
          message:
            "Email và số điện thoại đang thuộc hai hồ sơ khác nhau. Vui lòng kiểm tra lại.",
        });
      }

      // ============================
      // Email đã tồn tại
      // ============================
      if (userByEmail) {
        /*
         * Nếu người dùng đã nhập phone nhưng phone
         * không giống hồ sơ email thì báo xung đột.
         */
        if (phone && normalizePhone(userByEmail.phone) !== phone) {
          return res.status(409).json({
            success: false,
            code: "EMAIL_PHONE_MISMATCH",
            message:
              "Email đã tồn tại nhưng số điện thoại không khớp với hồ sơ.",
          });
        }

        return res.json({
          success: true,
          match_type: "EMAIL",
          is_existing_user: true,
          message: `Đã tìm thấy hồ sơ của ${userByEmail.fullname}.`,
          data: userByEmail,
        });
      }

      // ============================
      // Chưa nhập phone
      // ============================
      if (!phone) {
        return res.json({
          success: true,
          match_type: "EMAIL_NOT_FOUND",
          requires_phone: true,
          message:
            "Email chưa từng đăng ký. Vui lòng nhập số điện thoại để kiểm tra hồ sơ.",
        });
      }

      // ============================
      // Email mới nhưng phone đã tồn tại
      // ============================
      if (userByPhone) {
        return res.json({
          success: true,
          match_type: "PHONE",
          is_existing_user: true,
          requires_email_confirmation: true,

          message:
            "Số điện thoại này đã có hồ sơ. Vui lòng xác nhận email nhận thông báo.",

          data: {
            id: userByPhone.id,
            fullname: userByPhone.fullname,
            phone: userByPhone.phone,
            masked_email: maskEmail(userByPhone.email),
            gender: userByPhone.gender,
            age_group: userByPhone.age_group,
            company: userByPhone.company,
            position: userByPhone.position,
            user_type: userByPhone.user_type,
          },
        });
      }

      // ============================
      // User hoàn toàn mới
      // ============================
      return res.json({
        success: true,
        match_type: "NEW_USER",
        is_existing_user: false,
        message: "Không tìm thấy hồ sơ cũ. Bạn có thể tiếp tục tạo hồ sơ mới.",
      });
    } catch (error) {
      console.error("Lỗi kiểm tra hồ sơ học viên:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể kiểm tra hồ sơ học viên.",
      });
    }
  }
  // ============================
  // Cập nhật email nhận thông báo
  // ============================
  static async updatePrimaryEmail(req, res) {
    try {
      const userId = Number(req.params.id);

      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const phone = normalizePhone(req.body.phone);

      if (!userId || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp đầy đủ email và số điện thoại.",
        });
      }

      /*
       * Kiểm tra số điện thoại có thật sự
       * thuộc user đang cập nhật không.
       */
      const userByPhone = await UserModel.findByPhone(phone);

      if (!userByPhone || userByPhone.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại không khớp với hồ sơ học viên.",
        });
      }

      /*
       * Không cho lấy email đã thuộc user khác.
       */
      const emailOwner = await UserModel.findByEmail(email);

      if (emailOwner && emailOwner.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Email này đã được sử dụng bởi một hồ sơ khác.",
        });
      }

      await UserModel.updatePrimaryEmail(userId, email);

      return res.json({
        success: true,
        message: "Đã cập nhật email nhận thông báo thành công.",
      });
    } catch (error) {
      console.error("Lỗi cập nhật email:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật email.",
      });
    }
  }
  // ============================
  // Thống kê học viên
  // ============================
  static async statistics(req, res) {
    try {
      const data = await UserModel.statistics();

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
}

module.exports = UserController;
