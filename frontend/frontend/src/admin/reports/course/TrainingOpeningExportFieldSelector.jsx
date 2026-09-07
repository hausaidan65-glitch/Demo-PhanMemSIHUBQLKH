import { ChevronDown, ListChecks, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_TRAINING_OPENING_EXPORT_FIELDS,
  TRAINING_OPENING_EXPORT_FIELD_GROUPS,
} from "./trainingOpeningExportFields";

export default function TrainingOpeningExportFieldSelector({
  selectedFields,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selected = new Set(selectedFields);
  const toggleField = (key) => {
    onChange(
      selected.has(key)
        ? selectedFields.filter((field) => field !== key)
        : DEFAULT_TRAINING_OPENING_EXPORT_FIELDS.filter(
            (field) => field === key || selected.has(field),
          ),
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      >
        <ListChecks size={16} />
        Chọn trường xuất ({selectedFields.length}/10)
        <ChevronDown size={16} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,430px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            <button type="button" onClick={() => onChange([...DEFAULT_TRAINING_OPENING_EXPORT_FIELDS])} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Chọn tất cả</button>
            <button type="button" onClick={() => onChange([])} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Bỏ chọn tất cả</button>
            <button type="button" onClick={() => onChange([...DEFAULT_TRAINING_OPENING_EXPORT_FIELDS])} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600"><RotateCcw size={13} /> Mặc định</button>
          </div>
          <div className="mt-3 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {TRAINING_OPENING_EXPORT_FIELD_GROUPS.map((group) => (
              <fieldset key={group.label}>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.fields.map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleField(key)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          {selectedFields.length === 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">Vui lòng chọn ít nhất 1 trường để xuất.</p>
          )}
        </div>
      )}
    </div>
  );
}

