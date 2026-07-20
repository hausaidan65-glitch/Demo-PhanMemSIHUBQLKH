class RoleMiddleware {
  static allow(...roles) {
    return (req, res, next) => {
      if (!req.admin) {
        return res.status(401).json({
          success: false,

          message: "Chưa đăng nhập.",
        });
      }

      if (!roles.includes(req.admin.role)) {
        return res.status(403).json({
          success: false,

          message: "Bạn không có quyền truy cập.",
        });
      }

      next();
    };
  }
}

module.exports = RoleMiddleware;
