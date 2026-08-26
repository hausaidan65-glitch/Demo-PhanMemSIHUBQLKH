import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const roleOptions = [
  {
    value: "STARTUP",
    label: "Startup / Dự án khởi nghiệp",
  },
  {
    value: "BUSINESS",
    label: "Doanh nghiệp",
  },
  {
    value: "STUDENT",
    label: "Sinh viên",
  },
  {
    value: "UNIVERSITY",
    label: "Trường đại học / Viện nghiên cứu",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

function formatDateTime(value) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Đang cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function StartupEventRegister() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",

    organization: "",
    position: "",

    gender: "",
    age_group: "",
    user_type: "",

    has_project: "",
    project_field: "",
    startup_stage: "",

    program_selection_status: "",

    support_needs: "",
    organizer_question: "",
  });

  const [loadingEvent, setLoadingEvent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // =====================================================
  // LOAD EVENT
  // =====================================================
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoadingEvent(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/startup-connection/events/${id}`,
        );

        const data = response.data?.data || response.data;

        setEvent(data);
      } catch (err) {
        console.error("Không thể tải sự kiện:", err);

        setError(
          err.response?.data?.message || "Không thể tải thông tin sự kiện.",
        );
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEvent();
  }, [id]);

  // =====================================================
  // INPUT CHANGE
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // =====================================================
  // VALIDATE FRONTEND
  // =====================================================
  const validate = () => {
    if (!form.fullname.trim()) {
      return "Vui lòng nhập họ và tên.";
    }

    if (!form.organization.trim()) {
      return "Vui lòng nhập đơn vị.";
    }

    if (!form.position.trim()) {
      return "Vui lòng nhập chức vụ.";
    }

    if (!form.email.trim()) {
      return "Vui lòng nhập email.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email.trim())) {
      return "Email không hợp lệ.";
    }

    if (!form.phone.trim()) {
      return "Vui lòng nhập số điện thoại.";
    }

    if (!form.gender) {
      return "Vui lòng chọn giới tính.";
    }

    if (!form.age_group) {
      return "Vui lòng chọn nhóm tuổi.";
    }

    if (!form.user_type) {
      return "Vui lòng chọn nhóm đối tượng.";
    }

    if (form.has_project === "") {
      return "Vui lòng cho biết bạn có dự án khởi nghiệp hay chưa.";
    }

    if (form.has_project === true) {
      if (!form.project_field.trim()) {
        return "Vui lòng nhập lĩnh vực dự án.";
      }

      if (!form.startup_stage) {
        return "Vui lòng chọn giai đoạn dự án.";
      }
    }

    if (!form.program_selection_status) {
      return "Vui lòng chọn tình trạng tuyển chọn chương trình.";
    }

    return "";
  };

  // =====================================================
  // SUBMIT
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await axios.post(
        `${API_URL}/startup-connection/events/${id}/register`,
        {
          fullname: form.fullname.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.replace(/\D/g, ""),

          organization: form.organization.trim(),
          position: form.position.trim(),

          gender: form.gender,
          age_group: form.age_group,
          user_type: form.user_type,

          has_project: form.has_project === true,

          project_field:
            form.has_project === true
              ? form.project_field.trim() || null
              : null,

          startup_stage:
            form.has_project === true ? form.startup_stage || null : null,

          program_selection_status: form.program_selection_status,

          support_needs: form.support_needs.trim() || null,

          organizer_question: form.organizer_question.trim() || null,
        },
      );
      setSuccessData(response.data?.data || {});
    } catch (err) {
      console.error("Lỗi đăng ký:", err);

      setError(
        err.response?.data?.message ||
          "Không thể đăng ký tham gia. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loadingEvent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-gray-500">Đang tải thông tin sự kiện...</p>
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
      <div className="min-h-[70vh] bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="px-6 py-10 text-center sm:px-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-10 w-10 text-green-600"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                Đăng ký thành công!
              </h1>

              <p className="mt-3 text-gray-500">
                Bạn đã đăng ký tham gia sự kiện
              </p>

              <div className="mt-7 rounded-2xl bg-gray-50 p-6 text-left">
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {successEvent?.event_type === "SEMINAR"
                    ? "Hội thảo"
                    : "Triển lãm"}
                </span>

                <h2 className="mt-4 text-xl font-bold leading-relaxed text-gray-900">
                  {successEvent?.event_name || "Startup Connection Day"}
                </h2>

                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-800">
                      Thời gian:
                    </span>

                    <span>{formatDateTime(successEvent?.start_datetime)}</span>
                  </div>

                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-800">
                      Địa điểm:
                    </span>

                    <span>{successEvent?.location || "Đang cập nhật"}</span>
                  </div>

                  {successData.participant?.participant_role && (
                    <div className="flex gap-3">
                      <span className="font-semibold text-gray-800">
                        Vai trò:
                      </span>

                      <span>
                        {
                          roleOptions.find(
                            (role) =>
                              role.value ===
                              successData.participant.participant_role,
                          )?.label
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to={`/startup-connection-day/${id}`}
                  className="rounded-xl border border-gray-200 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Xem lại sự kiện
                </Link>

                <Link
                  to="/events"
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Xem các sự kiện khác
                </Link>
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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* BACK */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-blue-600"
        >
          ← Quay lại sự kiện
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* FORM */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Startup Connection Day
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                Đăng ký tham gia
              </h1>

              <p className="mt-3 text-gray-500">
                Vui lòng cung cấp thông tin để hoàn tất đăng ký tham gia chương
                trình.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* PERSONAL INFO */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Thông tin người đăng ký
                </h2>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      name="fullname"
                      value={form.fullname}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="0909 123 456"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Đơn vị / tổ chức <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      name="organization"
                      value={form.organization}
                      onChange={handleChange}
                      placeholder="Tên công ty / tổ chức"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Chức vụ <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Founder, CEO..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </section>

              {/* PERSONAL CLASSIFICATION */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Thông tin phân loại
                </h2>

                <div className="grid gap-5 md:grid-cols-2">
                  {/* GENDER */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Giới tính <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  {/* AGE */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Nhóm tuổi <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="age_group"
                      value={form.age_group}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Chọn nhóm tuổi</option>
                      <option value="UNDER_18">Dưới 18 tuổi</option>
                      <option value="18-25">18–25 tuổi</option>
                      <option value="26-35">26–35 tuổi</option>
                      <option value="36-45">36–45 tuổi</option>
                      <option value="46_PLUS">Trên 45 tuổi</option>
                    </select>
                  </div>

                  {/* USER TYPE */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Bạn thuộc nhóm đối tượng nào sau đây?{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="user_type"
                      value={form.user_type}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Chọn nhóm đối tượng</option>
                      <option value="STARTUP">
                        Startup / Dự án khởi nghiệp
                      </option>
                      <option value="BUSINESS">Doanh nghiệp</option>
                      <option value="STUDENT">Sinh viên</option>
                      <option value="UNIVERSITY">
                        Trường đại học / Viện nghiên cứu
                      </option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* PROJECT */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Thông tin khởi nghiệp
                </h2>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-700">
                    Bạn có dự án khởi nghiệp hay chưa?{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="flex flex-wrap gap-6">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="has_project"
                        checked={form.has_project === true}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            has_project: true,
                          }));

                          setError("");
                        }}
                      />
                      <span>Có</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="has_project"
                        checked={form.has_project === false}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            has_project: false,
                            project_field: "",
                            startup_stage: "",
                          }));

                          setError("");
                        }}
                      />
                      <span>Chưa</span>
                    </label>
                  </div>
                </div>

                {form.has_project === true && (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Lĩnh vực dự án <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        name="project_field"
                        value={form.project_field}
                        onChange={handleChange}
                        placeholder="Ví dụ: Chuyển đổi số, trí tuệ nhân tạo"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Giai đoạn dự án <span className="text-red-500">*</span>
                      </label>

                      <select
                        name="startup_stage"
                        value={form.startup_stage}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">Chọn giai đoạn</option>
                        <option value="IDEA">Ý tưởng</option>
                        <option value="MVP">MVP / Sản phẩm thử nghiệm</option>
                        <option value="EARLY">Giai đoạn đầu</option>
                        <option value="GROWTH">Tăng trưởng</option>
                        <option value="SCALE">Mở rộng</option>
                      </select>
                    </div>
                  </div>
                )}
              </section>

              {/* NQ20 */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Chương trình ươm tạo / tăng tốc
                </h2>

                <label className="mb-3 block text-sm font-semibold leading-relaxed text-gray-700">
                  Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo
                  Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="program_selection_status"
                      value="YES"
                      checked={form.program_selection_status === "YES"}
                      onChange={handleChange}
                    />
                    <span>Có</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="program_selection_status"
                      value="NO"
                      checked={form.program_selection_status === "NO"}
                      onChange={handleChange}
                    />
                    <span>Chưa</span>
                  </label>
                </div>
              </section>

              {/* SUPPORT */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Nhu cầu hỗ trợ
                </h2>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nhu cầu cần được hỗ trợ?
                </label>

                <textarea
                  name="support_needs"
                  value={form.support_needs}
                  onChange={handleChange}
                  rows={4}
                  maxLength={2000}
                  placeholder="Nhập nhu cầu cần SIHUB hỗ trợ..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </section>

              {/* ORGANIZER QUESTION */}
              <section>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  Trao đổi với Ban tổ chức
                </h2>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Câu hỏi dành cho Ban tổ chức nếu có?
                </label>

                <textarea
                  name="organizer_question"
                  value={form.organizer_question}
                  onChange={handleChange}
                  rows={4}
                  maxLength={2000}
                  placeholder="Nhập câu hỏi dành cho Ban tổ chức..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </section>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Đang đăng ký..." : "Đăng ký tham gia"}
              </button>
            </form>
          </div>

          {/* EVENT SUMMARY */}
          <aside>
            <div className="sticky top-24 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {event?.thumbnail && (
                <img
                  src={event.thumbnail}
                  alt={event.event_name}
                  className="h-52 w-full object-cover"
                />
              )}

              <div className="p-6">
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  {event?.event_type === "SEMINAR" ? "Hội thảo" : "Triển lãm"}
                </span>

                <h2 className="mt-4 text-xl font-bold leading-relaxed text-gray-900">
                  {event?.event_name}
                </h2>

                {event?.parent_event_name && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Thuộc triển lãm
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-relaxed text-gray-700">
                      {event.parent_event_name}
                    </p>
                  </div>
                )}

                <div className="mt-6 space-y-4 border-t border-gray-100 pt-5 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Thời gian
                    </p>

                    <p className="mt-1 font-medium text-gray-700">
                      {formatDateTime(event?.start_datetime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Địa điểm
                    </p>

                    <p className="mt-1 leading-relaxed text-gray-700">
                      {event?.location || "Đang cập nhật"}
                    </p>
                  </div>

                  {event?.organizer && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Đơn vị tổ chức
                      </p>

                      <p className="mt-1 text-gray-700">{event.organizer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
