const bcrypt = require("bcrypt");
const AdminModel = require("../models/adminModel");

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN"];

const ALLOWED_STATUSES = ["ACTIVE", "INACTIVE"];

class AdminController {
  // ==========================================
  // LIST
  // ==========================================
  static async index(req, res) {
    try {
      const admins = await AdminModel.getAll();

      res.json({
        success: true,
        total: admins.length,
        data: admins,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==========================================
  // DETAIL
  // ==========================================
  static async show(req, res) {
    try {
      const admin = await AdminModel.findById(req.params.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản quản trị.",
        });
      }

      res.json({
        success: true,
        data: admin,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==========================================
  // CREATE
  // ==========================================
  static async create(req, res) {
    try {
      const { fullname, username, email, password, role } = req.body;

      if (!fullname?.trim() || !username?.trim() || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Họ tên, tài khoản, mật khẩu và role là bắt buộc.",
        });
      }

      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role quản trị không hợp lệ.",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu phải có ít nhất 8 ký tự.",
        });
      }

      const existedUsername = await AdminModel.findByUsernameAnyStatus(
        username.trim(),
      );

      if (existedUsername) {
        return res.status(409).json({
          success: false,
          message: "Tên đăng nhập đã tồn tại.",
        });
      }

      if (email?.trim()) {
        const existedEmail = await AdminModel.findByEmail(email.trim());

        if (existedEmail) {
          return res.status(409).json({
            success: false,
            message: "Email quản trị đã tồn tại.",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const id = await AdminModel.create({
        fullname: fullname.trim(),
        username: username.trim(),
        email: email?.trim() || null,
        password: hashedPassword,
        role,
        status: "ACTIVE",

        // Account do Super Admin tạo:
        // lần đầu đăng nhập phải đổi mật khẩu.
        must_change_password: 1,
      });

      const admin = await AdminModel.findById(id);

      res.status(201).json({
        success: true,
        message: "Tạo tài khoản quản trị thành công.",
        data: admin,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==========================================
  // UPDATE PROFILE + ROLE
  // ==========================================
  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      const admin = await AdminModel.findById(id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản quản trị.",
        });
      }

      const { fullname, email, role, status } = req.body;

      if (!fullname?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Họ và tên không được để trống.",
        });
      }

      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role không hợp lệ.",
        });
      }

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ.",
        });
      }

      // Không cho Super Admin tự hạ quyền hoặc khóa chính mình.
      if (
        id === Number(req.admin.id) &&
        (role !== "SUPER_ADMIN" || status !== "ACTIVE")
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Bạn không thể tự hạ quyền hoặc khóa tài khoản đang đăng nhập.",
        });
      }

      if (email?.trim()) {
        const emailOwner = await AdminModel.findByEmail(email.trim());

        if (emailOwner && Number(emailOwner.id) !== id) {
          return res.status(409).json({
            success: false,
            message: "Email đã được tài khoản khác sử dụng.",
          });
        }
      }

      await AdminModel.update(id, {
        fullname: fullname.trim(),
        email: email?.trim() || null,
        role,
        status,
      });

      const updated = await AdminModel.findById(id);

      res.json({
        success: true,
        message: "Cập nhật tài khoản thành công.",
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==========================================
  // CHANGE STATUS
  // ==========================================
  static async changeStatus(req, res) {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ.",
        });
      }

      if (id === Number(req.admin.id) && status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "Bạn không thể tự khóa tài khoản đang đăng nhập.",
        });
      }

      const admin = await AdminModel.findById(id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản quản trị.",
        });
      }

      await AdminModel.updateStatus(id, status);

      res.json({
        success: true,
        message:
          status === "ACTIVE"
            ? "Đã kích hoạt tài khoản."
            : "Đã ngừng hoạt động tài khoản.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==========================================
  // RESET PASSWORD
  // ==========================================
  static async resetPassword(req, res) {
    try {
      const id = Number(req.params.id);
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
        });
      }

      const admin = await AdminModel.findById(id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản quản trị.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await AdminModel.updatePassword(id, hashedPassword, 1);

      res.json({
        success: true,
        message:
          "Reset mật khẩu thành công. Tài khoản sẽ được yêu cầu đổi mật khẩu.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = AdminController;
