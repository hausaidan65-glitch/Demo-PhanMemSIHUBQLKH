import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import courseReportApi from "../../../services/courseReportApi";
import CourseReportFilters from "./CourseReportFilters";

const currentYear = String(new Date().getFullYear());

const INITIAL_FILTERS = {
  year: currentYear,
  periodType: "YEAR",
  quarter: "",
  month: "",
  selectedCourseId: "",
  selectedOpeningId: "",
};

function getFiltersFromSearch(searchParams) {
  const year = searchParams.get("year");
  const quarter = searchParams.get("quarter");
  const month = searchParams.get("month");
  const validYear = /^\d{4}$/.test(year || "") ? year : currentYear;

  if (/^[1-4]$/.test(quarter || "") && month === null) {
    return {
      year: validYear,
      periodType: "QUARTER",
      quarter,
      month: "",
      selectedCourseId: "",
      selectedOpeningId: "",
    };
  }

  if (/^(?:[1-9]|1[0-2])$/.test(month || "") && quarter === null) {
    return {
      year: validYear,
      periodType: "MONTH",
      quarter: "",
      month,
      selectedCourseId: "",
      selectedOpeningId: "",
    };
  }

  return { ...INITIAL_FILTERS, year: validYear };
}

const SUMMARY_ITEMS = [
  { key: "total_courses", label: "Tổng khóa đào tạo" },
  { key: "total_openings", label: "Tổng lớp / đợt tổ chức" },
  { key: "finished_openings", label: "Đã kết thúc" },
  { key: "ongoing_openings", label: "Đang diễn ra" },
  { key: "upcoming_openings", label: "Sắp tổ chức" },
  { key: "total_students_registered", label: "Tổng học viên đăng ký" },
  { key: "total_students_attended", label: "Tổng học viên đi học" },
  { key: "total_certificates_issued", label: "Tổng chứng nhận đã cấp" },
];

function buildPeriodParams(filters) {
  const year = Number(filters.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Năm báo cáo phải nằm trong khoảng từ 2000 đến 2100.");
  }

  if (filters.periodType === "QUARTER") {
    if (!filters.quarter) {
      throw new Error("Vui lòng chọn quý báo cáo.");
    }

    return { year, quarter: Number(filters.quarter) };
  }

  if (filters.periodType === "MONTH") {
    if (!filters.month) {
      throw new Error("Vui lòng chọn tháng báo cáo.");
    }

    return { year, month: Number(filters.month) };
  }

  return { year };
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || "-";
}

function buildPeriodSearch(period) {
  const params = new URLSearchParams({ year: String(period.year) });

  if (period.type === "QUARTER" && period.quarter) {
    params.set("quarter", String(period.quarter));
  }

  if (period.type === "MONTH" && period.month) {
    params.set("month", String(period.month));
  }

  return params.toString();
}

function getPeriodParams(period) {
  if (!period) {
    return null;
  }

  if (period.type === "QUARTER") {
    return { year: period.year, quarter: period.quarter };
  }

  if (period.type === "MONTH") {
    return { year: period.year, month: period.month };
  }

  return { year: period.year };
}

