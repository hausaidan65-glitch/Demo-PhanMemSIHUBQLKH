import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Search, UserRound } from "lucide-react";

const COLORS = ["#059669", "#2563eb", "#7c3aed", "#f59e0b", "#e11d48", "#0891b2", "#64748b"];
const COURSE_ANALYSIS_ORDER = [
  "gender", "age_group", "user_type", "company", "position",
  "has_project", "project_field", "startup_stage", "female_founder", "team_size",
  "project_name", "project_description", "incubation_status",
  "program_selection_status", "support_needs", "organizer_question",
];
const HIDDEN_DASHBOARD_ANALYSES = new Set(["register_status", "checked_in"]);
const NQ20_FULL_QUESTION = "Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?";
const FIELD_DEFINITIONS = [
  { key: "gender", label: "Giới tính", aliases: ["gender"], labels: { MALE: "Nam", FEMALE: "Nữ" } },
  { key: "age_group", label: "Nhóm tuổi", aliases: ["age_group", "ageGroup"] },
  { key: "user_type", label: "Nhóm đối tượng", aliases: ["user_type", "userType", "participant_group", "participantGroup"], labels: { STARTUP: "Dự án khởi nghiệp", BUSINESS: "Doanh nghiệp", UNIVERSITY: "Trường / Viện", SME: "Doanh nghiệp SME", STARTUP_COMPANY: "Doanh nghiệp khởi nghiệp sáng tạo (Startup đã thành lập DN)", STARTUP_PROJECT: "Startup/Dự án (Chưa thành lập doanh nghiệp)", EDUCATOR: "Giảng viên/giáo viên", SUPPORT_ORGANIZATION: "Tổ chức hỗ trợ khởi nghiệp", INVESTMENT_FUND: "Quỹ đầu tư", COOPERATIVE: "Hợp tác xã, làng nghề", STUDENT: "Sinh viên" } },
  { key: "has_project", label: "Có dự án?", aliases: ["has_project", "hasProject"], boolean: true },
  { key: "company", label: "Đơn vị công tác", aliases: ["company", "organization"] },
  { key: "position", label: "Chức vụ", aliases: ["position"] },
  { key: "project_name", label: "Tên dự án", aliases: ["project_name", "projectName"] },
  { key: "project_field", label: "Lĩnh vực dự án", aliases: ["analytics_project_fields", "project_field", "projectField"] },
  { key: "startup_stage", label: "Giai đoạn dự án", aliases: ["startup_stage", "startupStage", "project_stage", "projectStage"] },
  { key: "project_description", label: "Mô tả dự án", aliases: ["project_description", "projectDescription"] },
  { key: "female_founder", label: "Dự án có nữ founder/co-founder?", aliases: ["female_founder", "femaleFounder"], boolean: true },
  { key: "team_size", label: "Quy mô đội ngũ", aliases: ["team_size", "teamSize"] },
  { key: "incubation_status", label: "Trạng thái ươm tạo", aliases: ["incubation_status", "incubationStatus"] },
  { key: "program_selection_status", label: NQ20_FULL_QUESTION, description: NQ20_FULL_QUESTION, aliases: ["program_selection_status", "programSelectionStatus", "nq20_status", "nq20Status"] },
  { key: "support_needs", label: "Nhu cầu hỗ trợ", aliases: ["support_needs", "supportNeeds"] },
  { key: "organizer_question", label: "Câu hỏi cho Ban tổ chức", aliases: ["organizer_question", "organizerQuestion"] },
  { key: "register_status", label: "Trạng thái đăng ký", aliases: ["register_status", "registerStatus", "registration_status", "registrationStatus"], labels: { VALID: "Hợp lệ", PENDING: "Chờ xử lý", CONFIRMED: "Đã xác nhận", APPROVED: "Đã duyệt", REJECTED: "Từ chối", CANCELLED: "Đã hủy" } },
  { key: "checked_in", label: "Đã check-in", aliases: ["checked_in", "checkedIn"], boolean: true },
];
const clean = (value) => String(value ?? "").trim();
const number = (value) => (Number(value) || 0).toLocaleString("vi-VN");
const display = (value) => clean(value) || "Chưa cập nhật";
const shortCategoryLabel = (value, limit = 24) => {
  const label = clean(value);
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
};
function normalizeStudent(row) {
  const user = row?.user || row?.student || {};
  const profile = row?.profile || row?.participant || {};
  const registration = row?.registration || {};
  return {
    ...profile,
    ...user,
    ...registration,
    ...row,
    fullname: clean(row?.fullname || row?.full_name || row?.student_name || row?.name || user.fullname || user.full_name || user.name),
    email: row?.email || user.email,
    phone: row?.phone || user.phone,
    organization: row?.organization || row?.company || user.organization || user.company,
  };
}

