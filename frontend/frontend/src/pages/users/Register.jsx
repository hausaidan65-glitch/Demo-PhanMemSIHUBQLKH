import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Send,
  UserRound,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const INITIAL_FORM = {
  fullname: "",
  phone: "",
  email: "",
  company: "",
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
};

function formatDateTime(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateVietnamPhone(value) {
  const phone = normalizePhone(value);

  return /^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(phone);
}

export default function Register() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const [loadingClass, setLoadingClass] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [apiMessage, setApiMessage] = useState("");

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      setLoadingClass(true);
      setApiMessage("");

      if (!classId) {
        setClassInfo(null);
        setApiMessage("Không xác định được lớp học.");
        return;
      }

      const response = await axios.get(`${API_URL}/course-classes/${classId}`);

      setClassInfo(response.data?.data || null);
    } catch (error) {
      console.error("Lỗi tải lớp:", error.response?.data || error);

      setClassInfo(null);

      setApiMessage(
        error.response?.data?.message || "Không thể tải thông tin lớp học.",
      );
    } finally {
      setLoadingClass(false);
    }
  };

  const isRegistrationAvailable = useMemo(() => {
    if (!classInfo) {
      return false;
    }

    if (classInfo.status !== "OPEN") {
      return false;
    }

    const current = Number(classInfo.current_students) || 0;

    const maximum = Number(classInfo.max_students) || 0;

    if (maximum > 0 && current >= maximum) {
      return false;
    }

    const now = new Date();

    if (classInfo.register_open && now < new Date(classInfo.register_open)) {
      return false;
    }

    if (classInfo.register_close && now > new Date(classInfo.register_close)) {
      return false;
    }

    return true;
  }, [classInfo]);

  const updateField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiMessage("");
  };

  const validateForm = () => {
    const nextErrors = {};

    const fullname = form.fullname.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!fullname) {
      nextErrors.fullname = "Vui lòng nhập họ và tên.";
    } else if (fullname.length < 2) {
      nextErrors.fullname = "Họ tên phải có ít nhất 2 ký tự.";
    } else if (fullname.length > 100) {
      nextErrors.fullname = "Họ tên không được vượt quá 100 ký tự.";
    }

    if (!email) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!validateEmail(email)) {
      nextErrors.email = "Email không đúng định dạng.";
    } else if (email.length > 150) {
      nextErrors.email = "Email không được vượt quá 150 ký tự.";
    }

    if (!phone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!validateVietnamPhone(phone)) {
      nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ.";
    }
    if (!form.company.trim()) {
      nextErrors.company = "Vui lòng nhập đơn vị.";
    } else if (form.company.length > 200) {
      nextErrors.company = "Tên đơn vị không được vượt quá 200 ký tự.";
    }

    if (!form.position.trim()) {
      nextErrors.position = "Vui lòng nhập chức vụ.";
    } else if (form.position.length > 150) {
      nextErrors.position = "Chức vụ không được vượt quá 150 ký tự.";
    }
    if (!form.gender) {
      nextErrors.gender = "Vui lòng chọn giới tính.";
    }

    if (!form.age_group) {
      nextErrors.age_group = "Vui lòng chọn nhóm tuổi.";
    }

    if (!form.user_type) {
      nextErrors.user_type = "Vui lòng chọn đối tượng tham gia.";
    }

    if (!form.company.trim()) {
      nextErrors.company = "Vui lòng nhập đơn vị.";
    } else if (form.company.length > 200) {
      nextErrors.company = "Tên đơn vị không được vượt quá 200 ký tự.";
    }

    if (!form.position.trim()) {
      nextErrors.position = "Vui lòng nhập chức vụ.";
    } else if (form.position.length > 150) {
      nextErrors.position = "Chức vụ không được vượt quá 150 ký tự.";
    }

    if (!form.gender) {
      nextErrors.gender = "Vui lòng chọn giới tính.";
    }

    if (!form.age_group) {
      nextErrors.age_group = "Vui lòng chọn nhóm tuổi.";
    }

    if (!form.user_type) {
      nextErrors.user_type = "Vui lòng chọn đối tượng tham gia.";
    }

    // Bắt buộc chọn Có / Chưa có dự án
    if (form.has_project === "") {
      nextErrors.has_project =
        "Vui lòng cho biết bạn có dự án khởi nghiệp hay chưa.";
    }

    // Chỉ bắt lĩnh vực + giai đoạn khi CÓ dự án
    if (form.has_project === true) {
      if (!form.project_field.trim()) {
        nextErrors.project_field = "Vui lòng nhập lĩnh vực dự án.";
      }

      if (!form.startup_stage) {
        nextErrors.startup_stage = "Vui lòng chọn giai đoạn dự án.";
      }
    }

    // Câu NQ20 luôn bắt buộc
    if (!form.program_selection_status) {
      nextErrors.program_selection_status =
        "Vui lòng chọn tình trạng tuyển chọn chương trình.";
    }

    if (form.support_needs.length > 2000) {
      nextErrors.support_needs =
        "Nhu cầu hỗ trợ không được vượt quá 2000 ký tự.";
    }

    if (form.organizer_question.length > 2000) {
      nextErrors.organizer_question = "Câu hỏi không được vượt quá 2000 ký tự.";
    }
    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();

    setApiMessage("");

    if (!isRegistrationAvailable) {
      setApiMessage("Lớp học hiện không còn nhận đăng ký.");
      return;
    }

    if (!validateForm()) {
      setApiMessage("Vui lòng kiểm tra lại các thông tin bắt buộc.");
      return;
    }

    const payload = {
      class_id: Number(classId),

      fullname: form.fullname.trim(),

      phone: normalizePhone(form.phone),

      email: form.email.trim().toLowerCase(),

      gender: form.gender,

      age_group: form.age_group,

      company: form.company.trim() || null,

      position: form.position.trim() || null,

      user_type: form.user_type,

      has_project: form.has_project === true,

      project_field:
        form.has_project === true ? form.project_field.trim() || null : null,

      startup_stage:
        form.has_project === true ? form.startup_stage || null : null,

      program_selection_status: form.program_selection_status,

      support_needs: form.support_needs.trim() || null,

      organizer_question: form.organizer_question.trim() || null,
    };

    try {
      setSubmitting(true);

      const response = await axios.post(`${API_URL}/registrations`, payload);

      setSuccess(true);

      setApiMessage(response.data.message || "Đăng ký lớp học thành công.");
    } catch (error) {
      console.error("Lỗi đăng ký:", error.response?.data || error);

      setApiMessage(
        error.response?.data?.message ||
          "Không thể gửi đăng ký. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClass) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 size={38} className="mx-auto animate-spin text-green-600" />

          <p className="mt-4 text-slate-500">Đang tải thông tin lớp học...</p>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Không tìm thấy lớp học</p>

          <p className="mt-2 text-sm">{apiMessage}</p>

          <Link
            to="/courses"
            className="mt-5 inline-flex items-center gap-2 font-semibold"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách khóa học
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-green-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 size={64} className="mx-auto text-green-600" />

          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            Đăng ký thành công
          </h1>

          <p className="mt-3 text-slate-600">{apiMessage}</p>

          <p className="mt-2 text-sm text-slate-500">
            Đăng ký của bạn đã được ghi nhận thành công. SIHUB sẽ gửi thông tin
            chương trình đến email bạn đã cung cấp.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/courses"
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem khóa học khác
            </Link>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[350px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <Link
            to={`/courses/${classInfo.course_id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700"
          >
            <ArrowLeft size={17} />
            Quay lại khóa học
          </Link>

          <h2 className="mt-6 text-xl font-bold text-slate-900">
            {classInfo.class_name}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{classInfo.course_name}</p>

          <div className="mt-6 space-y-4">
            <ClassSummary
              icon={<UserRound size={18} />}
              label="Giảng viên"
              value={classInfo.trainer_name || "Đang cập nhật"}
            />

            <ClassSummary
              icon={<MapPin size={18} />}
              label="Địa điểm"
              value={classInfo.location || "Đang cập nhật"}
            />

            <ClassSummary
              icon={<CalendarDays size={18} />}
              label="Đóng đăng ký"
              value={formatDateTime(classInfo.register_close)}
            />
          </div>

          {!isRegistrationAvailable && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Lớp học hiện không nhận thêm đăng ký.
            </div>
          )}
        </aside>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Đăng ký tham gia lớp học
            </h1>

            <p className="mt-2 text-slate-500">
              Các trường có dấu <span className="text-red-500">*</span> là thông
              tin bắt buộc.
            </p>
          </div>

          {apiMessage && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiMessage}
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-8 space-y-8">
            <FormSection title="Thông tin cá nhân">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Họ và tên" required error={errors.fullname}>
                  <input
                    type="text"
                    value={form.fullname}
                    onChange={(event) =>
                      updateField("fullname", event.target.value)
                    }
                    maxLength={100}
                    placeholder="Nguyễn Văn A"
                    className={inputClass(errors.fullname)}
                  />
                </Field>

                <Field label="Email" required error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    maxLength={150}
                    placeholder="example@gmail.com"
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field label="Số điện thoại" required error={errors.phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    maxLength={15}
                    placeholder="0901234567"
                    className={inputClass(errors.phone)}
                  />
                </Field>

                <Field label="Giới tính" required error={errors.gender}>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      updateField("gender", event.target.value)
                    }
                    className={inputClass(errors.gender)}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </Field>

                <Field label="Nhóm tuổi" required error={errors.age_group}>
                  <select
                    value={form.age_group}
                    onChange={(event) =>
                      updateField("age_group", event.target.value)
                    }
                    className={inputClass(errors.age_group)}
                  >
                    <option value="">Chọn nhóm tuổi</option>
                    <option value="UNDER_18">Dưới 18 tuổi</option>
                    <option value="18_24">Từ 18–24 tuổi</option>
                    <option value="25_34">Từ 25–34 tuổi</option>
                    <option value="35_44">Từ 35–44 tuổi</option>
                    <option value="45_PLUS">Từ 45 tuổi trở lên</option>
                  </select>
                </Field>

                <Field
                  label="Đối tượng tham gia"
                  required
                  error={errors.user_type}
                >
                  <select
                    value={form.user_type}
                    onChange={(event) =>
                      updateField("user_type", event.target.value)
                    }
                    className={inputClass(errors.user_type)}
                  >
                    <option value="">Chọn đối tượng</option>
                    <option value="STARTUP">Startup</option>
                    <option value="STUDENT">Sinh viên</option>
                    <option value="BUSINESS">Doanh nghiệp</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </Field>

                <Field label="Đơn vị/Công ty" required error={errors.company}>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(event) =>
                      updateField("company", event.target.value)
                    }
                    maxLength={200}
                    placeholder="Tên công ty hoặc trường học"
                    className={inputClass(errors.company)}
                  />
                </Field>

                <Field label="Chức vụ" required error={errors.position}>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(event) =>
                      updateField("position", event.target.value)
                    }
                    maxLength={150}
                    placeholder="Nhân viên, sinh viên, founder..."
                    className={inputClass(errors.position)}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Thông tin dự án">
              <Field
                label="Bạn có dự án khởi nghiệp hay chưa?"
                required
                error={errors.has_project}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_project"
                      checked={form.has_project === true}
                      onChange={() => updateField("has_project", true)}
                    />
                    <span>Có</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="has_project"
                      checked={form.has_project === false}
                      onChange={() => {
                        updateField("has_project", false);

                        setForm((previous) => ({
                          ...previous,
                          has_project: false,
                          project_field: "",
                          startup_stage: "",
                        }));
                      }}
                    />
                    <span>Chưa</span>
                  </label>
                </div>
              </Field>

              {form.has_project === true && (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <Field
                    label="Lĩnh vực dự án"
                    required
                    error={errors.project_field}
                  >
                    <input
                      type="text"
                      value={form.project_field}
                      onChange={(event) =>
                        updateField("project_field", event.target.value)
                      }
                      maxLength={255}
                      placeholder="Công nghệ, giáo dục, nông nghiệp..."
                      className={inputClass(errors.project_field)}
                    />
                  </Field>

                  <Field
                    label="Giai đoạn dự án"
                    required
                    error={errors.startup_stage}
                  >
                    <select
                      value={form.startup_stage}
                      onChange={(event) =>
                        updateField("startup_stage", event.target.value)
                      }
                      className={inputClass(errors.startup_stage)}
                    >
                      <option value="">Chọn giai đoạn</option>
                      <option value="IDEA">Ý tưởng</option>
                      <option value="MVP">Đã có sản phẩm thử nghiệm</option>
                      <option value="EARLY_STAGE">
                        Đang phát triển thị trường
                      </option>
                      <option value="GROWTH">Đang tăng trưởng</option>
                    </select>
                  </Field>
                </div>
              )}
            </FormSection>
            <FormSection title="Chương trình ươm tạo / tăng tốc">
              <Field
                label="Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?"
                required
                error={errors.program_selection_status}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="program_selection_status"
                      value="YES"
                      checked={form.program_selection_status === "YES"}
                      onChange={() =>
                        updateField("program_selection_status", "YES")
                      }
                    />
                    <span>Có</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="program_selection_status"
                      value="NO"
                      checked={form.program_selection_status === "NO"}
                      onChange={() =>
                        updateField("program_selection_status", "NO")
                      }
                    />
                    <span>Chưa</span>
                  </label>
                </div>
              </Field>
            </FormSection>

            <FormSection title="Nhu cầu hỗ trợ">
              <Field
                label="Nhu cầu cần được hỗ trợ?"
                error={errors.support_needs}
              >
                <textarea
                  rows={4}
                  value={form.support_needs}
                  onChange={(event) =>
                    updateField("support_needs", event.target.value)
                  }
                  maxLength={2000}
                  placeholder="Nhập nhu cầu cần SIHUB hỗ trợ..."
                  className={inputClass(errors.support_needs)}
                />
              </Field>
            </FormSection>

            <FormSection title="Trao đổi với Ban tổ chức">
              <Field
                label="Câu hỏi dành cho Ban tổ chức nếu có?"
                error={errors.organizer_question}
              >
                <textarea
                  rows={4}
                  value={form.organizer_question}
                  onChange={(event) =>
                    updateField("organizer_question", event.target.value)
                  }
                  maxLength={2000}
                  placeholder="Nhập câu hỏi dành cho Ban tổ chức..."
                  className={inputClass(errors.organizer_question)}
                />
              </Field>
            </FormSection>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                to={`/courses/${classInfo.course_id}`}
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </Link>

              <button
                type="submit"
                disabled={submitting || !isRegistrationAvailable}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-7 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <Send size={19} />
                )}

                {submitting ? "Đang gửi đăng ký..." : "Gửi đăng ký"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, required = false, error, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ClassSummary({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="text-green-600">{icon}</div>

      <div>
        <p className="text-xs text-slate-400">{label}</p>

        <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function inputClass(error = "") {
  return `
    w-full
    rounded-xl
    border
    bg-white
    px-4
    py-3
    text-sm
    outline-none
    transition
    ${
      error
        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-slate-200 focus:border-green-500 focus:ring-4 focus:ring-green-100"
    }
  `;
}
