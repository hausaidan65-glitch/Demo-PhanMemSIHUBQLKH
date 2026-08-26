const NetworkingEventModel = require("../models/networkingEventModel");
const UserModel = require("../models/userModel");
const ExcelJS = require("exceljs");
function getExportStatusLabel(status) {
  const labels = {
    DRAFT: "Bản nháp",
    OPEN: "Đang mở",
    CLOSED: "Đã đóng",
    FINISHED: "Đã kết thúc",
  };

  return labels[status] || status || "";
}

function getRegistrationStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
  };

  return labels[status] || status || "";
}
// =========================================================
// LẤY DANH SÁCH SỰ KIỆN KẾT NỐI
// =========================================================
exports.getEvents = async (req, res) => {
  try {
    const data = await NetworkingEventModel.getAll(req.query);

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sự kiện kết nối.",
    });
  }
};
// =========================================================
// THỐNG KÊ / BIỂU ĐỒ SỰ KIỆN KẾT NỐI
// =========================================================
exports.getStatistics = async (req, res) => {
  try {
    const data = await NetworkingEventModel.statistics(req.query);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Lỗi thống kê sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu thống kê sự kiện kết nối.",
    });
  }
};
// =========================================================
// ĐĂNG KÝ SỰ KIỆN KẾT NỐI - PUBLIC
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

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ.",
      });
    }

    const event = await NetworkingEventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

    if (String(event.status || "").toUpperCase() !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Sự kiện hiện không mở đăng ký.",
      });
    }

    const normalizedFullname = String(fullname || "").trim();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    const normalizedOrganization = String(organization || "").trim();

    const normalizedPosition = String(position || "").trim();

    if (!normalizedFullname) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ và tên.",
      });
    }

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

    if (normalizedPhone.length < 9 || normalizedPhone.length > 11) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ.",
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

    const normalizedHasProject =
      has_project === true ||
      has_project === 1 ||
      has_project === "1" ||
      has_project === "true";

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
        message: "Vui lòng chọn tình trạng tuyển chọn chương trình.",
      });
    }

    const currentParticipants =
      await NetworkingEventModel.countParticipants(eventId);

    const maxParticipants = Number(event.max_participants) || 0;

    if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
      return res.status(409).json({
        success: false,
        message: "Sự kiện đã đủ số lượng người tham gia.",
      });
    }

    const userByEmail = await UserModel.findByEmail(normalizedEmail);

    const userByPhone = await UserModel.findByPhone(normalizedPhone);

    if (
      userByEmail &&
      userByPhone &&
      Number(userByEmail.id) !== Number(userByPhone.id)
    ) {
      return res.status(409).json({
        success: false,
        message: "Email và số điện thoại đang thuộc hai hồ sơ khác nhau.",
      });
    }

    const user = userByPhone || userByEmail;

    let userId;

    if (!user) {
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
            message: "Email đã được sử dụng bởi hồ sơ khác.",
          });
        }

        await UserModel.updatePrimaryEmail(userId, normalizedEmail);
      }
    }

    const existed = await NetworkingEventModel.findParticipant(eventId, userId);

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã đăng ký sự kiện này rồi.",
      });
    }

    const participantId = await NetworkingEventModel.addParticipant(eventId, {
      user_id: userId,

      participant_role: normalizedUserType,

      organization: normalizedOrganization,

      position: normalizedPosition,

      has_project: normalizedHasProject,

      project_field: normalizedHasProject
        ? String(project_field || "").trim() || null
        : null,

      startup_stage: normalizedHasProject ? startup_stage || null : null,

      program_selection_status: program_selection_status,

      support_needs: String(support_needs || "").trim() || null,

      organizer_question: String(organizer_question || "").trim() || null,

      note: null,

      checked_in: false,

      checked_in_at: null,

      registration_status: "CONFIRMED",
    });

    const participants = await NetworkingEventModel.getParticipants(eventId);

    const created =
      participants.find((item) => Number(item.id) === Number(participantId)) ||
      null;

    return res.status(201).json({
      success: true,
      message: "Đăng ký tham gia sự kiện kết nối thành công!",

      data: {
        event: {
          id: event.id,
          event_name: event.event_name,
          start_datetime: event.start_datetime,
          end_datetime: event.end_datetime,
          location: event.location,
        },

        participant: created,
      },
    });
  } catch (error) {
    console.error("REGISTER NETWORKING EVENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đăng ký tham gia sự kiện.",
    });
  }
};
// =========================================================
// CHI TIẾT
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

    const event = await NetworkingEventModel.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

    const participants = await NetworkingEventModel.getParticipants(id);

    return res.json({
      success: true,
      data: {
        ...event,
        participants,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết sự kiện kết nối.",
    });
  }
};

