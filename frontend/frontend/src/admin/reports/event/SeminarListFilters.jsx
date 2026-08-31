import {
  NO_PARENT_FILTER_VALUE,
  UNKNOWN_FILTER_VALUE,
} from "./seminarReportFilters";
import { getStatusLabel } from "./eventReportUtils";

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

export default function SeminarListFilters({
  filters,
  statusOptions,
  parentOptions,
  missionOptions,
  onChange,
  onReset,
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Từ khóa">
          <input
            type="search"
            value={filters.keyword}
            onChange={(event) => onChange("keyword", event.target.value)}
            placeholder="Tên, mã, địa điểm, đơn vị..."
            className={FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Trạng thái">
          <select
            value={filters.status}
            onChange={(event) => onChange("status", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.values.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
            {statusOptions.hasUnknown && (
              <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>
            )}
          </select>
        </FilterField>

        <FilterField label="Triển lãm trực thuộc">
          <select
            value={filters.parent}
            onChange={(event) => onChange("parent", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả triển lãm</option>
            <option value={NO_PARENT_FILTER_VALUE}>Không thuộc triển lãm</option>
            {parentOptions.values.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Nhiệm vụ">
          <select
            value={filters.mission}
            onChange={(event) => onChange("mission", event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Tất cả nhiệm vụ</option>
            {missionOptions.values.map((mission) => (
              <option key={mission} value={mission}>
                {mission}
              </option>
            ))}
            {missionOptions.hasUnknown && (
              <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>
            )}
          </select>
        </FilterField>

        <div className="flex items-end md:col-span-2 xl:col-span-4">
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