function getStudents(data) {
  const raw = [data?.students, data?.registrations, data?.rows, data?.items, data?.data?.students, data?.data].find(Array.isArray) || [];
  return raw.map(normalizeStudent);
}

function rawValue(student, field) {
  const value = field.aliases
    .map((key) => student?.[key])
    .find((value) => value !== undefined && value !== null && clean(value) !== "");
  if (field.key === "gender" && !["MALE", "FEMALE"].includes(clean(value).toUpperCase())) {
    return undefined;
  }
  if (field.key === "user_type" && ["", "OTHER", "UNKNOWN"].includes(clean(value).toUpperCase())) {
    return undefined;
  }
  return value;
}

function friendlyValue(value, field) {
  if (field.boolean) {
    if (value === true || value === 1 || ["1", "true", "có", "co", "yes"].includes(clean(value).toLowerCase())) return "Có";
    if (value === false || value === 0 || ["0", "false", "không", "khong", "no"].includes(clean(value).toLowerCase())) return "Không";
  }
  const normalized = clean(value).toUpperCase();
  return field.labels?.[normalized] || clean(value) || "Chưa cập nhật";
}

function aggregate(students, field) {
  const counts = new Map();
  students.forEach((student) => {
    const value = rawValue(student, field);
    if (value === undefined) return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      const name = friendlyValue(item, field);
      const key = ["position", "company"].includes(field.key)
        ? name.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim()
        : name;
      const current = counts.get(key) || { name, value: 0 };
      current.value += 1;
      counts.set(key, current);
    });
  });
  const groups = [...counts.values()].sort((a, b) => b.value - a.value);
  if (field.key !== "position" || groups.length <= 12) return groups;
  const kept = groups.slice(0, 12);
  const tail = groups.slice(12);
  return [...kept, {
    name: "Khác",
    value: tail.reduce((sum, group) => sum + group.value, 0),
    groupedCategoryCount: tail.length,
  }];
}

function Breadcrumb({ selection, onBack }) {
  const items = [{ key: "root", label: "Tổng quan" }];
  if (selection.program) items.push({ key: "program", label: selection.program.name });
  if (selection.course) items.push({ key: "course", label: selection.course.course_name });
  if (selection.opening) items.push({ key: "opening", label: selection.opening.class_name });
  return <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">{items.map((item, index) => <span key={item.key} className="flex min-w-0 items-center gap-1">{index > 0 && <ChevronRight size={14} className="shrink-0 text-slate-300" />}{index === items.length - 1 ? <strong className="max-w-[34rem] truncate text-slate-800" title={item.label}>{display(item.label)}</strong> : <button type="button" title={item.label} onClick={() => onBack(item.key)} className="max-w-52 truncate text-emerald-700 hover:underline">{item.label}</button>}</span>)}</nav>;
}

export default function TrainingDrilldown(props) {
  const { programs, selection, programOverview, onSelectProgram } = props;
  if (!selection.program) return <section className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-center"><p className="font-semibold text-emerald-800">Chọn một Nhiệm vụ đào tạo trên biểu đồ để xem sâu hơn.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{programs.map((program) => <button key={program.id} type="button" onClick={() => onSelectProgram(program)} className="max-w-xl rounded-xl border border-emerald-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:border-emerald-500">{program.name}</button>)}</div></section>;
  if (selection.opening) return <OpeningWorkspace {...props} />;
  return <ProgramWorkspace {...props} overview={programOverview} selectedCourse={selection.course} />;
}

