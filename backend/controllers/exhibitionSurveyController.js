const ExhibitionSurveyModel = require("../models/exhibitionSurveyModel");
const ExcelJS = require("exceljs");
const StartupConnectionModel = require("../models/startupConnectionModel");
exports.exportExcel = async (req, res) => {
  try {
    const eventId = req.query.event_id ? Number(req.query.event_id) : null;

    if (req.query.event_id && (!Number.isInteger(eventId) || eventId <= 0)) {
      return res.status(400).json({
        success: false,
        message: "ID triển lãm không hợp lệ.",
      });
    }

    const surveys = await ExhibitionSurveyModel.getExportData(eventId);

    if (!surveys.length) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu khảo sát để xuất Excel.",
      });
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SIHUB";

    const sheet = workbook.addWorksheet("Khảo sát triển lãm");

    // =====================================================
    // HELPERS
    // =====================================================
    const genderLabel = (value) => {
      switch (String(value || "").toUpperCase()) {
        case "MALE":
          return "Nam";

        case "FEMALE":
          return "Nữ";

        case "OTHER":
          return "Khác";

        default:
          return "";
      }
    };

    const femaleFounderLabel = (value) => {
      if (value === null || value === undefined) {
        return "";
      }

      return Number(value) === 1 ? "Có" : "Không";
    };

    const ageGroupLabel = (value) => {
      const map = {
        UNDER_18: "Dưới 18 tuổi",
        "18-24": "Từ 18-24 tuổi",
        "18-25": "Từ 18-25 tuổi",
        "25-35": "Từ 25-35 tuổi",
        "26-35": "Từ 26-35 tuổi",
        "36-45": "Từ 36-45 tuổi",
        "46_PLUS": "Trên 45 tuổi",
      };

      return map[value] || value || "";
    };

    const userTypeLabel = (value) => {
      const map = {
        STARTUP: "Startup/Dự án (Chưa thành lập doanh nghiệp)",

        BUSINESS: "Doanh nghiệp",

        STUDENT: "Sinh viên",

        UNIVERSITY: "Trường đại học, viện nghiên cứu...",

        OTHER: "Khác",
      };

      return map[String(value || "").toUpperCase()] || value || "";
    };

    const projectFieldLabel = (item) => {
      if (String(item.project_field || "").toUpperCase() === "OTHER") {
        return item.project_field_other
          ? `Lĩnh vực khác: ${item.project_field_other}`
          : "Lĩnh vực khác";
      }

      const map = {
        ECOMMERCE: "Lĩnh vực Thương mại điện tử",

        FINTECH: "Lĩnh vực Công nghệ tài chính",

        LOGISTICS: "Lĩnh vực Logistic",

        EDTECH: "Lĩnh vực Công nghệ giáo dục",

        HEALTHCARE: "Lĩnh vực Y tế và chăm sóc sức khỏe",

        HIGH_TECH_AGRICULTURE: "Lĩnh vực Nông nghiệp công nghệ cao",

        SUSTAINABILITY: "Lĩnh vực Phát triển bền vững",

        AI_DIGITAL_TRANSFORMATION: "Lĩnh vực Chuyển đổi số",

        AI: "Lĩnh vực Chuyển đổi số",

        CYBERSECURITY: "Lĩnh vực An ninh mạng",

        CULTURAL_INDUSTRY: "Lĩnh vực công nghiệp văn hoá",
      };

      return (
        map[String(item.project_field || "").toUpperCase()] ||
        item.project_field ||
        ""
      );
    };

    const startupStageLabel = (value) => {
      const map = {
        NONE: "Không có startup",

        IDEA: "Giai đoạn ý tưởng",

        PROTOTYPE: "Giai đoạn prototype",

        MVP: "Giai đoạn prototype/MVP",

        EARLY_REVENUE: "Đã có sản phẩm và doanh thu ban đầu",

        GROWTH: "Giai đoạn tăng trưởng",

        SCALE: "Giai đoạn mở rộng",
      };

      return map[String(value || "").toUpperCase()] || value || "";
    };

    const programSelectionLabel = (value) => {
      const normalized = String(value || "").toUpperCase();

      if (normalized === "YES") {
        return "Tôi thuộc chương trình trên";
      }

      if (normalized === "NO") {
        return "Tôi không thuộc chương trình trên";
      }

      return value || "";
    };

    // =====================================================
    // COLUMNS - ĐÚNG MẪU EM CHỐT
    // =====================================================
    sheet.columns = [
      {
        header: "Dấu thời gian",
        key: "created_at",
        width: 22,
      },
      {
        header: "Họ và tên",
        key: "fullname",
        width: 28,
      },
      {
        header: "Chức vụ",
        key: "position",
        width: 32,
      },
      {
        header: "Đơn vị công tác",
        key: "organization",
        width: 40,
      },
      {
        header: "Số Điện thoại",
        key: "phone",
        width: 18,
      },
      {
        header: "Địa chỉ email",
        key: "email",
        width: 34,
      },
      {
        header: "Giới tính",
        key: "gender",
        width: 14,
      },
      {
        header: "Dự án của bạn có nữ là founder, co-founder không",
        key: "female_founder",
        width: 30,
      },
      {
        header: "Bạn thuộc nhóm tuổi nào sau đây",
        key: "age_group",
        width: 26,
      },
      {
        header: "Bạn thuộc nhóm đối tượng nào sau đây",
        key: "user_type",
        width: 42,
      },
      {
        header: "Dự án/ý tưởng của bạn thuộc lĩnh vực nào sau đây",
        key: "project_field",
        width: 42,
      },
      {
        header: "Nếu là startup/dự án Bạn ở giai đoạn nào",
        key: "startup_stage",
        width: 32,
      },
      {
        header:
          "Dự án/công ty của bạn có bao nhiêu nhân sự (Ví dụ 2 nam, 3 nữ) (Chưa có dự án, team ghi 0)",
        key: "team_size",
        width: 36,
      },
      {
        header:
          "Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?",
        key: "program_selection_status",
        width: 55,
      },
      {
        header:
          "Bạn tham quan triển lãm mà mong muốn gặp gỡ các Doanh nghiệp như thế nào?",
        key: "networking_expectation",
        width: 55,
      },
      {
        header:
          "Bạn có yêu cầu đặc biệt nào về việc kết nối với các hoạt động trong triển lãm hoặc hội thảo không?",
        key: "special_connection_request",
        width: 55,
      },
      {
        header: "Câu hỏi dành cho Ban tổ chức (nếu có)",
        key: "organizer_question",
        width: 45,
      },
    ];

    // =====================================================
    // DATA
    // =====================================================
    surveys.forEach((item) => {
      sheet.addRow({
        created_at: item.created_at ? new Date(item.created_at) : null,

        fullname: item.fullname || "",

        position: item.position || "",

        organization: item.organization || "",

        phone: item.phone || "",

        email: item.email || "",

        gender: genderLabel(item.gender),

        female_founder: femaleFounderLabel(item.female_founder),

        age_group: ageGroupLabel(item.age_group),

        user_type: userTypeLabel(item.user_type),

        project_field: projectFieldLabel(item),

        startup_stage: startupStageLabel(item.startup_stage),

        team_size: item.team_size ?? "",

        program_selection_status: programSelectionLabel(
          item.program_selection_status,
        ),

        networking_expectation: item.networking_expectation || "",

        special_connection_request: item.special_connection_request || "",

        organizer_question: item.organizer_question || "",
      });
    });

    // =====================================================
    // STYLE
    // =====================================================
    const headerRow = sheet.getRow(1);

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
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    headerRow.height = 70;

    sheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    sheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: 1,
        column: sheet.columnCount,
      },
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    });

    sheet.getColumn("created_at").numFmt = "dd/mm/yyyy hh:mm:ss";

    const dateText = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="khao-sat-trien-lam-${dateText}.xlsx"`,
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("EXPORT EXHIBITION SURVEY ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Không thể xuất Excel khảo sát triển lãm.",
      });
    }
  }
};
exports.submitSurvey = async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID triển lãm không hợp lệ.",
      });
    }

    const event = await StartupConnectionModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy triển lãm.",
      });
    }

    if (String(event.event_type || "").toUpperCase() !== "EXHIBITION") {
      return res.status(400).json({
        success: false,
        message: "Biểu mẫu khảo sát này chỉ áp dụng cho Triển lãm.",
      });
    }

    const {
      fullname,
      position,
      organization,
      phone,
      email,

      project_field,
      project_field_other,

      exhibition_product_name,
      exhibition_product_quantity,

      sold_or_ordered_quantity,
      visitor_count,
      b2b_matching_count,
      public_sector_connection_count,

      mou_count,
      exhibition_revenue,

      highlight_impression,
      want_to_join_again,
      gender,
      female_founder,
      age_group,
      user_type,

      startup_stage,
      team_size,
      program_selection_status,

      networking_expectation,
      special_connection_request,
      organizer_question,
      organizer_feedback,
      other_sharing,
    } = req.body;
    const requiredTextFields = [
      ["fullname", fullname, "Vui lòng nhập họ và tên."],
      ["position", position, "Vui lòng nhập chức vụ."],
      ["organization", organization, "Vui lòng nhập đơn vị công tác."],
      ["phone", phone, "Vui lòng nhập số điện thoại."],
      ["email", email, "Vui lòng nhập email."],
      ["project_field", project_field, "Vui lòng chọn lĩnh vực dự án."],
      [
        "exhibition_product_name",
        exhibition_product_name,
        "Vui lòng nhập tên sản phẩm trưng bày.",
      ],
      [
        "exhibition_product_quantity",
        exhibition_product_quantity,
        "Vui lòng nhập số lượng sản phẩm trưng bày.",
      ],
      [
        "highlight_impression",
        highlight_impression,
        "Vui lòng nhập điểm ấn tượng của chương trình.",
      ],
      [
        "want_to_join_again",
        want_to_join_again,
        "Vui lòng cho biết đơn vị có muốn tiếp tục tham gia.",
      ],
    ];

    for (const [, value, message] of requiredTextFields) {
      if (!String(value ?? "").trim()) {
        return res.status(400).json({
          success: false,
          message,
        });
      }
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ.",
      });
    }
    if (
      String(project_field).toUpperCase() === "OTHER" &&
      !String(project_field_other || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng ghi rõ lĩnh vực khác.",
      });
    }
    const requiredNumbers = [
      [sold_or_ordered_quantity, "Vui lòng nhập số sản phẩm đã bán/đặt hàng."],
      [visitor_count, "Vui lòng nhập số lượt khách ghé gian hàng."],
      [b2b_matching_count, "Vui lòng nhập số lượt B2B matching."],
      [
        public_sector_connection_count,
        "Vui lòng nhập số lượt kết nối khu vực công.",
      ],
    ];

    for (const [value, message] of requiredNumbers) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        Number(value) < 0
      ) {
        return res.status(400).json({
          success: false,
          message,
        });
      }
    }
    const normalizedJoinAgain = String(want_to_join_again).toUpperCase();

    if (!["YES", "NO"].includes(normalizedJoinAgain)) {
      return res.status(400).json({
        success: false,
        message: "Lựa chọn tiếp tục tham gia sự kiện không hợp lệ.",
      });
    }
    const surveyId = await ExhibitionSurveyModel.create({
      event_id: eventId,

      fullname: String(fullname).trim(),
      position: String(position).trim(),
      organization: String(organization).trim(),
      phone: String(phone).replace(/\D/g, ""),
      email: normalizedEmail,

      project_field: String(project_field).toUpperCase(),

      project_field_other:
        String(project_field).toUpperCase() === "OTHER"
          ? String(project_field_other).trim()
          : null,

      exhibition_product_name: String(exhibition_product_name).trim(),

      exhibition_product_quantity: String(exhibition_product_quantity).trim(),

      sold_or_ordered_quantity,
      visitor_count,
      b2b_matching_count,
      public_sector_connection_count,

      mou_count,
      exhibition_revenue,

      highlight_impression: String(highlight_impression).trim(),

      want_to_join_again: normalizedJoinAgain,

      organizer_feedback: String(organizer_feedback || "").trim() || null,

      other_sharing: String(other_sharing || "").trim() || null,
      gender: String(gender || "").trim() || null,

      female_founder:
        female_founder === true ||
        female_founder === 1 ||
        female_founder === "1" ||
        female_founder === "true",

      age_group: String(age_group || "").trim() || null,

      user_type: String(user_type || "").trim() || null,

      startup_stage: String(startup_stage || "").trim() || null,

      team_size: String(team_size || "").trim() || null,

      program_selection_status:
        String(program_selection_status || "").trim() || null,

      networking_expectation:
        String(networking_expectation || "").trim() || null,

      special_connection_request:
        String(special_connection_request || "").trim() || null,

      organizer_question: String(organizer_question || "").trim() || null,
    });

    const created = await ExhibitionSurveyModel.findById(surveyId);

    return res.status(201).json({
      success: true,
      message: "Gửi khảo sát triển lãm thành công.",
      data: {
        event: {
          id: event.id,
          event_name: event.event_name,
        },
        survey: created,
      },
    });
  } catch (error) {
    console.error("SUBMIT EXHIBITION SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể gửi khảo sát. Vui lòng thử lại.",
    });
  }
};
