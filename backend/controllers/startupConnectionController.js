const ExcelJS = require("exceljs");
const StartupConnectionModel = require("../models/startupConnectionModel");
const ExhibitionSurveyModel = require("../models/exhibitionSurveyModel");
const UserModel = require("../models/userModel");
// =========================================================
// LẤY DANH SÁCH
// =========================================================
exports.getEvents = async (req, res) => {
  try {
    const data = await StartupConnectionModel.getAll(req.query);

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách Startup Connection Day.",
    });
  }
};
// =========================================================
// THỐNG KÊ / BIỂU ĐỒ STARTUP CONNECTION DAY
// =========================================================
exports.getStatistics = async (req, res) => {
  try {
    const data = await StartupConnectionModel.statistics(req.query);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Lỗi thống kê Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu thống kê Startup Connection Day.",
    });
  }
};
// =========================================================
// LẤY CHI TIẾT
// =========================================================
exports.getEventById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    const event = await StartupConnectionModel.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }

    const participants = await StartupConnectionModel.getParticipants(id);

    let surveys = [];

    if (event.event_type === "EXHIBITION") {
      surveys = await ExhibitionSurveyModel.findByEventId(id);
    }

    return res.json({
      success: true,

      data: {
        ...event,

        participants,

        surveys,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết sự kiện.",
    });
  }
};

// =========================================================
// TẠO MỚI
// =========================================================
exports.createEvent = async (req, res) => {
  try {
    const {
      event_name,
      event_type,
      parent_event_id,
      event_code,
      short_description,
      description,
      mission,
      thumbnail,
      location,
      start_datetime,
      end_datetime,
      year,
      organizer,
      max_participants,
      status,
    } = req.body;

    if (!String(event_name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên sự kiện là bắt buộc.",
      });
    }

    const normalizedType = String(event_type || "").toUpperCase();

    if (!["SEMINAR", "EXHIBITION"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Loại sự kiện không hợp lệ.",
      });
    }

    const normalizedStatus = String(status || "OPEN").toUpperCase();

    if (!["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái sự kiện không hợp lệ.",
      });
    }

    if (event_code) {
      const duplicated =
        await StartupConnectionModel.findByEventCode(event_code);

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Mã sự kiện đã tồn tại.",
        });
      }
    }

    let parentEventId = null;

    if (parent_event_id) {
      parentEventId = Number(parent_event_id);

      if (!Number.isInteger(parentEventId) || parentEventId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Triển lãm cha không hợp lệ.",
        });
      }

      const parent =
        await StartupConnectionModel.findExhibitionById(parentEventId);

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Sự kiện cha phải là một triển lãm.",
        });
      }

      if (normalizedType !== "SEMINAR") {
        return res.status(400).json({
          success: false,
          message: "Chỉ Hội thảo mới được phép thuộc một Triển lãm.",
        });
      }
    }

    const id = await StartupConnectionModel.create({
      event_name: String(event_name).trim(),
      event_type: normalizedType,
      parent_event_id: parentEventId,
      event_code: event_code || null,
      short_description: short_description || null,
      description: description || null,
      mission: String(mission || "").trim() || null,
      thumbnail: thumbnail || null,
      location: location || null,
      start_datetime: start_datetime || null,
      end_datetime: end_datetime || null,
      year: Number(year) || null,
      organizer: organizer || null,
      max_participants: Number(max_participants) || 0,
      status: normalizedStatus,
    });

    const created = await StartupConnectionModel.findById(id);

    return res.status(201).json({
      success: true,
      message: "Thêm sự kiện Startup Connection Day thành công.",
      data: created,
    });
  } catch (error) {
    console.error("Lỗi tạo Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo sự kiện Startup Connection Day.",
    });
  }
};

