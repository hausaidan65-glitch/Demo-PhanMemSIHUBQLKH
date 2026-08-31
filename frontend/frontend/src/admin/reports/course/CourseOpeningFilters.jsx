const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100";

const STATUS_LABELS = {
  OPEN: "Đang mở",
  FULL: "Đã đủ",
  CLOSED: "Đã đóng",
  ACTIVE: "Đang hoạt động",
  FINISHED: "Đã kết thúc",
  ONGOING: "Đang diễn ra",
  UPCOMING: "Sắp tổ chức",
  PENDING: "Chờ xử lý",
};

function FilterField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function CourseOpeningFilters({
  filters,
  operationalStatusOptions,
  organizationStatusOptions,
  onChange,
  onReset,
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Tìm kiếm lớp / đợt tổ chức">
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Tìm tên lớp hoặc mã lớp..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Trạng thái vận hành">
          <select
            value={filters.operationalStatus}
            onChange={(event) =>
              onChange("operationalStatus", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            {operationalStatusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Trạng thái tổ chức">
          <select
            value={filters.organizationStatus}
            onChange={(event) =>
              onChange("organizationStatus", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            {organizationStatusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Từ ngày">
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Đến ngày">
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Đăng ký">
          <select
            value={filters.registrationPresence}
            onChange={(event) =>
              onChange("registrationPresence", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="HAS">Có học viên đăng ký</option>
            <option value="NONE">Chưa có học viên đăng ký</option>
          </select>
        </FilterField>

        <FilterField label="Đi học">
          <select
            value={filters.attendancePresence}
            onChange={(event) =>
              onChange("attendancePresence", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="HAS">Có học viên đi học</option>
            <option value="NONE">Chưa có học viên đi học</option>
          </select>
        </FilterField>

        <FilterField label="Chứng nhận">
          <select
            value={filters.certificatePresence}
            onChange={(event) =>
              onChange("certificatePresence", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="HAS">Có cấp chứng nhận</option>
            <option value="NONE">Chưa cấp chứng nhận</option>
          </select>
        </FilterField>

        <div className="flex items-end md:col-span-2 xl:col-span-4">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:w-auto"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}
