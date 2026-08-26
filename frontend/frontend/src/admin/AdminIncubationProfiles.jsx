import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
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
// TRẠNG THÁI HỒ SƠ
// ============================================================

const STATUS_LABELS = {
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã gửi hồ sơ",
  REVIEWING: "Đang xem xét",
  APPROVED: "Đã duyệt",
  REJECTED: "Không duyệt",
};

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",

  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",

  REVIEWING: "bg-amber-50 text-amber-700 border-amber-200",

  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",

  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const SOURCE_LABELS = {
  ADMIN: "Admin nhập",
  PUBLIC_FORM: "Người dùng gửi",
  IMPORT: "Import Excel",
};

// ============================================================
// HELPER
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

  return new Intl.NumberFormat("vi-VN").format(number);
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

// ============================================================
// BADGE TRẠNG THÁI
// ============================================================

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

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, icon: Icon }) {
  return (
    <div
      className="
        rounded-2xl border border-slate-200
        bg-white p-5 shadow-sm
      "
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? 0}</p>
        </div>

        <div
          className="
            flex h-12 w-12 items-center
            justify-center rounded-2xl
            bg-emerald-50 text-emerald-600
          "
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ITEM CHI TIẾT
// ============================================================

function DetailItem({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">
        {valueOrDash(value)}
      </div>
    </div>
  );
}

// ============================================================
// SECTION CHI TIẾT
// ============================================================

function DetailSection({ title, children }) {
  return (
    <section
      className="
        rounded-2xl border border-slate-200
        bg-white p-5
      "
    >
      <h3 className="mb-5 text-base font-bold text-slate-900">{title}</h3>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

// ============================================================
// MODAL CHI TIẾT
// ============================================================

function DetailModal({ open, loading, profile, onClose }) {
  if (!open) {
    return null;
  }

  const fields = profile?.fields || [];

  const markets = profile?.markets || [];

  const supports = profile?.received_supports || [];

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/50 p-4
      "
    >
      <div
        className="
          flex max-h-[92vh] w-full
          max-w-5xl flex-col overflow-hidden
          rounded-3xl bg-slate-50 shadow-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex items-start justify-between gap-4
            border-b border-slate-200
            bg-white px-6 py-5
          "
        >
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Hồ sơ Chương trình ươm tạo
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {profile?.project_name || "Chi tiết hồ sơ"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl p-2 text-slate-500
              transition hover:bg-slate-100
              hover:text-slate-900
            "
          >
            <X size={22} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={34} />
            </div>
          ) : !profile ? (
            <div className="py-20 text-center text-slate-500">
              Không có dữ liệu hồ sơ.
            </div>
          ) : (
            <div className="space-y-5">
              {/* TRẠNG THÁI */}
              <div
                className="
                  flex flex-wrap items-center
                  justify-between gap-3
                  rounded-2xl border border-slate-200
                  bg-white p-5
                "
              >
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Trạng thái hồ sơ
                  </p>

                  <div className="mt-2">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Nguồn dữ liệu
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {SOURCE_LABELS[profile.source_type] ||
                      profile.source_type ||
                      "—"}
                  </p>
                </div>
              </div>

              {/* A */}
              <DetailSection title="A. Thông tin chung">
                <DetailItem
                  fullWidth
                  label="Thuộc Chương trình ươm tạo"
                  value={
                    profile.program_name
                      ? `${profile.program_name}${
                          profile.program_year
                            ? ` (${profile.program_year})`
                            : ""
                        }`
                      : "Chưa gán chương trình"
                  }
                />
                <DetailItem
                  label="Chương trình tuyển chọn"
                  value={
                    profile.selection_program_other || profile.selection_program
                  }
                />

                <DetailItem label="Tên dự án" value={profile.project_name} />

                <DetailItem
                  label="Tên doanh nghiệp"
                  value={profile.company_name}
                />

                <DetailItem label="Mã số thuế" value={profile.tax_code} />

                <DetailItem
                  label="Tỉnh / Thành phố"
                  value={profile.province_city}
                />

                <DetailItem label="Website" value={profile.website} />

                <DetailItem fullWidth label="Địa chỉ" value={profile.address} />
              </DetailSection>

              {/* B */}
              <DetailSection title="B. Người liên hệ">
                <DetailItem
                  label="Họ và tên"
                  value={profile.contact_fullname}
                />

                <DetailItem
                  label="Chức vụ"
                  value={
                    profile.contact_position_other || profile.contact_position
                  }
                />

                <DetailItem
                  label="Số điện thoại"
                  value={profile.contact_phone}
                />

                <DetailItem label="Email" value={profile.contact_email} />
              </DetailSection>

              {/* C */}
              <DetailSection title="C. Quy mô và giai đoạn phát triển">
                <DetailItem
                  label="Nhân sự"
                  value={
                    profile.team_size !== null
                      ? `${profile.team_size} người`
                      : null
                  }
                />

                <DetailItem
                  label="Việc làm bán thời gian / thời vụ"
                  value={
                    profile.part_time_jobs !== null
                      ? `${profile.part_time_jobs} người`
                      : null
                  }
                />

                <DetailItem
                  label="Năm bắt đầu dự án"
                  value={profile.project_start_year}
                />

                <DetailItem
                  label="Giai đoạn phát triển"
                  value={
                    profile.development_stage_other || profile.development_stage
                  }
                />

                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Lĩnh vực hoạt động
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {fields.length ? (
                      fields.map((field) => (
                        <span
                          key={field.id}
                          className="
                            rounded-full
                            bg-emerald-50 px-3 py-1.5
                            text-sm font-medium
                            text-emerald-700
                          "
                        >
                          {field.other_detail
                            ? `${field.field_name}: ${field.other_detail}`
                            : field.field_name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </div>
                </div>
              </DetailSection>

              {/* D */}
              <DetailSection title="D. Tài chính và gọi vốn">
                <DetailItem
                  label="Đã có doanh thu"
                  value={profile.has_revenue ? "Có" : "Chưa"}
                />

                <DetailItem
                  label="Doanh thu 3 năm gần nhất"
                  value={
                    profile.revenue_last_3_years
                      ? `${formatMoney(profile.revenue_last_3_years)} VNĐ`
                      : null
                  }
                />

                <DetailItem
                  label="Vốn điều lệ"
                  value={
                    profile.charter_capital
                      ? `${formatMoney(profile.charter_capital)} VNĐ`
                      : null
                  }
                />

                <DetailItem
                  label="Đã gọi vốn"
                  value={profile.has_raised_fund ? "Có" : "Chưa"}
                />

                <DetailItem
                  label="Giai đoạn gọi vốn"
                  value={profile.fundraising_stage}
                />

                <DetailItem
                  label="Số vốn đã gọi"
                  value={
                    profile.raised_amount
                      ? `${formatMoney(profile.raised_amount)} VNĐ`
                      : null
                  }
                />

                <DetailItem
                  label="Nhu cầu gọi vốn"
                  value={
                    profile.fundraising_need
                      ? `${formatMoney(profile.fundraising_need)} VNĐ`
                      : null
                  }
                />
              </DetailSection>

              {/* E */}
              <DetailSection title="E. Sản phẩm, dịch vụ và sở hữu trí tuệ">
                <DetailItem
                  fullWidth
                  label="Mô tả sản phẩm / dịch vụ"
                  value={profile.product_service_description}
                />

                <DetailItem
                  label="Tình trạng sản phẩm"
                  value={profile.product_status}
                />

                <DetailItem
                  label="Có sở hữu trí tuệ"
                  value={profile.has_intellectual_property ? "Có" : "Chưa"}
                />

                <DetailItem
                  fullWidth
                  label="Chi tiết sở hữu trí tuệ"
                  value={profile.intellectual_property_detail}
                />

                <DetailItem
                  label="Số bằng sáng chế"
                  value={profile.patent_count}
                />

                <DetailItem
                  label="Số giải pháp hữu ích"
                  value={profile.utility_solution_count}
                />

                <DetailItem label="Số sản phẩm" value={profile.product_count} />

                <DetailItem label="Số dịch vụ" value={profile.service_count} />

                <DetailItem
                  label="Số khách hàng"
                  value={profile.customer_count}
                />

                <DetailItem
                  label="Khách hàng mục tiêu"
                  value={profile.target_customer}
                />
              </DetailSection>

              {/* F */}
              <DetailSection title="F. Thị trường">
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Thị trường chính
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {markets.length ? (
                      markets.map((market) => (
                        <span
                          key={market.id}
                          className="
                            rounded-full
                            bg-blue-50 px-3 py-1.5
                            text-sm font-medium
                            text-blue-700
                          "
                        >
                          {market.other_detail
                            ? `${market.market_name}: ${market.other_detail}`
                            : market.market_name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </div>
                </div>

                <DetailItem
                  label="Có doanh thu quốc tế"
                  value={profile.has_international_revenue ? "Có" : "Chưa"}
                />

                <DetailItem
                  label="Doanh thu quốc tế"
                  value={
                    profile.international_revenue
                      ? `${formatMoney(profile.international_revenue)} VNĐ`
                      : null
                  }
                />

                <DetailItem
                  label="Khách hàng quốc tế"
                  value={profile.international_customer_count}
                />
              </DetailSection>

              {/* G */}
              <DetailSection title="G. Hỗ trợ đã nhận">
                <div className="md:col-span-2">
                  {supports.length ? (
                    <div className="space-y-3">
                      {supports.map((support) => (
                        <div
                          key={support.id}
                          className="
                              rounded-xl
                              border border-slate-200
                              bg-slate-50 p-4
                            "
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">
                              {support.support_name}
                            </p>

                            {support.support_year && (
                              <span className="text-sm text-slate-500">
                                Năm {support.support_year}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-slate-600">
                            Đơn vị:{" "}
                            {support.provider_other ||
                              support.provider_name ||
                              "—"}
                          </p>

                          {support.support_detail && (
                            <p className="mt-2 text-sm text-slate-700">
                              {support.support_detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Chưa có thông tin hỗ trợ.
                    </p>
                  )}
                </div>
              </DetailSection>

              {/* QUẢN TRỊ */}
              <DetailSection title="Thông tin quản trị">
                <DetailItem
                  label="Ngày tạo"
                  value={formatDate(profile.created_at)}
                />

                <DetailItem
                  label="Cập nhật gần nhất"
                  value={formatDate(profile.updated_at)}
                />

                <DetailItem
                  fullWidth
                  label="Ghi chú của Admin"
                  value={profile.admin_note}
                />
              </DetailSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL XÓA
// ============================================================

function DeleteModal({ open, profile, deleting, onClose, onConfirm }) {
  if (!open || !profile) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-0 z-[110]
        flex items-center justify-center
        bg-slate-950/50 p-4
      "
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div
          className="
            flex h-12 w-12 items-center
            justify-center rounded-full
            bg-red-50 text-red-600
          "
        >
          <CircleAlert size={24} />
        </div>

        <h3 className="mt-5 text-xl font-bold text-slate-900">
          Xóa hồ sơ này?
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Hồ sơ{" "}
          <strong className="text-slate-900">{profile.project_name}</strong>{" "}
          cùng thông tin lĩnh vực, thị trường và hỗ trợ liên quan sẽ bị xóa.
        </p>

        <p className="mt-3 text-sm font-semibold text-red-600">
          Thao tác này không thể hoàn tác.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="
              rounded-xl border border-slate-200
              px-5 py-2.5 text-sm font-semibold
              text-slate-700
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="
              inline-flex items-center gap-2
              rounded-xl bg-red-600
              px-5 py-2.5 text-sm font-semibold
              text-white
              hover:bg-red-700
              disabled:opacity-50
            "
          >
            {deleting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Trash2 size={17} />
            )}
            Xóa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// MODAL THÊM HỒ SƠ
// ============================================================

const EMPTY_PROFILE_FORM = {
  selection_program: "",
  selection_program_other: "",

  project_name: "",
  company_name: "",
  address: "",
  province_city: "",
  website: "",
  tax_code: "",

  contact_fullname: "",
  contact_phone: "",
  contact_email: "",
  contact_position: "",
  contact_position_other: "",

  team_size: "",
  part_time_jobs: "",
  project_start_year: "",
  development_stage: "",
  development_stage_other: "",

  has_revenue: false,
  revenue_last_3_years: "",
  charter_capital: "",
  annual_revenue: "",

  has_raised_fund: false,
  fundraising_stage: "",
  raised_amount: "",
  fundraising_need: "",

  product_service_description: "",
  product_status: "",

  has_intellectual_property: false,
  intellectual_property_detail: "",

  patent_count: "",
  utility_solution_count: "",
  product_count: "",
  service_count: "",
  customer_count: "",

  target_customer: "",

  has_international_revenue: false,
  international_revenue: "",
  international_customer_count: "",

  status: "SUBMITTED",
  admin_note: "",
  source_type: "ADMIN",

  fields: [],
  markets: [],
  received_supports: [],
};

function ProfileFormInput({
  label,
  required = false,
  value,
  onChange,
  type = "text",
  placeholder = "",
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full rounded-xl
          border border-slate-200
          bg-white px-4 py-3
          text-sm text-slate-800
          outline-none transition
          placeholder:text-slate-400
          focus:border-emerald-400
          focus:ring-4 focus:ring-emerald-50
        "
      />
    </div>
  );
}

function ProfileFormSelect({
  label,
  required = false,
  value,
  onChange,
  options = [],
  placeholder = "— Chọn —",
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full appearance-none rounded-xl
            border border-slate-200
            bg-white px-4 py-3 pr-10
            text-sm text-slate-800
            outline-none transition
            focus:border-emerald-400
            focus:ring-4 focus:ring-emerald-50
          "
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={17}
          className="
            pointer-events-none
            absolute right-3 top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />
      </div>
    </div>
  );
}

function ProfileFormTextarea({
  label,
  value,
  onChange,
  placeholder = "",
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="
          w-full resize-y rounded-xl
          border border-slate-200
          bg-white px-4 py-3
          text-sm text-slate-800
          outline-none transition
          placeholder:text-slate-400
          focus:border-emerald-400
          focus:ring-4 focus:ring-emerald-50
        "
      />
    </div>
  );
}

function ProfileFormSection({ title, description, children }) {
  return (
    <section
      className="
        rounded-2xl
        border border-slate-200
        bg-white p-5
        shadow-sm
      "
    >
      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function YesNoField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`
            rounded-xl border px-5 py-2.5 text-sm font-semibold transition
            ${
              value
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }
          `}
        >
          Có
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`
            rounded-xl border px-5 py-2.5 text-sm font-semibold transition
            ${
              !value
                ? "border-slate-400 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }
          `}
        >
          Chưa
        </button>
      </div>
    </div>
  );
}

function IncubationProfileFormModal({
  open,
  saving,
  form,
  filterOptions,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) {
    return null;
  }

  const updateField = (key, value) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const addField = () => {
    onChange((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          field_code: "",
          field_name: "",
          other_detail: "",
        },
      ],
    }));
  };

  const updateFieldItem = (index, key, value) => {
    onChange((prev) => ({
      ...prev,
      fields: prev.fields.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  };

  const removeField = (index) => {
    onChange((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addMarket = () => {
    onChange((prev) => ({
      ...prev,
      markets: [
        ...prev.markets,
        {
          market_code: "",
          market_name: "",
          other_detail: "",
        },
      ],
    }));
  };

  const updateMarketItem = (index, key, value) => {
    onChange((prev) => ({
      ...prev,
      markets: prev.markets.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  };

  const removeMarket = (index) => {
    onChange((prev) => ({
      ...prev,
      markets: prev.markets.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addSupport = () => {
    onChange((prev) => ({
      ...prev,
      received_supports: [
        ...prev.received_supports,
        {
          provider_code: "",
          provider_name: "",
          provider_other: "",
          support_code: "",
          support_name: "",
          support_detail: "",
          support_year: "",
        },
      ],
    }));
  };

  const updateSupportItem = (index, key, value) => {
    onChange((prev) => ({
      ...prev,
      received_supports: prev.received_supports.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  };

  const removeSupport = (index) => {
    onChange((prev) => ({
      ...prev,
      received_supports: prev.received_supports.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  return (
    <div
      className="
        fixed inset-0 z-[120]
        flex items-center justify-center
        bg-slate-950/60
        p-3 md:p-6
      "
    >
      <div
        className="
          flex h-[95vh] w-full max-w-6xl
          flex-col overflow-hidden
          rounded-3xl bg-slate-50
          shadow-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex shrink-0 items-center
            justify-between gap-4
            border-b border-slate-200
            bg-white px-5 py-4 md:px-7
          "
        >
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              QUẢN LÝ DỮ LIỆU
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
              Thêm hồ sơ Chương trình ươm tạo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin doanh nghiệp / dự án theo từng phần.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              shrink-0 rounded-xl p-2
              text-slate-500
              transition hover:bg-slate-100
              hover:text-slate-900
              disabled:opacity-50
            "
          >
            <X size={23} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <form
            id="incubation-profile-form"
            onSubmit={onSubmit}
            className="space-y-5"
          >
            {/* A */}
            <ProfileFormSection
              title="A. Thông tin chung"
              description="Thông tin cơ bản về dự án và doanh nghiệp."
            >
              <ProfileFormSelect
                label="Chương trình tuyển chọn"
                value={form.selection_program}
                onChange={(value) => updateField("selection_program", value)}
                options={(filterOptions.selection_programs || []).map(
                  (item) => ({
                    value: item,
                    label: item,
                  }),
                )}
                placeholder="— Chọn chương trình —"
              />

              <ProfileFormInput
                label="Nếu chọn chương trình khác"
                value={form.selection_program_other}
                onChange={(value) =>
                  updateField("selection_program_other", value)
                }
                placeholder="Nhập tên chương trình khác"
              />

              <ProfileFormInput
                label="Tên dự án"
                required
                value={form.project_name}
                onChange={(value) => updateField("project_name", value)}
                placeholder="Nhập tên dự án"
              />

              <ProfileFormInput
                label="Tên doanh nghiệp"
                value={form.company_name}
                onChange={(value) => updateField("company_name", value)}
                placeholder="Nhập tên doanh nghiệp"
              />

              <ProfileFormInput
                label="Mã số thuế"
                value={form.tax_code}
                onChange={(value) => updateField("tax_code", value)}
                placeholder="Nhập mã số thuế"
              />

              <ProfileFormInput
                label="Tỉnh / Thành phố"
                value={form.province_city}
                onChange={(value) => updateField("province_city", value)}
                placeholder="Ví dụ: TP.HCM"
              />

              <ProfileFormInput
                label="Website"
                value={form.website}
                onChange={(value) => updateField("website", value)}
                placeholder="https://..."
              />

              <ProfileFormInput
                label="Địa chỉ"
                value={form.address}
                onChange={(value) => updateField("address", value)}
                placeholder="Nhập địa chỉ"
                className="md:col-span-2"
              />
            </ProfileFormSection>

            {/* B */}
            <ProfileFormSection
              title="B. Người liên hệ"
              description="Cần nhập ít nhất số điện thoại hoặc email."
            >
              <ProfileFormInput
                label="Họ và tên"
                required
                value={form.contact_fullname}
                onChange={(value) => updateField("contact_fullname", value)}
                placeholder="Nhập họ và tên"
              />

              <ProfileFormSelect
                label="Chức vụ"
                value={form.contact_position}
                onChange={(value) => updateField("contact_position", value)}
                options={[
                  { value: "Founder", label: "Founder" },
                  { value: "Co-Founder", label: "Co-Founder" },
                  { value: "Giám đốc", label: "Giám đốc" },
                  { value: "CEO", label: "CEO" },
                  { value: "Quản lý", label: "Quản lý" },
                  { value: "Khác", label: "Khác" },
                ]}
              />

              <ProfileFormInput
                label="Chức vụ khác"
                value={form.contact_position_other}
                onChange={(value) =>
                  updateField("contact_position_other", value)
                }
                placeholder="Nhập chức vụ nếu chọn Khác"
              />

              <ProfileFormInput
                label="Số điện thoại"
                value={form.contact_phone}
                onChange={(value) => updateField("contact_phone", value)}
                placeholder="Nhập số điện thoại"
              />

              <ProfileFormInput
                label="Email"
                type="email"
                value={form.contact_email}
                onChange={(value) => updateField("contact_email", value)}
                placeholder="example@email.com"
              />
            </ProfileFormSection>

            {/* C */}
            <ProfileFormSection
              title="C. Quy mô và giai đoạn phát triển"
              description="Thông tin về quy mô đội ngũ và giai đoạn hiện tại."
            >
              <ProfileFormInput
                label="Nhân sự"
                type="number"
                value={form.team_size}
                onChange={(value) => updateField("team_size", value)}
                placeholder="Số người"
              />

              <ProfileFormInput
                label="Việc làm bán thời gian / thời vụ"
                type="number"
                value={form.part_time_jobs}
                onChange={(value) => updateField("part_time_jobs", value)}
                placeholder="Số người"
              />

              <ProfileFormInput
                label="Năm bắt đầu dự án"
                type="number"
                value={form.project_start_year}
                onChange={(value) => updateField("project_start_year", value)}
                placeholder="Ví dụ: 2024"
              />

              <ProfileFormSelect
                label="Giai đoạn phát triển"
                value={form.development_stage}
                onChange={(value) => updateField("development_stage", value)}
                options={(filterOptions.development_stages || []).map(
                  (item) => ({
                    value: item,
                    label: item,
                  }),
                )}
                placeholder="— Chọn giai đoạn —"
              />

              <ProfileFormInput
                label="Giai đoạn khác"
                value={form.development_stage_other}
                onChange={(value) =>
                  updateField("development_stage_other", value)
                }
                placeholder="Nhập nếu chọn giai đoạn khác"
                className="md:col-span-2"
              />

              {/* LĨNH VỰC */}
              <div className="md:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Lĩnh vực hoạt động
                    </label>

                    <p className="mt-1 text-xs text-slate-500">
                      Có thể thêm nhiều lĩnh vực.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addField}
                    className="
                      rounded-xl border border-emerald-200
                      bg-emerald-50 px-3 py-2
                      text-sm font-semibold
                      text-emerald-700
                      hover:bg-emerald-100
                    "
                  >
                    + Thêm lĩnh vực
                  </button>
                </div>

                {form.fields.length === 0 ? (
                  <div
                    className="
                      rounded-xl border border-dashed
                      border-slate-300 bg-slate-50
                      px-4 py-5 text-center
                      text-sm text-slate-500
                    "
                  >
                    Chưa thêm lĩnh vực.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.fields.map((field, index) => (
                      <div
                        key={index}
                        className="
                          rounded-xl border border-slate-200
                          bg-slate-50 p-4
                        "
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <ProfileFormInput
                            label="Mã lĩnh vực"
                            value={field.field_code}
                            onChange={(value) =>
                              updateFieldItem(index, "field_code", value)
                            }
                            placeholder="Ví dụ: IT"
                          />

                          <ProfileFormInput
                            label="Tên lĩnh vực"
                            value={field.field_name}
                            onChange={(value) =>
                              updateFieldItem(index, "field_name", value)
                            }
                            placeholder="Tên lĩnh vực"
                          />

                          <ProfileFormInput
                            label="Thông tin thêm"
                            value={field.other_detail}
                            onChange={(value) =>
                              updateFieldItem(index, "other_detail", value)
                            }
                            placeholder="Nếu có"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="
                            mt-3 text-sm font-semibold
                            text-red-500 hover:text-red-700
                          "
                        >
                          Xóa lĩnh vực này
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ProfileFormSection>

            {/* D */}
            <ProfileFormSection
              title="D. Tài chính và gọi vốn"
              description="Thông tin tài chính và tình trạng gọi vốn của dự án."
            >
              <YesNoField
                label="Đã có doanh thu"
                value={form.has_revenue}
                onChange={(value) => updateField("has_revenue", value)}
              />

              <ProfileFormInput
                label="Doanh thu 3 năm gần nhất (VNĐ)"
                type="number"
                value={form.revenue_last_3_years}
                onChange={(value) => updateField("revenue_last_3_years", value)}
                placeholder="Nhập số tiền"
              />

              <ProfileFormInput
                label="Vốn điều lệ (VNĐ)"
                type="number"
                value={form.charter_capital}
                onChange={(value) => updateField("charter_capital", value)}
                placeholder="Nhập số tiền"
              />

              <ProfileFormInput
                label="Doanh thu hàng năm (VNĐ)"
                type="number"
                value={form.annual_revenue}
                onChange={(value) => updateField("annual_revenue", value)}
                placeholder="Nhập số tiền"
              />

              <YesNoField
                label="Đã gọi vốn"
                value={form.has_raised_fund}
                onChange={(value) => updateField("has_raised_fund", value)}
              />

              <ProfileFormInput
                label="Giai đoạn gọi vốn"
                value={form.fundraising_stage}
                onChange={(value) => updateField("fundraising_stage", value)}
                placeholder="Ví dụ: Pre-seed, Seed..."
              />

              <ProfileFormInput
                label="Số vốn đã gọi (VNĐ)"
                type="number"
                value={form.raised_amount}
                onChange={(value) => updateField("raised_amount", value)}
                placeholder="Nhập số tiền"
              />

              <ProfileFormInput
                label="Nhu cầu gọi vốn (VNĐ)"
                type="number"
                value={form.fundraising_need}
                onChange={(value) => updateField("fundraising_need", value)}
                placeholder="Nhập số tiền"
              />
            </ProfileFormSection>

            {/* E */}
            <ProfileFormSection
              title="E. Sản phẩm, dịch vụ và sở hữu trí tuệ"
              description="Thông tin về sản phẩm, dịch vụ và tài sản trí tuệ."
            >
              <ProfileFormTextarea
                label="Mô tả sản phẩm / dịch vụ"
                value={form.product_service_description}
                onChange={(value) =>
                  updateField("product_service_description", value)
                }
                placeholder="Mô tả ngắn gọn sản phẩm hoặc dịch vụ..."
                className="md:col-span-2"
              />

              <ProfileFormInput
                label="Tình trạng sản phẩm"
                value={form.product_status}
                onChange={(value) => updateField("product_status", value)}
                placeholder="Ví dụ: Đang thử nghiệm, Đã thương mại hóa..."
              />

              <YesNoField
                label="Có sở hữu trí tuệ"
                value={form.has_intellectual_property}
                onChange={(value) =>
                  updateField("has_intellectual_property", value)
                }
              />

              <ProfileFormTextarea
                label="Chi tiết sở hữu trí tuệ"
                value={form.intellectual_property_detail}
                onChange={(value) =>
                  updateField("intellectual_property_detail", value)
                }
                placeholder="Mô tả nếu có..."
                className="md:col-span-2"
              />

              <ProfileFormInput
                label="Số bằng sáng chế"
                type="number"
                value={form.patent_count}
                onChange={(value) => updateField("patent_count", value)}
                placeholder="0"
              />

              <ProfileFormInput
                label="Số giải pháp hữu ích"
                type="number"
                value={form.utility_solution_count}
                onChange={(value) =>
                  updateField("utility_solution_count", value)
                }
                placeholder="0"
              />

              <ProfileFormInput
                label="Số sản phẩm"
                type="number"
                value={form.product_count}
                onChange={(value) => updateField("product_count", value)}
                placeholder="0"
              />

              <ProfileFormInput
                label="Số dịch vụ"
                type="number"
                value={form.service_count}
                onChange={(value) => updateField("service_count", value)}
                placeholder="0"
              />

              <ProfileFormInput
                label="Số khách hàng"
                type="number"
                value={form.customer_count}
                onChange={(value) => updateField("customer_count", value)}
                placeholder="0"
              />

              <ProfileFormInput
                label="Khách hàng mục tiêu"
                value={form.target_customer}
                onChange={(value) => updateField("target_customer", value)}
                placeholder="Nhập nhóm khách hàng mục tiêu"
                className="md:col-span-2"
              />
            </ProfileFormSection>

            {/* F */}
            <ProfileFormSection
              title="F. Thị trường"
              description="Có thể thêm nhiều thị trường."
            >
              <div className="md:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Thị trường chính
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addMarket}
                    className="
                      rounded-xl border border-blue-200
                      bg-blue-50 px-3 py-2
                      text-sm font-semibold
                      text-blue-700
                      hover:bg-blue-100
                    "
                  >
                    + Thêm thị trường
                  </button>
                </div>

                {form.markets.length === 0 ? (
                  <div
                    className="
                      rounded-xl border border-dashed
                      border-slate-300 bg-slate-50
                      px-4 py-5 text-center
                      text-sm text-slate-500
                    "
                  >
                    Chưa thêm thị trường.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.markets.map((market, index) => (
                      <div
                        key={index}
                        className="
                          rounded-xl border border-slate-200
                          bg-slate-50 p-4
                        "
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <ProfileFormInput
                            label="Mã thị trường"
                            value={market.market_code}
                            onChange={(value) =>
                              updateMarketItem(index, "market_code", value)
                            }
                            placeholder="Ví dụ: VN"
                          />

                          <ProfileFormInput
                            label="Tên thị trường"
                            value={market.market_name}
                            onChange={(value) =>
                              updateMarketItem(index, "market_name", value)
                            }
                            placeholder="Ví dụ: Việt Nam"
                          />

                          <ProfileFormInput
                            label="Thông tin thêm"
                            value={market.other_detail}
                            onChange={(value) =>
                              updateMarketItem(index, "other_detail", value)
                            }
                            placeholder="Nếu có"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMarket(index)}
                          className="
                            mt-3 text-sm font-semibold
                            text-red-500 hover:text-red-700
                          "
                        >
                          Xóa thị trường này
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <YesNoField
                label="Có doanh thu quốc tế"
                value={form.has_international_revenue}
                onChange={(value) =>
                  updateField("has_international_revenue", value)
                }
              />

              <ProfileFormInput
                label="Doanh thu quốc tế (VNĐ)"
                type="number"
                value={form.international_revenue}
                onChange={(value) =>
                  updateField("international_revenue", value)
                }
                placeholder="Nhập số tiền"
              />

              <ProfileFormInput
                label="Số khách hàng quốc tế"
                type="number"
                value={form.international_customer_count}
                onChange={(value) =>
                  updateField("international_customer_count", value)
                }
                placeholder="0"
              />
            </ProfileFormSection>

            {/* G */}
            <ProfileFormSection
              title="G. Hỗ trợ đã nhận"
              description="Nếu dự án từng nhận hỗ trợ, có thể thêm từng lần hỗ trợ."
            >
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={addSupport}
                  className="
                    rounded-xl border border-emerald-200
                    bg-emerald-50 px-4 py-2.5
                    text-sm font-semibold
                    text-emerald-700
                    hover:bg-emerald-100
                  "
                >
                  + Thêm lần hỗ trợ
                </button>

                {form.received_supports.length === 0 ? (
                  <div
                    className="
                      mt-3 rounded-xl border border-dashed
                      border-slate-300 bg-slate-50
                      px-4 py-5 text-center
                      text-sm text-slate-500
                    "
                  >
                    Chưa có thông tin hỗ trợ.
                  </div>
                ) : (
                  <div className="mt-3 space-y-4">
                    {form.received_supports.map((support, index) => (
                      <div
                        key={index}
                        className="
                          rounded-xl
                          border border-slate-200
                          bg-slate-50 p-4
                        "
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-semibold text-slate-800">
                            Lần hỗ trợ {index + 1}
                          </p>

                          <button
                            type="button"
                            onClick={() => removeSupport(index)}
                            className="
                              text-sm font-semibold
                              text-red-500
                              hover:text-red-700
                            "
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <ProfileFormInput
                            label="Đơn vị hỗ trợ"
                            value={support.provider_name}
                            onChange={(value) =>
                              updateSupportItem(index, "provider_name", value)
                            }
                            placeholder="Tên đơn vị"
                          />

                          <ProfileFormInput
                            label="Đơn vị khác"
                            value={support.provider_other}
                            onChange={(value) =>
                              updateSupportItem(index, "provider_other", value)
                            }
                            placeholder="Nếu có"
                          />

                          <ProfileFormInput
                            label="Tên hỗ trợ"
                            value={support.support_name}
                            onChange={(value) =>
                              updateSupportItem(index, "support_name", value)
                            }
                            placeholder="Ví dụ: Tư vấn, đào tạo..."
                          />

                          <ProfileFormInput
                            label="Năm hỗ trợ"
                            type="number"
                            value={support.support_year}
                            onChange={(value) =>
                              updateSupportItem(index, "support_year", value)
                            }
                            placeholder="2026"
                          />

                          <ProfileFormTextarea
                            label="Chi tiết hỗ trợ"
                            value={support.support_detail}
                            onChange={(value) =>
                              updateSupportItem(index, "support_detail", value)
                            }
                            placeholder="Nội dung hỗ trợ..."
                            className="md:col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ProfileFormSection>

            {/* QUẢN TRỊ */}
            <ProfileFormSection
              title="Thông tin quản trị"
              description="Các thông tin dùng trong quá trình quản lý hồ sơ."
            >
              <ProfileFormSelect
                label="Trạng thái hồ sơ"
                value={form.status}
                onChange={(value) => updateField("status", value)}
                options={[
                  {
                    value: "DRAFT",
                    label: "Bản nháp",
                  },
                  {
                    value: "SUBMITTED",
                    label: "Đã gửi hồ sơ",
                  },
                  {
                    value: "REVIEWING",
                    label: "Đang xem xét",
                  },
                  {
                    value: "APPROVED",
                    label: "Đã duyệt",
                  },
                  {
                    value: "REJECTED",
                    label: "Không duyệt",
                  },
                ]}
              />

              <ProfileFormSelect
                label="Nguồn dữ liệu"
                value={form.source_type}
                onChange={(value) => updateField("source_type", value)}
                options={[
                  {
                    value: "ADMIN",
                    label: "Admin nhập",
                  },
                  {
                    value: "PUBLIC_FORM",
                    label: "Người dùng gửi",
                  },
                  {
                    value: "IMPORT",
                    label: "Import Excel",
                  },
                ]}
              />

              <ProfileFormTextarea
                label="Ghi chú của Admin"
                value={form.admin_note}
                onChange={(value) => updateField("admin_note", value)}
                placeholder="Nhập ghi chú nếu cần..."
                className="md:col-span-2"
              />
            </ProfileFormSection>
          </form>
        </div>

        {/* FOOTER */}
        <div
          className="
            flex shrink-0 items-center
            justify-end gap-3
            border-t border-slate-200
            bg-white px-5 py-4 md:px-7
          "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-xl border border-slate-200
              bg-white px-5 py-2.5
              text-sm font-semibold
              text-slate-700
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            Hủy
          </button>

          <button
            type="submit"
            form="incubation-profile-form"
            disabled={saving}
            className="
              inline-flex items-center gap-2
              rounded-xl bg-emerald-600
              px-5 py-2.5
              text-sm font-semibold
              text-white
              shadow-sm
              hover:bg-emerald-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {saving && <Loader2 size={17} className="animate-spin" />}

            {saving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// MAIN
// ============================================================

export default function AdminIncubationProfiles() {
  const [profiles, setProfiles] = useState([]);

  const [statistics, setStatistics] = useState({
    total_profiles: 0,
    draft_profiles: 0,
    submitted_profiles: 0,
    reviewing_profiles: 0,
    approved_profiles: 0,
    rejected_profiles: 0,
  });

  const [filterOptions, setFilterOptions] = useState({
    selection_programs: [],
    development_stages: [],
    provinces: [],
    fields: [],
    markets: [],
  });

  const [filters, setFilters] = useState({
    keyword: "",
    incubation_program_id: "",
    selection_program: "",
    development_stage: "",
    field_code: "",
    market_code: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState("");
  const [incubationPrograms, setIncubationPrograms] = useState([]);
  // FORM THÊM HỒ SƠ
  const [formOpen, setFormOpen] = useState(false);

  const [formSaving, setFormSaving] = useState(false);

  const [formData, setFormData] = useState({
    ...EMPTY_PROFILE_FORM,
  });
  // DETAIL
  const [detailOpen, setDetailOpen] = useState(false);

  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState(null);

  // DELETE
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleting, setDeleting] = useState(false);

  // ==========================================================
  // QUERY PARAMS
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
  // LOAD DANH SÁCH
  // ==========================================================

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles`,
        getAuthConfig(queryParams),
      );

      setProfiles(response.data?.data || []);
    } catch (err) {
      console.error("Lỗi lấy hồ sơ ươm tạo:", err);

      setProfiles([]);

      setError(err.response?.data?.message || "Không thể tải danh sách hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  // ==========================================================
  // LOAD STATISTICS
  // ==========================================================

  const loadStatistics = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/statistics`,
        getAuthConfig(),
      );

      setStatistics(response.data?.data || {});
    } catch (err) {
      console.error("Lỗi tải thống kê ươm tạo:", err);
    }
  }, []);

  // ==========================================================
  // LOAD FILTER OPTIONS
  // ==========================================================

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/filter-options`,
        getAuthConfig(),
      );
      setFilterOptions(
        response.data?.data || {
          selection_programs: [],
          development_stages: [],
          provinces: [],
          fields: [],
          markets: [],
        },
      );
    } catch (err) {
      console.error("Lỗi lấy bộ lọc ươm tạo:", err);
    }
  }, []);
  const loadIncubationPrograms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/incubation-programs`);

      setIncubationPrograms(response.data?.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách Chương trình ươm tạo:", err);

      setIncubationPrograms([]);
    }
  }, []);
  useEffect(() => {
    loadStatistics();
    loadFilterOptions();
    loadIncubationPrograms();
  }, [loadStatistics, loadFilterOptions, loadIncubationPrograms]);

  // debounce search/filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfiles();
    }, 350);

    return () => clearTimeout(timer);
  }, [loadProfiles]);

  // ==========================================================
  // CHANGE FILTER
  // ==========================================================

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const resetFilters = () => {
    setFilters({
      keyword: "",
      incubation_program_id: "",
      selection_program: "",
      development_stage: "",
      field_code: "",
      market_code: "",
      status: "",
    });
  };

  // ==========================================================
  // XEM CHI TIẾT
  // ==========================================================

  const openDetail = async (profileId) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setSelectedProfile(null);

      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/${profileId}`,
        getAuthConfig(),
      );

      setSelectedProfile(response.data?.data || null);
    } catch (err) {
      console.error("Lỗi xem chi tiết hồ sơ:", err);

      alert(err.response?.data?.message || "Không thể tải chi tiết hồ sơ.");

      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ==========================================================
  // EXPORT
  // ==========================================================

  const handleExport = async () => {
    try {
      setExporting(true);

      const response = await axios.get(
        `${API_BASE}/api/incubation-profiles/export`,
        {
          ...getAuthConfig(queryParams),
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `chuong-trinh-uom-tao-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);

      alert("Không thể xuất Excel. Vui lòng kiểm tra lại bộ lọc.");
    } finally {
      setExporting(false);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const askDelete = (profile) => {
    setDeleteTarget(profile);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    try {
      setDeleting(true);

      await axios.delete(
        `${API_BASE}/api/incubation-profiles/${deleteTarget.id}`,
        getAuthConfig(),
      );

      setDeleteOpen(false);
      setDeleteTarget(null);

      await Promise.all([
        loadProfiles(),
        loadStatistics(),
        loadFilterOptions(),
      ]);
    } catch (err) {
      console.error("Lỗi xóa hồ sơ:", err);

      alert(err.response?.data?.message || "Không thể xóa hồ sơ.");
    } finally {
      setDeleting(false);
    }
  };
  // ==========================================================
  // FORM THÊM HỒ SƠ
  // ==========================================================

  const openCreateForm = () => {
    setFormData({
      ...EMPTY_PROFILE_FORM,
      fields: [],
      markets: [],
      received_supports: [],
    });

    setFormOpen(true);
  };

  const closeCreateForm = () => {
    if (formSaving) {
      return;
    }

    setFormOpen(false);

    setFormData({
      ...EMPTY_PROFILE_FORM,
      fields: [],
      markets: [],
      received_supports: [],
    });
  };

  const handleCreateProfile = async (event) => {
    event.preventDefault();

    if (!formData.project_name.trim()) {
      alert("Vui lòng nhập tên dự án.");
      return;
    }

    if (!formData.contact_fullname.trim()) {
      alert("Vui lòng nhập họ tên người liên hệ.");
      return;
    }

    if (!formData.contact_phone.trim() && !formData.contact_email.trim()) {
      alert("Người liên hệ cần có ít nhất số điện thoại hoặc email.");
      return;
    }

    try {
      setFormSaving(true);

      const payload = {
        ...formData,

        team_size:
          formData.team_size === "" ? null : Number(formData.team_size),

        part_time_jobs:
          formData.part_time_jobs === ""
            ? null
            : Number(formData.part_time_jobs),

        project_start_year:
          formData.project_start_year === ""
            ? null
            : Number(formData.project_start_year),

        revenue_last_3_years:
          formData.revenue_last_3_years === ""
            ? null
            : Number(formData.revenue_last_3_years),

        charter_capital:
          formData.charter_capital === ""
            ? null
            : Number(formData.charter_capital),

        annual_revenue:
          formData.annual_revenue === ""
            ? null
            : Number(formData.annual_revenue),

        raised_amount:
          formData.raised_amount === "" ? null : Number(formData.raised_amount),

        fundraising_need:
          formData.fundraising_need === ""
            ? null
            : Number(formData.fundraising_need),

        patent_count:
          formData.patent_count === "" ? null : Number(formData.patent_count),

        utility_solution_count:
          formData.utility_solution_count === ""
            ? null
            : Number(formData.utility_solution_count),

        product_count:
          formData.product_count === "" ? null : Number(formData.product_count),

        service_count:
          formData.service_count === "" ? null : Number(formData.service_count),

        customer_count:
          formData.customer_count === ""
            ? null
            : Number(formData.customer_count),

        international_revenue:
          formData.international_revenue === ""
            ? null
            : Number(formData.international_revenue),

        international_customer_count:
          formData.international_customer_count === ""
            ? null
            : Number(formData.international_customer_count),

        fields: formData.fields
          .filter(
            (item) =>
              String(item.field_code || "").trim() &&
              String(item.field_name || "").trim(),
          )
          .map((item) => ({
            field_code: String(item.field_code).trim(),
            field_name: String(item.field_name).trim(),
            other_detail: String(item.other_detail || "").trim() || null,
          })),

        markets: formData.markets
          .filter(
            (item) =>
              String(item.market_code || "").trim() &&
              String(item.market_name || "").trim(),
          )
          .map((item) => ({
            market_code: String(item.market_code).trim(),
            market_name: String(item.market_name).trim(),
            other_detail: String(item.other_detail || "").trim() || null,
          })),

        received_supports: formData.received_supports
          .filter(
            (item) =>
              String(item.support_code || "").trim() ||
              String(item.support_name || "").trim(),
          )
          .map((item) => ({
            provider_code: String(item.provider_code || "").trim() || null,

            provider_name: String(item.provider_name || "").trim() || null,

            provider_other: String(item.provider_other || "").trim() || null,

            support_code:
              String(item.support_code || "").trim() ||
              String(item.support_name || "").trim(),

            support_name: String(item.support_name || "").trim(),

            support_detail: String(item.support_detail || "").trim() || null,

            support_year:
              item.support_year === "" ? null : Number(item.support_year),
          })),
      };

      await axios.post(
        `${API_BASE}/api/incubation-profiles`,
        payload,
        getAuthConfig(),
      );

      alert("Đã thêm hồ sơ Chương trình ươm tạo thành công.");

      setFormOpen(false);

      setFormData({
        ...EMPTY_PROFILE_FORM,
        fields: [],
        markets: [],
        received_supports: [],
      });

      await Promise.all([
        loadProfiles(),
        loadStatistics(),
        loadFilterOptions(),
      ]);
    } catch (err) {
      console.error("Lỗi thêm hồ sơ ươm tạo:", err);

      alert(
        err.response?.data?.message ||
          "Không thể thêm hồ sơ Chương trình ươm tạo.",
      );
    } finally {
      setFormSaving(false);
    }
  };
  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <div
        className="
          mb-6 flex flex-col
          justify-between gap-4
          lg:flex-row lg:items-center
        "
      >
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            QUẢN LÝ DỮ LIỆU
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Chương trình ươm tạo
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Quản lý hồ sơ doanh nghiệp, dự án, thông tin liên hệ và quá trình hỗ
            trợ trong chương trình ươm tạo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading || profiles.length === 0}
            className="
              inline-flex items-center gap-2
              rounded-xl border border-emerald-200
              bg-white px-4 py-2.5
              text-sm font-semibold text-emerald-700
              transition hover:bg-emerald-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            Xuất Excel
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="
    inline-flex items-center gap-2
    rounded-xl bg-emerald-600
    px-5 py-2.5
    text-sm font-semibold text-white
    shadow-sm transition
    hover:bg-emerald-700
  "
          >
            + Thêm hồ sơ
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* STATISTICS */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng hồ sơ"
          value={statistics.total_profiles}
          icon={FileText}
        />

        <StatCard
          label="Đã gửi hồ sơ"
          value={statistics.submitted_profiles}
          icon={Mail}
        />

        <StatCard
          label="Đang xem xét"
          value={statistics.reviewing_profiles}
          icon={Search}
        />

        <StatCard
          label="Đã duyệt"
          value={statistics.approved_profiles}
          icon={CheckCircle2}
        />
      </div>

      {/* ==================================================== */}
      {/* FILTER */}
      {/* ==================================================== */}

      <div
        className="
          mt-6 rounded-2xl
          border border-slate-200
          bg-white p-5 shadow-sm
        "
      >
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-emerald-600" />

          <h2 className="font-bold text-slate-900">Tìm kiếm và lọc hồ sơ</h2>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search
            size={19}
            className="
              absolute left-4 top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            value={filters.keyword}
            onChange={(e) => handleFilterChange("keyword", e.target.value)}
            placeholder="Tìm theo tên dự án, doanh nghiệp, người liên hệ, email hoặc số điện thoại..."
            className="
              w-full rounded-xl
              border border-slate-200
              bg-slate-50
              py-3 pl-11 pr-4
              text-sm outline-none
              transition
              focus:border-emerald-400
              focus:bg-white
              focus:ring-4
              focus:ring-emerald-50
            "
          />
        </div>

        {/* FILTER GRID */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SelectFilter
            value={filters.incubation_program_id}
            onChange={(value) =>
              handleFilterChange("incubation_program_id", value)
            }
            placeholder="Tất cả Chương trình ươm tạo"
            options={incubationPrograms.map((program) => ({
              value: String(program.id),
              label: `${program.program_name}${
                program.year ? ` (${program.year})` : ""
              }`,
            }))}
          />
          <SelectFilter
            value={filters.selection_program}
            onChange={(value) => handleFilterChange("selection_program", value)}
            placeholder="Tất cả chương trình"
            options={filterOptions.selection_programs.map((item) => ({
              value: item,
              label: item,
            }))}
          />

          <SelectFilter
            value={filters.development_stage}
            onChange={(value) => handleFilterChange("development_stage", value)}
            placeholder="Tất cả giai đoạn"
            options={filterOptions.development_stages.map((item) => ({
              value: item,
              label: item,
            }))}
          />

          <SelectFilter
            value={filters.field_code}
            onChange={(value) => handleFilterChange("field_code", value)}
            placeholder="Tất cả lĩnh vực"
            options={filterOptions.fields.map((item) => ({
              value: item.field_code,
              label: item.field_name,
            }))}
          />

          <SelectFilter
            value={filters.market_code}
            onChange={(value) => handleFilterChange("market_code", value)}
            placeholder="Tất cả thị trường"
            options={filterOptions.markets.map((item) => ({
              value: item.market_code,
              label: item.market_name,
            }))}
          />

          <SelectFilter
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            placeholder="Tất cả trạng thái"
            options={[
              {
                value: "DRAFT",
                label: "Bản nháp",
              },
              {
                value: "SUBMITTED",
                label: "Đã gửi hồ sơ",
              },
              {
                value: "REVIEWING",
                label: "Đang xem xét",
              },
              {
                value: "APPROVED",
                label: "Đã duyệt",
              },
              {
                value: "REJECTED",
                label: "Không duyệt",
              },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Tìm thấy{" "}
            <strong className="text-slate-900">{profiles.length}</strong> hồ sơ
            phù hợp.
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="
              inline-flex items-center gap-2
              rounded-xl px-4 py-2
              text-sm font-semibold
              text-slate-600 transition
              hover:bg-slate-100
            "
          >
            <RefreshCcw size={17} />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* ERROR */}
      {/* ==================================================== */}

      {error && (
        <div
          className="
            mt-5 rounded-2xl
            border border-red-200
            bg-red-50 p-4
            text-sm text-red-700
          "
        >
          {error}
        </div>
      )}

      {/* ==================================================== */}
      {/* TABLE */}
      {/* ==================================================== */}

      <div
        className="
          mt-6 overflow-hidden
          rounded-2xl border
          border-slate-200
          bg-white shadow-sm
        "
      >
        <div
          className="
            flex flex-wrap items-center
            justify-between gap-3
            border-b border-slate-200
            px-5 py-4
          "
        >
          <div>
            <h2 className="font-bold text-slate-900">Danh sách hồ sơ</h2>

            <p className="mt-1 text-sm text-slate-500">
              Bấm “Xem” để mở đầy đủ thông tin A → G của hồ sơ.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1350px] w-full">
            <thead className="bg-slate-50">
              <tr
                className="
                  text-left text-xs
                  font-semibold uppercase
                  tracking-wide text-slate-500
                "
              >
                <th className="px-5 py-4">Dự án / Doanh nghiệp</th>

                <th className="px-5 py-4">Thuộc chương trình</th>

                <th className="px-5 py-4">Người liên hệ</th>

                <th className="px-5 py-4">Giai đoạn</th>

                <th className="px-5 py-4">Lĩnh vực</th>

                <th className="px-5 py-4">Thị trường</th>

                <th className="px-5 py-4">Trạng thái</th>

                <th className="px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20">
                    <div className="flex items-center justify-center gap-3 text-slate-500">
                      <Loader2 className="animate-spin" size={25} />
                      Đang tải hồ sơ...
                    </div>
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center">
                    <FileText size={40} className="mx-auto text-slate-300" />

                    <p className="mt-3 font-semibold text-slate-700">
                      Không có hồ sơ phù hợp
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Hãy thử thay đổi hoặc đặt lại bộ lọc.
                    </p>
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="
                        align-top transition
                        hover:bg-slate-50/70
                      "
                  >
                    {/* PROJECT */}
                    <td className="px-5 py-4">
                      <div className="max-w-[330px]">
                        <p className="font-semibold leading-5 text-slate-900">
                          {profile.project_name}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Building2 size={15} />

                          <span>
                            {profile.company_name || "Chưa có tên doanh nghiệp"}
                          </span>
                        </div>

                        {profile.province_city && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <MapPin size={15} />
                            {profile.province_city}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PROGRAM */}
                    <td className="px-5 py-4">
                      {profile.program_name ? (
                        <div className="min-w-[220px]">
                          <p className="text-sm font-semibold text-slate-800">
                            {profile.program_name}
                          </p>

                          {profile.program_year && (
                            <p className="mt-1 text-xs text-slate-500">
                              Năm {profile.program_year}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Chưa gán chương trình
                        </span>
                      )}
                    </td>

                    {/* CONTACT */}
                    <td className="px-5 py-4">
                      <div className="min-w-[220px]">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <UserRound size={16} />
                          {profile.contact_fullname}
                        </div>

                        {profile.contact_phone && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <Phone size={14} />
                            {profile.contact_phone}
                          </div>
                        )}

                        {profile.contact_email && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Mail size={14} />

                            <span className="max-w-[190px] truncate">
                              {profile.contact_email}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* STAGE */}
                    <td className="px-5 py-4">
                      <span
                        className="
                            inline-flex rounded-lg
                            bg-slate-100
                            px-2.5 py-1.5
                            text-sm font-medium
                            text-slate-700
                          "
                      >
                        {profile.development_stage_other ||
                          profile.development_stage ||
                          "—"}
                      </span>
                    </td>

                    {/* FIELD */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">
                        {profile.total_fields
                          ? `${profile.total_fields} lĩnh vực`
                          : "—"}
                      </p>
                    </td>

                    {/* MARKET */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">
                        {profile.total_markets
                          ? `${profile.total_markets} thị trường`
                          : "—"}
                      </p>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <StatusBadge status={profile.status} />

                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(profile.updated_at)}
                      </p>
                    </td>

                    {/* ACTION */}
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => openDetail(profile.id)}
                          className="
                              inline-flex items-center
                              gap-1.5 rounded-lg
                              bg-emerald-50
                              px-3 py-2
                              text-sm font-semibold
                              text-emerald-700
                              transition
                              hover:bg-emerald-100
                            "
                        >
                          <Eye size={16} />
                          Xem
                        </button>

                        <button
                          type="button"
                          title="Xóa hồ sơ"
                          onClick={() => askDelete(profile)}
                          className="
                              rounded-lg
                              p-2 text-red-500
                              transition
                              hover:bg-red-50
                              hover:text-red-700
                            "
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
      {/* MODAL THÊM HỒ SƠ */}
      <IncubationProfileFormModal
        open={formOpen}
        saving={formSaving}
        form={formData}
        filterOptions={filterOptions}
        onChange={setFormData}
        onClose={closeCreateForm}
        onSubmit={handleCreateProfile}
      />
      {/* MODAL DETAIL */}
      <DetailModal
        open={detailOpen}
        loading={detailLoading}
        profile={selectedProfile}
        onClose={() => {
          setDetailOpen(false);
          setSelectedProfile(null);
        }}
      />

      {/* MODAL DELETE */}
      <DeleteModal
        open={deleteOpen}
        profile={deleteTarget}
        deleting={deleting}
        onClose={() => {
          if (deleting) return;

          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ============================================================
// SELECT FILTER
// ============================================================

function SelectFilter({ value, onChange, placeholder, options = [] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full appearance-none
          rounded-xl border
          border-slate-200
          bg-white
          px-4 py-3 pr-10
          text-sm text-slate-700
          outline-none transition
          focus:border-emerald-400
          focus:ring-4
          focus:ring-emerald-50
        "
      >
        <option value="">{placeholder}</option>

        {options.map((option, index) => (
          <option
            key={`${option.value}-${option.label}-${index}`}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={17}
        className="
          pointer-events-none
          absolute right-3 top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />
    </div>
  );
}