// =========================================================
// CẬP NHẬT
// =========================================================
exports.updateEvent = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    const existing = await StartupConnectionModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }

    const {
      event_name,
      event_type,
      parent_event_id,
      event_code,
      short_description,
      description,
      mission,
      thumbnail,
      location,
      start_datetime,
      end_datetime,
      year,
      organizer,
      max_participants,
      status,
    } = req.body;

    if (!String(event_name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên sự kiện là bắt buộc.",
      });
    }

    const normalizedType = String(event_type || "").toUpperCase();

    if (!["SEMINAR", "EXHIBITION"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Loại sự kiện không hợp lệ.",
      });
    }

    if (event_code) {
      const duplicated = await StartupConnectionModel.findByEventCode(
        event_code,
        id,
      );

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Mã sự kiện đã tồn tại.",
        });
      }
    }

    let parentEventId = null;

    if (parent_event_id) {
      parentEventId = Number(parent_event_id);

      const parent =
        await StartupConnectionModel.findExhibitionById(parentEventId);

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Sự kiện cha phải là một triển lãm.",
        });
      }

      if (normalizedType !== "SEMINAR") {
        return res.status(400).json({
          success: false,
          message: "Chỉ Hội thảo mới được phép thuộc một Triển lãm.",
        });
      }

      if (parentEventId === id) {
        return res.status(400).json({
          success: false,
          message: "Sự kiện không thể là cha của chính nó.",
        });
      }
    }

    const normalizedStatus = String(status || existing.status).toUpperCase();

    if (!["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái sự kiện không hợp lệ.",
      });
    }

    await StartupConnectionModel.update(id, {
      event_name: String(event_name).trim(),
      event_type: normalizedType,
      parent_event_id: parentEventId,
      event_code: event_code || null,
      short_description: short_description || null,
      description: description || null,
      mission: String(mission || "").trim() || null,
      thumbnail: thumbnail || null,
      location: location || null,
      start_datetime: start_datetime || null,
      end_datetime: end_datetime || null,
      year: Number(year) || null,
      organizer: organizer || null,
      max_participants: Number(max_participants) || 0,
      status: normalizedStatus,
    });

    const updated = await StartupConnectionModel.findById(id);

    return res.json({
      success: true,
      message: "Cập nhật sự kiện thành công.",
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi cập nhật Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật sự kiện.",
    });
  }
};
exports.getParticipants = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    const event = await StartupConnectionModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }

    const data = await StartupConnectionModel.getParticipants(eventId);

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy người tham dự Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người tham dự.",
    });
  }
};
// =========================================================
// ĐĂNG KÝ STARTUP CONNECTION DAY - PUBLIC USER
// =========================================================
exports.registerPublic = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const {
      fullname,
      email,
      phone,

      organization,
      position,

      gender,
      age_group,
      user_type,

      has_project,
      project_field,
      startup_stage,

      program_selection_status,
      support_needs,
      organizer_question,
    } = req.body;
    // =====================================================
    // 1. KIỂM TRA ID EVENT
    // =====================================================
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    // =====================================================
    // 2. KIỂM TRA EVENT CÓ TỒN TẠI KHÔNG
    // =====================================================
    const event = await StartupConnectionModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }
    if (String(event.event_type || "").toUpperCase() !== "SEMINAR") {
      return res.status(400).json({
        success: false,
        message: "Biểu mẫu này chỉ áp dụng cho Hội thảo.",
      });
    }

    // =====================================================
    // 3. CHỈ CHO ĐĂNG KÝ EVENT ĐANG OPEN
    // =====================================================
    if (String(event.status || "").toUpperCase() !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Sự kiện hiện không mở đăng ký.",
      });
    }

    // =====================================================
    // 4. VALIDATE THÔNG TIN NGƯỜI ĐĂNG KÝ
    // =====================================================
    const normalizedFullname = String(fullname || "").trim();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    if (!normalizedFullname) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ và tên.",
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ.",
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số điện thoại.",
      });
    }

    if (normalizedPhone.length < 9 || normalizedPhone.length > 11) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ.",
      });
    }
    const normalizedOrganization = String(organization || "").trim();
    const normalizedPosition = String(position || "").trim();

    if (!normalizedOrganization) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đơn vị.",
      });
    }

    if (!normalizedPosition) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập chức vụ.",
      });
    }

    if (!gender) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn giới tính.",
      });
    }

    if (!age_group) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn nhóm tuổi.",
      });
    }
    const normalizedHasProject =
      has_project === true ||
      has_project === 1 ||
      has_project === "1" ||
      has_project === "true";

    if (
      has_project === undefined ||
      has_project === null ||
      has_project === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cho biết bạn có dự án khởi nghiệp hay chưa.",
      });
    }

    if (normalizedHasProject && !String(project_field || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn lĩnh vực dự án.",
      });
    }

    if (normalizedHasProject && !startup_stage) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn giai đoạn dự án.",
      });
    }

    if (!program_selection_status) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cho biết tình trạng tuyển chọn vào chương trình ươm tạo/tăng tốc.",
      });
    }
    // =====================================================
    // 5. VALIDATE VAI TRÒ
    // =====================================================

    const allowedUserTypes = [
      "STARTUP",
      "BUSINESS",
      "STUDENT",
      "UNIVERSITY",
      "OTHER",
    ];

    const normalizedUserType = String(user_type || "").toUpperCase();

    if (!allowedUserTypes.includes(normalizedUserType)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn nhóm đối tượng.",
      });
    }
    // =====================================================
    // 6. KIỂM TRA SỐ LƯỢNG NGƯỜI THAM GIA
    // =====================================================
    const currentParticipants =
      await StartupConnectionModel.countParticipants(eventId);

    const maxParticipants = Number(event.max_participants) || 0;

    if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
      return res.status(409).json({
        success: false,
        message: "Sự kiện đã đủ số lượng người tham gia.",
      });
    }

    // =====================================================
    // 7. TÌM USER BẰNG EMAIL / PHONE
    // =====================================================
    const userByEmail = await UserModel.findByEmail(normalizedEmail);

    const userByPhone = await UserModel.findByPhone(normalizedPhone);

    // Email thuộc user này nhưng phone lại thuộc user khác
    if (
      userByEmail &&
      userByPhone &&
      Number(userByEmail.id) !== Number(userByPhone.id)
    ) {
      return res.status(409).json({
        success: false,
        message: "Email và số điện thoại đang thuộc hai người dùng khác nhau.",
      });
    }

    let user = userByPhone || userByEmail;

    let userId;

    // =====================================================
    // 8. CHƯA CÓ USER -> TẠO USER
    // =====================================================
    if (!user) {
      // ===================================================
      // USER MỚI
      // ===================================================
      userId = await UserModel.create({
        fullname: normalizedFullname,
        email: normalizedEmail,
        phone: normalizedPhone,

        gender,
        age_group,

        company: normalizedOrganization,
        position: normalizedPosition,

        user_type: normalizedUserType,
      });
    } else {
      // ===================================================
      // USER ĐÃ TỒN TẠI
      // ===================================================
      userId = Number(user.id);

      await UserModel.updateProfile(userId, {
        fullname: normalizedFullname,

        gender,
        age_group,

        company: normalizedOrganization,
        position: normalizedPosition,

        user_type: normalizedUserType,
      });
      if (
        normalizedEmail &&
        String(user.email || "").toLowerCase() !== normalizedEmail
      ) {
        const emailOwner = await UserModel.findByEmail(normalizedEmail);

        if (emailOwner && Number(emailOwner.id) !== userId) {
          return res.status(409).json({
            success: false,
            message: "Email đã được sử dụng bởi một hồ sơ khác.",
          });
        }

        await UserModel.updatePrimaryEmail(userId, normalizedEmail);
      }
    }
    // =====================================================
    // 9. KIỂM TRA ĐÃ ĐĂNG KÝ EVENT NÀY CHƯA
    // =====================================================
    const existed = await StartupConnectionModel.findParticipant(
      eventId,
      userId,
    );

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã đăng ký tham gia sự kiện này rồi.",
      });
    }

    // =====================================================
    // 10. THÊM VÀO STARTUP CONNECTION PARTICIPANTS
    // =====================================================
    const participantId = await StartupConnectionModel.addParticipant(eventId, {
      user_id: userId,

      participant_role: normalizedUserType,

      organization: normalizedOrganization,
      position: normalizedPosition,

      has_project: normalizedHasProject,

      project_field: normalizedHasProject
        ? String(project_field || "").trim() || null
        : null,

      startup_stage: normalizedHasProject ? startup_stage || null : null,

      program_selection_status: program_selection_status || null,

      support_needs: String(support_needs || "").trim() || null,

      organizer_question: String(organizer_question || "").trim() || null,

      note: null,

      checked_in: false,
      checked_in_at: null,

      registration_status: "CONFIRMED",
    });

    // =====================================================
    // 11. LẤY LẠI RECORD VỪA TẠO
    // =====================================================
    const participants = await StartupConnectionModel.getParticipants(eventId);

    const created =
      participants.find((item) => Number(item.id) === Number(participantId)) ||
      null;

    return res.status(201).json({
      success: true,

      message: "Đăng ký tham gia sự kiện thành công!",

      data: {
        event: {
          id: event.id,
          event_name: event.event_name,
          event_type: event.event_type,
          start_datetime: event.start_datetime,
          end_datetime: event.end_datetime,
          location: event.location,
        },

        participant: created,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký Startup Connection Day:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email hoặc số điện thoại đã tồn tại trong hệ thống.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu người đăng ký không hợp lệ.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể đăng ký tham gia sự kiện. Vui lòng thử lại.",
    });
  }
};
exports.addParticipant = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const {
      user_id,
      participant_role,
      organization,
      position,
      note,
      checked_in,
      checked_in_at,
      registration_status,
    } = req.body;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    const event = await StartupConnectionModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }

    const userId = Number(user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Học viên/người tham dự không hợp lệ.",
      });
    }

    const existed = await StartupConnectionModel.findParticipant(
      eventId,
      userId,
    );

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Người này đã tham dự sự kiện.",
      });
    }

    const participantId = await StartupConnectionModel.addParticipant(eventId, {
      user_id: userId,
      participant_role,
      organization,
      position,
      note,
      checked_in,
      checked_in_at,
      registration_status,
    });

    const participants = await StartupConnectionModel.getParticipants(eventId);

    const created =
      participants.find((item) => Number(item.id) === Number(participantId)) ||
      null;

    return res.status(201).json({
      success: true,
      message: "Thêm người tham dự thành công.",
      data: created,
    });
  } catch (error) {
    console.error("Lỗi thêm người tham dự Startup Connection Day:", error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy người dùng tương ứng.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể thêm người tham dự.",
    });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const participantId = Number(req.params.participantId);

    const affectedRows = await StartupConnectionModel.removeParticipant(
      eventId,
      participantId,
    );

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người tham dự.",
      });
    }

    return res.json({
      success: true,
      message: "Xóa người tham dự thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa người tham dự Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa người tham dự.",
    });
  }
};

