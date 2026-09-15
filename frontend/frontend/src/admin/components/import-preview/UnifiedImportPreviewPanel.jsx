import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { MODULE_FIELD_REGISTRY } from "../../../config/moduleFieldRegistry";
import {
  previewUnifiedImport,
  validateUnifiedImport,
  commitUnifiedImport,
  createTrainingCourse,
  createTrainingOpening,
  loadTrainingCourses,
  loadTrainingOpenings,
} from "../../../services/unifiedImportPreviewApi";

const MODULES = {
  TRAINING: "Đào tạo",
  SEMINAR: "Hội thảo",
  EXHIBITION: "Triển lãm",
  NETWORKING: "Sự kiện kết nối",
  INCUBATION: "Ươm tạo",
};
const FILTERS = {
  ALL: "Tất cả",
  VALID: "Hợp lệ",
  SKIPPED: "Bỏ qua",
  DUPLICATE: "Trùng",
  CONFLICT: "Xung đột",
  NEEDS_REVIEW: "Cần kiểm tra",
  ERROR: "Lỗi",
};
const sheetKey = (source) => `${source.fileIndex}:${source.sheetIndex}`;
const sheetHasValidRows = (sheet) =>
  sheet?.validationReady === true &&
  Array.isArray(sheet?.rows) &&
  sheet.rows.some((row) => row?.status === "VALID");
const rowMatches = (status, filter) =>
  filter === "ALL" ||
  status === filter ||
  (filter === "SKIPPED" && status.startsWith("SKIPPED")) ||
  (filter === "DUPLICATE" && status === "SKIPPED_DUPLICATE");

