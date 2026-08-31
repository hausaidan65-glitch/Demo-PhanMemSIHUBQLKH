import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, CheckCircle2, Database, Sparkles } from "lucide-react";

import {
  getFieldsForTarget,
  SPECIAL_MAPPING_OPTIONS,
} from "./googleFormFieldRegistry";

import { detectGoogleFormField } from "./googleFormAutoMapper";

// =====================================================
// LABEL
// =====================================================

function getFieldLabel(field, fields) {
  if (field === "__EXTRA__") {
    return "Giữ làm dữ liệu bổ sung";
  }

  if (field === "__IGNORE__") {
    return "Bỏ qua cột này";
  }

  return fields.find((item) => item.value === field)?.label || field;
}

// =====================================================
// COMPONENT
// =====================================================

function GoogleFormFieldMapping({ selectedSheet, target, onMappingChange }) {
  const headers = selectedSheet?.headers || [];

  const [mapping, setMapping] = useState({});

  // =====================================================
  // FIELD THEO MODULE
  // =====================================================

  const availableFields = useMemo(
    () => getFieldsForTarget(target?.type),
    [target?.type],
  );

  const selectOptions = useMemo(
    () => [...availableFields, ...SPECIAL_MAPPING_OPTIONS],
    [availableFields],
  );

  // =====================================================
  // AUTO MAP
  // =====================================================

  useEffect(() => {
    const detected = {};

    headers.forEach((header) => {
      /*
       * Placeholder do reader tạo ra:
       * đây mới thực sự là cột kỹ thuật nên bỏ.
       */
      if (String(header).startsWith("[Cột trống")) {
        detected[header] = "__IGNORE__";

        return;
      }

      /*
       * Mapper không nhận diện được
       * => __EXTRA__
       * => GIỮ dữ liệu.
       */
      detected[header] = detectGoogleFormField(header);
    });

    setMapping(detected);
  }, [selectedSheet?.sheetName, target?.type]);

  // =====================================================
  // REPORT RA PARENT
  // =====================================================

  useEffect(() => {
    if (!onMappingChange) {
      return;
    }

    const mappedFields = Object.values(mapping);

    const hasFullname = mappedFields.includes("fullname");

    const hasPhone = mappedFields.includes("phone");

    const hasEmail = mappedFields.includes("email");

    /*
     * Training hiện tại:
     * fullname + phone là required.
     *
     * Event sau này có thể điều chỉnh rule
     * trong Cleaner/Validator.
     */
    const isComplete = hasFullname && (target?.type !== "TRAINING" || hasPhone);

    onMappingChange({
      mapping,

      isComplete,

      hasFullname,
      hasPhone,
      hasEmail,
    });
  }, [mapping, target?.type, onMappingChange]);

  // =====================================================
  // STATS
  // =====================================================

  const stats = useMemo(() => {
    let mapped = 0;
    let extra = 0;
    let ignored = 0;

    for (const value of Object.values(mapping)) {
      if (value === "__EXTRA__") {
        extra += 1;
      } else if (value === "__IGNORE__") {
        ignored += 1;
      } else if (value) {
        mapped += 1;
      }
    }

    return {
      total: headers.length,
      mapped,
      extra,
      ignored,
    };
  }, [headers, mapping]);

  // =====================================================
  // REQUIRED
  // =====================================================

  const requiredIssues = useMemo(() => {
    const fields = Object.values(mapping);

    const issues = [];

    if (!fields.includes("fullname")) {
      issues.push("Chưa xác định cột Họ và tên.");
    }

    if (target?.type === "TRAINING" && !fields.includes("phone")) {
      issues.push("Khóa đào tạo cần cột Số điện thoại.");
    }

    return issues;
  }, [mapping, target?.type]);

  // =====================================================
  // DUPLICATE TARGET FIELD
  //
  // Ví dụ Admin vô tình map:
  // Cột A -> phone
  // Cột B -> phone
  //
  // => cảnh báo.
  // =====================================================

  const duplicateMappedFields = useMemo(() => {
    const counter = {};

    Object.values(mapping).forEach((value) => {
      if (!value || value === "__EXTRA__" || value === "__IGNORE__") {
        return;
      }

      counter[value] = (counter[value] || 0) + 1;
    });

    return Object.entries(counter)
      .filter(([, count]) => count > 1)
      .map(([field]) => field);
  }, [mapping]);

  if (!selectedSheet) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Bước Mapping
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Ghép cột Google Form với SIHUB
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Hệ thống tự nhận diện các trường phổ biến. Những cột chưa có field
            SIHUB phù hợp vẫn được giữ làm dữ liệu bổ sung, không bị xóa.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          <Sparkles size={17} />
          Tự map {stats.mapped}/{stats.total}
        </div>
      </div>

      {/* REQUIRED WARNING */}

      {requiredIssues.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-2">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="font-bold text-amber-800">Thiếu trường bắt buộc</p>

              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                {requiredIssues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING */}

      {duplicateMappedFields.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />

            <div>
              <p className="font-bold text-red-800">
                Có field SIHUB bị map nhiều lần
              </p>

              <p className="mt-1 text-sm text-red-700">
                Hãy kiểm tra:{" "}
                {duplicateMappedFields
                  .map((field) => getFieldLabel(field, availableFields))
                  .join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAPPING LIST */}

      <div className="mt-5 space-y-2">
        {headers.map((header, index) => {
          const selected = mapping[header] || "__EXTRA__";

          const isEmptyColumn = String(header).startsWith("[Cột trống");

          const isMapped =
            selected && selected !== "__EXTRA__" && selected !== "__IGNORE__";

          const isExtra = selected === "__EXTRA__";

          const isIgnored = selected === "__IGNORE__";

          return (
            <div
              key={`${header}-${index}`}
              className={`grid gap-3 rounded-xl border p-3 md:grid-cols-[minmax(0,1.25fr)_40px_minmax(0,1fr)] md:items-center ${
                isMapped
                  ? "border-emerald-200 bg-emerald-50/30"
                  : isExtra
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              {/* GOOGLE FORM */}

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Google Form
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {header}
                </p>
              </div>

              {/* ARROW */}

              <div className="hidden text-center text-slate-300 md:block">
                →
              </div>

              {/* TARGET */}

              <div>
                <select
                  value={selected}
                  disabled={isEmptyColumn}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,

                      [header]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  {selectOptions.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>

                {isMapped && (
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={13} />

                    {getFieldLabel(selected, availableFields)}
                  </div>
                )}

                {isExtra && (
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-700">
                    <Database size={13} />
                    Giữ lại dữ liệu
                  </div>
                )}

                {isIgnored && (
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Không dùng khi import
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMMARY */}

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
          {stats.mapped} đã map
        </span>

        <span className="rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">
          {stats.extra} dữ liệu bổ sung
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
          {stats.ignored} bỏ qua thật sự
        </span>
      </div>
    </section>
  );
}

export default GoogleFormFieldMapping;