// =========================================================
// TẠO SỰ KIỆN
// =========================================================
exports.createEvent = async (req, res) => {
  try {
    const {
      event_name,
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

    const normalizedStatus = String(status || "OPEN").toUpperCase();

    if (!["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái sự kiện không hợp lệ.",
      });
    }

    if (
      start_datetime &&
      end_datetime &&
      new Date(start_datetime) >= new Date(end_datetime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
      });
    }

    if (event_code) {
      const duplicated = await NetworkingEventModel.findByEventCode(event_code);

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Mã sự kiện đã tồn tại.",
        });
      }
    }

    const id = await NetworkingEventModel.create({
      event_name: String(event_name).trim(),

      event_code: String(event_code || "").trim() || null,

      short_description: String(short_description || "").trim() || null,

      description: String(description || "").trim() || null,
      mission: String(mission || "").trim() || null,

      thumbnail: String(thumbnail || "").trim() || null,

      location: String(location || "").trim() || null,

      start_datetime: start_datetime || null,

      end_datetime: end_datetime || null,

      year: Number(year) || null,

      organizer: String(organizer || "").trim() || null,

      max_participants: Math.max(0, Number(max_participants) || 0),

      status: normalizedStatus,
    });

    const created = await NetworkingEventModel.findById(id);

    return res.status(201).json({
      success: true,
      message: "Thêm sự kiện kết nối thành công.",
      data: created,
    });
  } catch (error) {
    console.error("Lỗi tạo sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo sự kiện kết nối.",
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

    const existing = await NetworkingEventModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

    const {
      event_name,
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

    const normalizedStatus = String(status || existing.status).toUpperCase();

    if (!["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái sự kiện không hợp lệ.",
      });
    }

    if (
      start_datetime &&
      end_datetime &&
      new Date(start_datetime) >= new Date(end_datetime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
      });
    }

    if (event_code) {
      const duplicated = await NetworkingEventModel.findByEventCode(
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

    await NetworkingEventModel.update(id, {
      event_name: String(event_name).trim(),

      event_code: String(event_code || "").trim() || null,

      short_description: String(short_description || "").trim() || null,

      description: String(description || "").trim() || null,
      mission: String(mission || "").trim() || null,

      thumbnail: String(thumbnail || "").trim() || null,

      location: String(location || "").trim() || null,

      start_datetime: start_datetime || null,

      end_datetime: end_datetime || null,

      year: Number(year) || null,

      organizer: String(organizer || "").trim() || null,

      max_participants: Math.max(0, Number(max_participants) || 0),

      status: normalizedStatus,
    });

    const updated = await NetworkingEventModel.findById(id);

    return res.json({
      success: true,
      message: "Cập nhật sự kiện kết nối thành công.",
      data: updated,
    });
  } catch (error) {
    console.error("Lỗi cập nhật sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật sự kiện kết nối.",
    });
  }
};

// =========================================================
// XÓA
// =========================================================
exports.deleteEvent = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existing = await NetworkingEventModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

    const result = await NetworkingEventModel.remove(id);

    if (!result.deleted) {
      if (result.reason === "HAS_PARTICIPANTS") {
        return res.status(409).json({
          success: false,
          message: `Sự kiện đang có ${result.total_participants} người tham dự. Không thể xóa.`,
          data: {
            event_id: id,
            event_name: existing.event_name,
            total_participants: result.total_participants,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Không thể xóa sự kiện.",
      });
    }

    return res.json({
      success: true,
      message: "Xóa sự kiện kết nối thành công.",
      data: {
        id,
        event_name: existing.event_name,
      },
    });
  } catch (error) {
    console.error("Lỗi xóa sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa sự kiện kết nối.",
    });
  }
};

// =========================================================
// LẤY NGƯỜI THAM DỰ
// =========================================================
exports.getParticipants = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const event = await NetworkingEventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

    const data = await NetworkingEventModel.getParticipants(eventId);

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy người tham dự sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người tham dự.",
    });
  }
};

