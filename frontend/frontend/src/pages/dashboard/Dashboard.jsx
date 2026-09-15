import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, BookOpenCheck, CalendarRange, Download, GraduationCap, Loader2, Users } from "lucide-react";
import WelcomeCard from "../../components/WelcomeCard";
import courseReportApi from "../../services/courseReportApi";
import { formatReportPeriodLabel } from "../../admin/reports/reportPeriodUtils";
import TrainingDashboardFilters from "./TrainingDashboardFilters";
import { buildDashboardPeriodParams, createDefaultDashboardFilters } from "./trainingDashboardPeriod";
import TrainingDrilldown from "./TrainingDrilldown";

const KPI_ITEMS = [
  ["total_programs", "Nhiệm vụ đào tạo", BookOpenCheck, "bg-blue-50 text-blue-700"],
  ["total_openings", "Đợt tổ chức", CalendarRange, "bg-violet-50 text-violet-700"],
  ["total_students_year", "Tổng số lượng học viên", Users, "bg-emerald-50 text-emerald-700"],
  ["total_students_attended", "Học viên đi học", GraduationCap, "bg-amber-50 text-amber-700"],
];
const formatNumber = (value) => (Number(value) || 0).toLocaleString("vi-VN");
const shortChartLabel = (value, limit = 34) => {
  const label = String(value || "").trim();
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
};

function getDownloadFilename(value) {
  const match = String(value || "").match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  return String(match?.[1] || match?.[2] || "SIHUB_Training_Report.xlsx").trim();
}

