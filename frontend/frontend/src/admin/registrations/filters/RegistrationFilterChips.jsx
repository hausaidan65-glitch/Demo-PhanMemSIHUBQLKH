import { X } from "lucide-react";

export default function RegistrationFilterChips({ chips, onClearAll }) {
  if (!chips.length) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Đang lọc:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-green-200 bg-green-50 py-1 pl-3 pr-1.5 text-xs font-medium text-green-800"
        >
          <span className="max-w-64 truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={`Xóa bộ lọc ${chip.name}`}
            onClick={chip.onRemove}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-green-700 hover:bg-green-200"
          >
            <X size={13} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
      >
        Xóa tất cả
      </button>
    </div>
  );
}
