import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// =====================================================
// LĨNH VỰC DỰ ÁN
// =====================================================
const PROJECT_FIELDS = [
  {
    value: "ECOMMERCE",
    label: "Lĩnh vực Thương mại điện tử",
  },
  {
    value: "FINTECH",
    label: "Lĩnh vực Công nghệ tài chính",
  },
  {
    value: "LOGISTICS",
    label: "Lĩnh vực Logistic",
  },
  {
    value: "EDTECH",
    label: "Lĩnh vực Công nghệ giáo dục",
  },
  {
    value: "HEALTHCARE",
    label: "Lĩnh vực Y tế và chăm sóc sức khỏe",
  },
  {
    value: "HIGH_TECH_AGRICULTURE",
    label: "Lĩnh vực Nông nghiệp công nghệ cao",
  },
  {
    value: "SUSTAINABILITY",
    label: "Lĩnh vực Phát triển bền vững",
  },
  {
    value: "AI_DIGITAL_TRANSFORMATION",
    label: "Lĩnh vực Chuyển đổi số, trí tuệ nhân tạo",
  },
  {
    value: "CYBERSECURITY",
    label: "Lĩnh vực An ninh mạng",
  },
  {
    value: "CULTURAL_INDUSTRY",
    label: "Lĩnh vực công nghiệp văn hoá",
  },
  {
    value: "OTHER",
    label: "Lĩnh vực khác",
  },
];

const INITIAL_FORM = {
  fullname: "",
  position: "",
  organization: "",
  phone: "",
  email: "",

  gender: "",
  female_founder: "",
  age_group: "",
  user_type: "",

  project_field: "",
  project_field_other: "",

  startup_stage: "",
  team_size: "",
  program_selection_status: "",

  networking_expectation: "",
  special_connection_request: "",
  organizer_question: "",

  exhibition_product_name: "",
  exhibition_product_quantity: "",

  sold_or_ordered_quantity: "",
  visitor_count: "",
  b2b_matching_count: "",
  public_sector_connection_count: "",

  mou_count: "",
  exhibition_revenue: "",

  highlight_impression: "",
  want_to_join_again: "",

  organizer_feedback: "",
  other_sharing: "",
};

