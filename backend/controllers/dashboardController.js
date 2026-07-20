const DashboardModel = require("../models/dashboardModel");

class DashboardController {
  static async dashboard(req, res) {
    try {
      const data = await DashboardModel.getStatistics();

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

module.exports = DashboardController;
