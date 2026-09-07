import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function RegistrationMultiSelect({
  label,
  values,
  options,
  onChange,
  getOptionValue = (option) => option,
  getOptionLabel = (option) => option,
  searchPlaceholder = "Tìm lựa chọn...",
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        raw: option,
        value: String(getOptionValue(option)),
        label: String(getOptionLabel(option)),
      })),
    [getOptionLabel, getOptionValue, options],
  );

  const selectedValues = useMemo(
    () => new Set(values.map(String)),
    [values],
  );

  const selectedOptions = useMemo(
    () => normalizedOptions.filter((option) => selectedValues.has(option.value)),
    [normalizedOptions, selectedValues],
  );

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");

    if (!normalizedQuery) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) =>
      option.label.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleOption = (value) => {
    if (selectedValues.has(value)) {
      onChange(values.filter((item) => String(item) !== value));
      return;
    }

    onChange([...values, value]);
  };

  const toggleDropdown = () => {
    if (open) {
      setQuery("");
    }

    setOpen(!open);
  };

  const summary = selectedOptions.length
    ? `${selectedOptions
        .slice(0, 2)
        .map((option) => option.label)
        .join(", ")}${selectedOptions.length > 2 ? ` +${selectedOptions.length - 2}` : ""}`
    : "Tất cả";

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={toggleDropdown}
          className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm outline-none transition focus:ring-4 focus:ring-green-100 ${
            open
              ? "border-green-500"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <span
            className={`min-w-0 flex-1 truncate ${
              selectedOptions.length ? "font-medium text-slate-800" : "text-slate-500"
            }`}
          >
            {summary}
          </span>

          {selectedOptions.length > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              {selectedOptions.length}
            </span>
          )}

          <ChevronDown
            size={17}
            className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center rounded-lg bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-green-100">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm lựa chọn"
                    onClick={() => setQuery("")}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-2">
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option) => {
                  const selected = selectedValues.has(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggleOption(option.value)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        selected
                          ? "bg-green-50 text-green-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="break-words">{option.label}</span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-5 text-center text-sm text-slate-400">
                  Không tìm thấy lựa chọn phù hợp.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
