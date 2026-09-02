import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import IncubationProgressModal from "./incubation/progress/IncubationProgressModal";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sprout,
  Trash2,
  Users,
  FileSpreadsheet,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const getAuthConfig = (params = {}) => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  },
  params,
});
// ============================================================
// STATUS
// ============================================================

const STATUS_LABELS = {
  DRAFT: "Bản nháp",
  OPEN: "Đang nhận hồ sơ",
  CLOSED: "Đã đóng đăng ký",
  ONGOING: "Đang triển khai",
  FINISHED: "Đã kết thúc",
};

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",

  OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200",

  CLOSED: "bg-red-50 text-red-700 border-red-200",

  ONGOING: "bg-amber-50 text-amber-700 border-amber-200",

  FINISHED: "bg-blue-50 text-blue-700 border-blue-200",
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("vi-VN");
}
function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return `${number.toLocaleString("vi-VN")} đ`;
}

function yesNoLabel(value) {
  if (value === 1 || value === true) return "Có";
  if (value === 0 || value === false) return "Không";

  return "—";
}

function developmentStageLabel(value) {
  const labels = {
    IDEA: "Giai đoạn ý tưởng",
    PROTOTYPE: "Giai đoạn prototype",
    MVP: "Giai đoạn MVP",
    EARLY_REVENUE: "Đã có doanh thu ban đầu",
    GROWTH: "Giai đoạn tăng trưởng",
    SCALE: "Giai đoạn mở rộng",
  };

  return labels[value] || value || "—";
}

function fundraisingStageLabel(value) {
  const labels = {
    PRE_SEED: "Pre-seed",
    SEED: "Seed",
    SERIES_A: "Series A",
    SERIES_B: "Series B",
    SERIES_C: "Series C",
    OTHER: "Khác",
  };

  return labels[value] || value || "—";
}
function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function StatusBadge({ status }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border",
        "px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200",
      ].join(" ")}
    >
      {STATUS_LABELS[status] || status || "—"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? 0}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FORM MODAL
// ============================================================

const EMPTY_FORM = {
  program_name: "",
  program_code: "",
  year: "",
  short_description: "",
  description: "",
  location: "",
  organizer: "SIHUB",
  application_open: "",
  application_close: "",
  start_date: "",
  end_date: "",
  max_profiles: 0,
  status: "DRAFT",
};

