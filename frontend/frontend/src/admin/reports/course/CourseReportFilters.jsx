const PERIOD_OPTIONS = [
  { value: "YEAR", label: "Năm" },
  { value: "QUARTER", label: "Quý" },
  { value: "MONTH", label: "Tháng" },
];

export default function CourseReportFilters({
  filters,
  courses,
  openings,
  openingsLoading,
  loading,
  onChange,
  onPeriodTypeChange,
  onCourseChange,
  onOpeningChange,
  onSubmit,
  onReset,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Năm báo cáo
        </label>

        <input
          type="number"
          min="2000"
          max="2100"
          required
          value={filters.year}
          onChange={(event) => onChange("year", event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Kỳ báo cáo
        </label>

        <select
          value={filters.periodType}
          onChange={(event) => onPeriodTypeChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filters.periodType === "QUARTER" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Quý
          </label>

          <select
            required
            value={filters.quarter}
            onChange={(event) => onChange("quarter", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Chọn quý</option>
            {[1, 2, 3, 4].map((quarter) => (
              <option key={quarter} value={quarter}>
                Quý {quarter}
              </option>
            ))}
          </select>
        </div>
      )}

      {filters.periodType === "MONTH" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tháng
          </label>

          <select
            required
            value={filters.month}
            onChange={(event) => onChange("month", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Chọn tháng</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  Tháng {month}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Khóa đào tạo
        </label>

        <select
          value={filters.selectedCourseId}
          disabled={loading || courses.length === 0}
          onChange={(event) => onCourseChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Tất cả khóa đào tạo</option>
          {courses.map((course) => (
            <option key={course.course_id} value={course.course_id}>
              {course.course_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Lớp / Đợt tổ chức
        </label>

        <select
          value={filters.selectedOpeningId}
          disabled={
            loading ||
            !filters.selectedCourseId ||
            openingsLoading ||
            openings.length === 0
          }
          onChange={(event) => onOpeningChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">
            {openingsLoading
              ? "Đang tải lớp / đợt tổ chức..."
              : "Tất cả lớp / đợt tổ chức"}
          </option>
          {openings.map((opening) => (
            <option key={opening.opening_id} value={opening.opening_id}>
              {opening.class_code
                ? `${opening.class_name} (${opening.class_code})`
                : opening.class_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang tải báo cáo..." : "Áp dụng"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onReset}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Đặt lại
        </button>
      </div>
    </form>
  );
}
