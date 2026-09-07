import { useState } from 'react';
import {
  combineDateTime,
  formatOrganizationRange,
  splitDateTime,
} from './organizationDateTimeUtils';

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100';

export default function OrganizationDateTimeFields({
  startValue,
  endValue,
  onCommit,
  dateOnly = false,
  startName = 'start_datetime',
  endName = 'end_datetime',
}) {
  const initialStart = splitDateTime(startValue);
  const initialEnd = splitDateTime(endValue);
  const [draft, setDraft] = useState({
    startDate: initialStart.date,
    startTime: initialStart.time,
    endDate: initialEnd.date,
    endTime: initialEnd.time,
  });
  const start = dateOnly
    ? draft.startDate
    : combineDateTime(draft.startDate, draft.startTime);
  const end = dateOnly
    ? draft.endDate
    : combineDateTime(draft.endDate, draft.endTime);
  const invalidRange = Boolean(start && end && end < start);
  const incomplete = Boolean(
    (draft.startDate ||
      draft.startTime ||
      draft.endDate ||
      draft.endTime) &&
      (!start || !end),
  );
  const preview = formatOrganizationRange(start, end, dateOnly);

  const update = (field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  };
  const commit = () => onCommit?.(start, end);

  return (
    <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <p className="text-sm font-bold text-blue-900">Thời gian tổ chức</p>
      <div className={`mt-4 grid gap-4 ${dateOnly ? 'md:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
        <label className="text-sm font-medium text-slate-700">
          Ngày bắt đầu
          <input type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} onBlur={commit} className={`${INPUT_CLASS} mt-2`} />
        </label>
        {!dateOnly && (
          <label className="text-sm font-medium text-slate-700">
            Giờ bắt đầu
            <input type="time" value={draft.startTime} onChange={(event) => update('startTime', event.target.value)} onBlur={commit} className={`${INPUT_CLASS} mt-2`} />
          </label>
        )}
        <label className="text-sm font-medium text-slate-700">
          Ngày kết thúc
          <input type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(event) => update('endDate', event.target.value)} onBlur={commit} className={`${INPUT_CLASS} mt-2`} />
        </label>
        {!dateOnly && (
          <label className="text-sm font-medium text-slate-700">
            Giờ kết thúc
            <input type="time" value={draft.endTime} onChange={(event) => update('endTime', event.target.value)} onBlur={commit} className={`${INPUT_CLASS} mt-2`} />
          </label>
        )}
      </div>
      <input type="hidden" name={startName} value={start} />
      <input type="hidden" name={endName} value={end} />
      <input
        type="hidden"
        name="organization_time_incomplete"
        value={incomplete ? "1" : "0"}
      />
      <input
        type="hidden"
        name="organization_time_invalid"
        value={invalidRange ? "1" : "0"}
      />
      {invalidRange && (
        <p className="mt-3 text-sm font-medium text-red-600">
          Thời gian kết thúc phải sau thời gian bắt đầu.
        </p>
      )}
      {!invalidRange && incomplete && (
        <p className="mt-3 text-sm text-amber-700">
          Vui lòng nhập đầy đủ ngày và giờ bắt đầu, kết thúc.
        </p>
      )}
      <p className="mt-3 text-sm text-slate-600">
        {preview === 'Chưa cập nhật'
          ? 'Chưa cập nhật thời gian tổ chức'
          : preview}
      </p>
    </div>
  );
}
