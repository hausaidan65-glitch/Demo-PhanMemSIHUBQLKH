const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const AdminModel = require("../models/adminModel");

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // ==========================
      // Validate
      // ==========================

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tài khoản và mật khẩu.",
        });
      }

      // ==========================
      // Tìm Admin
      // ==========================

      const admin = await AdminModel.findByUsername(username);

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Sai tài khoản hoặc mật khẩu.",
        });
      }

      // ==========================
      // Kiểm tra Password
      // ==========================

      const match = await bcrypt.compare(password, admin.password);

      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Sai tài khoản hoặc mật khẩu.",
        });
      }

      // ==========================
      // Update Last Login
      // ==========================

      await AdminModel.updateLastLogin(admin.id);

      // ==========================
      // Sinh JWT
      // ==========================

      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          role: admin.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        },
      );

      // ==========================
      // Response
      // ==========================

      res.json({
        success: true,
        message: "Đăng nhập thành công.",

        token,

        admin: {
          id: admin.id,
          fullname: admin.fullname,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          avatar: admin.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = AuthController;
