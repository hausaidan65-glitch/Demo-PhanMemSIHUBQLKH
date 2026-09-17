import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import { CheckCircle2, Loader2, Send } from "lucide-react";

import { Field, Radio } from "../../components/survey/SurveyControls";
import { inputClass } from "../../components/survey/surveyStyles";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// =====================================================
// BỘ LỰA CHỌN
// =====================================================
const SATISFACTION_OPTIONS = [
  { value: "VERY_DISSATISFIED", label: "Rất không hài lòng" },
  { value: "DISSATISFIED", label: "Không hài lòng" },
  { value: "NEUTRAL", label: "Bình thường" },
  { value: "SATISFIED", label: "Hài lòng" },
  { value: "VERY_SATISFIED", label: "Rất hài lòng" },
];

const AGREEMENT_OPTIONS = [
  { value: "STRONGLY_DISAGREE", label: "Rất không đồng ý" },
  { value: "DISAGREE", label: "Không đồng ý" },
  { value: "NEUTRAL", label: "Bình thường" },
  { value: "AGREE", label: "Đồng ý" },
  { value: "STRONGLY_AGREE", label: "Rất đồng ý" },
];

const DURATION_OPTIONS = [
  { value: "TOO_LONG", label: "Quá dài" },
  { value: "LONG", label: "Dài" },
  { value: "JUST_RIGHT", label: "Vừa đủ" },
  { value: "SHORT", label: "Ngắn" },
  { value: "TOO_SHORT", label: "Quá ngắn" },
];

// =====================================================
// CÂU HỎI
// =====================================================
const RADIO_QUESTIONS = [
  {
    field: "q1_content_meets_objective",
    label: "Câu 1: Nội dung khóa học đáp ứng được mục tiêu đề ra",
    required: true,
    options: SATISFACTION_OPTIONS,
  },
  {
    field: "q2_materials_clear_useful",
    label: "Câu 2: Tài liệu học tập (slide, giáo trình) rõ ràng, hữu ích",
    required: true,
    options: SATISFACTION_OPTIONS,
  },
  {
    field: "q3_knowledge_practical",
    label: "Câu 3: Kiến thức có tính thực tiễn cao, đã áp dụng vào công việc",
    required: false,
    options: AGREEMENT_OPTIONS,
  },
  {
    field: "q4_trainer_expertise",
    label: "Câu 4: Giảng viên có kiến thức chuyên môn sâu rộng",
    required: false,
    options: AGREEMENT_OPTIONS,
  },
  {
    field: "q5_trainer_delivery",
    label: "Câu 5: Phong cách truyền đạt của giảng viên rõ ràng, lôi cuốn",
    required: false,
    options: AGREEMENT_OPTIONS,
  },
  {
    field: "q6_trainer_support",
    label: "Câu 6: Giảng viên giải đáp thắc mắc của học viên tốt",
    required: false,
    options: SATISFACTION_OPTIONS,
  },
  {
    field: "q7_duration",
    label: "Câu 7: Thời lượng khóa học (quá dài/quá ngắn/vừa đủ)",
    required: false,
    options: DURATION_OPTIONS,
  },
];

const TEXT_QUESTIONS = [
  {
    field: "q8_most_satisfied",
    label: "Câu 8: Điểm bạn cảm thấy hài lòng nhất về khóa học là gì?",
  },
  {
    field: "q9_improvement",
    label: "Câu 9: Điểm nào khóa học cần cải thiện để tốt hơn?",
  },
  {
    field: "q10_next_course_suggestion",
    label: "Câu 10: Đề xuất của bạn về các khóa học tiếp theo (nếu có)",
  },
];

function createInitialForm() {
  const fields = [
    ...RADIO_QUESTIONS.map((question) => question.field),
    ...TEXT_QUESTIONS.map((question) => question.field),
  ];

  return fields.reduce((form, field) => ({ ...form, [field]: "" }), {});
}

