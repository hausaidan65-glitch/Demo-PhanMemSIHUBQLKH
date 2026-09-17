const CourseClassModel = require("../models/courseClassModel");
const CourseSurveyModel = require("../models/courseSurveyModel");
const { verifySurveyToken } = require("../utils/surveyToken");
const ExcelJS = require("exceljs");

const SATISFACTION_OPTIONS = [
  "VERY_DISSATISFIED",
  "DISSATISFIED",
  "NEUTRAL",
  "SATISFIED",
  "VERY_SATISFIED",
];

const AGREEMENT_OPTIONS = [
  "STRONGLY_DISAGREE",
  "DISAGREE",
  "NEUTRAL",
  "AGREE",
  "STRONGLY_AGREE",
];

const DURATION_OPTIONS = ["TOO_LONG", "LONG", "JUST_RIGHT", "SHORT", "TOO_SHORT"];

const RADIO_QUESTIONS = [
  {
    field: "q1_content_meets_objective",
    required: true,
    options: SATISFACTION_OPTIONS,
    message: "Vui lòng đánh giá mức độ hài lòng về nội dung khóa học.",
  },
  {
    field: "q2_materials_clear_useful",
    required: true,
    options: SATISFACTION_OPTIONS,
    message: "Vui lòng đánh giá mức độ hài lòng về tài liệu học tập.",
  },
  {
    field: "q3_knowledge_practical",
    required: false,
    options: AGREEMENT_OPTIONS,
    message: "Lựa chọn về tính thực tiễn của kiến thức không hợp lệ.",
  },
  {
    field: "q4_trainer_expertise",
    required: false,
    options: AGREEMENT_OPTIONS,
    message: "Lựa chọn về kiến thức chuyên môn của giảng viên không hợp lệ.",
  },
  {
    field: "q5_trainer_delivery",
    required: false,
    options: AGREEMENT_OPTIONS,
    message: "Lựa chọn về phong cách truyền đạt của giảng viên không hợp lệ.",
  },
  {
    field: "q6_trainer_support",
    required: false,
    options: SATISFACTION_OPTIONS,
    message: "Lựa chọn về việc giảng viên giải đáp thắc mắc không hợp lệ.",
  },
  {
    field: "q7_duration",
    required: false,
    options: DURATION_OPTIONS,
    message: "Lựa chọn về thời lượng khóa học không hợp lệ.",
  },
];

const TEXT_FIELDS = [
  "q8_most_satisfied",
  "q9_improvement",
  "q10_next_course_suggestion",
];

// =====================================================
// NHÃN TIẾNG VIỆT CHO GIÁ TRỊ ENUM
// =====================================================
const SATISFACTION_LABELS = {
  VERY_DISSATISFIED: "Rất không hài lòng",
  DISSATISFIED: "Không hài lòng",
  NEUTRAL: "Bình thường",
  SATISFIED: "Hài lòng",
  VERY_SATISFIED: "Rất hài lòng",
};

const AGREEMENT_LABELS = {
  STRONGLY_DISAGREE: "Rất không đồng ý",
  DISAGREE: "Không đồng ý",
  NEUTRAL: "Bình thường",
  AGREE: "Đồng ý",
  STRONGLY_AGREE: "Rất đồng ý",
};

const DURATION_LABELS = {
  TOO_LONG: "Quá dài",
  LONG: "Dài",
  JUST_RIGHT: "Vừa đủ",
  SHORT: "Ngắn",
  TOO_SHORT: "Quá ngắn",
};

function toLabel(labels, value) {
  return labels[value] || value || "";
}

function toClassContext(courseClass) {
  return {
    id: courseClass.id,
    class_code: courseClass.class_code,
    class_name: courseClass.class_name,
    course_name: courseClass.course_name || null,
    trainer_name: courseClass.trainer_name || null,
    location: courseClass.location || null,
    register_close: courseClass.register_close || null,
    effective_status: courseClass.effective_status || courseClass.status || null,
  };
}

async function resolveClass(req) {
  const classId = Number(req.params.classId);

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: { status: 400, message: "Lớp học không hợp lệ." } };
  }

  const courseClass = await CourseClassModel.getById(classId);

  if (!courseClass) {
    return { error: { status: 404, message: "Không tìm thấy lớp học." } };
  }

  const isValidToken = verifySurveyToken(
    classId,
    courseClass.class_code,
    req.params.token,
  );

  if (!isValidToken) {
    return { error: { status: 400, message: "Liên kết khảo sát không hợp lệ." } };
  }

  return { courseClass };
}

exports.resolveClass = async (req, res) => {
  try {
    const { courseClass, error } = await resolveClass(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
      data: toClassContext(courseClass),
    });
  } catch (error) {
    console.error("RESOLVE COURSE SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải thông tin khảo sát.",
    });
  }
};

exports.submitSurvey = async (req, res) => {
  try {
    const { courseClass, error } = await resolveClass(req);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    const body = req.body || {};
    const answers = {};

    for (const question of RADIO_QUESTIONS) {
      const value = String(body[question.field] ?? "").trim();

      if (!value) {
        if (question.required) {
          return res.status(400).json({
            success: false,
            message: question.message,
          });
        }

        answers[question.field] = null;

        continue;
      }

      if (!question.options.includes(value)) {
        return res.status(400).json({
          success: false,
          message: question.message,
        });
      }

      answers[question.field] = value;
    }

    for (const field of TEXT_FIELDS) {
      answers[field] = String(body[field] ?? "").trim() || null;
    }

    const surveyId = await CourseSurveyModel.create({
      class_id: courseClass.id,
      ...answers,
    });

    const created = await CourseSurveyModel.findById(surveyId);

    return res.status(201).json({
      success: true,
      message: "Gửi khảo sát thành công.",
      data: {
        class: toClassContext(courseClass),
        survey: created,
      },
    });
  } catch (error) {
    console.error("SUBMIT COURSE SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể gửi khảo sát. Vui lòng thử lại.",
    });
  }
};

