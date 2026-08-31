const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100";

const USER_TYPE_LABELS = {
  STARTUP: "Khởi nghiệp",
  STUDENT: "Sinh viên",
  BUSINESS: "Doanh nghiệp",
  UNIVERSITY: "Trường đại học",
  OTHER: "Khác",
};

const REGISTER_STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
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

export default function StudentReportFilters({
  filters,
  genderOptions,
  userTypeOptions,
  registerStatusOptions,
  onChange,
  onReset,
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Tìm kiếm học viên">
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Tìm họ tên, email, điện thoại..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Giới tính">
          <select
            value={filters.gender}
            onChange={(event) => onChange("gender", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả giới tính</option>
            {genderOptions.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Nhóm đối tượng">
          <select
            value={filters.userType}
            onChange={(event) => onChange("userType", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả nhóm đối tượng</option>
            {userTypeOptions.map((userType) => (
              <option key={userType} value={userType}>
                {USER_TYPE_LABELS[userType] || userType}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Trạng thái đăng ký">
          <select
            value={filters.registerStatus}
            onChange={(event) =>
              onChange("registerStatus", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            {registerStatusOptions.map((status) => (
              <option key={status} value={status}>
                {REGISTER_STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Đơn vị">
          <input
            type="search"
            value={filters.company}
            onChange={(event) => onChange("company", event.target.value)}
            placeholder="Tìm theo đơn vị..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Chức vụ">
          <input
            type="search"
            value={filters.position}
            onChange={(event) => onChange("position", event.target.value)}
            placeholder="Tìm theo chức vụ..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Tình trạng đi học">
          <select
            value={filters.attendanceStatus}
            onChange={(event) =>
              onChange("attendanceStatus", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="ATTENDED">Đã đi học</option>
            <option value="NOT_ATTENDED">Chưa đi học</option>
          </select>
        </FilterField>

        <FilterField label="Tỷ lệ tham dự">
          <select
            value={filters.attendanceRate}
            onChange={(event) =>
              onChange("attendanceRate", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả tỷ lệ</option>
            <option value="FULL">100%</option>
            <option value="AT_LEAST_80">Từ 80% trở lên</option>
            <option value="FROM_50_TO_80">Từ 50% đến dưới 80%</option>
            <option value="FROM_0_TO_50">Trên 0% đến dưới 50%</option>
            <option value="ZERO">0%</option>
          </select>
        </FilterField>

        <FilterField label="Điều kiện chứng nhận">
          <select
            value={filters.certificateEligible}
            onChange={(event) =>
              onChange("certificateEligible", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="ELIGIBLE">Đủ điều kiện</option>
            <option value="NOT_ELIGIBLE">Chưa đủ điều kiện</option>
          </select>
        </FilterField>

        <FilterField label="Trạng thái cấp chứng nhận">
          <select
            value={filters.certificateIssued}
            onChange={(event) =>
              onChange("certificateIssued", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả</option>
            <option value="ISSUED">Đã cấp</option>
            <option value="NOT_ISSUED">Chưa cấp</option>
          </select>
        </FilterField>

        <div className="flex items-end md:col-span-2 xl:col-span-2">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 xl:w-auto"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}
