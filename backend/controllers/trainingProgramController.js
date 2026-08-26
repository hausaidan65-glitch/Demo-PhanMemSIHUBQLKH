const TrainingProgramModel = require("../models/trainingProgramModel");

class TrainingProgramController {
  static async getTree(req, res) {
    try {
      const data = await TrainingProgramModel.getTree();

      res.json({
        success: true,

        total: data.length,

        data,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,

        message: "Lỗi lấy dữ liệu chương trình",
      });
    }
  }
  static async getAll(req, res) {
    try {
      const data = await TrainingProgramModel.getAll();

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải danh sách chương trình.",
      });
    }
  }

  static async getById(req, res) {
    try {
      const program = await TrainingProgramModel.findById(req.params.id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chương trình.",
        });
      }

      return res.json({
        success: true,
        data: program,
      });
    } catch (error) {
      console.error("Lỗi lấy chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tải thông tin chương trình.",
      });
    }
  }

  static async create(req, res) {
    try {
      const programName = String(req.body.program_name || "").trim();
      const description = String(req.body.description || "").trim();
      const status = req.body.status || "ACTIVE";

      if (!programName) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên chương trình.",
        });
      }

      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái chương trình không hợp lệ.",
        });
      }

      const duplicated = await TrainingProgramModel.findByName(programName);

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Tên chương trình đã tồn tại.",
        });
      }

      const id = await TrainingProgramModel.create({
        program_name: programName,
        description,
        status,
      });

      const createdProgram = await TrainingProgramModel.findById(id);

      return res.status(201).json({
        success: true,
        message: "Thêm chương trình thành công.",
        data: createdProgram,
      });
    } catch (error) {
      console.error("Lỗi thêm chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể thêm chương trình.",
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);
      const programName = String(req.body.program_name || "").trim();
      const description = String(req.body.description || "").trim();
      const status = req.body.status || "ACTIVE";

      const existed = await TrainingProgramModel.findById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chương trình.",
        });
      }

      if (!programName) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập tên chương trình.",
        });
      }

      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái chương trình không hợp lệ.",
        });
      }

      const duplicated = await TrainingProgramModel.findByName(programName, id);

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Tên chương trình đã tồn tại.",
        });
      }

      await TrainingProgramModel.update(id, {
        program_name: programName,
        description,
        status,
      });

      const updatedProgram = await TrainingProgramModel.findById(id);

      return res.json({
        success: true,
        message: "Cập nhật chương trình thành công.",
        data: updatedProgram,
      });
    } catch (error) {
      console.error("Lỗi cập nhật chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật chương trình.",
      });
    }
  }

  static async remove(req, res) {
    try {
      const id = Number(req.params.id);

      const existed = await TrainingProgramModel.findById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy chương trình.",
        });
      }

      const totalCourses = await TrainingProgramModel.countCourses(id);

      if (totalCourses > 0) {
        return res.status(409).json({
          success: false,
          message:
            `Chương trình đang có ${totalCourses} khóa học. ` +
            "Vui lòng chuyển hoặc xóa các khóa học trước.",
        });
      }

      await TrainingProgramModel.remove(id);

      return res.json({
        success: true,
        message: "Xóa chương trình thành công.",
      });
    } catch (error) {
      console.error("Lỗi xóa chương trình:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xóa chương trình.",
      });
    }
  }
}

module.exports = TrainingProgramController;