export default function CourseSurvey() {
  const { classId, token } = useParams();

  const [courseClass, setCourseClass] = useState(null);
  const [form, setForm] = useState(createInitialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // LOAD LỚP HỌC
  // =====================================================
  useEffect(() => {
    const loadClass = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/course-surveys/classes/${classId}/${token}`,
        );

        const data = response.data?.data || null;

        if (!data) {
          setError("Không tìm thấy lớp học.");
          return;
        }

        setCourseClass(data);
      } catch (err) {
        console.error("Lỗi tải lớp học:", err);

        setError(
          err.response?.data?.message || "Không thể tải thông tin khảo sát.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadClass();
  }, [classId, token]);

  // =====================================================
  // CHANGE
  // =====================================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // =====================================================
  // CLEAR
  // =====================================================
  const handleClear = () => {
    setForm(createInitialForm());
    setError("");
  };

  // =====================================================
  // VALIDATE
  // =====================================================
  const validate = () => {
    for (const question of RADIO_QUESTIONS) {
      if (question.required && !form[question.field]) {
        return `Vui lòng trả lời "${question.label}".`;
      }
    }

    return "";
  };

  // =====================================================
  // SUBMIT
  // =====================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      scrollToTop();

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = Object.keys(form).reduce((result, field) => {
        result[field] = form[field].trim();

        return result;
      }, {});

      const response = await axios.post(
        `${API_URL}/course-surveys/classes/${classId}/${token}`,
        payload,
      );

      setSuccessData(response.data?.data || {});
    } catch (err) {
      console.error("Lỗi gửi khảo sát:", err);

      setError(
        err.response?.data?.message ||
          "Không thể gửi khảo sát. Vui lòng thử lại.",
      );

      scrollToTop();
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={42} className="mx-auto animate-spin text-green-600" />

          <p className="mt-4 text-slate-500">Đang tải thông tin khảo sát...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================
  if (!courseClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Không thể mở khảo sát
          </h1>

          <p className="mt-3 text-slate-500">
            {error || "Liên kết khảo sát không hợp lệ."}
          </p>
        </div>
      </div>
    );
  }

  const courseName = courseClass.course_name || courseClass.class_name;

  // =====================================================
  // SUCCESS
  // =====================================================
  if (successData) {
    const successClass = successData.class || courseClass;

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={42} />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Gửi khảo sát thành công!
            </h1>

            <p className="mt-3 leading-7 text-slate-500">
              Cảm ơn Anh/Chị đã đánh giá khóa học cho SIHUB.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                Khóa học
              </p>

              <h2 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                {successClass.course_name || successClass.class_name}
              </h2>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">Lớp:</span>{" "}
                  {successClass.class_name}
                </div>

                {successClass.class_code && (
                  <div>
                    <span className="font-semibold text-slate-800">Mã lớp:</span>{" "}
                    {successClass.class_code}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // FORM
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* TIÊU ĐỀ */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-t-4 border-green-600 px-6 py-7 sm:px-8">
            <h1 className="text-2xl font-bold uppercase leading-tight text-slate-900 sm:text-3xl">
              BẢNG ĐÁNH GIÁ SAU KHÓA HỌC
            </h1>

            <h2 className="mt-2 text-xl font-bold uppercase leading-tight text-slate-700 sm:text-2xl">
              {courseName}
            </h2>

            <p className="mt-5 text-sm text-slate-500">
              Các câu hỏi có dấu <span className="text-red-500">*</span> là bắt
              buộc.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CÂU HỎI */}
        <div className="mt-6 space-y-5">
          {RADIO_QUESTIONS.map((question) => (
            <QuestionCard key={question.field}>
              <Field label={question.label} required={question.required}>
                <div className="space-y-3 pt-1">
                  {question.options.map((option) => (
                    <Radio
                      key={option.value}
                      name={question.field}
                      value={option.value}
                      checked={form[question.field] === option.value}
                      onChange={handleChange}
                      label={option.label}
                    />
                  ))}
                </div>
              </Field>
            </QuestionCard>
          ))}

          {TEXT_QUESTIONS.map((question) => (
            <QuestionCard key={question.field}>
              <Field label={question.label}>
                <textarea
                  name={question.field}
                  value={form[question.field]}
                  onChange={handleChange}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Your answer"
                />
              </Field>
            </QuestionCard>
          ))}
        </div>

        {/* HÀNH ĐỘNG */}
        <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-red-600"
          >
            Clear form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send size={19} />
                Submit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// =====================================================
// COMPONENTS
// =====================================================
function QuestionCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      {children}
    </div>
  );
}