function ProgramWorkspace({ overview, loading, error, onBack, selectedCourse, analyticsOpeningId, onSelectAnalyticsOpening }) {
  const [selectedFieldKeys, setSelectedFieldKeys] = useState(null);
  const program = overview?.program;
  const summary = overview?.summary || {};
  const courses = overview?.courses || [];
  const options = overview?.filter_options || {};
  const analyses = overview?.analyses || {};
  const availableFields = Object.entries(analyses).filter(([key]) => !HIDDEN_DASHBOARD_ANALYSES.has(key)).map(([key, analysis]) => {
    const known = FIELD_DEFINITIONS.find((field) => field.aliases.includes(key));
    return {
      ...(known || {}),
      key,
      aliases: known?.aliases || [key],
      label: analysis?.label || known?.label || key,
      description: analysis?.description || known?.description,
      boolean: analysis?.boolean ?? known?.boolean ?? false,
    };
  });
  const effectiveSelectedFieldKeys = selectedFieldKeys ?? availableFields.map((field) => field.key);
  const selectedFields = selectedCourse
    ? [...availableFields].sort((left, right) => COURSE_ANALYSIS_ORDER.indexOf(left.key) - COURSE_ANALYSIS_ORDER.indexOf(right.key))
    : availableFields.filter((field) => effectiveSelectedFieldKeys.includes(field.key));
  const toggleField = (key) => setSelectedFieldKeys((current) => {
    const selected = current ?? availableFields.map((field) => field.key);
    return selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
  });
  const selectedCourseData = courses.find((course) => String(course.course_id) === String(selectedCourse?.course_id)) || courses[0];
  const openingOptions = options.openings || [];
  const selectedAnalyticsOpening = openingOptions.find((opening) => String(opening.value) === String(analyticsOpeningId));

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 sm:p-6">
        {!selectedCourse && <nav className="flex items-center gap-2 text-sm"><button type="button" onClick={() => onBack("root")} className="font-semibold text-emerald-700 hover:underline">Tổng quan</button><ChevronRight size={15} className="text-slate-300" /><strong className="truncate text-slate-700">{program?.program_name || "Nhiệm vụ đào tạo"}</strong></nav>}
        <div className={selectedCourse ? "flex items-start gap-3" : "mt-4 flex items-start gap-3"}><button type="button" onClick={() => onBack(selectedCourse ? "program" : "root")} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" title="Quay lại Tổng quan"><ArrowLeft size={18} /></button><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">{selectedCourse ? "Nhiệm vụ khóa đào tạo" : "Nhiệm vụ đào tạo"}</p><h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{selectedCourse?.course_name || program?.program_name || "Đang tải..."}</h2>{selectedCourse ? <><p className="mt-2 text-sm text-slate-600">Thuộc: <strong>{program?.program_name}</strong></p>{selectedAnalyticsOpening && <p className="mt-1 text-sm font-semibold text-emerald-700">Đợt tổ chức: {selectedAnalyticsOpening.label}</p>}</> : program && <><div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Năm {program.year ?? "Chưa xác định"}</span><span className={`rounded-full px-3 py-1 ${program.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{program.status || "Chưa có trạng thái"}</span></div>{program?.description && <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{program.description}</p>}</>}</div></div>
      </div>
      {error && <div className="p-5"><ErrorBox message={error} /></div>}
      {loading && !overview ? <Loading /> : overview && <div className="p-5 sm:p-6">{selectedCourse ? <CourseKpis summary={summary} /> : <ProgramKpis summary={summary} />}</div>}
    </div>

    {overview && <>
      {selectedCourse && <OpeningFilter options={openingOptions} value={analyticsOpeningId} loading={loading} onChange={onSelectAnalyticsOpening} />}
      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 py-3 text-center text-sm font-semibold text-emerald-700">Đang cập nhật dữ liệu phân tích...</div>}
      {selectedCourse ? !analyticsOpeningId && <OpeningOverviewChart openings={selectedCourseData?.openings || []} onSelect={onSelectAnalyticsOpening} /> : <CourseOverviewChart courses={courses} />}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {!selectedCourse && <FieldMultiSelect fields={availableFields} selectedKeys={effectiveSelectedFieldKeys} onToggle={toggleField} onSelectAll={() => setSelectedFieldKeys(availableFields.map((field) => field.key))} onClear={() => setSelectedFieldKeys([])} />}
        {selectedFields.length ? <div className={`${selectedCourse ? "" : "mt-6"} grid gap-5 lg:grid-cols-2`}>{selectedFields.map((field) => <ApiAnalysisBlock key={field.key} field={field} analysis={analyses[field.key]} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm font-medium text-slate-500">Chọn ít nhất một tiêu chí để phân tích.</div>}
      </section>
    </>}
  </section>;
}

const COURSE_METRICS = [
  { key: "unique_students", label: "Học viên unique", unit: "học viên" },
  { key: "total_registrations", label: "Lượt đăng ký", unit: "lượt đăng ký" },
  { key: "total_openings", label: "Đợt tổ chức", unit: "đợt tổ chức" },
];

function CourseOverviewChart({ courses }) {
  const [chartType, setChartType] = useState("PIE");
  const [metricKey, setMetricKey] = useState("unique_students");
  const metric = COURSE_METRICS.find((item) => item.key === metricKey) || COURSE_METRICS[0];
  const data = courses.map((course) => ({
    name: course.course_name,
    value: Number(course[metric.key]) || 0,
  }));
  const chartHeight = chartType === "HORIZONTAL" ? Math.max(360, data.length * 44) : 400;

  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h3 className="text-lg font-bold text-slate-900">Tổng quan Nhiệm vụ khóa đào tạo</h3><p className="mt-1 text-sm text-slate-500">Phân bố theo {metric.label.toLowerCase()} của từng Nhiệm vụ khóa đào tạo.</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="text-sm font-semibold text-slate-700">Chỉ số<select value={metricKey} onChange={(event) => setMetricKey(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-500">{COURSE_METRICS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><ChartTypeSelector value={chartType} onChange={setChartType} /></div></div><div className="mt-5 max-h-[560px] overflow-auto rounded-2xl bg-slate-50 p-3"><div style={{ height: chartHeight, minWidth: chartType === "COLUMN" ? Math.max(560, data.length * 90) : 0 }}><MainChart data={data} type={chartType} emptyLabel="Nhiệm vụ khóa đào tạo" unit={metric.unit} /></div></div></section>;
}

function ProgramKpis({ summary }) {
  const items = [
    ["Tổng Nhiệm vụ khóa đào tạo", summary.total_courses],
    ["Tổng Đợt tổ chức", summary.total_openings],
    ["Số đợt đã tổ chức", summary.organized_openings],
    ["Tổng số lượng học viên", summary.unique_students],
    ["Tổng lượt đăng ký", summary.total_registrations],
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{number(value)}</p></div>)}</div>;
}

function CourseKpis({ summary }) {
  const items = [
    ["Đợt tổ chức", summary.total_openings],
    ["Học viên", summary.unique_students],
    ["Lượt đăng ký", summary.total_registrations],
  ];
  return <div className="grid gap-3 sm:grid-cols-3">{items.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{number(value)}</p></div>)}</div>;
}

function OpeningFilter({ options, value, loading, onChange }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="block max-w-md text-sm font-bold text-slate-700">Đợt tổ chức<select value={value || ""} disabled={loading} onChange={(event) => onChange(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"><option value="">Tất cả các Đợt</option>{options.map((opening) => <option key={opening.value} value={opening.value}>{opening.label}</option>)}</select></label></section>;
}

function OpeningOverviewChart({ openings, onSelect }) {
  const data = openings.map((opening) => ({
    openingId: opening.opening_id,
    name: opening.class_name,
    value: Number(opening.unique_students) || 0,
    registrations: Number(opening.registered_count) || 0,
  }));
  const chartHeight = Math.max(190, data.length * 46);
  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h3 className="text-lg font-bold text-slate-900">Học viên theo Đợt tổ chức</h3><p className="mt-1 text-sm text-slate-500">Mỗi học viên được tính duy nhất trong từng đợt. Bấm vào thanh để lọc Dashboard.</p></div><div className={`mt-5 overflow-x-hidden rounded-2xl bg-slate-50 p-3 ${data.length > 6 ? "max-h-[390px] overflow-y-auto" : ""}`}><div style={{ height: chartHeight }}><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 12, right: 48 }} onClick={(state) => state?.activePayload?.[0]?.payload?.openingId && onSelect(state.activePayload[0].payload.openingId)} className="cursor-pointer"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 600 }} /><YAxis type="category" dataKey="name" width={210} interval={0} tick={{ fontSize: 13, fontWeight: 600 }} /><Tooltip content={<OpeningTooltip />} /><Bar dataKey="value" fill="#059669" radius={[0, 6, 6, 0]}><LabelList dataKey="value" position="right" style={{ fontSize: 13, fontWeight: 700, fill: "#334155" }} /></Bar></BarChart></ResponsiveContainer></div></div></section>;
}

function OpeningTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg"><p className="font-bold text-slate-900">{row.name}</p><p className="mt-2 text-emerald-700">Học viên unique: <strong>{number(row.value)}</strong></p><p className="mt-1 text-blue-700">Lượt đăng ký: <strong>{number(row.registrations)}</strong></p></div>;
}

function ChartTypeSelector({ value, onChange }) {
  return <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1.5">{[["PIE", "Tròn"], ["COLUMN", "Cột"], ["HORIZONTAL", "Thanh ngang"]].map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${value === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>)}</div>;
}

function defaultChartType(groupCount) {
  if (groupCount <= 5) return "PIE";
  if (groupCount <= 10) return "COLUMN";
  return "HORIZONTAL";
}

function ApiAnalysisBlock({ field, analysis }) {
  const safeAnalysis = analysis || { total: 0, with_data: 0, without_data: 0, groups: [] };
  const data = (safeAnalysis.groups || []).map((group) => ({ name: group.value === null ? `Không có dữ liệu ${field.label}` : friendlyValue(group.value, field), value: Number(group.count) || 0 }));
  const [chartType, setChartType] = useState(() => defaultChartType(data.length));
  const effectiveChartType = chartType === "PIE" && (data.length > 10 || data.length === 1) ? "HORIZONTAL" : chartType;
  const chartHeight = effectiveChartType === "HORIZONTAL" ? Math.max(400, data.length * 44) : 400;
  if (safeAnalysis.with_data === 0) {
    return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold text-slate-900">{field.label}</h3><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{safeAnalysis.scope === "REGISTRATION" ? "Theo lượt đăng ký" : "Theo học viên"}</span><div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center"><p className="font-bold text-slate-700">Chưa có dữ liệu</p><p className="mt-1 text-sm text-slate-500">0 / {number(safeAnalysis.total)} bản ghi có thông tin</p></div></article>;
  }
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-bold text-slate-900">{field.label}</h3><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{safeAnalysis.scope === "REGISTRATION" ? "Theo lượt đăng ký" : "Theo học viên"}</span></div><ChartTypeSelector value={chartType} onChange={setChartType} /></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Tổng", safeAnalysis.total, "text-slate-900"], ["Có dữ liệu", safeAnalysis.with_data, "text-emerald-700"], ["Không có dữ liệu", safeAnalysis.without_data, "text-amber-700"]].map(([label, value, tone]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="break-words text-xs font-medium text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{number(value)}</p></div>)}</div><p className="mt-3 text-sm font-medium text-slate-500">Có dữ liệu: {number(safeAnalysis.with_data)} / {number(safeAnalysis.total)}</p>{safeAnalysis.multi_value && <p className="mt-2 text-xs font-medium text-slate-500">Một lượt đăng ký có thể chọn nhiều lĩnh vực; tỷ lệ tính trên {number(safeAnalysis.percentage_denominator)} lượt có dữ liệu lĩnh vực.</p>}{safeAnalysis.grouped_other && <p className="mt-2 text-xs font-medium text-slate-500">“Khác” gộp {number(safeAnalysis.grouped_other.category_count)} nhóm ít gặp, tổng {number(safeAnalysis.grouped_other.record_count)} bản ghi.</p>}{chartType === "PIE" && effectiveChartType !== "PIE" && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">Trên 10 nhóm dữ liệu; tự chuyển sang thanh ngang để tránh chồng nhãn.</p>}<div className="mt-4 max-h-[560px] overflow-auto rounded-2xl bg-slate-50 p-3"><div style={{ height: chartHeight, minWidth: effectiveChartType === "COLUMN" ? Math.max(560, data.length * 90) : 0 }}><MainChart data={data} type={effectiveChartType} emptyLabel={field.label} percentageDenominator={safeAnalysis.percentage_denominator} /></div></div></article>;
}
function ViewHeader({ selection, onBack, total }) {
  return <div className="flex items-start gap-3"><button type="button" onClick={() => onBack(selection.opening ? "course" : selection.course ? "program" : "root")} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft size={18} /></button><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Đang xem</p><h2 className="mt-1 line-clamp-2 text-xl font-bold text-slate-900">{selection.opening?.class_name || selection.course?.course_name || selection.program.name}</h2>{total !== undefined && <p className="mt-1 text-sm font-semibold text-slate-500">{number(total)} học viên</p>}</div></div>;
}

function OpeningWorkspace({ selection, openingData, attendance, loading, error, onSelectStudent, onBack }) {
  const [tab, setTab] = useState("OVERVIEW");
  const [selectedFieldKeys, setSelectedFieldKeys] = useState(null);
  const [chartType, setChartType] = useState("PIE");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const students = useMemo(() => getStudents(openingData), [openingData]);
  const availableFields = FIELD_DEFINITIONS.filter((field) => !HIDDEN_DASHBOARD_ANALYSES.has(field.key));
  const effectiveSelectedFieldKeys = selectedFieldKeys ?? availableFields.map((field) => field.key);
  const selectedFields = availableFields.filter((field) => effectiveSelectedFieldKeys.includes(field.key));
  const visibleStudents = students.filter((student) => student.fullname.toLowerCase().includes(search.trim().toLowerCase()));
  const pageSize = 12;
  const pageRows = visibleStudents.slice((page - 1) * pageSize, page * pageSize);
  const chooseStudent = (student) => { onSelectStudent(student); setTab("ATTENDANCE"); };
  return <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="space-y-4 border-b border-slate-100 p-5 sm:p-6"><Breadcrumb selection={selection} onBack={onBack} /><ViewHeader selection={selection} onBack={onBack} total={openingData?.summary?.total_students ?? openingData?.total ?? students.length} /></div><div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 sm:px-6">{[["OVERVIEW", "Tổng quan"], ["STUDENTS", "Thông tin học viên"], ["ATTENDANCE", "Điểm danh"]].map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div><div className="p-5 sm:p-6">{error && <ErrorBox message={error} />}{loading ? <Loading /> : tab === "OVERVIEW" ? <Overview fields={availableFields} selectedFields={selectedFields} selectedFieldKeys={effectiveSelectedFieldKeys} onFields={setSelectedFieldKeys} chartType={chartType} onChartType={setChartType} students={students} /> : tab === "STUDENTS" ? <Students students={pageRows} total={visibleStudents.length} search={search} onSearch={(value) => { setSearch(value); setPage(1); }} page={page} pageSize={pageSize} onPage={setPage} onSelect={chooseStudent} /> : <Attendance student={selection.student} attendance={attendance} students={students} onSelect={chooseStudent} />}</div></section>;
}

function Overview({ fields, selectedFields, selectedFieldKeys, onFields, chartType, onChartType, students }) {
  const toggleField = (key) => onFields((current) => {
    const selected = current ?? fields.map((field) => field.key);
    return selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
  });
  return <div className="space-y-5"><div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between"><FieldMultiSelect fields={fields} selectedKeys={selectedFieldKeys} onToggle={toggleField} onSelectAll={() => onFields(fields.map((field) => field.key))} onClear={() => onFields([])} /><div className="inline-flex w-fit rounded-xl bg-slate-100 p-1.5">{[["PIE", "Tròn"], ["COLUMN", "Cột"], ["HORIZONTAL", "Thanh ngang"]].map(([key, label]) => <button key={key} type="button" onClick={() => onChartType(key)} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${chartType === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>)}</div></div>{selectedFields.length ? <div className="grid gap-5 xl:grid-cols-2">{selectedFields.map((field) => <FieldAnalysis key={field.key} field={field} students={students} chartType={chartType} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm font-medium text-slate-500">Chọn ít nhất một tiêu chí để phân tích.</div>}</div>;
}

function FieldMultiSelect({ fields, selectedKeys, onToggle, onSelectAll, onClear }) {
  const selectedLabel = selectedKeys.length === 0
    ? "Chưa chọn tiêu chí"
    : selectedKeys.length === 1
      ? fields.find((field) => field.key === selectedKeys[0])?.label
      : `Đã chọn ${selectedKeys.length} tiêu chí`;
  return <div className="w-full lg:w-[26rem]"><p className="text-base font-bold text-slate-800">Phân tích theo</p><details className="group relative mt-2.5"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 shadow-sm outline-none hover:border-emerald-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100"><span className="truncate">{selectedLabel}</span><ChevronRight size={18} className="shrink-0 rotate-90 text-slate-400 transition-transform group-open:-rotate-90" /></summary><div className="absolute left-0 z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><button type="button" onClick={onSelectAll} className="rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Chọn tất cả</button><button type="button" onClick={onClear} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Bỏ chọn tất cả</button></div><div className="max-h-64 overflow-y-auto p-2">{fields.map((field) => <label key={field.key} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50"><input type="checkbox" checked={selectedKeys.includes(field.key)} onChange={() => onToggle(field.key)} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" /><span>{field.label}</span></label>)}</div></div></details></div>;
}

function FieldAnalysis({ field, students, chartType }) {
  const data = useMemo(() => aggregate(students, field), [field, students]);
  const withData = students.filter((student) => rawValue(student, field) !== undefined).length;
  const effectiveChartType = chartType === "PIE" && data.length > 6 ? "HORIZONTAL" : chartType;
  const groupedOther = data.find((group) => group.groupedCategoryCount);
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-bold text-slate-900">Phân tích {field.label}</h3><div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">{[["Tổng học viên", students.length, "text-slate-900"], ["Có dữ liệu", withData, "text-emerald-700"], [`Không có dữ liệu ${field.label}`, Math.max(0, students.length - withData), "text-amber-700"]].map(([label, value, tone]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{number(value)}</p></div>)}</div>{field.key === "project_field" && <p className="mt-3 text-xs font-medium text-slate-500">Một học viên có thể chọn nhiều lĩnh vực; tỷ lệ tính trên {number(withData)} học viên có dữ liệu lĩnh vực.</p>}{groupedOther && <p className="mt-3 text-xs font-medium text-slate-500">“Khác” gộp {number(groupedOther.groupedCategoryCount)} nhóm ít gặp, tổng {number(groupedOther.value)} học viên.</p>}{chartType === "PIE" && effectiveChartType !== "PIE" && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">Có nhiều nhóm dữ liệu; hệ thống chuyển sang thanh ngang để dễ đọc.</p>}<div className="mt-4 h-[400px] rounded-2xl bg-slate-50 p-3"><MainChart data={data} type={effectiveChartType} emptyLabel={field.label} percentageDenominator={field.key === "project_field" ? withData : undefined} /></div></article>;
}

function MainChart({ data, type, emptyLabel, unit = "học viên", percentageDenominator }) {
  if (!data.length) return <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Không có dữ liệu {emptyLabel}</div>;
  const total = Number(percentageDenominator) || data.reduce((sum, item) => sum + item.value, 0);
  const tooltip = (value) => [`${number(value)} ${unit} (${total ? Math.round((Number(value) / total) * 100) : 0}%)`, "Số lượng"];
  if (type === "PIE") return <ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={72} outerRadius={125} paddingAngle={2} label={({ name, value }) => `${shortCategoryLabel(name, 16)} — ${number(value)} (${total ? Math.round((Number(value) / total) * 100) : 0}%)`} style={{ fontSize: 12, fontWeight: 600 }}>{data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={tooltip} contentStyle={{ fontSize: 14, borderRadius: 12 }} /></PieChart></ResponsiveContainer>;
  const horizontal = type === "HORIZONTAL";
  return <ResponsiveContainer><BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={horizontal ? { left: 130, right: 42 } : { top: 24, right: 20, bottom: 64, left: 8 }}><CartesianGrid strokeDasharray="3 3" />{horizontal ? <><XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 600 }} /><YAxis type="category" dataKey="name" width={145} tickFormatter={(value) => shortCategoryLabel(value)} tick={{ fontSize: 13, fontWeight: 600 }} /></> : <><XAxis dataKey="name" tickFormatter={(value) => shortCategoryLabel(value, 18)} angle={-20} textAnchor="end" interval={0} height={86} tick={{ fontSize: 12, fontWeight: 600 }} /><YAxis allowDecimals={false} tick={{ fontSize: 13, fontWeight: 600 }} /></>}<Tooltip labelFormatter={(label) => label} formatter={tooltip} contentStyle={{ fontSize: 14, borderRadius: 12 }} /><Bar dataKey="value" fill="#059669" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}><LabelList dataKey="value" position={horizontal ? "right" : "top"} style={{ fontSize: 13, fontWeight: 700, fill: "#334155" }} /></Bar></BarChart></ResponsiveContainer>;
}

function Students({ students, total, search, onSearch, page, pageSize, onPage, onSelect }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{number(total)} học viên</p><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search size={16} className="text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Tìm theo họ tên" className="bg-transparent text-sm outline-none" /></label></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{students.map((student, index) => <button key={student.registration_id || `${student.fullname}-${index}`} type="button" onClick={() => onSelect(student)} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50"><UserRound className="shrink-0 text-emerald-600" size={20} /><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{student.fullname || "Không có họ tên"}</strong><small className="block truncate text-slate-500">{display(student.organization)}</small></span></button>)}</div>{!students.length && <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy học viên.</p>}{totalPages > 1 && <div className="mt-4 flex items-center justify-end gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Trước</button><span className="text-xs text-slate-500">{page}/{totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Sau</button></div>}</div>;
}

function Attendance({ student, attendance, students, onSelect }) {
  if (!student) return <div><p className="text-sm text-slate-500">Chọn học viên để xem lịch sử điểm danh.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{students.slice(0, 12).map((item, index) => <button key={item.registration_id || index} type="button" onClick={() => onSelect(item)} className="rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold text-slate-800 hover:border-emerald-400">{item.fullname || "Không có họ tên"}</button>)}</div></div>;
  const rows = [attendance?.sessions, attendance?.attendance, attendance?.rows, attendance?.items].find(Array.isArray) || [];
  return <div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-600">Học viên</p><p className="mt-1 font-bold text-slate-900">{student.fullname || "Không có họ tên"}</p></div><div className="mt-4 space-y-2">{rows.map((row, index) => { const present = row.checked_in || row.attended || row.status === "PRESENT"; return <div key={row.session_id || index} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><div><strong>Buổi {row.session_no || index + 1}</strong><p className="mt-1 text-xs text-slate-500">{display(row.session_date)} · {display(row.start_time)}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${present ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}><CheckCircle2 size={13} />{present ? "Có mặt" : "Chưa điểm danh"}</span></div>;})}</div>{!rows.length && <p className="py-10 text-center text-sm text-slate-500">Chưa có dữ liệu điểm danh.</p>}</div>;
}

const Loading = () => <div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;
const ErrorBox = ({ message }) => <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>;