// =========================================================
// XÓA
// =========================================================
exports.deleteEvent = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existing = await StartupConnectionModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện.",
      });
    }

    const result = await StartupConnectionModel.remove(id);

    if (!result.deleted) {
      if (result.reason === "HAS_PARTICIPANTS") {
        return res.status(409).json({
          success: false,
          message: `Sự kiện đang có ${result.total_participants} người tham dự. Không thể xóa.`,
        });
      }

      if (result.reason === "HAS_CHILD_EVENTS") {
        return res.status(409).json({
          success: false,
          message: `Triển lãm đang có ${result.total_child_events} hội thảo bên trong. Không thể xóa.`,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Không thể xóa sự kiện.",
      });
    }

    return res.json({
      success: true,
      message: "Xóa sự kiện thành công.",
      data: {
        id,
        event_name: existing.event_name,
      },
    });
  } catch (error) {
    console.error("Lỗi xóa Startup Connection Day:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa sự kiện.",
    });
  }
};
// =========================================================
// CHUYỂN NETWORKING EVENT -> HỘI THẢO STARTUP CONNECTION DAY
// =========================================================
exports.migrateNetworkingToSeminar = async (req, res) => {
  try {
    const networkingEventId = Number(req.params.networkingEventId);

    const { parent_event_id = null, copy_participants = true } = req.body;

    // =====================================================
    // 1. VALIDATE NETWORKING EVENT ID
    // =====================================================
    if (!Number.isInteger(networkingEventId) || networkingEventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện kết nối không hợp lệ.",
      });
    }

    // =====================================================
    // 2. VALIDATE TRIỂN LÃM CHA NẾU CÓ
    // =====================================================
    let parentEventId = null;

    if (
      parent_event_id !== null &&
      parent_event_id !== undefined &&
      parent_event_id !== ""
    ) {
      parentEventId = Number(parent_event_id);

      if (!Number.isInteger(parentEventId) || parentEventId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID triển lãm cha không hợp lệ.",
        });
      }
    }

    // =====================================================
    // 3. CHUYỂN DỮ LIỆU
    // =====================================================
    const result = await StartupConnectionModel.migrateFromNetworkingEvent(
      networkingEventId,
      {
        parent_event_id: parentEventId,

        copy_participants:
          copy_participants === true ||
          copy_participants === 1 ||
          copy_participants === "1" ||
          copy_participants === "true",
      },
    );

    // =====================================================
    // 4. LẤY EVENT VỪA TẠO
    // =====================================================
    const createdEvent = await StartupConnectionModel.findById(
      result.new_event_id,
    );

    const participants = await StartupConnectionModel.getParticipants(
      result.new_event_id,
    );

    // =====================================================
    // 5. RESPONSE
    // =====================================================
    return res.status(201).json({
      success: true,

      message:
        "Chuyển sự kiện kết nối sang Hội thảo Startup Connection Day thành công.",

      data: {
        source_event_id: result.source_event_id,

        copied_participants: result.copied_participants,

        event: {
          ...createdEvent,
          participants,
        },
      },
    });
  } catch (error) {
    console.error(
      "Lỗi chuyển Networking Event -> Startup Connection Seminar:",
      error,
    );

    if (error.code === "NETWORKING_EVENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối cần chuyển.",
      });
    }

    if (error.code === "INVALID_PARENT_EXHIBITION") {
      return res.status(400).json({
        success: false,
        message:
          "Triển lãm cha không tồn tại hoặc sự kiện được chọn không phải Triển lãm.",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Dữ liệu bị trùng khi chuyển sự kiện.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message:
          "Có dữ liệu người tham dự không hợp lệ hoặc không còn tồn tại.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể chuyển sự kiện sang Startup Connection Day.",
    });
  }
};
// =========================================================
// XUẤT EXCEL STARTUP CONNECTION DAY
//
// KHÔNG thay đổi logic filter.
// Chỉ thay đổi giao diện file Excel.
// =========================================================
exports.exportEvents = async (req, res) => {
  try {
    const rows = await StartupConnectionModel.exportData(req.query);

    const type = String(req.query.type || "").toUpperCase();

    const status = String(req.query.status || "").toUpperCase();

    const year = String(req.query.year || "").trim();

    const month = String(req.query.month || "").trim();

    const keyword = String(req.query.keyword || "").trim();
    const mission = String(req.query.mission || "").trim();
    // =====================================================
    // CHỈ XEM LÀ "CÓ BỘ LỌC" KHI ADMIN THỰC SỰ CHỌN FILTER
    //
    // type KHÔNG tính vì EXHIBITION / SEMINAR là page hiện tại.
    // =====================================================
    const hasFilter = Boolean(status || year || month || keyword || mission);

    // =====================================================
    // TÊN DANH SÁCH
    // =====================================================
    const baseTitle =
      type === "EXHIBITION"
        ? "DANH SÁCH TRIỂN LÃM"
        : type === "SEMINAR"
          ? "DANH SÁCH HỘI THẢO"
          : "DANH SÁCH STARTUP CONNECTION DAY";

    const titleParts = [baseTitle];

    if (month) {
      titleParts.push(`THÁNG ${month}`);
    }

    if (year) {
      titleParts.push(`NĂM ${year}`);
    }

    const title = titleParts.join(" - ");

    // =====================================================
    // TEXT TRẠNG THÁI
    // =====================================================
    const getStatusText = (value) => {
      const labels = {
        OPEN: "Đang mở",
        CLOSED: "Đã đóng",
        FINISHED: "Đã kết thúc",
        DRAFT: "Bản nháp",
      };

      return labels[value] || value || "";
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================
    const formatDateTime = (value) => {
      if (!value) {
        return "";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };

    // =====================================================
    // WORKBOOK
    // =====================================================
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SIHUB";

    workbook.created = new Date();

    const sheetName =
      type === "EXHIBITION"
        ? "Danh sách Triển lãm"
        : type === "SEMINAR"
          ? "Danh sách Hội thảo"
          : "Startup Connection Day";

    const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

    // =====================================================
    // CỘT
    // =====================================================
    const columns = [
      {
        header: "STT",
        key: "stt",
        width: 8,
      },
      {
        header: "Tên sự kiện",
        key: "event_name",
        width: 46,
      },
      {
        header: "Nhiệm vụ",
        key: "mission",
        width: 50,
      },
      {
        header: "Loại",
        key: "event_type",
        width: 16,
      },
      {
        header: "Thuộc triển lãm",
        key: "parent_event_name",
        width: 40,
      },

      {
        header: "Địa điểm",
        key: "location",
        width: 42,
      },
      {
        header: "Thời gian bắt đầu",
        key: "start_datetime",
        width: 22,
      },
      {
        header: "Thời gian kết thúc",
        key: "end_datetime",
        width: 22,
      },
      {
        header: "Năm",
        key: "year",
        width: 12,
      },
      {
        header: "Đơn vị tổ chức",
        key: "organizer",
        width: 24,
      },
      {
        header: "Số người tham dự",
        key: "total_participants",
        width: 20,
      },
      {
        header: "Số người tối đa",
        key: "max_participants",
        width: 18,
      },
      {
        header: "Trạng thái",
        key: "status",
        width: 18,
      },
    ];

    // =====================================================
    // NẾU KHÔNG FILTER
    //
    // Header vẫn nằm dòng 1 như hiện tại.
    // =====================================================
    let headerRowNumber = 1;

    // =====================================================
    // NẾU CÓ FILTER
    //
    // Row 1 = title
    // Row 2 = mô tả filter nếu có
    // Row 3 = header
    // =====================================================
    if (hasFilter) {
      worksheet.addRow([]);

      worksheet.mergeCells(1, 1, 1, columns.length);

      const titleCell = worksheet.getCell(1, 1);

      titleCell.value = title;

      titleCell.font = {
        bold: true,
        size: 16,
        color: {
          argb: "FFFFFFFF",
        },
      };

      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15803D",
        },
      };

      titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      worksheet.getRow(1).height = 34;

      // ===============================================
      // MÔ TẢ FILTER PHỤ
      // ===============================================
      const filterDescriptions = [];

      if (status) {
        filterDescriptions.push(`Trạng thái: ${getStatusText(status)}`);
      }

      if (keyword) {
        filterDescriptions.push(`Từ khóa: ${keyword}`);
      }

      if (filterDescriptions.length > 0) {
        worksheet.addRow([]);

        worksheet.mergeCells(2, 1, 2, columns.length);

        const filterCell = worksheet.getCell(2, 1);

        filterCell.value = `Bộ lọc: ${filterDescriptions.join(" | ")}`;

        filterCell.font = {
          italic: true,
          color: {
            argb: "FF475569",
          },
        };

        filterCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF1F5F9",
          },
        };

        filterCell.alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        worksheet.getRow(2).height = 24;

        headerRowNumber = 3;
      } else {
        headerRowNumber = 2;
      }
    }

    // =====================================================
    // PHẢI set columns SAU KHI xác định header.
    //
    // Không dùng worksheet.columns trực tiếp vì sẽ tự
    // chèn header ở row 1.
    // =====================================================
    columns.forEach((column, index) => {
      worksheet.getColumn(index + 1).width = column.width;
    });

    const headerRow = worksheet.getRow(headerRowNumber);

    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);

      cell.value = column.header;

      cell.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF16A34A",
        },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      cell.border = {
        top: {
          style: "thin",
          color: {
            argb: "FFD1D5DB",
          },
        },
        left: {
          style: "thin",
          color: {
            argb: "FFD1D5DB",
          },
        },
        bottom: {
          style: "thin",
          color: {
            argb: "FFD1D5DB",
          },
        },
        right: {
          style: "thin",
          color: {
            argb: "FFD1D5DB",
          },
        },
      };
    });

    headerRow.height = 30;

    // =====================================================
    // DATA
    // =====================================================
    rows.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,

        item.event_name || "",

        item.mission || "",
        item.event_type === "EXHIBITION"
          ? "Triển lãm"
          : item.event_type === "SEMINAR"
            ? "Hội thảo"
            : item.event_type || "",

        item.parent_event_name || "",

        item.location || "",

        formatDateTime(item.start_datetime),

        formatDateTime(item.end_datetime),

        item.year || "",

        item.organizer || "",

        Number(item.total_participants || 0),

        Number(item.max_participants || 0),

        getStatusText(item.status),
      ]);

      row.alignment = {
        vertical: "top",
        wrapText: true,
      };

      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
        };
      });

      // STT + số liệu căn giữa
      row.getCell(1).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(9).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(11).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(12).alignment = {
        horizontal: "center",
        vertical: "top",
      };
    });

    // =====================================================
    // FREEZE HEADER
    // =====================================================
    worksheet.views = [
      {
        state: "frozen",
        ySplit: headerRowNumber,
      },
    ];

    // =====================================================
    // AUTO FILTER
    // =====================================================
    worksheet.autoFilter = {
      from: {
        row: headerRowNumber,
        column: 1,
      },

      to: {
        row: headerRowNumber,
        column: columns.length,
      },
    };

    // =====================================================
    // FILE
    // =====================================================
    let fileName =
      type === "EXHIBITION"
        ? "danh-sach-trien-lam"
        : type === "SEMINAR"
          ? "danh-sach-hoi-thao"
          : "startup-connection-day";

    if (year) {
      fileName += `-${year}`;
    }

    if (month) {
      fileName += `-thang-${month}`;
    }

    fileName += ".xlsx";

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    return res.send(buffer);
  } catch (error) {
    console.error("EXPORT STARTUP CONNECTION DAY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xuất dữ liệu Excel.",
    });
  }
};
