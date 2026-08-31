import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import courseReportApi from "../../../services/courseReportApi";
import CourseOpeningFilters from "./CourseOpeningFilters";

const COURSE_SUMMARY_ITEMS = [
  { key: "total_openings", label: "Tổng lớp / đợt tổ chức" },
  { key: "total_students_registered", label: "Tổng học viên đăng ký" },
  { key: "total_students_attended", label: "Tổng học viên đi học" },
  { key: "total_certificates_issued", label: "Tổng chứng nhận đã cấp" },
];

const INITIAL_OPENING_FILTERS = {
  search: "",
  operationalStatus: "",
  organizationStatus: "",
  startDate: "",
  endDate: "",
  registrationPresence: "",
  attendancePresence: "",
  certificatePresence: "",
};

function parsePositiveInteger(value) {
  if (!/^\d+$/.test(String(value || ""))) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function resolvePeriod(searchParams) {
  const currentYear = new Date().getFullYear();
  const rawYear = searchParams.get("year");
  const parsedYear = Number(rawYear);
  const year =
    /^\d+$/.test(String(rawYear || "")) &&
    Number.isInteger(parsedYear) &&
    parsedYear >= 2000 &&
    parsedYear <= 2100
      ? parsedYear
      : currentYear;
  const rawQuarter = searchParams.get("quarter");
  const rawMonth = searchParams.get("month");

  if (rawQuarter !== null && rawMonth !== null) {
    return {
      error: "Không được sử dụng đồng thời bộ lọc quý và tháng.",
      params: null,
    };
  }

  if (rawQuarter !== null) {
    const quarter = Number(rawQuarter);

    if (!/^\d+$/.test(rawQuarter) || quarter < 1 || quarter > 4) {
      return { error: "Quý báo cáo không hợp lệ.", params: null };
    }

    return { error: "", params: { year, quarter } };
  }

  if (rawMonth !== null) {
    const month = Number(rawMonth);

    if (!/^\d+$/.test(rawMonth) || month < 1 || month > 12) {
      return { error: "Tháng báo cáo không hợp lệ.", params: null };
    }

    return { error: "", params: { year, month } };
  }

  return { error: "", params: { year } };
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : displayValue(value);
}

function getStatusLabel(status) {
  return (
    {
      OPEN: "Đang mở",
      FULL: "Đã đủ",
      CLOSED: "Đã đóng",
      ACTIVE: "Đang hoạt động",
      FINISHED: "Đã kết thúc",
      ONGOING: "Đang diễn ra",
      UPCOMING: "Sắp tổ chức",
      PENDING: "Chờ xử lý",
    }[status] || displayValue(status)
  );
}

function getStatusClass(status) {
  if (["OPEN", "ONGOING", "ACTIVE"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["UPCOMING", "PENDING"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["FINISHED", "CLOSED"].includes(status)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getUniqueOptions(openings, field) {
  return Array.from(
    new Set(
      openings
        .map((opening) => String(opening[field] ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((first, second) => first.localeCompare(second, "vi"));
}

function matchesPresence(value, filter) {
  if (!filter) {
    return true;
  }

  const count = Number(value);
  const safeCount = Number.isFinite(count) ? count : 0;

  return filter === "HAS" ? safeCount > 0 : safeCount === 0;
}

export default function CourseReportDetailPage() {
  const { courseId: rawCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = parsePositiveInteger(rawCourseId);
  const periodResult = useMemo(
    () => resolvePeriod(searchParams),
    [searchParams],
  );
  const navigationCourse =
    courseId && Number(location.state?.course?.course_id) === courseId
      ? location.state.course
      : null;
  const [course, setCourse] = useState(navigationCourse);
  const [period, setPeriod] = useState(null);
  const [openings, setOpenings] = useState([]);
  const [openingFilters, setOpeningFilters] = useState(
    INITIAL_OPENING_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadOpenings = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await courseReportApi.getOpeningsByCourse(
        courseId,
        periodResult.params,
      );
      const data = response.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCourse((previous) => ({
        ...(Number(previous?.course_id) === courseId ? previous : {}),
        ...(data.course || {}),
      }));
      setPeriod(data.period || null);
      setOpenings(Array.isArray(data.openings) ? data.openings : []);
      setOpeningFilters(INITIAL_OPENING_FILTERS);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setOpenings([]);
      setOpeningFilters(INITIAL_OPENING_FILTERS);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải chi tiết báo cáo khóa đào tạo.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [courseId, periodResult.params]);

  useEffect(() => {
    if (!courseId || periodResult.error) {
      return undefined;
    }

    const initialLoadTimer = setTimeout(() => {
      loadOpenings();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
      requestIdRef.current += 1;
    };
  }, [courseId, loadOpenings, periodResult.error]);

  const normalizedSearch = periodResult.params
    ? new URLSearchParams(
        Object.entries(periodResult.params).map(([key, value]) => [
          key,
          String(value),
        ]),
      ).toString()
    : "";
  const backUrl = normalizedSearch
    ? `/admin/reports?${normalizedSearch}`
    : "/admin/reports";
  const pageError = !courseId
    ? "ID khóa đào tạo không hợp lệ."
    : periodResult.error || error;
  const displayedCourse =
    Number(course?.course_id) === courseId ? course : null;
  const summaryItems = COURSE_SUMMARY_ITEMS.filter((item) =>
    Object.prototype.hasOwnProperty.call(displayedCourse || {}, item.key),
  );
  const operationalStatusOptions = useMemo(
    () => getUniqueOptions(openings, "operational_status"),
    [openings],
  );
  const organizationStatusOptions = useMemo(
    () => getUniqueOptions(openings, "organization_status"),
    [openings],
  );
  const filteredOpenings = useMemo(() => {
    const search = normalizeText(openingFilters.search);

    return openings.filter((opening) => {
      const matchesSearch =
        !search ||
        [opening.class_name, opening.class_code].some((value) =>
          normalizeText(value).includes(search),
        );
      const matchesOperationalStatus =
        !openingFilters.operationalStatus ||
        String(opening.operational_status ?? "").trim() ===
          openingFilters.operationalStatus;
      const matchesOrganizationStatus =
        !openingFilters.organizationStatus ||
        String(opening.organization_status ?? "").trim() ===
          openingFilters.organizationStatus;
      const organizationStartDate = String(
        opening.organization_start_date ?? "",
      ).slice(0, 10);
      const organizationEndDate = String(
        opening.organization_end_date ?? "",
      ).slice(0, 10);
      const matchesStartDate =
        !openingFilters.startDate ||
        (organizationEndDate &&
          organizationEndDate >= openingFilters.startDate);
      const matchesEndDate =
        !openingFilters.endDate ||
        (organizationStartDate &&
          organizationStartDate <= openingFilters.endDate);

      return (
        matchesSearch &&
        matchesOperationalStatus &&
        matchesOrganizationStatus &&
        matchesStartDate &&
        matchesEndDate &&
        matchesPresence(
          opening.total_students_registered,
          openingFilters.registrationPresence,
        ) &&
        matchesPresence(
          opening.total_students_attended,
          openingFilters.attendancePresence,
        ) &&
        matchesPresence(
          opening.total_certificates_issued,
          openingFilters.certificatePresence,
        )
      );
    });
  }, [openingFilters, openings]);
  const hasActiveOpeningFilters =
    Object.values(openingFilters).some(Boolean);

  const handleOpeningFilterChange = (name, value) => {
    setOpeningFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleResetOpeningFilters = () => {
    setOpeningFilters(INITIAL_OPENING_FILTERS);
  };

  const handleViewOpening = (opening) => {
    const search = normalizedSearch ? `?${normalizedSearch}` : "";

    navigate(
      `/admin/reports/courses/${courseId}/openings/${opening.opening_id}${search}`,
      {
        state: {
          course: displayedCourse,
          opening,
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
      >
        <ArrowLeft size={18} />
        Quay lại Báo cáo
      </button>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Báo cáo</span>
          <span>/</span>
          <span>Khóa đào tạo</span>
          <span>/</span>
          <span className="font-medium text-slate-700">
            {displayedCourse?.course_name || "Chi tiết khóa đào tạo"}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {displayedCourse?.course_name || "Chi tiết báo cáo khóa đào tạo"}
        </h1>

        {period && (
          <p className="mt-2 text-sm text-slate-500">
            Kỳ dữ liệu: {formatDate(period.report_start)} đến{" "}
            {formatDate(period.report_end)}
          </p>
        )}
      </div>

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {!pageError && loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-green-600"
            />
            <p className="mt-3 text-sm text-slate-500">
              Đang tải lớp / đợt tổ chức...
            </p>
          </div>
        </div>
      ) : !pageError ? (
        <>
          {summaryItems.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatNumber(displayedCourse[item.key])}
                  </p>
                </div>
              ))}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Lớp học / Đợt tổ chức
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {openings.length} lớp / đợt trong kỳ báo cáo.
              </p>
            </div>

            <CourseOpeningFilters
              filters={openingFilters}
              operationalStatusOptions={operationalStatusOptions}
              organizationStatusOptions={organizationStatusOptions}
              onChange={handleOpeningFilterChange}
              onReset={handleResetOpeningFilters}
            />

            <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-600">
              {hasActiveOpeningFilters
                ? `Kết quả lọc: ${filteredOpenings.length} / ${openings.length} lớp / đợt tổ chức`
                : `Tổng cộng ${openings.length} lớp / đợt tổ chức`}
            </div>

            {openings.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Không có lớp / đợt tổ chức trong kỳ báo cáo này.
              </div>
            ) : filteredOpenings.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Không có lớp / đợt tổ chức phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1520px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Tên lớp</th>
                      <th className="px-4 py-3">Mã lớp</th>
                      <th className="px-4 py-3">Ngày bắt đầu</th>
                      <th className="px-4 py-3">Ngày kết thúc</th>
                      <th className="px-4 py-3">Địa điểm</th>
                      <th className="px-4 py-3">Trạng thái vận hành</th>
                      <th className="px-4 py-3">Trạng thái tổ chức</th>
                      <th className="px-4 py-3 text-center">Đăng ký</th>
                      <th className="px-4 py-3 text-center">Đi học</th>
                      <th className="px-4 py-3 text-center">Chứng nhận</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOpenings.map((opening) => (
                      <tr
                        key={opening.opening_id}
                        className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {displayValue(opening.class_name)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(opening.class_code)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(opening.organization_start_date)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(opening.organization_end_date)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(opening.location)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                              opening.operational_status,
                            )}`}
                          >
                            {getStatusLabel(opening.operational_status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                              opening.organization_status,
                            )}`}
                          >
                            {getStatusLabel(opening.organization_status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-700">
                          {formatNumber(opening.total_students_registered)}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-700">
                          {formatNumber(opening.total_students_attended)}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-700">
                          {formatNumber(opening.total_certificates_issued)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleViewOpening(opening)}
                              title="Xem danh sách học viên"
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
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
