import { toPng } from "html-to-image";
import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import ChartRenderer from "./ChartRenderer";
import StatisticsFilter from "./StatisticsFilter";
import { normalizeAgeGroupAnalytics } from "./ageGroupAnalytics";

const USER_TYPE_LABELS = {
  STUDENT: "Sinh viên",
  STARTUP: "Startup",
  BUSINESS: "Doanh nghiệp",
  UNIVERSITY: "Trường đại học",
  OTHER: "Khác / Chưa xác định",
  UNKNOWN: "Khác / Chưa xác định",
};
const GENDER_LABELS = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác / Chưa xác định",
  UNKNOWN: "Khác / Chưa xác định",
};
const STATUS_LABELS = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

function normalizeAndMerge(items = [], labels = {}) {
  const totals = new Map();
  items.forEach((item) => {
    const rawName = String(item.name || "UNKNOWN");
    const name = labels[rawName] || rawName;
    totals.set(name, (totals.get(name) || 0) + Number(item.value || 0));
  });
  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({ title, value, note, icon: Icon, tone = "green" }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{note}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, description, coverage, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-semibold text-slate-900">{title}</h4>
          {coverage && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {coverage}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message = "Chưa có đủ dữ liệu để hiển thị biểu đồ này." }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function percentage(value, total) {
  return total ? `${((Number(value) / Number(total)) * 100).toFixed(1)}%` : "0%";
}

export default function RegistrationCharts({
  open,
  onClose,
  loading,
  statistics,
  filters,
  setFilters,
  onApply,
  onReset,
}) {
  const chartRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);
  const [customMetric, setCustomMetric] = useState("user_types");

  if (!open) return null;

  const summary = statistics?.summary || {};
  const charts = statistics?.charts || {};
  const totalUsers = Number(summary.total_users || 0);
  const totalRegistrations = Number(summary.total_registrations || 0);
  const classifiedUserTypes = Number(summary.classified_user_types || 0);
  const unknownUserTypes = Number(summary.unknown_user_types || 0);
  const ageCoveredUsers = Number(summary.age_group_covered_users || 0);
  const projectCoverage = Number(summary.project_field_covered_registrations || 0);
  const stageCoverage = Number(summary.startup_stage_covered_registrations || 0);
  const userTypes = normalizeAndMerge(charts.user_types, USER_TYPE_LABELS);
  const genders = normalizeAndMerge(charts.genders, GENDER_LABELS);
  const ageGroups = normalizeAgeGroupAnalytics(charts.age_groups || []);
  const statuses = normalizeAndMerge(charts.statuses, STATUS_LABELS);
  const genderAgeGroups = normalizeAgeGroupAnalytics(
    (charts.gender_age_groups || [])
      .filter((item) => (GENDER_LABELS[item.gender] || item.gender) === selectedGender)
      .map((item) => ({
        name: item.age_group,
        value: item.value,
      })),
  );
  const customOptions = {
    user_types: { label: "Nhóm đối tượng", data: userTypes, unit: "học viên" },
    genders: { label: "Giới tính", data: genders, unit: "học viên" },
    age_groups: { label: "Nhóm tuổi", data: ageGroups, unit: "học viên" },
    project_fields: { label: "Lĩnh vực dự án", data: charts.project_fields || [], unit: "lượt đăng ký" },
    startup_stages: { label: "Giai đoạn Startup", data: charts.startup_stages || [], unit: "lượt đăng ký" },
    statuses: { label: "Trạng thái đăng ký", data: statuses, unit: "lượt đăng ký" },
    courses: { label: "Khóa đào tạo", data: charts.courses || [], unit: "học viên" },
  };

  const exportPng = async () => {
    try {
      setExporting(true);
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
        filter: (node) => !node.classList?.contains("no-export"),
      });
      const link = document.createElement("a");
      link.download = "phan-tich-hoc-vien-sihub.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Không thể xuất ảnh phân tích học viên:", error);
    } finally {
      setExporting(false);
    }
  };

  const chart = (data, unit, options = {}) => {
    const readabilityMode = data?.length > 6;

    return data?.length ? (
      <div
        className={readabilityMode ? "min-w-0" : options.className || "h-[340px]"}
        style={readabilityMode ? undefined : options.style}
      >
        <ChartRenderer
          data={data}
          defaultType={options.type || "horizontal"}
          allowedTypes={options.allowedTypes || ["horizontal", "bar"]}
          valueLabel={unit}
          showPercentage={options.showPercentage}
          readabilityMode={readabilityMode}
        />
      </div>
    ) : (
      <EmptyChart />
    );
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div ref={chartRef} className="mx-auto w-full max-w-7xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Phân tích dữ liệu học viên</h2>
            <p className="mt-1 text-sm text-slate-500">
              Demographic tính theo học viên duy nhất; dữ liệu đăng ký được ghi rõ theo lượt.
            </p>
          </div>
          <div className="no-export flex shrink-0 items-center gap-2">
            <button type="button" onClick={exportPng} disabled={exporting} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {exporting ? "Đang xuất..." : "Xuất PNG"}
            </button>
            <button type="button" onClick={onClose} aria-label="Đóng phân tích học viên" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100">
              <X size={22} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[600px] items-center justify-center text-sm text-slate-500">Đang tổng hợp số liệu...</div>
        ) : totalUsers === 0 ? (
          <div className="flex min-h-[480px] items-center justify-center p-8 text-center">
            <div>
              <BarChart3 className="mx-auto text-slate-300" size={48} />
              <h3 className="mt-4 text-lg font-semibold text-slate-800">Không có dữ liệu phù hợp với bộ lọc hiện tại.</h3>
              <p className="mt-2 text-sm text-slate-500">Hãy điều chỉnh bộ lọc trong danh sách học viên và thử lại.</p>
            </div>
          </div>
        ) : (
          <main className="space-y-9 p-6">
            <div className="no-export">
              <StatisticsFilter
                ageGroups={(charts.age_groups || []).map((item) => item.name).filter((name) => name !== "UNKNOWN")}
                projectFields={(charts.project_fields || []).map((item) => item.name)}
                statuses={statuses.map((item) => item.name)}
                filters={filters}
                setFilters={setFilters}
                onApply={onApply}
                onReset={onReset}
              />
            </div>

            <section className="space-y-4">
              <SectionTitle eyebrow="Tổng quan" title="Chất lượng và quy mô dữ liệu" description="Các chỉ số phản ánh đúng tập dữ liệu theo bộ lọc đang áp dụng." />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard title="Tổng học viên" value={totalUsers.toLocaleString("vi-VN")} note="Không đếm trùng người" icon={Users} />
                <StatCard title="Đã phân loại đối tượng" value={classifiedUserTypes.toLocaleString("vi-VN")} note={percentage(classifiedUserTypes, totalUsers)} icon={UserRoundCheck} tone="blue" />
                <StatCard title="Khác / Chưa xác định" value={unknownUserTypes.toLocaleString("vi-VN")} note={percentage(unknownUserTypes, totalUsers)} icon={HelpCircle} tone="amber" />
                <StatCard title="Có thông tin nhóm tuổi" value={percentage(ageCoveredUsers, totalUsers)} note={`${ageCoveredUsers.toLocaleString("vi-VN")} / ${totalUsers.toLocaleString("vi-VN")} học viên`} icon={UserRoundCheck} tone="violet" />
                <StatCard title="Tổng lượt đăng ký" value={totalRegistrations.toLocaleString("vi-VN")} note="Có thể trùng học viên" icon={ClipboardList} />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle eyebrow="Thông tin học viên" title="Chân dung học viên" description="Các biểu đồ phần này sử dụng học viên duy nhất làm mẫu số." />
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Nhóm đối tượng" description="Phân bố theo users.user_type; OTHER luôn được giữ trong kết quả." coverage={`${totalUsers.toLocaleString("vi-VN")} học viên`}>
                  {chart(userTypes, "học viên", { allowedTypes: ["horizontal", "bar", "pie"] })}
                  {unknownUserTypes / totalUsers >= 0.5 && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Dữ liệu nhóm đối tượng chưa được phân loại đầy đủ.</p>
                  )}
                </ChartCard>
                <ChartCard title="Giới tính" description="Bao gồm Nam, Nữ và Khác / Chưa xác định. Chọn một nhóm để xem tuổi." coverage={`${totalUsers.toLocaleString("vi-VN")} học viên`}>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {genders.map((item) => (
                      <button type="button" key={item.name} onClick={() => setSelectedGender((current) => current === item.name ? null : item.name)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${selectedGender === item.name ? "border-green-600 bg-green-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        {item.name} ({item.value})
                      </button>
                    ))}
                  </div>
                  {chart(genders, "học viên", { type: "pie", allowedTypes: ["pie", "horizontal", "bar"] })}
                  {selectedGender && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                      <p className="mb-3 text-sm font-semibold text-slate-700">Nhóm tuổi — {selectedGender}</p>
                      {chart(genderAgeGroups, "học viên", { className: "h-[300px]" })}
                    </div>
                  )}
                </ChartCard>
                <ChartCard title="Nhóm tuổi" description="Các giá trị nhóm tuổi tương đương được gộp thành nhãn chuẩn để dễ đọc." coverage={`Có dữ liệu: ${ageCoveredUsers.toLocaleString("vi-VN")} / ${totalUsers.toLocaleString("vi-VN")}`} className="xl:col-span-2">
                  {chart(ageGroups, "học viên", { style: { height: Math.max(360, ageGroups.length * 42) } })}
                </ChartCard>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle eyebrow="Thông tin dự án" title="Dữ liệu dự án và Startup" description="Các biểu đồ phần này tính theo lượt đăng ký vì dữ liệu nằm trên registrations." />
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Lĩnh vực dự án" description="Theo giá trị project_field thực tế." coverage={`Có dữ liệu: ${projectCoverage.toLocaleString("vi-VN")} / ${totalRegistrations.toLocaleString("vi-VN")} lượt`}>
                  {projectCoverage ? chart(charts.project_fields, "lượt đăng ký", { style: { height: Math.max(320, (charts.project_fields?.length || 0) * 42) } }) : <EmptyChart />}
                </ChartCard>
                <ChartCard title="Giai đoạn Startup" description="Theo startup_stage, không tạo taxonomy mới." coverage={`Có dữ liệu: ${stageCoverage.toLocaleString("vi-VN")} / ${totalRegistrations.toLocaleString("vi-VN")} lượt`}>
                  {stageCoverage ? chart(charts.startup_stages, "lượt đăng ký", { style: { height: Math.max(320, (charts.startup_stages?.length || 0) * 42) } }) : <EmptyChart />}
                </ChartCard>
                <ChartCard title="Nữ Founder/Co-founder" description="Phân bố theo lượt đăng ký." className="xl:col-span-2">
                  {chart(charts.female_founders, "lượt đăng ký", { type: "pie", allowedTypes: ["pie", "bar", "horizontal"] })}
                </ChartCard>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle eyebrow="Đăng ký đào tạo" title="Hoạt động đăng ký" description="Phân biệt lượt đăng ký và học viên duy nhất theo từng biểu đồ." />
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Trạng thái đăng ký" description="Phân bố theo lượt hồ sơ đăng ký.">
                  {chart(statuses, "lượt đăng ký", { type: "pie", allowedTypes: ["pie", "bar", "horizontal"] })}
                </ChartCard>
                <ChartCard title="Học viên theo khóa đào tạo" description="Mỗi khóa đếm học viên duy nhất; một người có thể thuộc nhiều khóa.">
                  {chart(charts.courses, "học viên")}
                </ChartCard>
                <ChartCard title="Học viên đăng ký theo ngày" description="Mỗi ngày đếm học viên duy nhất có đăng ký trong ngày đó." className="xl:col-span-2">
                  {chart(charts.timeline, "học viên", { type: "line", allowedTypes: ["line", "bar"], showPercentage: false })}
                </ChartCard>
                <ChartCard title="Biểu đồ tùy chọn" description="Chọn breakdown đã được tổng hợp trong cùng response." className="xl:col-span-2">
                  <div className="no-export mb-5 max-w-sm">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Dữ liệu thống kê</label>
                    <select value={customMetric} onChange={(event) => setCustomMetric(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100">
                      {Object.entries(customOptions).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
                    </select>
                  </div>
                  {chart(customOptions[customMetric]?.data, customOptions[customMetric]?.unit, { allowedTypes: ["horizontal", "bar", "pie"] })}
                </ChartCard>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
