import { RotateCcw, Search } from 'lucide-react';

import { UNKNOWN_FILTER_VALUE } from './networkingEventFilterUtils';

const FIELD_CLASS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100';

export default function NetworkingEventListFilters({
  filters,
  storedStatusOptions,
  operationalStatusOptions,
  missionOptions,
  onChange,
  onReset,
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 md:grid-cols-2 xl:grid-cols-5">
      <label className="relative md:col-span-2 xl:col-span-2">
        <span className="sr-only">Tìm sự kiện</span>
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="search"
          value={filters.keyword}
          onChange={(event) => onChange('keyword', event.target.value)}
          placeholder="Tìm tên, mã, địa điểm, đơn vị, nhiệm vụ..."
          className={`${FIELD_CLASS} pl-9`}
        />
      </label>
      <select value={filters.stored_status} onChange={(event) => onChange('stored_status', event.target.value)} className={FIELD_CLASS} aria-label="Trạng thái lưu">
        <option value="">Tất cả trạng thái lưu</option>
        {storedStatusOptions.values.map((value) => <option key={value} value={value}>{value}</option>)}
        {storedStatusOptions.hasUnknown && <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>}
      </select>
      <select value={filters.operational_status} onChange={(event) => onChange('operational_status', event.target.value)} className={FIELD_CLASS} aria-label="Trạng thái hoạt động">
        <option value="">Tất cả trạng thái hoạt động</option>
        {operationalStatusOptions.values.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <div className="flex min-w-0 gap-2">
        <select value={filters.mission} onChange={(event) => onChange('mission', event.target.value)} className={`${FIELD_CLASS} min-w-0`} aria-label="Nhiệm vụ">
          <option value="">Tất cả nhiệm vụ</option>
          {missionOptions.values.map((value) => <option key={value} value={value}>{value}</option>)}
          {missionOptions.hasUnknown && <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>}
        </select>
        <button type="button" title="Đặt lại bộ lọc sự kiện" onClick={onReset} className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-100">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
