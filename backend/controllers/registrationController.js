const RegistrationService = require("../services/registrationService");

class RegistrationController {
  static async register(req, res) {
    try {
      const id = await RegistrationService.register(req.body);

      res.json({
        success: true,

        registration_id: id,

        message: "Đăng ký thành công.",
      });
    } catch (error) {
      res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  }
}

module.exports = RegistrationController;
