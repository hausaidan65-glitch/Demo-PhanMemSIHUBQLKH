const Category = require("../models/categoryModel");

class CategoryController {
  // GET
  static async index(req, res) {
    try {
      const data = await Category.getAll();

      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET BY ID
  static async show(req, res) {
    try {
      const id = req.params.id;

      const data = await Category.getById(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy danh mục",
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

  // POST
  static async store(req, res) {
    try {
      const result = await Category.create(req.body);

      res.status(201).json({
        success: true,
        message: "Thêm danh mục thành công",
        id: result.insertId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT
  static async update(req, res) {
    try {
      const id = req.params.id;

      await Category.update(id, req.body);

      res.json({
        success: true,
        message: "Cập nhật thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE
  static async destroy(req, res) {
    try {
      const id = req.params.id;

      await Category.delete(id);

      res.json({
        success: true,
        message: "Xóa thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = CategoryController;
