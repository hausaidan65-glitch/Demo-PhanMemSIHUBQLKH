const MissionModel = require("../models/missionModel");
const AdminActivityLogModel = require("../models/adminActivityLogModel");

const ALLOWED_SOURCES = ["A", "B"];
const ALLOWED_STATUSES = ["ACTIVE", "INACTIVE"];

function errorResponse(res, status, code, message) {
  return res.status(status).json({ success: false, code, message });
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function unknownFields(body, allowedFields) {
  return Object.keys(body || {}).filter((key) => !allowedFields.includes(key));
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return null;
  const description = value.trim();
  return description || null;
}

function isValidDescription(value) {
  return value === undefined || value === null || typeof value === "string";
}

function validateCreateBody(body = {}) {
  const unknown = unknownFields(body, [
    "mission_name",
    "mission_source",
    "description",
    "status",
  ]);
  if (unknown.length) return `Trường không được hỗ trợ: ${unknown.join(", ")}.`;

  const missionName = typeof body.mission_name === "string"
    ? body.mission_name.trim()
    : "";
  if (!missionName) return "mission_name là bắt buộc.";
  if (missionName.length > 255) return "mission_name không được vượt quá 255 ký tự.";

  const missionSource = typeof body.mission_source === "string"
    ? body.mission_source.trim().toUpperCase()
    : "";
  if (!ALLOWED_SOURCES.includes(missionSource)) {
    return "mission_source phải là A hoặc B.";
  }

  if (!isValidDescription(body.description)) {
    return "description phải là chuỗi, null hoặc không được truyền.";
  }

  const status = body.status === undefined
    ? "ACTIVE"
    : typeof body.status === "string"
      ? body.status.trim().toUpperCase()
      : "";
  if (!ALLOWED_STATUSES.includes(status)) {
    return "status phải là ACTIVE hoặc INACTIVE.";
  }

  return null;
}

function createData(body) {
  return {
    mission_name: body.mission_name.trim(),
    mission_source: body.mission_source.trim().toUpperCase(),
    description: normalizeDescription(body.description),
    status: body.status === undefined
      ? "ACTIVE"
      : body.status.trim().toUpperCase(),
  };
}

async function writeAdminActivityLog(req, data) {
  try {
    await AdminActivityLogModel.create({
      admin_id: Number(req.admin?.id) || null,
      admin_username: req.admin?.username || null,
      admin_role: req.admin?.role || null,
      action: data.action,
      entity_type: "MISSION",
      entity_id: data.entity_id,
      entity_name: data.entity_name,
      old_data: data.old_data || null,
      new_data: data.new_data || null,
      ip_address: req.ip || null,
      user_agent: req.get("user-agent") || null,
    });
  } catch (error) {
    console.error("Lỗi ghi nhật ký hoạt động Mission:", error);
  }
}

class MissionController {
  static async index(req, res) {
    try {
      const unknown = unknownFields(req.query, [
        "keyword",
        "mission_source",
        "status",
      ]);
      if (unknown.length) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          `Tham số không được hỗ trợ: ${unknown.join(", ")}.`,
        );
      }

      const keyword = String(req.query.keyword || "").trim();
      const missionSource = String(req.query.mission_source || "")
        .trim()
        .toUpperCase();
      const status = String(req.query.status || "").trim().toUpperCase();

      if (missionSource && !ALLOWED_SOURCES.includes(missionSource)) {
        return errorResponse(res, 400, "VALIDATION_ERROR", "mission_source phải là A hoặc B.");
      }
      if (status && !ALLOWED_STATUSES.includes(status)) {
        return errorResponse(res, 400, "VALIDATION_ERROR", "status phải là ACTIVE hoặc INACTIVE.");
      }

      const data = await MissionModel.getAll({
        keyword,
        mission_source: missionSource,
        status,
      });
      return res.status(200).json({ success: true, total: data.length, data });
    } catch (error) {
      console.error("Lỗi lấy danh sách nhiệm vụ:", error);
      return errorResponse(res, 500, "INTERNAL_ERROR", "Không thể tải danh sách nhiệm vụ.");
    }
  }

  static async show(req, res) {
    try {
      const id = parseId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_ID", "ID nhiệm vụ không hợp lệ.");

      const mission = await MissionModel.findById(id);
      if (!mission) return errorResponse(res, 404, "MISSION_NOT_FOUND", "Không tìm thấy nhiệm vụ.");

      return res.status(200).json({ success: true, data: mission });
    } catch (error) {
      console.error("Lỗi lấy chi tiết nhiệm vụ:", error);
      return errorResponse(res, 500, "INTERNAL_ERROR", "Không thể tải thông tin nhiệm vụ.");
    }
  }

  static async store(req, res) {
    try {
      const validationError = validateCreateBody(req.body);
      if (validationError) return errorResponse(res, 400, "VALIDATION_ERROR", validationError);

      const data = createData(req.body);
      const id = await MissionModel.create(data);
      const created = await MissionModel.findById(id);
      await writeAdminActivityLog(req, {
        action: "CREATE",
        entity_id: id,
        entity_name: created.mission_name,
        new_data: created,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo nhiệm vụ thành công.",
        data: created,
      });
    } catch (error) {
      console.error("Lỗi tạo nhiệm vụ:", error);
      return errorResponse(res, 500, "INTERNAL_ERROR", "Không thể tạo nhiệm vụ.");
    }
  }

  static async update(req, res) {
    try {
      const id = parseId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_ID", "ID nhiệm vụ không hợp lệ.");

      if (Object.prototype.hasOwnProperty.call(req.body || {}, "status")) {
        return errorResponse(
          res,
          400,
          "STATUS_UPDATE_NOT_ALLOWED",
          "Trạng thái chỉ được cập nhật qua endpoint /:id/status.",
        );
      }

      const validationError = validateCreateBody({ ...req.body, status: "ACTIVE" });
      if (validationError) return errorResponse(res, 400, "VALIDATION_ERROR", validationError);

      const existing = await MissionModel.findById(id);
      if (!existing) return errorResponse(res, 404, "MISSION_NOT_FOUND", "Không tìm thấy nhiệm vụ.");

      const data = createData({ ...req.body, status: existing.status });
      if (data.mission_source !== existing.mission_source) {
        const totalLinks = await MissionModel.countActivityLinks(id);
        if (totalLinks > 0) {
          return errorResponse(
            res,
            409,
            "MISSION_SOURCE_LOCKED",
            "Không thể đổi nhóm A/B vì nhiệm vụ đang được liên kết với hoạt động.",
          );
        }
      }

      await MissionModel.updateInfo(id, data);
      const updated = await MissionModel.findById(id);
      await writeAdminActivityLog(req, {
        action: "UPDATE",
        entity_id: id,
        entity_name: updated.mission_name,
        old_data: existing,
        new_data: updated,
      });

      return res.status(200).json({
        success: true,
        message: "Cập nhật nhiệm vụ thành công.",
        data: updated,
      });
    } catch (error) {
      console.error("Lỗi cập nhật nhiệm vụ:", error);
      return errorResponse(res, 500, "INTERNAL_ERROR", "Không thể cập nhật nhiệm vụ.");
    }
  }

  static async changeStatus(req, res) {
    try {
      const id = parseId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_ID", "ID nhiệm vụ không hợp lệ.");

      const unknown = unknownFields(req.body, ["status"]);
      const status = typeof req.body?.status === "string"
        ? req.body.status.trim().toUpperCase()
        : "";
      if (unknown.length || !ALLOWED_STATUSES.includes(status)) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          unknown.length
            ? `Trường không được hỗ trợ: ${unknown.join(", ")}.`
            : "status phải là ACTIVE hoặc INACTIVE.",
        );
      }

      const existing = await MissionModel.findById(id);
      if (!existing) return errorResponse(res, 404, "MISSION_NOT_FOUND", "Không tìm thấy nhiệm vụ.");

      await MissionModel.updateStatus(id, status);
      const updated = await MissionModel.findById(id);
      await writeAdminActivityLog(req, {
        action: "STATUS_CHANGE",
        entity_id: id,
        entity_name: updated.mission_name,
        old_data: existing,
        new_data: updated,
      });

      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái nhiệm vụ thành công.",
        data: updated,
      });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái nhiệm vụ:", error);
      return errorResponse(res, 500, "INTERNAL_ERROR", "Không thể cập nhật trạng thái nhiệm vụ.");
    }
  }
}

MissionController._test = {
  createData,
  isValidDescription,
  normalizeDescription,
  parseId,
  unknownFields,
  validateCreateBody,
};

module.exports = MissionController;
