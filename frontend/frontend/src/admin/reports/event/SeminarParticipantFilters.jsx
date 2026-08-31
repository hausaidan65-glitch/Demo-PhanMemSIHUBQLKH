import { UNKNOWN_FILTER_VALUE } from "./seminarReportFilters";
import { getRegistrationStatusLabel } from "./eventReportUtils";

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100";

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

function RawOptions({ options }) {
  return (
    <>
      {options.values.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
      {options.hasUnknown && (
        <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>
      )}
    </>
  );
}

export default function SeminarParticipantFilters({
  filters,
  registrationStatusOptions,
  checkInOptions,
  userTypeOptions,
  genderOptions,
  onChange,
  onReset,
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FilterField label="Từ khóa">
          <input
            type="search"
            value={filters.keyword}
            onChange={(event) => onChange("keyword", event.target.value)}
            placeholder="Họ tên, email, điện thoại..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Trạng thái đăng ký">
          <select
            value={filters.registrationStatus}
            onChange={(event) =>
              onChange("registrationStatus", event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            {registrationStatusOptions.values.map((status) => (
              <option key={status} value={status}>
                {getRegistrationStatusLabel(status)}
              </option>
            ))}
            {registrationStatusOptions.hasUnknown && (
              <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>
            )}
          </select>
        </FilterField>

        <FilterField label="Check-in">
          <select
            value={filters.checkedIn}
            onChange={(event) => onChange("checkedIn", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả check-in</option>
            {checkInOptions.has("CHECKED") && (
              <option value="CHECKED">Đã check-in</option>
            )}
            {checkInOptions.has("UNCHECKED") && (
              <option value="UNCHECKED">Chưa check-in</option>
            )}
            {checkInOptions.has("UNKNOWN") && (
              <option value="UNKNOWN">Không xác định</option>
            )}
          </select>
        </FilterField>

        <FilterField label="Nhóm đối tượng">
          <select
            value={filters.userType}
            onChange={(event) => onChange("userType", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả nhóm đối tượng</option>
            <RawOptions options={userTypeOptions} />
          </select>
        </FilterField>

        <FilterField label="Giới tính">
          <select
            value={filters.gender}
            onChange={(event) => onChange("gender", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả giới tính</option>
            <RawOptions options={genderOptions} />
          </select>
        </FilterField>

        <div className="flex items-end md:col-span-2 xl:col-span-5">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:w-auto"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}
