class ScopeMiddleware {
  static allow(...requiredScopes) {
    return (req, res, next) => {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: "Chưa đăng nhập quản trị.",
        });
      }

      // SUPER_ADMIN được toàn quyền
      if (req.admin.role === "SUPER_ADMIN") {
        return next();
      }

      // Các tài khoản còn lại phải là ADMIN
      if (req.admin.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Tài khoản không có quyền quản trị.",
        });
      }

      const scopes = Array.isArray(req.admin.scopes) ? req.admin.scopes : [];

      const allowed = requiredScopes.some((scope) => scopes.includes(scope));

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Bạn không được phân quyền quản lý chức năng này.",
        });
      }

      next();
    };
  }
}

module.exports = ScopeMiddleware;