export default function ExhibitionSurvey() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // =====================================================
  // LOAD TRIỂN LÃM
  // =====================================================
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/startup-connection/events/${id}`,
        );

        const data = response.data?.data || null;

        if (!data) {
          setError("Không tìm thấy triển lãm.");
          return;
        }

        if (String(data.event_type || "").toUpperCase() !== "EXHIBITION") {
          setError("Biểu mẫu khảo sát này chỉ áp dụng cho Triển lãm.");
          return;
        }

        setEvent(data);
      } catch (err) {
        console.error("Lỗi tải triển lãm:", err);

        setError(
          err.response?.data?.message || "Không thể tải thông tin triển lãm.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

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
  // VALIDATE
  // =====================================================
  const validate = () => {
    if (!form.fullname.trim()) {
      return "Vui lòng nhập họ và tên.";
    }

    if (!form.position.trim()) {
      return "Vui lòng nhập chức vụ.";
    }

    if (!form.organization.trim()) {
      return "Vui lòng nhập đơn vị công tác.";
    }

    if (!form.phone.trim()) {
      return "Vui lòng nhập số điện thoại.";
    }

    const phone = form.phone.replace(/\D/g, "");

    if (phone.length < 9 || phone.length > 11) {
      return "Số điện thoại không hợp lệ.";
    }

    if (!form.email.trim()) {
      return "Vui lòng nhập địa chỉ email.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email.trim())) {
      return "Email không hợp lệ.";
    }
    if (!form.gender) {
      return "Vui lòng chọn giới tính.";
    }

    if (form.female_founder === "") {
      return "Vui lòng cho biết dự án có nữ Founder/Co-Founder hay không.";
    }

    if (!form.age_group) {
      return "Vui lòng chọn nhóm tuổi.";
    }

    if (!form.user_type) {
      return "Vui lòng chọn nhóm đối tượng.";
    }
    if (!form.project_field) {
      return "Vui lòng chọn lĩnh vực dự án.";
    }

    if (form.project_field === "OTHER" && !form.project_field_other.trim()) {
      return "Vui lòng ghi rõ lĩnh vực khác.";
    }
    if (!form.startup_stage) {
      return "Vui lòng chọn giai đoạn của Startup/Dự án.";
    }

    if (!form.team_size.trim()) {
      return "Vui lòng nhập số lượng nhân sự.";
    }

    if (!form.program_selection_status) {
      return "Vui lòng chọn tình trạng tham gia chương trình ươm tạo/tăng tốc.";
    }
    if (!form.exhibition_product_name.trim()) {
      return "Vui lòng nhập tên sản phẩm trưng bày.";
    }

    if (!form.exhibition_product_quantity.trim()) {
      return "Vui lòng nhập số sản phẩm trưng bày.";
    }

    const requiredNumbers = [
      {
        value: form.sold_or_ordered_quantity,
        message: "Vui lòng nhập số lượng sản phẩm đã bán/đặt hàng.",
      },
      {
        value: form.visitor_count,
        message: "Vui lòng nhập số lượt khách ghé thăm gian hàng.",
      },
      {
        value: form.b2b_matching_count,
        message: "Vui lòng nhập số lượt B2B matching.",
      },
      {
        value: form.public_sector_connection_count,
        message: "Vui lòng nhập số lượt kết nối với khu vực công.",
      },
    ];

    for (const item of requiredNumbers) {
      if (
        item.value === "" ||
        Number(item.value) < 0 ||
        Number.isNaN(Number(item.value))
      ) {
        return item.message;
      }
    }

    if (
      form.mou_count !== "" &&
      (Number(form.mou_count) < 0 || Number.isNaN(Number(form.mou_count)))
    ) {
      return "Số MOU không hợp lệ.";
    }

    if (
      form.exhibition_revenue !== "" &&
      (Number(form.exhibition_revenue) < 0 ||
        Number.isNaN(Number(form.exhibition_revenue)))
    ) {
      return "Doanh thu không hợp lệ.";
    }

    if (!form.highlight_impression.trim()) {
      return "Vui lòng chia sẻ điểm đặc biệt ấn tượng.";
    }

    if (!form.want_to_join_again) {
      return "Vui lòng cho biết đơn vị có muốn tiếp tục tham gia không.";
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

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        fullname: form.fullname.trim(),
        position: form.position.trim(),
        organization: form.organization.trim(),

        phone: form.phone.replace(/\D/g, ""),

        email: form.email.trim().toLowerCase(),
        gender: form.gender,

        female_founder: form.female_founder === "YES",

        age_group: form.age_group,

        user_type: form.user_type,

        project_field: form.project_field,

        project_field_other:
          form.project_field === "OTHER"
            ? form.project_field_other.trim()
            : null,
        startup_stage: form.startup_stage,

        team_size: form.team_size.trim(),

        program_selection_status: form.program_selection_status,

        networking_expectation: form.networking_expectation.trim() || null,

        special_connection_request:
          form.special_connection_request.trim() || null,

        organizer_question: form.organizer_question.trim() || null,

        exhibition_product_name: form.exhibition_product_name.trim(),

        exhibition_product_quantity: form.exhibition_product_quantity.trim(),

        sold_or_ordered_quantity: Number(form.sold_or_ordered_quantity),

        visitor_count: Number(form.visitor_count),

        b2b_matching_count: Number(form.b2b_matching_count),

        public_sector_connection_count: Number(
          form.public_sector_connection_count,
        ),

        mou_count: form.mou_count === "" ? null : Number(form.mou_count),

        exhibition_revenue:
          form.exhibition_revenue === ""
            ? null
            : Number(form.exhibition_revenue),

        highlight_impression: form.highlight_impression.trim(),

        want_to_join_again: form.want_to_join_again,

        organizer_feedback: form.organizer_feedback.trim() || null,

        other_sharing: form.other_sharing.trim() || null,
      };

      const response = await axios.post(
        `${API_URL}/exhibition-surveys/events/${id}`,
        payload,
      );

      setSuccessData(response.data?.data || {});
    } catch (err) {
      console.error("Lỗi gửi khảo sát:", err);

      setError(
        err.response?.data?.message ||
          "Không thể gửi khảo sát. Vui lòng thử lại.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================
  const formatDateTime = (value) => {
    if (!value) return "Đang cập nhật";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Đang cập nhật";
    }

    return date.toLocaleString("vi-VN");
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={42} className="mx-auto animate-spin text-green-600" />

          <p className="mt-4 text-slate-500">Đang tải thông tin triển lãm...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR EVENT
  // =====================================================
  if (!event) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Không thể mở khảo sát
          </h1>

          <p className="mt-3 text-slate-500">
            {error || "Không tìm thấy triển lãm."}
          </p>

          <Link
            to="/exhibitions"
            className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Quay lại Triển lãm
          </Link>
        </div>
      </div>
    );
  }

  // =====================================================
  // SUCCESS
  // =====================================================
  if (successData) {
    const successEvent = successData.event || event;

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
              Cảm ơn Anh/Chị đã cung cấp thông tin cho SIHUB.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                Triển lãm
              </p>

              <h2 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                {successEvent?.event_name}
              </h2>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">
                    Người phản hồi:
                  </span>{" "}
                  {successData.survey?.fullname || form.fullname}
                </div>

                <div>
                  <span className="font-semibold text-slate-800">Đơn vị:</span>{" "}
                  {successData.survey?.organization || form.organization}
                </div>

                <div>
                  <span className="font-semibold text-slate-800">
                    Sản phẩm:
                  </span>{" "}
                  {successData.survey?.exhibition_product_name ||
                    form.exhibition_product_name}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={`/exhibitions/${id}`}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xem lại triển lãm
              </Link>

              <Link
                to="/exhibitions"
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Xem triển lãm khác
              </Link>
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
      <div className="mx-auto max-w-7xl px-6">
        <Link
          to={`/exhibitions/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-green-600"
        >
          <ArrowLeft size={18} />
          Quay lại triển lãm
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* ================= FORM ================= */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                Khảo sát triển lãm SIHUB
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Phiếu khảo sát sau triển lãm
              </h1>

              <p className="mt-3 leading-7 text-slate-500">
                Vui lòng cung cấp đầy đủ thông tin để SIHUB tổng hợp kết quả
                chương trình.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Các trường có dấu <span className="text-red-500">*</span> là bắt
                buộc.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* =====================================
                  1. THÔNG TIN ĐƠN VỊ
              ===================================== */}
              <Section title="1. Thông tin người đại diện / đơn vị">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Họ và tên" required>
                    <input
                      type="text"
                      name="fullname"
                      value={form.fullname}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Nguyễn Văn A"
                    />
                  </Field>

                  <Field label="Chức vụ" required>
                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Founder, CEO..."
                    />
                  </Field>

                  <Field label="Đơn vị công tác" required>
                    <input
                      type="text"
                      name="organization"
                      value={form.organization}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Startup ABC"
                    />
                  </Field>

                  <Field label="Số điện thoại" required>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="0909 123 456"
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Địa chỉ email" required>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="email@example.com"
                      />
                    </Field>
                  </div>
                </div>
              </Section>
              <Section title="2. Thông tin người tham gia">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Giới tính" required>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </Field>

                  <Field
                    label="Dự án của bạn có nữ là Founder/Co-Founder không?"
                    required
                  >
                    <div className="flex gap-6 pt-2">
                      <Radio
                        name="female_founder"
                        value="YES"
                        checked={form.female_founder === "YES"}
                        onChange={handleChange}
                        label="Có"
                      />

                      <Radio
                        name="female_founder"
                        value="NO"
                        checked={form.female_founder === "NO"}
                        onChange={handleChange}
                        label="Không"
                      />
                    </div>
                  </Field>

                  <Field label="Bạn thuộc nhóm tuổi nào sau đây?" required>
                    <select
                      name="age_group"
                      value={form.age_group}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn nhóm tuổi</option>
                      <option value="UNDER_18">Dưới 18 tuổi</option>
                      <option value="18-24">Từ 18-24 tuổi</option>
                      <option value="25-35">Từ 25-35 tuổi</option>
                      <option value="36-45">Từ 36-45 tuổi</option>
                      <option value="46_PLUS">Trên 45 tuổi</option>
                    </select>
                  </Field>

                  <Field label="Bạn thuộc nhóm đối tượng nào sau đây?" required>
                    <select
                      name="user_type"
                      value={form.user_type}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn nhóm đối tượng</option>
                      <option value="STARTUP">
                        Startup/Dự án (Chưa thành lập doanh nghiệp)
                      </option>
                      <option value="BUSINESS">Doanh nghiệp</option>
                      <option value="STUDENT">Sinh viên</option>
                      <option value="UNIVERSITY">
                        Trường đại học, viện nghiên cứu...
                      </option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </Field>
                </div>
              </Section>
              {/* =====================================
                  2. PROJECT
              ===================================== */}
              <Section title="3. Thông tin dự án / sản phẩm">
                {/* LĨNH VỰC */}
                <Field
                  label="Dự án/ý tưởng của bạn thuộc lĩnh vực nào sau đây?"
                  required
                >
                  <select
                    name="project_field"
                    value={form.project_field}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Chọn lĩnh vực dự án</option>

                    {PROJECT_FIELDS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* LĨNH VỰC KHÁC */}
                {form.project_field === "OTHER" && (
                  <div className="mt-5">
                    <Field label="Lĩnh vực khác" required>
                      <input
                        type="text"
                        name="project_field_other"
                        value={form.project_field_other}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Vui lòng ghi rõ lĩnh vực..."
                      />
                    </Field>
                  </div>
                )}

                {/* GIAI ĐOẠN + NHÂN SỰ */}
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field
                    label="Nếu là Startup/Dự án, bạn đang ở giai đoạn nào?"
                    required
                  >
                    <select
                      name="startup_stage"
                      value={form.startup_stage}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn giai đoạn</option>
                      <option value="NONE">Không có startup</option>
                      <option value="IDEA">Giai đoạn ý tưởng</option>
                      <option value="PROTOTYPE">Giai đoạn prototype</option>
                      <option value="MVP">Giai đoạn prototype/MVP</option>
                      <option value="EARLY_REVENUE">
                        Đã có sản phẩm và doanh thu ban đầu
                      </option>
                      <option value="GROWTH">Giai đoạn tăng trưởng</option>
                      <option value="SCALE">Giai đoạn mở rộng</option>
                    </select>
                  </Field>

                  <Field
                    label="Dự án/công ty của bạn có bao nhiêu nhân sự?"
                    required
                    description="Ví dụ: 2 nam, 3 nữ. Chưa có dự án/team ghi 0."
                  >
                    <input
                      type="text"
                      name="team_size"
                      value={form.team_size}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ví dụ: 2 nam, 3 nữ"
                    />
                  </Field>
                </div>

                {/* NQ20 */}
                <div className="mt-6">
                  <Field
                    label="Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?"
                    required
                  >
                    <div className="flex flex-wrap gap-6">
                      <Radio
                        name="program_selection_status"
                        value="YES"
                        checked={form.program_selection_status === "YES"}
                        onChange={handleChange}
                        label="Tôi thuộc chương trình trên"
                      />

                      <Radio
                        name="program_selection_status"
                        value="NO"
                        checked={form.program_selection_status === "NO"}
                        onChange={handleChange}
                        label="Tôi không thuộc chương trình trên"
                      />
                    </div>
                  </Field>
                </div>

                {/* SẢN PHẨM TRƯNG BÀY */}
                <div className="mt-6 space-y-5">
                  <Field label="Tên sản phẩm trưng bày triển lãm" required>
                    <input
                      type="text"
                      name="exhibition_product_name"
                      value={form.exhibition_product_name}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ví dụ: Máy đo huyết áp"
                    />
                  </Field>

                  <Field
                    label="Số sản phẩm trưng bày triển lãm"
                    required
                    description="Ghi số lượng và tên sản phẩm. Ví dụ: Máy đo huyết áp: 01 cái."
                  >
                    <textarea
                      name="exhibition_product_quantity"
                      value={form.exhibition_product_quantity}
                      onChange={handleChange}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      placeholder="Máy đo huyết áp: 01 cái"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="4. Nhu cầu kết nối">
                <Field label="Bạn tham quan triển lãm mà mong muốn gặp gỡ các Doanh nghiệp như thế nào?">
                  <textarea
                    name="networking_expectation"
                    value={form.networking_expectation}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <div className="mt-5">
                  <Field label="Bạn có yêu cầu đặc biệt nào về việc kết nối với các hoạt động trong triển lãm hoặc hội thảo không?">
                    <textarea
                      name="special_connection_request"
                      value={form.special_connection_request}
                      onChange={handleChange}
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field label="Câu hỏi dành cho Ban tổ chức (nếu có)">
                    <textarea
                      name="organizer_question"
                      value={form.organizer_question}
                      onChange={handleChange}
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>
              </Section>
              {/* =====================================
                  3. RESULTS
              ===================================== */}
              <Section title="5. Kết quả triển lãm">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Số lượng sản phẩm đã bán / được đặt hàng trong đợt triển lãm này?"
                    required
                  >
                    <NumberInput
                      name="sold_or_ordered_quantity"
                      value={form.sold_or_ordered_quantity}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field
                    label="Số lượng khách ghé thăm gian hàng"
                    required
                    description="Vui lòng ghi rõ lượt. Ví dụ: 50 lượt."
                  >
                    <NumberInput
                      name="visitor_count"
                      value={form.visitor_count}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field
                    label="Số lượt B2B matching"
                    required
                    description="Kết nối với khách hàng / đối tác tiềm năng."
                  >
                    <NumberInput
                      name="b2b_matching_count"
                      value={form.b2b_matching_count}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field
                    label="Số lượt kết nối với Khu vực công"
                    required
                    description="Ví dụ: Bệnh viện, Phường/Xã..."
                  >
                    <NumberInput
                      name="public_sector_connection_count"
                      value={form.public_sector_connection_count}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field label="Số MOU đã ký kết (nếu có)">
                    <NumberInput
                      name="mou_count"
                      value={form.mou_count}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field label="Doanh thu thu được trong triển lãm (nếu có)">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="exhibition_revenue"
                      value={form.exhibition_revenue}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ví dụ: 50000000"
                    />
                  </Field>
                </div>
              </Section>

              {/* =====================================
                  4. REVIEW
              ===================================== */}
              <Section title="6. Đánh giá chương trình">
                <Field
                  label="Điểm đặc biệt ấn tượng của Đơn vị khi tham gia chương trình là gì?"
                  required
                >
                  <textarea
                    name="highlight_impression"
                    value={form.highlight_impression}
                    onChange={handleChange}
                    rows={5}
                    className={`${inputClass} resize-none`}
                    placeholder="Chia sẻ điểm ấn tượng của đơn vị..."
                  />
                </Field>

                <div className="mt-6">
                  <Field
                    label="Nếu có sự kiện tương tự, Đơn vị có muốn tiếp tục tham gia không?"
                    required
                  >
                    <div className="flex flex-wrap gap-6 pt-1">
                      <Radio
                        name="want_to_join_again"
                        value="YES"
                        checked={form.want_to_join_again === "YES"}
                        onChange={handleChange}
                        label="Có"
                      />

                      <Radio
                        name="want_to_join_again"
                        value="NO"
                        checked={form.want_to_join_again === "NO"}
                        onChange={handleChange}
                        label="Không"
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-6">
                  <Field label="Đơn vị có góp ý hoặc nhận xét nào giúp Ban tổ chức có thể tổ chức tốt hơn?">
                    <textarea
                      name="organizer_feedback"
                      value={form.organizer_feedback}
                      onChange={handleChange}
                      rows={5}
                      className={`${inputClass} resize-none`}
                      placeholder="Chia sẻ góp ý với Ban tổ chức..."
                    />
                  </Field>
                </div>

                <div className="mt-6">
                  <Field label="Chia sẻ khác (nếu có)">
                    <textarea
                      name="other_sharing"
                      value={form.other_sharing}
                      onChange={handleChange}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      placeholder="Nhập chia sẻ khác..."
                    />
                  </Field>
                </div>
              </Section>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Đang gửi khảo sát...
                  </>
                ) : (
                  <>
                    <Send size={19} />
                    Gửi khảo sát
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ================= SUMMARY ================= */}
          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <ClipboardList size={25} />
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-green-600">
                Triển lãm
              </p>

              <h2 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                {event.event_name}
              </h2>

              <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                <SummaryItem
                  icon={<CalendarDays size={18} />}
                  title="Thời gian"
                  value={formatDateTime(event.start_datetime)}
                />

                <SummaryItem
                  icon={<MapPin size={18} />}
                  title="Địa điểm"
                  value={event.location || "Đang cập nhật"}
                />

                <SummaryItem
                  icon={<Building2 size={18} />}
                  title="Đơn vị tổ chức"
                  value={event.organizer || "SIHUB"}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Thông tin khảo sát
                </p>

                <p className="mt-1 text-sm leading-6 text-green-700">
                  Dữ liệu được SIHUB sử dụng để tổng hợp kết quả và đánh giá
                  chương trình.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// COMPONENTS
// =====================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-50";

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-5 border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Field({ label, required = false, description, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold leading-6 text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {description && (
        <p className="mb-2 text-xs leading-5 text-slate-400">{description}</p>
      )}

      {children}
    </div>
  );
}

function NumberInput({ name, value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      name={name}
      value={value}
      onChange={onChange}
      className={inputClass}
      placeholder="0"
    />
  );
}

function Radio({ name, value, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />

      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function SummaryItem({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-green-600">{icon}</div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-400">{title}</p>

        <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