export default function Dashboard() {
  const [filters, setFilters] = useState(createDefaultDashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultDashboardFilters);
  const [summary, setSummary] = useState({});
  const [period, setPeriod] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selection, setSelection] = useState({ program: null, course: null, opening: null, student: null });
  const [openings, setOpenings] = useState([]);
  const [programOverview, setProgramOverview] = useState(null);
  const [analyticsOpeningId, setAnalyticsOpeningId] = useState(null);
  const [openingData, setOpeningData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [programMetric, setProgramMetric] = useState("students");

  const loadDashboard = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");
    try {
      const params = buildDashboardPeriodParams(nextFilters);
      const [summaryResponse, programsResponse] = await Promise.all([
        courseReportApi.getSummary(params),
        courseReportApi.getPrograms(params),
      ]);
      const summaryData = summaryResponse.data?.data || {};
      const programsData = programsResponse.data?.data || {};
      const programRows = Array.isArray(programsData.programs) ? programsData.programs : [];
      const chartRows = await Promise.all(programRows.map(async (program) => {
        const response = await courseReportApi.getCoursesByProgram(program.program_id, params);
        const courses = Array.isArray(response.data?.data?.courses) ? response.data.data.courses : [];
        return {
          id: program.program_id,
          name: program.program_name,
          courses: Number(program.total_courses) || courses.length,
          coursesList: courses,
          openings: Number(program.total_openings) || 0,
          students: Number(program.total_students_registered) || 0,
          registrations: Number(program.total_registrations) || 0,
        };
      }));
      setSummary(summaryData.summary || {});
      setPeriod(summaryData.period || programsData.period || null);
      setPrograms(chartRows);
      setSelection({ program: null, course: null, opening: null, student: null });
      setOpenings([]);
      setProgramOverview(null);
      setAnalyticsOpeningId(null);
      setOpeningData(null);
      setAttendance(null);
    } catch (requestError) {
      setSummary({});
      setPrograms([]);
      setPeriod(null);
      setError(requestError.response?.data?.message || requestError.message || "Không thể tải Dashboard báo cáo đào tạo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadDashboard(appliedFilters), 0);
    return () => clearTimeout(timer);
  }, [appliedFilters, loadDashboard]);
  const periodLabel = useMemo(() => period ? formatReportPeriodLabel(period) : "", [period]);
  const chartPrograms = useMemo(
    () => programs.map((program) => ({ ...program, shortName: shortChartLabel(program.name) })),
    [programs],
  );
  const courseFilterOptions = useMemo(
    () => selection.program?.coursesList || [],
    [selection.program],
  );

  const clearDrilldown = () => {
    setSelection({ program: null, course: null, opening: null, student: null });
    setOpenings([]);
    setProgramOverview(null);
    setAnalyticsOpeningId(null);
    setOpeningData(null);
    setAttendance(null);
    setDetailError("");
  };

  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    clearDrilldown();
  };

  const applyFilters = (event) => {
    event.preventDefault();
    try {
      buildDashboardPeriodParams(filters);
      setAppliedFilters({ ...filters });
    } catch (validationError) {
      setError(validationError.message);
    }
  };
  const resetFilters = () => {
    const defaults = createDefaultDashboardFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    clearDrilldown();
  };
  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      const response = await courseReportApi.exportSummary(buildDashboardPeriodParams(appliedFilters));
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(response.headers?.["content-disposition"]);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Không thể xuất báo cáo đào tạo.");
    } finally {
      setExporting(false);
    }
  };

  const loadProgramOverview = async (programId, params = {}) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await courseReportApi.getProgramOverview(programId, params);
      setProgramOverview(response.data?.data || null);
    } catch (requestError) {
      setProgramOverview(null);
      setDetailError(requestError.response?.data?.message || requestError.message || "Không thể tải tổng quan Nhiệm vụ đào tạo.");
    } finally {
      setDetailLoading(false);
    }
  };

  const selectProgram = (program) => {
    setSelection({ program, course: null, opening: null, student: null });
    setOpenings([]);
    setProgramOverview(null);
    setAnalyticsOpeningId(null);
    setOpeningData(null);
    setAttendance(null);
    setDetailError("");
    loadProgramOverview(program.id);
  };

  const selectCourse = (course) => {
    setSelection((current) => ({
      ...current,
      course,
      opening: null,
      student: null,
    }));
    setOpenings([]);
    setOpeningData(null);
    setAttendance(null);
    setProgramOverview(null);
    setAnalyticsOpeningId(null);
    setDetailError("");
    if (selection.program?.id) {
      loadProgramOverview(selection.program.id, { courseId: course.course_id });
    }
  };

  const selectProgramFromFilter = (programId) => {
    if (!programId) {
      clearDrilldown();
      return;
    }
    const program = programs.find((item) => String(item.id) === String(programId));
    if (program) selectProgram(program);
  };

  const selectAnalyticsOpening = (openingId) => {
    if (!selection.program?.id || !selection.course?.course_id) return;
    const nextOpeningId = openingId ? Number(openingId) : null;
    setAnalyticsOpeningId(nextOpeningId);
    setProgramOverview(null);
    loadProgramOverview(selection.program.id, {
      courseId: selection.course.course_id,
      ...(nextOpeningId ? { openingId: nextOpeningId } : {}),
    });
  };

  const selectCourseFromFilter = (courseId) => {
    if (!courseId) {
      if (selection.program) selectProgram(selection.program);
      else clearDrilldown();
      return;
    }
    const course = courseFilterOptions.find((item) => String(item.course_id) === String(courseId));
    if (course) selectCourse(course);
  };

  const selectOpening = async (opening) => {
    setSelection((current) => ({ ...current, opening, student: null }));
    setOpeningData(null);
    setAttendance(null);
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await courseReportApi.getOpeningStudents(opening.opening_id);
      setOpeningData(response.data?.data || {});
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || requestError.message || "Không thể tải dữ liệu học viên.");
    } finally {
      setDetailLoading(false);
    }
  };

  const selectStudent = async (student) => {
    setSelection((current) => ({ ...current, student }));
    setAttendance(null);
    const registrationId = student.registration_id || student.registrationId || student.id;
    if (!selection.opening?.opening_id || !registrationId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await courseReportApi.getStudentAttendance(selection.opening.opening_id, registrationId);
      setAttendance(response.data?.data || {});
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || requestError.message || "Không thể tải lịch sử điểm danh.");
    } finally {
      setDetailLoading(false);
    }
  };

  const goToLevel = (level) => {
    if (level === "root") {
      setSelection({ program: null, course: null, opening: null, student: null });
      setProgramOverview(null);
      setAnalyticsOpeningId(null);
    }
    if (level === "program") {
      setSelection((current) => ({ ...current, course: null, opening: null, student: null }));
      setProgramOverview(null);
      setAnalyticsOpeningId(null);
      if (selection.program?.id) loadProgramOverview(selection.program.id);
    }
    if (level === "course") setSelection((current) => ({ ...current, opening: null, student: null }));
    if (level === "opening") setSelection((current) => ({ ...current, student: null }));
    setDetailError("");
  };

  return <div className="space-y-6">
    <WelcomeCard />
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Báo cáo đào tạo</p>
        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Tổng quan hoạt động đào tạo</h1><p className="mt-1 text-sm text-slate-500">Nhiệm vụ đào tạo → Nhiệm vụ khóa đào tạo → Đợt tổ chức → Học viên</p></div>
          {periodLabel && <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">{periodLabel}</span>}
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <TrainingDashboardFilters filters={filters} loading={loading} onChange={updateFilters} onSubmit={applyFilters} onReset={resetFilters} />
        <div className="grid gap-4 md:grid-cols-2">
          <HierarchyFilter
            label="Nhiệm vụ đào tạo"
            value={selection.program?.id || ""}
            disabled={loading || !programs.length}
            onChange={selectProgramFromFilter}
            selectedLabel={selection.program?.name}
            options={programs.map((program) => ({ value: program.id, label: program.name }))}
          />
          <HierarchyFilter
            label="Nhiệm vụ khóa đào tạo"
            value={selection.course?.course_id || ""}
            disabled={loading || !selection.program}
            onChange={selectCourseFromFilter}
            selectedLabel={selection.course?.course_name}
            options={courseFilterOptions.map((course) => ({ value: course.course_id, label: course.course_name }))}
          />
        </div>
      </div>
    </section>
    {error && <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} />{error}</div>}
    {loading ? <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="animate-spin text-emerald-600" size={32} /></div> : !error && <>
      <section className={`${selection.program || selection.course ? "hidden" : "grid"} gap-4 sm:grid-cols-2 xl:grid-cols-4`}>{KPI_ITEMS.map(([key, label, Icon, tone]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></div><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(summary[key])}</p></article>)}</section>
      <section className={`${selection.program || selection.course ? "hidden" : "block"} rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900">Tổng hợp theo Nhiệm vụ đào tạo</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu thật từ cùng kỳ báo cáo của KPI.</p></div><span className="text-xs font-semibold text-slate-400">{programs.length} nhiệm vụ</span></div>
        {!programs.length ? <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Không có dữ liệu đào tạo trong kỳ đã chọn.</div> : <><ProgramCards programs={chartPrograms} onSelect={selectProgram} /><ProgramMetricChart programs={chartPrograms} metricKey={programMetric} onMetric={setProgramMetric} onSelect={selectProgram} /></>}
      </section>
      <TrainingDrilldown programs={programs} selection={selection} programOverview={programOverview} analyticsOpeningId={analyticsOpeningId} openings={openings} openingData={openingData} attendance={attendance} loading={detailLoading} error={detailError} onSelectProgram={selectProgram} onSelectCourse={selectCourse} onSelectOpening={selectOpening} onSelectAnalyticsOpening={selectAnalyticsOpening} onSelectStudent={selectStudent} onBack={goToLevel} />
      <section className="hidden" aria-hidden="true"><button type="button" onClick={exportReport} disabled={exporting || !period}><Download size={17} /></button></section>
    </>}
  </div>;
}

const PROGRAM_METRICS = [
  ["students", "Học viên", "học viên unique"],
  ["registrations", "Lượt đăng ký", "lượt đăng ký"],
  ["courses", "Nhiệm vụ khóa đào tạo", "nhiệm vụ khóa đào tạo"],
  ["openings", "Đợt tổ chức", "đợt tổ chức"],
];

function ProgramCards({ programs, onSelect }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{programs.map((program) => <button key={program.id} type="button" onClick={() => onSelect(program)} title={program.name} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"><h3 className="line-clamp-2 min-h-12 font-bold text-slate-900">{program.name}</h3><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Nhiệm vụ khóa đào tạo</dt><dd className="mt-1 text-lg font-bold text-blue-700">{formatNumber(program.courses)}</dd></div><div><dt className="text-slate-500">Đợt tổ chức</dt><dd className="mt-1 text-lg font-bold text-violet-700">{formatNumber(program.openings)}</dd></div><div><dt className="text-slate-500">Học viên unique</dt><dd className="mt-1 text-lg font-bold text-emerald-700">{formatNumber(program.students)}</dd></div><div><dt className="text-slate-500">Lượt đăng ký</dt><dd className="mt-1 text-lg font-bold text-slate-800">{formatNumber(program.registrations)}</dd></div></dl></button>)}</div>;
}

function ProgramMetricChart({ programs, metricKey, onMetric, onSelect }) {
  const metric = PROGRAM_METRICS.find(([key]) => key === metricKey) || PROGRAM_METRICS[0];
  const height = Math.max(320, programs.length * 62);
  return <article className="mt-5 min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-bold text-slate-900">{metricKey === "students" ? "Học viên theo Nhiệm vụ đào tạo" : `${metric[1]} theo Nhiệm vụ đào tạo`}</h3><p className="mt-1 text-xs text-slate-500">Mỗi thanh dùng một chỉ số cùng đơn vị · Bấm vào thanh để xem chi tiết</p></div><label className="text-xs font-semibold text-slate-600">Chỉ số<select value={metricKey} onChange={(event) => onMetric(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500">{PROGRAM_METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><div className="mt-4 w-full overflow-x-auto"><div className="min-w-[620px]" style={{ height }}><ResponsiveContainer width="100%" height="100%"><BarChart data={programs} layout="vertical" margin={{ top: 8, right: 34, bottom: 8, left: 8 }} onClick={(state) => state?.activePayload?.[0]?.payload && onSelect(state.activePayload[0].payload)} className="cursor-pointer"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="shortName" width={210} tick={{ fontSize: 11, fontWeight: 600 }} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.name || "Nhiệm vụ đào tạo"} formatter={(value) => [`${formatNumber(value)} ${metric[2]}`, metric[1]]} /><Bar dataKey={metric[0]} name={metric[1]} fill="#059669" radius={[0, 6, 6, 0]} minPointSize={3} /></BarChart></ResponsiveContainer></div></div></article>;
}

function HierarchyFilter({ label, value, disabled, onChange, selectedLabel, options }) {
  return <label className="min-w-0 text-sm font-medium text-slate-700">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} title={selectedLabel || "Tất cả"} className="mt-2 block w-full truncate rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"><option value="">Tất cả</option>{options.map((option) => <option key={option.value} value={option.value} title={option.label}>{option.label}</option>)}</select></label>;
}