export default function CourseReportSection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    getFiltersFromSearch(searchParams),
  );
  const [summary, setSummary] = useState({});
  const [period, setPeriod] = useState(null);
  const [programGroups, setProgramGroups] = useState([]);
  const [openingOptions, setOpeningOptions] = useState([]);
  const [openingsLoading, setOpeningsLoading] = useState(false);
  const [openingsError, setOpeningsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const openingsRequestIdRef = useRef(0);

  const loadReport = useCallback(async (params) => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, programsResponse] = await Promise.all([
        courseReportApi.getSummary(params),
        courseReportApi.getPrograms(params),
      ]);
      const summaryData = summaryResponse.data?.data || {};
      const programsData = programsResponse.data?.data || {};
      const programs = Array.isArray(programsData.programs)
        ? programsData.programs
        : [];
      const groups = await Promise.all(
        programs.map(async (program) => {
          const coursesResponse = await courseReportApi.getCoursesByProgram(
            program.program_id,
            params,
          );

          return {
            program,
            courses: Array.isArray(coursesResponse.data?.data?.courses)
              ? coursesResponse.data.data.courses
              : [],
          };
        }),
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary(summaryData.summary || {});
      setPeriod(summaryData.period || programsData.period || null);
      setProgramGroups(groups);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary({});
      setPeriod(null);
      setProgramGroups([]);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải báo cáo khóa đào tạo.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = setTimeout(() => {
      loadReport(buildPeriodParams(getFiltersFromSearch(searchParams)));
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
      requestIdRef.current += 1;
    };
  }, [loadReport, searchParams]);

  const updateFilter = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
      selectedCourseId: "",
      selectedOpeningId: "",
    }));
    openingsRequestIdRef.current += 1;
    setOpeningOptions([]);
    setOpeningsError("");
    setOpeningsLoading(false);
  };

  const changePeriodType = (periodType) => {
    setFilters((previous) => ({
      ...previous,
      periodType,
      quarter: periodType === "QUARTER" ? previous.quarter : "",
      month: periodType === "MONTH" ? previous.month : "",
      selectedCourseId: "",
      selectedOpeningId: "",
    }));
    openingsRequestIdRef.current += 1;
    setOpeningOptions([]);
    setOpeningsError("");
    setOpeningsLoading(false);
  };

  const handleCourseChange = async (selectedCourseId) => {
    const requestId = openingsRequestIdRef.current + 1;

    openingsRequestIdRef.current = requestId;
    setFilters((previous) => ({
      ...previous,
      selectedCourseId,
      selectedOpeningId: "",
    }));
    setOpeningOptions([]);
    setOpeningsError("");

    if (!selectedCourseId) {
      setOpeningsLoading(false);
      return;
    }

    const params = getPeriodParams(period);

    if (!params) {
      return;
    }

    setOpeningsLoading(true);

    try {
      const response = await courseReportApi.getOpeningsByCourse(
        selectedCourseId,
        params,
      );

      if (requestId !== openingsRequestIdRef.current) {
        return;
      }

      const openings = response.data?.data?.openings;

      setOpeningOptions(Array.isArray(openings) ? openings : []);
    } catch (requestError) {
      if (requestId !== openingsRequestIdRef.current) {
        return;
      }

      setOpeningsError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải danh sách lớp / đợt tổ chức.",
      );
    } finally {
      if (requestId === openingsRequestIdRef.current) {
        setOpeningsLoading(false);
      }
    }
  };

  const handleOpeningChange = (selectedOpeningId) => {
    setFilters((previous) => ({ ...previous, selectedOpeningId }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      const params = buildPeriodParams(filters);
      const nextSearch = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      );

      if (nextSearch.toString() === searchParams.toString()) {
        loadReport(params);
      } else {
        setSearchParams(nextSearch);
      }
    } catch (validationError) {
      setError(validationError.message);
    }
  };

  const handleReset = () => {
    const params = { year: Number(currentYear) };
    const nextSearch = new URLSearchParams({ year: currentYear });

    openingsRequestIdRef.current += 1;
    setFilters(INITIAL_FILTERS);
    setOpeningOptions([]);
    setOpeningsError("");
    setOpeningsLoading(false);

    if (nextSearch.toString() === searchParams.toString()) {
      loadReport(params);
    } else {
      setSearchParams(nextSearch);
    }
  };

  const handleViewCourse = (course) => {
    if (!period) {
      return;
    }

    navigate(
      `/admin/reports/courses/${course.course_id}?${buildPeriodSearch(period)}`,
      { state: { course } },
    );
  };

  const handleViewOpening = () => {
    if (!period || !filters.selectedCourseId || !filters.selectedOpeningId) {
      return;
    }

    const selectedCourse = allCourses.find(
      (course) => String(course.course_id) === filters.selectedCourseId,
    );
    const selectedOpening = openingOptions.find(
      (opening) =>
        String(opening.opening_id) === filters.selectedOpeningId,
    );

    navigate(
      `/admin/reports/courses/${filters.selectedCourseId}/openings/${filters.selectedOpeningId}?${buildPeriodSearch(period)}`,
      { state: { course: selectedCourse, opening: selectedOpening } },
    );
  };

  const allCourses = programGroups.flatMap((group) => group.courses);
  const filteredProgramGroups = filters.selectedCourseId
    ? programGroups
        .map((group) => ({
          ...group,
          courses: group.courses.filter(
            (course) =>
              String(course.course_id) === filters.selectedCourseId,
          ),
        }))
        .filter((group) => group.courses.length > 0)
    : programGroups;
  const totalCourseRows = filteredProgramGroups.reduce(
    (total, group) => total + group.courses.length,
    0,
  );
  const selectedCourse = allCourses.find(
    (course) => String(course.course_id) === filters.selectedCourseId,
  );
  const selectedOpening = openingOptions.find(
    (opening) => String(opening.opening_id) === filters.selectedOpeningId,
  );

  return (
    <section className="space-y-5 rounded-3xl border border-green-100 bg-green-50/40 p-5 shadow-sm">
      <div>
        <h3 className="text-xl font-bold text-slate-900">
          Báo cáo khóa đào tạo
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Tổng hợp theo thời gian tổ chức chính thức của lớp / đợt tổ chức.
        </p>
      </div>

      <CourseReportFilters
        filters={filters}
        courses={allCourses}
        openings={openingOptions}
        openingsLoading={openingsLoading}
        loading={loading}
        onChange={updateFilter}
        onPeriodTypeChange={changePeriodType}
        onCourseChange={handleCourseChange}
        onOpeningChange={handleOpeningChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {openingsError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {openingsError}
        </div>
      )}

      {!loading &&
        filters.selectedCourseId &&
        !openingsLoading &&
        !openingsError &&
        openingOptions.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Không có lớp / đợt tổ chức của khóa này trong kỳ báo cáo.
          </div>
        )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2
              size={30}
              className="mx-auto animate-spin text-green-600"
            />
            <p className="mt-3 text-sm text-slate-500">
              Đang tải báo cáo khóa đào tạo...
            </p>
          </div>
        </div>
      ) : !error ? (
        <>
          {period && (
            <p className="text-sm text-slate-500">
              Kỳ dữ liệu: {formatDate(period.report_start)} đến{" "}
              {formatDate(period.report_end)}
            </p>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">Tổng quan theo kỳ</p>
            <p className="mt-1 text-blue-700">
              Các thẻ số liệu bên dưới luôn phản ánh toàn bộ kỳ báo cáo, không
              thay đổi theo bộ lọc khóa hoặc lớp.
            </p>
            {selectedCourse && (
              <p className="mt-2">
                Khóa đào tạo đang lọc: <strong>{selectedCourse.course_name}</strong>
              </p>
            )}
            {selectedOpening && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p>
                  Lớp / Đợt: <strong>{selectedOpening.class_name}</strong>
                  {selectedOpening.class_code
                    ? ` (${selectedOpening.class_code})`
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={handleViewOpening}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Xem báo cáo lớp
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatNumber(summary[item.key])}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h4 className="font-bold text-slate-900">
                Danh sách khóa đào tạo
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {totalCourseRows} khóa trong kỳ báo cáo.
              </p>
            </div>

            {totalCourseRows === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Không có khóa đào tạo trong kỳ báo cáo.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredProgramGroups.map(({ program, courses }) => (
                  <div key={program.program_id}>
                    <div className="bg-slate-50 px-5 py-3">
                      <p className="font-semibold text-slate-800">
                        {program.program_name}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-3">Khóa đào tạo</th>
                            <th className="px-5 py-3 text-center">
                              Lớp / đợt
                            </th>
                            <th className="px-5 py-3 text-center">Đăng ký</th>
                            <th className="px-5 py-3 text-center">Đi học</th>
                            <th className="px-5 py-3 text-center">
                              Chứng nhận
                            </th>
                            <th className="px-5 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>

                        <tbody>
                          {courses.map((course) => (
                            <tr
                              key={course.course_id}
                              className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                            >
                              <td className="px-5 py-4 font-semibold text-slate-900">
                                {course.course_name}
                              </td>
                              <td className="px-5 py-4 text-center text-slate-700">
                                {formatNumber(course.total_openings)}
                              </td>
                              <td className="px-5 py-4 text-center text-slate-700">
                                {formatNumber(course.total_students_registered)}
                              </td>
                              <td className="px-5 py-4 text-center text-slate-700">
                                {formatNumber(course.total_students_attended)}
                              </td>
                              <td className="px-5 py-4 text-center text-slate-700">
                                {formatNumber(
                                  course.total_certificates_issued,
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleViewCourse(course)}
                                    title="Xem chi tiết báo cáo khóa đào tạo"
                                    className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Eye size={17} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