function ProgramFormModal({
  open,
  mode,
  initialData,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialData) {
      setForm({
        program_name: initialData.program_name || "",

        program_code: initialData.program_code || "",

        year: initialData.year || "",

        short_description: initialData.short_description || "",

        description: initialData.description || "",

        location: initialData.location || "",

        organizer: initialData.organizer || "SIHUB",

        application_open: toDateInput(initialData.application_open),

        application_close: toDateInput(initialData.application_close),

        start_date: toDateInput(initialData.start_date),

        end_date: toDateInput(initialData.end_date),

        max_profiles: initialData.max_profiles ?? 0,

        status: initialData.status || "DRAFT",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.program_name.trim()) {
      alert("Vui lòng nhập tên Chương trình ươm tạo.");

      return;
    }

    onSubmit({
      ...form,

      year: form.year !== "" ? Number(form.year) : null,

      max_profiles: form.max_profiles !== "" ? Number(form.max_profiles) : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              CHƯƠNG TRÌNH ƯƠM TẠO
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {mode === "edit"
                ? "Cập nhật chương trình"
                : "Thêm chương trình mới"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Tên chương trình
                <span className="text-red-500"> *</span>
              </label>

              <input
                value={form.program_name}
                onChange={(e) => updateField("program_name", e.target.value)}
                placeholder="Ví dụ: Chương trình ươm tạo SIHUB 2026"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Mã chương trình
              </label>

              <input
                value={form.program_code}
                onChange={(e) => updateField("program_code", e.target.value)}
                placeholder="INCUBATION-2026"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Năm
              </label>

              <input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => updateField("year", e.target.value)}
                placeholder="2026"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Mô tả ngắn
              </label>

              <textarea
                rows={2}
                value={form.short_description}
                onChange={(e) =>
                  updateField("short_description", e.target.value)
                }
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Mô tả chi tiết
              </label>

              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Đơn vị tổ chức
              </label>

              <input
                value={form.organizer}
                onChange={(e) => updateField("organizer", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Địa điểm
              </label>

              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <DateField
              label="Mở nhận hồ sơ"
              value={form.application_open}
              onChange={(value) => updateField("application_open", value)}
            />

            <DateField
              label="Đóng nhận hồ sơ"
              value={form.application_close}
              onChange={(value) => updateField("application_close", value)}
            />

            <DateField
              label="Ngày bắt đầu chương trình"
              value={form.start_date}
              onChange={(value) => updateField("start_date", value)}
            />

            <DateField
              label="Ngày kết thúc chương trình"
              value={form.end_date}
              onChange={(value) => updateField("end_date", value)}
            />

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Số hồ sơ tối đa
              </label>

              <input
                type="number"
                min="0"
                value={form.max_profiles}
                onChange={(e) => updateField("max_profiles", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />

              <p className="mt-1 text-xs text-slate-400">
                Nhập 0 nếu không giới hạn.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Trạng thái
              </label>

              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              >
                <option value="DRAFT">Bản nháp</option>

                <option value="OPEN">Đang nhận hồ sơ</option>

                <option value="CLOSED">Đã đóng đăng ký</option>

                <option value="ONGOING">Đang triển khai</option>

                <option value="FINISHED">Đã kết thúc</option>
              </select>
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={17} className="animate-spin" />}

              {mode === "edit" ? "Lưu thay đổi" : "Tạo chương trình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>

      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400"
      />
    </div>
  );
}

// ============================================================
// PROFILES MODAL
// ============================================================

function ProgramProfilesModal({
  open,
  loading,
  program,
  profiles,
  onClose,
  onExport,
  exporting,
  onViewProfile,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              DANH SÁCH HỒ SƠ
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {program?.program_name || "Chương trình ươm tạo"}
            </h2>

            {program?.year && (
              <p className="mt-1 text-sm text-slate-500">Năm {program.year}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              disabled={exporting || loading || profiles.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={17} />
              )}

              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="py-20 text-center">
              <Users size={40} className="mx-auto text-slate-300" />

              <p className="mt-3 font-semibold text-slate-700">
                Chương trình chưa có hồ sơ tham gia
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="px-4 py-3">Dự án</th>

                      <th className="px-4 py-3">Doanh nghiệp</th>

                      <th className="px-4 py-3">Người liên hệ</th>

                      <th className="px-4 py-3">Giai đoạn</th>

                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {profile.project_name}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {profile.company_name || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">
                            {profile.contact_fullname}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {profile.contact_phone || "—"}
                          </p>

                          <p className="text-xs text-slate-500">
                            {profile.contact_email || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {profile.development_stage || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={profile.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => onViewProfile(profile)}
                              className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                              title="Xem chi tiết hồ sơ"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ProfileDetailModal({ open, loading, profile, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              CHI TIẾT HỒ SƠ ƯƠM TẠO
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {profile?.project_name || "Hồ sơ ươm tạo"}
            </h2>

            {profile?.company_name && (
              <p className="mt-1 text-sm text-slate-500">
                {profile.company_name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 size={34} className="animate-spin text-emerald-600" />
            </div>
          ) : !profile ? (
            <div className="py-20 text-center text-slate-500">
              Không có dữ liệu hồ sơ.
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. THÔNG TIN CHUNG */}
              <ProfileSection title="1. Thông tin chung">
                <ProfileItem
                  label="Chương trình tuyển chọn"
                  value={profile.selection_program}
                />

                <ProfileItem
                  label="Chương trình khác"
                  value={profile.selection_program_other}
                />

                <ProfileItem label="Tên dự án" value={profile.project_name} />

                <ProfileItem
                  label="Tên doanh nghiệp"
                  value={profile.company_name}
                />

                <ProfileItem label="Địa chỉ" value={profile.address} />

                <ProfileItem
                  label="Tỉnh / Thành phố"
                  value={profile.province_city}
                />

                <ProfileItem label="Website" value={profile.website} />

                <ProfileItem label="Mã số thuế" value={profile.tax_code} />
              </ProfileSection>

              {/* 2. NGƯỜI LIÊN HỆ */}
              <ProfileSection title="2. Người liên hệ">
                <ProfileItem
                  label="Họ và tên"
                  value={profile.contact_fullname}
                />

                <ProfileItem label="Điện thoại" value={profile.contact_phone} />

                <ProfileItem label="Email" value={profile.contact_email} />

                <ProfileItem
                  label="Chức vụ"
                  value={
                    profile.contact_position_other || profile.contact_position
                  }
                />
              </ProfileSection>

              {/* 3. QUY MÔ & GIAI ĐOẠN */}
              <ProfileSection title="3. Quy mô & giai đoạn phát triển">
                <ProfileItem label="Quy mô nhân sự" value={profile.team_size} />

                <ProfileItem
                  label="Việc làm bán thời gian"
                  value={profile.part_time_jobs}
                />

                <ProfileItem
                  label="Năm bắt đầu dự án"
                  value={profile.project_start_year}
                />

                <ProfileItem
                  label="Giai đoạn phát triển"
                  value={
                    profile.development_stage_other ||
                    developmentStageLabel(profile.development_stage)
                  }
                />
              </ProfileSection>

              {/* 4. DOANH THU / VỐN */}
              <ProfileSection title="4. Doanh thu & tài chính">
                <ProfileItem
                  label="Đã có doanh thu"
                  value={yesNoLabel(profile.has_revenue)}
                />

                <ProfileItem
                  label="Doanh thu 3 năm gần nhất"
                  value={formatMoney(profile.revenue_last_3_years)}
                />

                <ProfileItem
                  label="Vốn điều lệ"
                  value={formatMoney(profile.charter_capital)}
                />

                <ProfileItem
                  label="Doanh thu hằng năm"
                  value={formatMoney(profile.annual_revenue)}
                />
              </ProfileSection>

              {/* 5. GỌI VỐN */}
              <ProfileSection title="5. Gọi vốn">
                <ProfileItem
                  label="Đã gọi vốn"
                  value={yesNoLabel(profile.has_raised_fund)}
                />

                <ProfileItem
                  label="Giai đoạn gọi vốn"
                  value={fundraisingStageLabel(profile.fundraising_stage)}
                />

                <ProfileItem
                  label="Số tiền đã gọi"
                  value={formatMoney(profile.raised_amount)}
                />

                <ProfileItem
                  label="Nhu cầu gọi vốn"
                  value={formatMoney(profile.fundraising_need)}
                />
              </ProfileSection>

              {/* 6. SẢN PHẨM */}
              <ProfileSection title="6. Sản phẩm / Dịch vụ">
                <ProfileLongItem
                  label="Mô tả sản phẩm / dịch vụ"
                  value={profile.product_service_description}
                />

                <ProfileItem
                  label="Tình trạng sản phẩm"
                  value={profile.product_status}
                />

                <ProfileItem
                  label="Số sản phẩm"
                  value={profile.product_count}
                />

                <ProfileItem label="Số dịch vụ" value={profile.service_count} />

                <ProfileItem
                  label="Số khách hàng"
                  value={profile.customer_count}
                />

                <ProfileLongItem
                  label="Khách hàng mục tiêu"
                  value={profile.target_customer}
                />
              </ProfileSection>

              {/* 7. SỞ HỮU TRÍ TUỆ */}
              <ProfileSection title="7. Sở hữu trí tuệ">
                <ProfileItem
                  label="Có sở hữu trí tuệ"
                  value={yesNoLabel(profile.has_intellectual_property)}
                />

                <ProfileLongItem
                  label="Chi tiết sở hữu trí tuệ"
                  value={profile.intellectual_property_detail}
                />

                <ProfileItem
                  label="Số bằng sáng chế"
                  value={profile.patent_count}
                />

                <ProfileItem
                  label="Số giải pháp hữu ích"
                  value={profile.utility_solution_count}
                />
              </ProfileSection>

              {/* 8. THỊ TRƯỜNG QUỐC TẾ */}
              <ProfileSection title="8. Thị trường quốc tế">
                <ProfileItem
                  label="Có doanh thu quốc tế"
                  value={yesNoLabel(profile.has_international_revenue)}
                />

                <ProfileItem
                  label="Doanh thu quốc tế"
                  value={formatMoney(profile.international_revenue)}
                />

                <ProfileItem
                  label="Khách hàng quốc tế"
                  value={profile.international_customer_count}
                />
              </ProfileSection>

              {/* 9. LĨNH VỰC */}
              <ProfileArraySection
                title="9. Lĩnh vực hoạt động"
                items={profile.fields}
                renderItem={(item) =>
                  item.other_detail || item.field_name || item.field_code
                }
              />

              {/* 10. THỊ TRƯỜNG */}
              <ProfileArraySection
                title="10. Thị trường"
                items={profile.markets}
                renderItem={(item) =>
                  item.other_detail || item.market_name || item.market_code
                }
              />

              {/* 11. HỖ TRỢ ĐÃ NHẬN */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  11. Hỗ trợ đã nhận
                </h3>

                {!profile.received_supports?.length ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Chưa có dữ liệu.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {profile.received_supports.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">
                          {item.support_name || item.support_code}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Đơn vị hỗ trợ:{" "}
                          {item.provider_other ||
                            item.provider_name ||
                            item.provider_code ||
                            "—"}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Năm: {item.support_year || "—"}
                        </p>

                        {item.support_detail && (
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {item.support_detail}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 12. NHU CẦU HỖ TRỢ */}
              <ProfileArraySection
                title="12. Nhu cầu hỗ trợ"
                items={profile.support_needs}
                renderItem={(item) =>
                  item.other_detail || item.need_name || item.need_code
                }
              />

              {/* 13. QUẢN TRỊ */}
              <ProfileSection title="13. Thông tin quản trị">
                <ProfileItem label="Trạng thái hồ sơ" value={profile.status} />

                <ProfileItem label="Nguồn hồ sơ" value={profile.source_type} />

                <ProfileLongItem
                  label="Ghi chú Admin"
                  value={profile.admin_note}
                />

                <ProfileItem
                  label="Ngày tạo"
                  value={formatDate(profile.created_at)}
                />

                <ProfileItem
                  label="Cập nhật lần cuối"
                  value={formatDate(profile.updated_at)}
                />
              </ProfileSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DELETE MODAL
// ============================================================

function DeleteModal({ open, program, deleting, onClose, onConfirm }) {
  if (!open || !program) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <CircleAlert size={24} />
        </div>

        <h3 className="mt-5 text-xl font-bold text-slate-900">
          Xóa chương trình?
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bạn đang xóa{" "}
          <strong className="text-slate-900">{program.program_name}</strong>.
        </p>

        {Number(program.total_profiles) > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Chương trình hiện có <strong>{program.total_profiles} hồ sơ</strong>
            . Cần chuyển hoặc xử lý các hồ sơ trước khi xóa chương trình.
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-red-600">
            Thao tác này không thể hoàn tác.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
          >
            Hủy
          </button>

          {Number(program.total_profiles) === 0 && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Trash2 size={17} />
              )}
              Xóa chương trình
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function ProfileSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>

      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-medium text-slate-800">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function ProfileLongItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function ProfileArraySection({ title, items, renderItem }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      {safeItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {safeItems.map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
            >
              {renderItem(item) || "—"}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// MAIN
// ============================================================

export default function AdminIncubationPrograms() {
  const [programs, setPrograms] = useState([]);

  const [statistics, setStatistics] = useState({
    total_programs: 0,
    open_programs: 0,
    ongoing_programs: 0,
    finished_programs: 0,
    total_profiles: 0,
  });

  const [filters, setFilters] = useState({
    keyword: "",
    year: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // FORM
  const [formOpen, setFormOpen] = useState(false);

  const [formMode, setFormMode] = useState("create");

  const [editData, setEditData] = useState(null);

  const [saving, setSaving] = useState(false);

  // PROFILES
  const [profilesOpen, setProfilesOpen] = useState(false);

  const [profilesLoading, setProfilesLoading] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState(null);

  const [programProfiles, setProgramProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [profilesExporting, setProfilesExporting] = useState(false);
  // DELETE
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  // PROGRESS
  const [progressProgram, setProgressProgram] = useState(null);

  // ==========================================================
  // PARAMS
  // ==========================================================

  const queryParams = useMemo(() => {
    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        params[key] = String(value).trim();
      }
    });

    return params;
  }, [filters]);

  // ==========================================================
  // YEARS
  // ==========================================================

  const years = useMemo(() => {
    const set = new Set();

    programs.forEach((program) => {
      if (program.year) {
        set.add(program.year);
      }
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [programs]);

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_BASE}/api/incubation-programs`, {
        params: queryParams,
      });

      setPrograms(response.data?.data || []);
    } catch (err) {
      console.error("Lỗi lấy Chương trình ươm tạo:", err);

      setPrograms([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách Chương trình ươm tạo.",
      );
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  const loadStatistics = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/incubation-programs/statistics`,
        getAuthConfig(),
      );

      setStatistics(response.data?.data || {});
    } catch (err) {
      console.error("Lỗi thống kê Chương trình ươm tạo:", err);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPrograms();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadPrograms]);

  // ==========================================================
  // FILTER
  // ==========================================================

  const changeFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      keyword: "",
      year: "",
      status: "",
    });
  };

  // ==========================================================
  // CREATE
  // ==========================================================

  const openCreate = () => {
    setFormMode("create");
    setEditData(null);
    setFormOpen(true);
  };

  // ==========================================================
  // EDIT
  // ==========================================================

  const openEdit = async (id) => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/incubation-programs/${id}`,
      );

      setEditData(response.data?.data || null);

      setFormMode("edit");
      setFormOpen(true);
    } catch (err) {
      alert(
        err.response?.data?.message || "Không thể tải thông tin chương trình.",
      );
    }
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const saveProgram = async (payload) => {
    try {
      setSaving(true);

      if (formMode === "edit" && editData?.id) {
        await axios.put(
          `${API_BASE}/api/incubation-programs/${editData.id}`,
          payload,
          getAuthConfig(),
        );
      } else {
        await axios.post(
          `${API_BASE}/api/incubation-programs`,
          payload,
          getAuthConfig(),
        );
      }

      setFormOpen(false);
      setEditData(null);

      await Promise.all([loadPrograms(), loadStatistics()]);
    } catch (err) {
      console.error("Lỗi lưu chương trình:", err);

      alert(
        err.response?.data?.message || "Không thể lưu Chương trình ươm tạo.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // PROFILES
  // ==========================================================

  const openProfiles = async (program) => {
    try {
      setProfilesOpen(true);
      setProfilesLoading(true);

      setSelectedProgram({
        id: program.id,
        program_name: program.program_name,
        year: program.year,
      });

      setProgramProfiles([]);

      const response = await axios.get(
        `${API_BASE}/api/incubation-programs/${program.id}/profiles`,
        getAuthConfig(),
      );

      setSelectedProgram(
        response.data?.program || {
          id: program.id,
          program_name: program.program_name,
          year: program.year,
        },
      );

      setProgramProfiles(response.data?.data || []);
    } catch (err) {
      console.error("Lỗi lấy hồ sơ chương trình:", err);

      alert(err.response?.data?.message || "Không thể lấy danh sách hồ sơ.");

      setProfilesOpen(false);
    } finally {
      setProfilesLoading(false);
    }
  };
  const exportProgramProfiles = async () => {
    if (!selectedProgram?.id) {
      return;
    }

    try {
      setProfilesExporting(true);

      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/export`,
        {
          ...getAuthConfig(),
          params: {
            incubation_program_id: selectedProgram.id,
          },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `ho-so-uom-tao-${selectedProgram.id}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel hồ sơ ươm tạo:", err.response?.data || err);

      let message = "Không thể xuất Excel hồ sơ ươm tạo.";

      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);

          message = parsed?.message || message;
        } else {
          message = err.response?.data?.message || message;
        }
      } catch {
        // giữ message mặc định
      }

      alert(message);
    } finally {
      setProfilesExporting(false);
    }
  };
  const openProfileDetail = async (profile) => {
    if (!profile?.id) {
      return;
    }

    try {
      setProfileDetailOpen(true);
      setProfileDetailLoading(true);
      setSelectedProfile(null);

      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/${profile.id}`,
        getAuthConfig(),
      );

      setSelectedProfile(response.data?.data || null);
    } catch (err) {
      console.error(
        "Lỗi lấy chi tiết hồ sơ ươm tạo:",
        err.response?.data || err,
      );

      setProfileDetailOpen(false);
      setSelectedProfile(null);

      alert(
        err.response?.data?.message || "Không thể tải chi tiết hồ sơ ươm tạo.",
      );
    } finally {
      setProfileDetailLoading(false);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const askDelete = (program) => {
    setDeleteTarget(program);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);

      await axios.delete(
        `${API_BASE}/api/incubation-programs/${deleteTarget.id}`,
        getAuthConfig(),
      );

      setDeleteOpen(false);
      setDeleteTarget(null);

      await Promise.all([loadPrograms(), loadStatistics()]);
    } catch (err) {
      console.error("Lỗi xóa chương trình:", err);

      alert(err.response?.data?.message || "Không thể xóa chương trình.");
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            QUẢN LÝ ƯƠM TẠO
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Chương trình ươm tạo
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Quản lý từng chương trình, thời gian triển khai và danh sách hồ sơ
            doanh nghiệp / dự án tham gia.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          Thêm chương trình
        </button>
      </div>

      {/* STATS */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Tổng chương trình"
          value={statistics.total_programs}
          icon={Sprout}
        />

        <StatCard
          label="Đang nhận hồ sơ"
          value={statistics.open_programs}
          icon={FileText}
        />

        <StatCard
          label="Đang triển khai"
          value={statistics.ongoing_programs}
          icon={Clock3}
        />

        <StatCard
          label="Đã kết thúc"
          value={statistics.finished_programs}
          icon={CheckCircle2}
        />

        <StatCard
          label="Tổng hồ sơ tham gia"
          value={statistics.total_profiles}
          icon={Users}
        />
      </div>

      {/* FILTER */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_220px_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filters.keyword}
              onChange={(e) => changeFilter("keyword", e.target.value)}
              placeholder="Tìm tên chương trình, mã chương trình hoặc đơn vị tổ chức..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <div className="relative">
            <select
              value={filters.year}
              onChange={(e) => changeFilter("year", e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none"
            >
              <option value="">Tất cả năm</option>

              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => changeFilter("status", e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none"
            >
              <option value="">Tất cả trạng thái</option>

              <option value="DRAFT">Bản nháp</option>

              <option value="OPEN">Đang nhận hồ sơ</option>

              <option value="CLOSED">Đã đóng đăng ký</option>

              <option value="ONGOING">Đang triển khai</option>

              <option value="FINISHED">Đã kết thúc</option>
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <RefreshCcw size={17} />
            Đặt lại
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Tìm thấy <strong className="text-slate-900">{programs.length}</strong>{" "}
          chương trình.
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold text-slate-900">Danh sách chương trình</h2>

          <p className="mt-1 text-sm text-slate-500">
            Bấm “Hồ sơ” để xem các doanh nghiệp / dự án đang thuộc chương trình.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Chương trình</th>

                <th className="px-5 py-4">Năm</th>

                <th className="px-5 py-4">Nhận hồ sơ</th>

                <th className="px-5 py-4">Thời gian triển khai</th>

                <th className="px-5 py-4">Hồ sơ</th>

                <th className="px-5 py-4">Trạng thái</th>

                <th className="px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20">
                    <div className="flex items-center justify-center gap-3 text-slate-500">
                      <Loader2 size={25} className="animate-spin" />
                      Đang tải chương trình...
                    </div>
                  </td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <Sprout size={40} className="mx-auto text-slate-300" />

                    <p className="mt-3 font-semibold text-slate-700">
                      Không có chương trình phù hợp
                    </p>
                  </td>
                </tr>
              ) : (
                programs.map((program) => (
                  <tr
                    key={program.id}
                    className="align-top hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[350px]">
                        <p className="font-semibold leading-5 text-slate-900">
                          {program.program_name}
                        </p>

                        {program.program_code && (
                          <p className="mt-1 text-xs font-medium text-emerald-600">
                            {program.program_code}
                          </p>
                        )}

                        {program.short_description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                            {program.short_description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                        {program.year || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-[170px] text-sm text-slate-700">
                        <p>{formatDate(program.application_open)}</p>

                        <p className="mt-1 text-slate-400">đến</p>

                        <p>{formatDate(program.application_close)}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-[170px] text-sm text-slate-700">
                        <p>{formatDate(program.start_date)}</p>

                        <p className="mt-1 text-slate-400">đến</p>

                        <p>{formatDate(program.end_date)}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openProfiles(program)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Users size={16} />
                        {program.total_profiles} hồ sơ
                      </button>

                      {Number(program.max_profiles) > 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          Tối đa {program.max_profiles}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={program.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          title="Cập nhật tiến độ"
                          aria-label={`Cập nhật tiến độ ${program.program_name}`}
                          onClick={() => setProgressProgram(program)}
                          className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100"
                        >
                          <Clock3 size={18} />
                        </button>

                        <button
                          type="button"
                          title="Xem hồ sơ"
                          onClick={() => openProfiles(program)}
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          type="button"
                          title="Sửa chương trình"
                          onClick={() => openEdit(program.id)}
                          className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-100"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          type="button"
                          title="Xóa chương trình"
                          onClick={() => askDelete(program)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProgramFormModal
        open={formOpen}
        mode={formMode}
        initialData={editData}
        saving={saving}
        onClose={() => {
          if (saving) return;

          setFormOpen(false);
          setEditData(null);
        }}
        onSubmit={saveProgram}
      />
      <ProgramProfilesModal
        open={profilesOpen}
        loading={profilesLoading}
        program={selectedProgram}
        profiles={programProfiles}
        onViewProfile={openProfileDetail}
        onExport={exportProgramProfiles}
        exporting={profilesExporting}
        onClose={() => {
          setProfilesOpen(false);
          setSelectedProgram(null);
          setProgramProfiles([]);
        }}
      />
      <ProfileDetailModal
        open={profileDetailOpen}
        loading={profileDetailLoading}
        profile={selectedProfile}
        onClose={() => {
          setProfileDetailOpen(false);
          setSelectedProfile(null);
        }}
      />
      <DeleteModal
        open={deleteOpen}
        program={deleteTarget}
        deleting={deleting}
        onClose={() => {
          if (deleting) return;

          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
      {progressProgram && (
        <IncubationProgressModal
          key={progressProgram.id}
          program={progressProgram}
          onClose={() => setProgressProgram(null)}
        />
      )}
    </div>
  );
}