function TargetFields({ module, target, catalog, metadata, onChange }) {
  const [newCourseName, setNewCourseName] = useState(
    metadata?.courseName || "",
  );
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [refreshedCourses, setRefreshedCourses] = useState([]);
  const [refreshedOpenings, setRefreshedOpenings] = useState([]);
  const [newOpening, setNewOpening] = useState({
    class_name: metadata?.openingName || "",
    organization_start_date: metadata?.organizationStartDate || "",
    organization_end_date: metadata?.organizationEndDate || "",
  });
  const [creatingOpening, setCreatingOpening] = useState(false);
  const [createError, setCreateError] = useState("");

  const createCourse = async () => {
    if (!newCourseName.trim()) {
      setCreateError("Cần tên Khóa đào tạo.");
      return;
    }
    try {
      setCreatingCourse(true);
      setCreateError("");
      const created = await createTrainingCourse(
        target.trainingProgramId,
        newCourseName.trim(),
      );
      if (!created?.id)
        throw new Error("Backend không trả về ID Khóa đào tạo.");
      const latest = await loadTrainingCourses(target.trainingProgramId);
      setRefreshedCourses(latest);
      onChange({
        ...target,
        courseId: String(created.id),
        courseName: created.course_name || newCourseName.trim(),
        openingId: "",
      });
    } catch (requestError) {
      setCreateError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tạo Khóa đào tạo.",
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  const createOpening = async () => {
    if (
      !newOpening.class_name.trim() ||
      !newOpening.organization_start_date ||
      !newOpening.organization_end_date
    ) {
      setCreateError("Cần tên, ngày bắt đầu và ngày kết thúc.");
      return;
    }
    if (newOpening.organization_end_date < newOpening.organization_start_date) {
      setCreateError("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }
    try {
      setCreatingOpening(true);
      setCreateError("");
      const created = await createTrainingOpening(target.courseId, {
        ...newOpening,
        class_code: null,
        location: null,
        schedule_note: null,
        max_students: 50,
        status: "OPEN",
        sessions: [],
      });
      const id = created?.opening_id ?? created?.id ?? created?.openingId;
      if (!id) throw new Error("Backend không trả về ID Đợt tổ chức.");
      const latest = await loadTrainingOpenings(target.courseId);
      setRefreshedOpenings(latest);
      onChange({
        ...target,
        openingId: String(id),
        openingName: newOpening.class_name.trim(),
      });
    } catch (requestError) {
      setCreateError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tạo Đợt tổ chức.",
      );
    } finally {
      setCreatingOpening(false);
    }
  };

  if (!module)
    return (
      <p className="text-xs text-amber-700">
        Phải xác nhận module trước khi chọn target.
      </p>
    );
  const select = (label, name, items, reset = []) => (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select
        value={target[name] || ""}
        onChange={(event) => {
          const selected = items.find(
            (item) => String(item.id) === event.target.value,
          );
          const next = {
            ...target,
            [name]: event.target.value,
            ...(selected?.year ? { year: Number(selected.year) } : {}),
          };
          reset.forEach((key) => {
            next[key] = "";
          });
          onChange(next);
        }}
        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2"
      >
        <option value="">— Chọn —</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
            {item.year ? ` (${item.year})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
  if (module === "TRAINING") {
    const programs = catalog.programs || [];

    let courses = [
      ...(catalog.courses || []),
      ...refreshedCourses.map((item) => ({
        ...item,
        id: item.id ?? item.course_id,
        name: item.name ?? item.course_name,
      })),
    ].filter(
      (item) =>
        target.trainingProgramId &&
        Number(item.program_id) === Number(target.trainingProgramId),
    );
    if (
      target.courseId &&
      !courses.some((item) => Number(item.id) === Number(target.courseId))
    ) {
      courses = [
        { id: target.courseId, name: target.courseName || "Khóa vừa tạo" },
        ...courses,
      ];
    }

    let openings = [
      ...(catalog.openings || []),
      ...refreshedOpenings.map((item) => ({
        ...item,
        id: item.id ?? item.opening_id,
        name: item.name ?? item.class_name,
      })),
    ].filter(
      (item) =>
        target.courseId && Number(item.course_id) === Number(target.courseId),
    );
    if (
      target.openingId &&
      !openings.some((item) => Number(item.id) === Number(target.openingId))
    ) {
      openings = [
        { id: target.openingId, name: target.openingName || "Đợt vừa tạo" },
        ...openings,
      ];
    }

    return (
      <div className="grid gap-2 md:grid-cols-3">
        {select("Nhiệm vụ đào tạo", "trainingProgramId", programs, [
          "courseId",
          "openingId",
        ])}

        <div>
          {select("Khóa đào tạo", "courseId", courses, ["openingId"])}
          {target.trainingProgramId && !target.courseId && (
            <details className="mt-2 rounded-lg border border-emerald-200 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
                + Tạo Khóa đào tạo
              </summary>
              <div className="mt-2 flex gap-2">
                <input
                  value={newCourseName}
                  onChange={(event) => setNewCourseName(event.target.value)}
                  placeholder="Tên Khóa đào tạo"
                  className="min-w-0 flex-1 rounded border p-2 text-xs"
                />
                <button
                  type="button"
                  disabled={creatingCourse}
                  onClick={createCourse}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  {creatingCourse ? "Đang tạo..." : "Tạo và chọn"}
                </button>
              </div>
              {createError && (
                <p className="mt-2 text-xs text-red-700">{createError}</p>
              )}
            </details>
          )}
        </div>

        <div>
          {select("Đợt tổ chức", "openingId", openings)}
          {target.courseId && !target.openingId && (
            <details className="mt-2 rounded-lg border border-emerald-200 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
                + Tạo Đợt tổ chức
              </summary>
              <div className="mt-2 space-y-2">
                <input
                  value={newOpening.class_name}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      class_name: event.target.value,
                    }))
                  }
                  placeholder="Tên Đợt tổ chức"
                  className="w-full rounded border p-2 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  {["organization_start_date", "organization_end_date"].map(
                    (field) => (
                      <input
                        key={field}
                        type="date"
                        value={newOpening[field]}
                        onChange={(event) =>
                          setNewOpening((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                        className="rounded border p-2 text-xs"
                      />
                    ),
                  )}
                </div>
                {createError && (
                  <p className="text-xs text-red-700">{createError}</p>
                )}
                <button
                  type="button"
                  disabled={creatingOpening}
                  onClick={createOpening}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  {creatingOpening ? "Đang tạo..." : "Tạo và chọn"}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
  if (module === "INCUBATION")
    return select(
      "Chương trình ươm tạo",
      "programId",
      catalog.incubationPrograms || [],
    );
  const items =
    module === "NETWORKING"
      ? catalog.networkingEvents || []
      : (catalog.startupEvents || []).filter((item) => item.type === module);
  return select("Sự kiện", "eventId", items);
}

function SheetEditor({ sheet, config, catalog, validation, onChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const moduleFields = MODULE_FIELD_REGISTRY[config.module]?.importFields || [];
  const rows = (validation?.rows || sheet.sampleRows || []).filter(Boolean);

  const shownRows = rows.filter((row) => rowMatches(row?.status || "", filter));
  const counts = validation
    ? Object.fromEntries(
        Object.keys(FILTERS)
          .slice(1)
          .map((status) => [
            status,
            (validation.rows || [])
              .filter(Boolean)
              .filter((row) => rowMatches(row?.status || "", status)).length,
          ]),
      )
    : {};
  const selectedProgram = (catalog.programs || []).find(
    (item) => Number(item.id) === Number(config.target.trainingProgramId),
  );
  const selectedCourse = (catalog.courses || []).find(
    (item) => Number(item.id) === Number(config.target.courseId),
  );
  const selectedOpening = (catalog.openings || []).find(
    (item) => Number(item.id) === Number(config.target.openingId),
  );
  const mappedColumnCount = config.mapping.filter(
    (item) => item.field && !item.field.startsWith("__"),
  ).length;
  const ignoredColumnCount = config.mapping.filter(
    (item) => item.field === "__IGNORE__",
  ).length;
  const reviewColumnCount =
    config.mapping.length - mappedColumnCount - ignoredColumnCount;
  const setModule = (module) =>
    onChange({
      ...config,
      module,
      target: {},
      mapping: sheet.header.columns.map((column) => ({
        columnIndex: column.columnIndex,
        header: column.name,
        field: MODULE_FIELD_REGISTRY[module]?.importFields.some(
          (item) => item.key === column.mappedField,
        )
          ? column.mappedField
          : "__IGNORE__",
      })),
    });
  return (
    <article className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <b>{sheet.sheetName}</b>
          <p className="text-xs text-slate-500">
            Header dòng {sheet.headerRow || "—"} · {sheet.totalDataRows} dòng
          </p>
          <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-3">
            <span>
              Module: <b>{MODULES[config.module] || "Cần xác nhận"}</b>
            </span>
            <span className="line-clamp-1">
              Nhiệm vụ đào tạo: <b>{selectedProgram?.name || "Cần xác nhận"}</b>
            </span>
            <span className="line-clamp-1">
              Khóa đào tạo: <b>{selectedCourse?.name || "Cần xác nhận"}</b>
            </span>
            <span className="line-clamp-1">
              Đợt tổ chức:{" "}
              <b>
                {selectedOpening?.name ||
                  config.target.openingName ||
                  (config.target.courseId
                    ? "Thiếu Đợt tổ chức – tạo ngay"
                    : "Cần xác nhận")}
              </b>
            </span>
            <span>
              Dòng: <b>{sheet.totalDataRows}</b>
            </span>
            <span>
              Cột:{" "}
              <b>
                {mappedColumnCount} auto-map · {ignoredColumnCount} bỏ qua ·{" "}
                {reviewColumnCount} kiểm tra
              </b>
            </span>
          </div>
        </div>
        {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {open && (
        <div className="space-y-5 border-t border-slate-100 p-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Module
            </label>
            <select
              value={config.module}
              onChange={(event) => setModule(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2"
            >
              <option value="">— Admin xác nhận —</option>
              {Object.entries(MODULES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {sheet.moduleSuggestion.requiresAdminSelection && (
              <p className="mt-1 text-xs text-amber-700">
                Preview chưa đủ chắc chắn; Admin bắt buộc chọn.
              </p>
            )}
          </div>
          <TargetFields
            module={config.module}
            target={config.target}
            catalog={catalog}
            metadata={sheet.trainingMetadata}
            onChange={(target) => onChange({ ...config, target })}
          />
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase text-slate-500">
              Xem chi tiết mapping
            </summary>
            <div className="mt-3 grid gap-2">
              {sheet.header.columns.map((column, index) => (
                <div
                  key={column.columnIndex}
                  className="grid items-center gap-2 rounded-lg bg-slate-50 p-2 md:grid-cols-[1fr_1fr_1fr]"
                >
                  <div>
                    <b className="text-sm">
                      {column.name || `Cột ${column.index}`}
                    </b>
                    <p className="text-xs text-slate-500">
                      Sample: {String(column.sampleValue || "—")}
                    </p>
                  </div>
                  <select
                    value={config.mapping[index]?.field || ""}
                    onChange={(event) => {
                      const mapping = [...config.mapping];
                      mapping[index] = {
                        columnIndex: column.columnIndex,
                        header: column.name,
                        field: event.target.value,
                      };
                      onChange({ ...config, mapping });
                    }}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  >
                    <option value="">Chưa xử lý</option>
                    <option value="__IGNORE__">Bỏ qua có chủ đích</option>
                    <option value="__EXTRA__">Giữ dữ liệu bổ sung</option>
                    {moduleFields.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label} ({item.key})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {column.mappingConfidence} · {column.evidence}
                  </p>
                </div>
              ))}
            </div>
          </details>
          {validation?.mappingValidation && (
            <div
              className={`rounded-lg p-3 text-xs ${validation.mappingValidation.valid ? "bg-emerald-50" : "bg-red-50"}`}
            >
              {[
                ...validation.mappingValidation.errors,
                ...validation.mappingValidation.warnings,
              ].map((item, index) => (
                <p key={`${item.code}-${index}`}>
                  {item.code}
                  {item.field ? `: ${item.field}` : ""}
                </p>
              ))}
            </div>
          )}
          {validation && (
            <div className="grid grid-cols-3 gap-2 text-xs md:grid-cols-6">
              {Object.entries(counts).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-slate-50 p-2">
                  <b>{count}</b>
                  <br />
                  {FILTERS[status]}
                </div>
              ))}
            </div>
          )}
          {validation && (
            <div>
              <div className="mb-2 flex flex-wrap gap-1">
                {Object.entries(FILTERS).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3 py-1 text-xs ${filter === value ? "bg-slate-800 text-white" : "bg-slate-100"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className="p-2">Dòng</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Lý do</th>
                      <th className="p-2">Dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((row) => (
                      <tr key={row.source.rowNumber} className="border-t">
                        <td className="p-2">{row.source.rowNumber}</td>
                        <td className="p-2 font-bold">{row.status}</td>
                        <td className="p-2">{row.reasons.join(", ") || "—"}</td>
                        <td className="p-2">
                          {Object.entries(row.values)
                            .slice(0, 5)
                            .map(([key, value]) =>
                              value ? `${key}: ${value}` : "",
                            )
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function UnifiedImportPreviewPanel() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [configs, setConfigs] = useState({});
  const [validation, setValidation] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const validations = useMemo(
    () =>
      Object.fromEntries(
        (validation?.sheets || []).map((sheet) => [
          sheetKey(sheet.source),
          sheet,
        ]),
      ),
    [validation],
  );
  const runPreview = async () => {
    if (!files.length) return;
    try {
      setLoading("PREVIEW");
      setError("");
      const data = await previewUnifiedImport(files);
      const next = {};
      data.files.forEach((file) =>
        file.sheets.forEach((sheet) => {
          const module = sheet.moduleSuggestion.selected || "";
          const named = (items = []) => {
            const matches = items.filter((item) =>
              item.evidence?.includes("DB_NAME_MATCH"),
            );
            if (!matches.length) return null;
            if (
              matches[1] &&
              Number(matches[0].score) - Number(matches[1].score) < 20
            )
              return null;
            return matches[0];
          };
          let target;
          if (module === "TRAINING") {
            const hierarchy = sheet.targetSuggestions.hierarchy || {};
            const selection = sheet.targetSuggestions.selection;

            const program = selection?.trainingProgramId
              ? (hierarchy.trainingPrograms || []).find(
                  (item) =>
                    Number(item.id) === Number(selection.trainingProgramId),
                ) ||
                (data.targetCatalog?.programs || []).find(
                  (item) =>
                    Number(item.id) === Number(selection.trainingProgramId),
                )
              : named(hierarchy.trainingPrograms);
            const course = selection?.courseId
              ? (data.targetCatalog?.courses || []).find(
                  (item) => Number(item.id) === Number(selection.courseId),
                )
              : named(hierarchy.courses);
            const opening = selection?.openingId
              ? (data.targetCatalog?.openings || []).find(
                  (item) => Number(item.id) === Number(selection.openingId),
                )
              : named(hierarchy.openings);

            target = {
              trainingProgramId: program?.id || "",
              courseId: course?.id || "",
              openingId: opening?.id || "",
              year: program?.year || "",
            };
          } else {
            const item = named(sheet.targetSuggestions.flat);
            target =
              module === "INCUBATION"
                ? { programId: item?.id || "", year: item?.year || "" }
                : { eventId: item?.id || "", year: item?.year || "" };
          }
          next[sheetKey(sheet.source)] = {
            source: sheet.source,
            module,
            target,
            year: sheet.year,
            rows: sheet.rows,
            mapping: sheet.header.columns.map((column) => ({
              columnIndex: column.columnIndex,
              header: column.name,
              field: column.mappedField || "__IGNORE__",
            })),
          };
        }),
      );
      setPreview(data);
      setConfigs(next);
      setValidation(null);
      setCommitResult(null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Không thể đọc preview.",
      );
    } finally {
      setLoading("");
    }
  };
  const runValidation = async () => {
    try {
      setLoading("VALIDATE");
      setError("");
      setCommitResult(null);

      const data = await validateUnifiedImport(Object.values(configs));

      setValidation(data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Không thể validate batch.",
      );
    } finally {
      setLoading("");
    }
  };
  const runCommit = async () => {
    if (!validation) return;

    const readySheets = (validation.sheets || []).filter(sheetHasValidRows);

    if (!readySheets.length) {
      setError("Không có sheet hợp lệ để import.");
      return;
    }

    const validRowCount = readySheets.reduce(
      (sum, sheet) =>
        sum +
        (sheet.rows || [])
          .filter(Boolean)
          .filter((row) => row?.status === "VALID").length,
      0,
    );

    const accepted = window.confirm(
      `Xác nhận import ${validRowCount} dòng VALID từ ${readySheets.length} sheet?\n\n` +
        "CONFLICT / ERROR / NEEDS_REVIEW sẽ không được ghi. Backend sẽ kiểm tra lại trước khi ghi.",
    );

    if (!accepted) return;

    try {
      setLoading("COMMIT");
      setError("");

      const data = await commitUnifiedImport(Object.values(configs));

      setCommitResult(data);

      // Revalidate lại sau commit để phản ánh duplicate/trạng thái DB mới.
      const nextValidation = await validateUnifiedImport(
        Object.values(configs),
      );

      setValidation(nextValidation);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Không thể import dữ liệu vào hệ thống.",
      );
    } finally {
      setLoading("");
    }
  };
  return (
    <section className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b className="text-emerald-700">
            IMPORT HỢP NHẤT · PREVIEW → VALIDATE → IMPORT
          </b>

          <p className="text-sm text-slate-600">
            Backend kiểm tra lại dữ liệu trước khi ghi. Chỉ các dòng hợp lệ mới
            được phép import.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">
            <Upload size={17} /> Chọn nhiều file
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                setFiles([...event.target.files]);
                setPreview(null);
                setConfigs({});
                setValidation(null);
                setCommitResult(null);
                setError("");
              }}
            />
          </label>
          <button
            type="button"
            disabled={!files.length || loading}
            onClick={runPreview}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading === "PREVIEW" ? (
              <Loader2 className="inline animate-spin" size={17} />
            ) : (
              <FileSpreadsheet className="inline" size={17} />
            )}{" "}
            Preview
          </button>
          {preview && (
            <button
              type="button"
              disabled={loading}
              onClick={runValidation}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Validate batch
            </button>
          )}
          {validation && (
            <button
              type="button"
              disabled={
                loading || !(validation.sheets || []).some(sheetHasValidRows)
              }
              onClick={runCommit}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "COMMIT" ? (
                <Loader2 className="inline animate-spin" size={17} />
              ) : (
                <Database className="inline" size={17} />
              )}{" "}
              {loading === "COMMIT" ? "Đang import..." : "Xác nhận import"}
            </button>
          )}
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-sm text-slate-700">
              File đã chọn ({files.length})
            </b>

            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setPreview(null);
                setConfigs({});
                setValidation(null);
                setCommitResult(null);
                setError("");
              }}
              className="text-xs font-semibold text-red-600"
            >
              Xóa tất cả
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {file.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index),
                    )
                  }
                  className="text-xs font-semibold text-red-600"
                >
                  Bỏ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={17} />
          {error}
        </p>
      )}
      {validation && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(validation.summary).map(([status, count]) => (
            <span
              key={status}
              className="rounded-lg bg-white px-3 py-2 text-xs"
            >
              <b>{count}</b> {status}
            </span>
          ))}
        </div>
      )}
      {commitResult && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-700" />

            <b className="text-sm text-emerald-800">Kết quả import</b>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(commitResult.execution?.summary || {}).map(
              ([status, count]) => (
                <span
                  key={status}
                  className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-700"
                >
                  <b>{Number(count || 0)}</b> {status}
                </span>
              ),
            )}
          </div>
        </div>
      )}
      {preview && (
        <div className="mt-4 space-y-4">
          {preview.files.map((file) => (
            <div key={file.fileIndex} className="rounded-2xl bg-slate-100 p-3">
              <h3 className="mb-2 font-bold">
                #{file.fileIndex + 1} · {file.fileName}
              </h3>
              {file.error && (
                <p className="text-sm text-red-700">{file.error.message}</p>
              )}
              {file.sheets.map((sheet) => (
                <SheetEditor
                  key={sheetKey(sheet.source)}
                  sheet={sheet}
                  catalog={preview.targetCatalog || {}}
                  config={configs[sheetKey(sheet.source)]}
                  validation={validations[sheetKey(sheet.source)]}
                  onChange={(config) =>
                    setConfigs((current) => ({
                      ...current,
                      [sheetKey(sheet.source)]: config,
                    }))
                  }
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