// =========================================================
// THÊM NGƯỜI THAM DỰ
// =========================================================
exports.addParticipant = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const event = await NetworkingEventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện kết nối.",
      });
    }

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

    const userId = Number(user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Người tham dự không hợp lệ.",
      });
    }

    const existed = await NetworkingEventModel.findParticipant(eventId, userId);

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Người này đã tham dự sự kiện.",
      });
    }

    const participantId = await NetworkingEventModel.addParticipant(eventId, {
      user_id: userId,

      participant_role: participant_role || null,

      organization: organization || null,

      position: position || null,

      note: note || null,

      checked_in: Boolean(checked_in),

      checked_in_at: checked_in_at || null,

      registration_status: registration_status || "CONFIRMED",
    });

    const participants = await NetworkingEventModel.getParticipants(eventId);

    const created =
      participants.find((item) => Number(item.id) === Number(participantId)) ||
      null;

    return res.status(201).json({
      success: true,
      message: "Thêm người tham dự thành công.",
      data: created,
    });
  } catch (error) {
    console.error("Lỗi thêm người tham dự:", error);

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

// =========================================================
// XÓA NGƯỜI THAM DỰ
// =========================================================
exports.deleteParticipant = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    const participantId = Number(req.params.participantId);

    const affectedRows = await NetworkingEventModel.removeParticipant(
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
    console.error("Lỗi xóa người tham dự:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa người tham dự.",
    });
  }
};
// =========================================================
// FILTER OPTIONS
// =========================================================
exports.getFilterOptions = async (req, res) => {
  try {
    const data = await NetworkingEventModel.getFilterOptions();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy bộ lọc sự kiện kết nối:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu bộ lọc.",
    });
  }
};
// =========================================================
// XUẤT EXCEL SỰ KIỆN KẾT NỐI
// =========================================================
exports.exportEvents = async (req, res) => {
  try {
    const { events, participants } = await NetworkingEventModel.getExportData(
      req.query,
    );
    const year = String(req.query.year || "").trim();

    const month = String(req.query.month || "").trim();

    const status = String(req.query.status || "").trim();

    const keyword = String(req.query.keyword || "").trim();
    const mission = String(req.query.mission || "").trim();

    const hasFilter = Boolean(year || month || status || keyword || mission);

    const eventTitleParts = ["DANH SÁCH SỰ KIỆN KẾT NỐI"];

    const participantTitleParts = ["DANH SÁCH NGƯỜI THAM DỰ SỰ KIỆN KẾT NỐI"];

    if (month) {
      eventTitleParts.push(`THÁNG ${month}`);

      participantTitleParts.push(`THÁNG ${month}`);
    }

    if (year) {
      eventTitleParts.push(`NĂM ${year}`);

      participantTitleParts.push(`NĂM ${year}`);
    }

    const eventTitle = eventTitleParts.join(" - ");

    const participantTitle = participantTitleParts.join(" - ");

    if (!events.length) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu phù hợp để xuất Excel.",
      });
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SIHUB";
    workbook.created = new Date();

    // =====================================================
    // SHEET 1: DANH SÁCH SỰ KIỆN
    // =====================================================

    const eventSheet = workbook.addWorksheet("Danh sách sự kiện");

    eventSheet.columns = [
      {
        header: "STT",
        key: "stt",
        width: 8,
      },
      {
        header: "Tên sự kiện",
        key: "event_name",
        width: 42,
      },
      {
        header: "Nhiệm vụ",
        key: "mission",
        width: 50,
      },
      {
        header: "Địa điểm",
        key: "location",
        width: 38,
      },
      {
        header: "Bắt đầu",
        key: "start_datetime",
        width: 22,
      },
      {
        header: "Kết thúc",
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
        width: 28,
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
      {
        header: "Mô tả ngắn",
        key: "short_description",
        width: 45,
      },
    ];

    events.forEach((item, index) => {
      eventSheet.addRow({
        stt: index + 1,

        event_name: item.event_name || "",
        mission: item.mission || "",
        location: item.location || "",

        start_datetime: item.start_datetime
          ? new Date(item.start_datetime)
          : null,

        end_datetime: item.end_datetime ? new Date(item.end_datetime) : null,

        year: item.year || "",

        organizer: item.organizer || "",

        total_participants: Number(item.total_participants) || 0,

        max_participants: Number(item.max_participants) || 0,

        status: getExportStatusLabel(item.status),

        short_description: item.short_description || "",
      });
    });

    // =====================================================
    // SHEET 2: NGƯỜI THAM DỰ
    // =====================================================

    const participantSheet = workbook.addWorksheet("Người tham dự");

    participantSheet.columns = [
      {
        header: "STT",
        key: "stt",
        width: 8,
      },
      {
        header: "Tên sự kiện",
        key: "event_name",
        width: 42,
      },
      {
        header: "Nhiệm vụ",
        key: "mission",
        width: 50,
      },
      {
        header: "Họ tên",
        key: "fullname",
        width: 30,
      },
      {
        header: "Email",
        key: "email",
        width: 32,
      },
      {
        header: "Số điện thoại",
        key: "phone",
        width: 18,
      },
      {
        header: "Đơn vị",
        key: "organization",
        width: 32,
      },
      {
        header: "Chức vụ",
        key: "position",
        width: 25,
      },
      {
        header: "Vai trò tham dự",
        key: "participant_role",
        width: 25,
      },
      {
        header: "Trạng thái đăng ký",
        key: "registration_status",
        width: 22,
      },
      {
        header: "Check-in",
        key: "checked_in",
        width: 15,
      },
      {
        header: "Thời gian check-in",
        key: "checked_in_at",
        width: 22,
      },
      {
        header: "Ghi chú",
        key: "note",
        width: 35,
      },
    ];

    participants.forEach((item, index) => {
      participantSheet.addRow({
        stt: index + 1,

        event_name: item.event_name || "",

        event_code: item.event_code || "",
        mission: item.mission || "",

        fullname: item.fullname || "",

        email: item.email || "",

        phone: item.phone || "",

        organization: item.organization || "",

        position: item.position || "",

        participant_role: item.participant_role || "",

        registration_status: getRegistrationStatusLabel(
          item.registration_status,
        ),

        checked_in:
          Number(item.checked_in) === 1 ? "Đã check-in" : "Chưa check-in",

        checked_in_at: item.checked_in_at ? new Date(item.checked_in_at) : null,

        note: item.note || "",
      });
    });
    // =====================================================
    // TITLE CHỈ KHI CÓ FILTER
    // =====================================================

    let eventHeaderRowNumber = 1;

    let participantHeaderRowNumber = 1;

    if (hasFilter) {
      // EVENT SHEET
      eventSheet.insertRow(1, []);

      eventSheet.mergeCells(1, 1, 1, eventSheet.columnCount);

      const eventTitleCell = eventSheet.getCell(1, 1);

      eventTitleCell.value = eventTitle;

      eventTitleCell.font = {
        bold: true,
        size: 16,
        color: {
          argb: "FFFFFFFF",
        },
      };

      eventTitleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15803D",
        },
      };

      eventTitleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      eventSheet.getRow(1).height = 34;

      eventHeaderRowNumber = 2;

      // PARTICIPANT SHEET
      participantSheet.insertRow(1, []);

      participantSheet.mergeCells(1, 1, 1, participantSheet.columnCount);

      const participantTitleCell = participantSheet.getCell(1, 1);

      participantTitleCell.value = participantTitle;

      participantTitleCell.font = {
        bold: true,
        size: 16,
        color: {
          argb: "FFFFFFFF",
        },
      };

      participantTitleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15803D",
        },
      };

      participantTitleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      participantSheet.getRow(1).height = 34;

      participantHeaderRowNumber = 2;
    }
    // =====================================================
    // STYLE CHUNG
    // =====================================================

    [
      {
        sheet: eventSheet,
        headerRowNumber: eventHeaderRowNumber,
      },

      {
        sheet: participantSheet,
        headerRowNumber: participantHeaderRowNumber,
      },
    ].forEach(({ sheet, headerRowNumber }) => {
      const headerRow = sheet.getRow(headerRowNumber);

      headerRow.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF16A34A",
        },
      };

      headerRow.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      headerRow.height = 30;

      sheet.views = [
        {
          state: "frozen",
          ySplit: headerRowNumber,
        },
      ];

      sheet.autoFilter = {
        from: {
          row: headerRowNumber,
          column: 1,
        },

        to: {
          row: headerRowNumber,
          column: sheet.columnCount,
        },
      };

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber) {
          return;
        }

        row.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });
    });
    // Format ngày giờ
    eventSheet.getColumn("start_datetime").numFmt = "dd/mm/yyyy hh:mm";

    eventSheet.getColumn("end_datetime").numFmt = "dd/mm/yyyy hh:mm";

    participantSheet.getColumn("checked_in_at").numFmt = "dd/mm/yyyy hh:mm";

    let filename = "danh-sach-su-kien-ket-noi";

    if (year) {
      filename += `-${year}`;
    }

    if (month) {
      filename += `-thang-${month}`;
    }

    filename += ".xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Lỗi xuất Excel sự kiện kết nối:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Không thể xuất Excel sự kiện kết nối.",
      });
    }
  }
};
