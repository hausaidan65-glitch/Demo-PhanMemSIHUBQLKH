import { useSearchParams } from "react-router-dom";

import CourseReportSection from "./reports/course/CourseReportSection";
import SeminarReportSection from "./reports/event/SeminarReportSection";

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeReport =
    searchParams.get("report") === "seminar" ? "seminar" : "course";

  const selectReport = (report) => {
    const nextSearch = new URLSearchParams(searchParams);

    if (report === "seminar") {
      nextSearch.set("report", "seminar");

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

      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => selectReport("course")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeReport === "course"
              ? "bg-green-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Khóa đào tạo
        </button>
        <button
          type="button"
          onClick={() => selectReport("seminar")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeReport === "seminar"
              ? "bg-green-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Hội thảo
        </button>
      </div>

      {activeReport === "course" ? (
        <CourseReportSection />
      ) : (
        <SeminarReportSection />
      )}
    </div>
  );
}
