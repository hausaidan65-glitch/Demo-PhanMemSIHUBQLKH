function formatProgressDateTime(value) {
  if (!value) return 'Không xác định';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function CourseClassProgressHistory({ history }) {
  if (!history.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
        Chưa có cập nhật tiến độ.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <article
          key={entry.id}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <time className="text-sm font-semibold text-slate-800">
              {formatProgressDateTime(entry.report_time || entry.created_at)}
            </time>
            <span className="text-sm text-slate-500">
              {entry.created_by?.username || 'Không xác định'}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tiến độ
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
              {entry.content || '—'}
            </p>
          </div>

          {entry.note && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Ghi chú quan trọng
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-amber-900">
                {entry.note}
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
