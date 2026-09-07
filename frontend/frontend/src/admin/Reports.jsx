import { useSearchParams } from "react-router-dom";

import CourseReportSection from "./reports/course/CourseReportSection";
import SeminarReportSection from "./reports/event/SeminarReportSection";
import NetworkingReportSection from "./reports/networking/NetworkingReportSection";

const REPORT_TABS = [
  { key: "course", label: "Khóa đào tạo" },
  { key: "seminar", label: "Hội thảo" },
  { key: "networking", label: "Sự kiện kết nối" },
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportParam = searchParams.get("report");
  const activeReport = ["seminar", "networking"].includes(reportParam)
    ? reportParam
    : "course";

  const selectReport = (report) => {
    const nextSearch = new URLSearchParams(searchParams);

    if (["seminar", "networking"].includes(report)) {
      nextSearch.set("report", report);

      if (!nextSearch.get("year")) {
        nextSearch.set("year", String(new Date().getFullYear()));
      }
    } else {
      nextSearch.delete("report");
    }

    setSearchParams(nextSearch);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Báo cáo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tổng hợp báo cáo các hoạt động và chương trình của SIHUB.
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          role="tablist"
          aria-label="Loại báo cáo"
          className="inline-flex min-w-max rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              id={`report-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeReport === tab.key}
              aria-controls={`report-panel-${tab.key}`}
              onClick={() => selectReport(tab.key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
                activeReport === tab.key
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`report-panel-${activeReport}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeReport}`}
      >
        {activeReport === "course" && <CourseReportSection />}
        {activeReport === "seminar" && <SeminarReportSection />}
        {activeReport === "networking" && <NetworkingReportSection />}
      </div>
    </div>
  );
}