// =====================================================
// ADMIN: DANH SÁCH KHẢO SÁT
// =====================================================
exports.index = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const requestedLimit = Number(req.query.limit) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const [data, total] = await Promise.all([
      CourseSurveyModel.getAll(req.query),
      CourseSurveyModel.countAll(req.query),
    ]);

    return res.json({
      success: true,
      total,
      page,
      limit,
      total_pages: total === 0 ? 1 : Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("LIST COURSE SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách khảo sát.",
    });
  }
};

// =====================================================
// ADMIN: CHI TIẾT KHẢO SÁT
// =====================================================
exports.show = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID khảo sát không hợp lệ.",
      });
    }

    const survey = await CourseSurveyModel.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khảo sát.",
      });
    }

    const courseClass = await CourseClassModel.getById(survey.class_id);

    return res.json({
      success: true,
      data: {
        ...survey,
        class: courseClass ? toClassContext(courseClass) : null,
      },
    });
  } catch (error) {
    console.error("SHOW COURSE SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết khảo sát.",
    });
  }
};

// =====================================================
// ADMIN: XÓA KHẢO SÁT
// =====================================================
exports.destroy = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID khảo sát không hợp lệ.",
      });
    }

    const survey = await CourseSurveyModel.findById(id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khảo sát.",
      });
    }

    await CourseSurveyModel.remove(id);

    return res.json({
      success: true,
      message: "Xóa khảo sát thành công.",
    });
  } catch (error) {
    console.error("DELETE COURSE SURVEY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa khảo sát.",
    });
  }
};

// =====================================================
// ADMIN: XUẤT EXCEL
// =====================================================
exports.exportExcel = async (req, res) => {
  try {
    const surveys = await CourseSurveyModel.getExportData(req.query);

    if (!surveys.length) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu khảo sát để xuất Excel.",
      });
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SIHUB";

    const sheet = workbook.addWorksheet("Khảo sát sau khóa học");

    sheet.columns = [
      { header: "STT", key: "index", width: 8 },
      { header: "Lớp", key: "class_name", width: 32 },
      { header: "Mã lớp", key: "class_code", width: 18 },
      { header: "Khóa học", key: "course_name", width: 40 },
      { header: "Thời gian gửi", key: "created_at", width: 22 },
      {
        header: "Câu 1: Nội dung khóa học đáp ứng được mục tiêu đề ra",
        key: "q1",
        width: 40,
      },
      {
        header: "Câu 2: Tài liệu học tập (slide, giáo trình) rõ ràng, hữu ích",
        key: "q2",
        width: 40,
      },
      {
        header: "Câu 3: Kiến thức có tính thực tiễn cao, đã áp dụng vào công việc",
        key: "q3",
        width: 40,
      },
      {
        header: "Câu 4: Giảng viên có kiến thức chuyên môn sâu rộng",
        key: "q4",
        width: 40,
      },
      {
        header: "Câu 5: Phong cách truyền đạt của giảng viên rõ ràng, lôi cuốn",
        key: "q5",
        width: 40,
      },
      {
        header: "Câu 6: Giảng viên giải đáp thắc mắc của học viên tốt",
        key: "q6",
        width: 40,
      },
      {
        header: "Câu 7: Thời lượng khóa học (quá dài/quá ngắn/vừa đủ)",
        key: "q7",
        width: 32,
      },
      {
        header: "Câu 8: Điểm bạn cảm thấy hài lòng nhất về khóa học",
        key: "q8",
        width: 45,
      },
      {
        header: "Câu 9: Điểm khóa học cần cải thiện để tốt hơn",
        key: "q9",
        width: 45,
      },
      {
        header: "Câu 10: Đề xuất về các khóa học tiếp theo (nếu có)",
        key: "q10",
        width: 45,
      },
    ];

    surveys.forEach((item, index) => {
      sheet.addRow({
        index: index + 1,
        class_name: item.class_name || "",
        class_code: item.class_code || "",
        course_name: item.course_name || "",
        created_at: item.created_at ? new Date(item.created_at) : null,

        q1: toLabel(SATISFACTION_LABELS, item.q1_content_meets_objective),
        q2: toLabel(SATISFACTION_LABELS, item.q2_materials_clear_useful),
        q3: toLabel(AGREEMENT_LABELS, item.q3_knowledge_practical),
        q4: toLabel(AGREEMENT_LABELS, item.q4_trainer_expertise),
        q5: toLabel(AGREEMENT_LABELS, item.q5_trainer_delivery),
        q6: toLabel(SATISFACTION_LABELS, item.q6_trainer_support),
        q7: toLabel(DURATION_LABELS, item.q7_duration),
        q8: item.q8_most_satisfied || "",
        q9: item.q9_improvement || "",
        q10: item.q10_next_course_suggestion || "",
      });
    });

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
      `attachment; filename="khao-sat-sau-khoa-hoc-${dateText}.xlsx"`,
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("EXPORT COURSE SURVEY ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Không thể xuất Excel khảo sát.",
      });
    }
  }
};
