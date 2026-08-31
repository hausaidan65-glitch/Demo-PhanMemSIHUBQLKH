import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import courseReportApi from "../../../services/courseReportApi";
import StudentReportFilters from "./StudentReportFilters";

const PAGE_SIZE = 10;
const INITIAL_STUDENT_FILTERS = {
  search: "",
  gender: "",
  userType: "",
  company: "",
  position: "",
  registerStatus: "",
  attendanceStatus: "",
  attendanceRate: "",
  certificateEligible: "",
  certificateIssued: "",
};

const EXPORT_FILTER_PARAM_MAP = {
  search: "search",
  gender: "gender",
  userType: "user_type",
  company: "company",
  position: "position",
  registerStatus: "register_status",
  attendanceStatus: "attendance_status",
  attendanceRate: "attendance_rate",
  certificateEligible: "certificate_eligible",
  certificateIssued: "certificate_issued",
};

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [
    1,
    2,
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    totalPages - 1,
    totalPages,
  ]
    .filter((page) => page >= 1 && page <= totalPages)
    .filter((page, index, items) => items.indexOf(page) === index)
    .sort((first, second) => first - second);
  const result = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      result.push(`ellipsis-${previousPage}`);
    }

    result.push(page);
  });

  return result;
}

function parsePositiveInteger(value) {
  if (!/^\d+$/.test(String(value || ""))) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

function formatAttendanceRate(value) {
  return `${Number(value) || 0}%`;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getUniqueOptions(students, field) {
  return Array.from(
    new Set(
      students
        .map((student) => String(student[field] ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((first, second) => first.localeCompare(second, "vi"));
}

function getExportPeriodParams(search) {
  const searchParams = new URLSearchParams(search);

  return ["year", "quarter", "month"].reduce((params, name) => {
    if (searchParams.has(name)) {
      params[name] = searchParams.get(name);
    }

    return params;
  }, {});
}

function getActiveExportFilters(filters) {
  return Object.entries(EXPORT_FILTER_PARAM_MAP).reduce(
    (params, [stateName, queryName]) => {
      if (filters[stateName]) {
        params[queryName] = filters[stateName];
      }

      return params;
    },
    {},
  );
}

function getDownloadFilename(contentDisposition, openingId) {
  const match = String(contentDisposition || "").match(
    /filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i,
  );
  const filename = String(match?.[1] || match?.[2] || "").trim();

  return filename || `bao-cao-hoc-vien-${openingId}.xlsx`;
}

async function getExportErrorMessage(error) {
  const errorData = error.response?.data;

  if (errorData instanceof Blob) {
    try {
      const parsed = JSON.parse(await errorData.text());

      if (parsed?.message) {
        return parsed.message;
      }
    } catch {
      return "Không thể xuất báo cáo. Vui lòng thử lại.";
    }
  }

  return (
    errorData?.message || "Không thể xuất báo cáo. Vui lòng thử lại."
  );
}

function matchesAttendanceRate(student, filter) {
  if (!filter) {
    return true;
  }

  if (
    student.attendance_rate === null ||
    student.attendance_rate === undefined ||
    student.attendance_rate === ""
  ) {
    return false;
  }

  const rate = Number(student.attendance_rate);

  if (!Number.isFinite(rate)) {
    return false;
  }

  if (filter === "FULL") {
    return rate === 100;
  }

  if (filter === "AT_LEAST_80") {
    return rate >= 80;
  }

  if (filter === "FROM_50_TO_80") {
    return rate >= 50 && rate < 80;
  }

  if (filter === "FROM_0_TO_50") {
    return rate > 0 && rate < 50;
  }

  return filter === "ZERO" ? rate === 0 : true;
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : displayValue(value);
}

function getRegistrationStatusLabel(status) {
  return (
    {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
    }[status] || displayValue(status)
  );
}

function getRegistrationStatusClass(status) {
  return status === "CONFIRMED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function BooleanBadge({ value, trueLabel, falseLabel }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function OpeningInfo({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function OpeningReportDetailPage() {
  const { courseId: rawCourseId, openingId: rawOpeningId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = parsePositiveInteger(rawCourseId);
  const openingId = parsePositiveInteger(rawOpeningId);
  const navigationOpening =
    openingId && Number(location.state?.opening?.opening_id) === openingId
      ? location.state.opening
      : null;
  const navigationCourse =
    courseId && Number(location.state?.course?.course_id) === courseId
      ? location.state.course
      : null;
  const [opening, setOpening] = useState(navigationOpening);
  const [students, setStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState(
    INITIAL_STUDENT_FILTERS,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingScope, setExportingScope] = useState(null);
  const [exportError, setExportError] = useState("");
  const requestIdRef = useRef(0);

  const loadStudents = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await courseReportApi.getOpeningStudents(openingId);
      const data = response.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setOpening((previous) => ({
        ...(Number(previous?.opening_id) === openingId ? previous : {}),
        ...(data.opening || {}),
      }));
      setStudents(Array.isArray(data.students) ? data.students : []);
      setStudentFilters(INITIAL_STUDENT_FILTERS);
      setCurrentPage(1);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setStudents([]);
      setStudentFilters(INITIAL_STUDENT_FILTERS);
      setCurrentPage(1);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải danh sách học viên của lớp / đợt tổ chức.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [openingId]);

  useEffect(() => {
    if (!courseId || !openingId) {
      return undefined;
    }

    const initialLoadTimer = setTimeout(() => {
      loadStudents();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
      requestIdRef.current += 1;
    };
  }, [courseId, loadStudents, openingId]);

  const currentSearch = location.search || "";
  const backUrl = courseId
    ? `/admin/reports/courses/${courseId}${currentSearch}`
    : `/admin/reports${currentSearch}`;
  const pageError = !courseId
    ? "ID khóa đào tạo không hợp lệ."
    : !openingId
      ? "ID lớp / đợt tổ chức không hợp lệ."
      : error;
  const displayedOpening =
    Number(opening?.opening_id) === openingId ? opening : null;
  const totalStudents = students.length;
  const genderOptions = useMemo(
    () => getUniqueOptions(students, "gender"),
    [students],
  );
  const userTypeOptions = useMemo(
    () => getUniqueOptions(students, "user_type"),
    [students],
  );
  const registerStatusOptions = useMemo(
    () => getUniqueOptions(students, "register_status"),
    [students],
  );
  const filteredStudents = useMemo(() => {
    const search = normalizeText(studentFilters.search);
    const company = normalizeText(studentFilters.company);
    const position = normalizeText(studentFilters.position);

    return students.filter((student) => {
      const matchesSearch =
        !search ||
        [student.full_name, student.email, student.phone].some((value) =>
          normalizeText(value).includes(search),
        );
      const matchesGender =
        !studentFilters.gender ||
        String(student.gender ?? "").trim() === studentFilters.gender;
      const matchesUserType =
        !studentFilters.userType ||
        String(student.user_type ?? "").trim() === studentFilters.userType;
      const matchesCompany =
        !company || normalizeText(student.company).includes(company);
      const matchesPosition =
        !position || normalizeText(student.position).includes(position);
      const matchesRegisterStatus =
        !studentFilters.registerStatus ||
        String(student.register_status ?? "").trim() ===
          studentFilters.registerStatus;
      const matchesAttendanceStatus =
        !studentFilters.attendanceStatus ||
        (studentFilters.attendanceStatus === "ATTENDED"
          ? student.attended === true
          : student.attended !== true);
      const matchesCertificateEligible =
        !studentFilters.certificateEligible ||
        (studentFilters.certificateEligible === "ELIGIBLE"
          ? student.certificate_eligible === true
          : student.certificate_eligible !== true);
      const matchesCertificateIssued =
        !studentFilters.certificateIssued ||
        (studentFilters.certificateIssued === "ISSUED"
          ? student.certificate_issued === true
          : student.certificate_issued !== true);

      return (
        matchesSearch &&
        matchesGender &&
        matchesUserType &&
        matchesCompany &&
        matchesPosition &&
        matchesRegisterStatus &&
        matchesAttendanceStatus &&
        matchesAttendanceRate(student, studentFilters.attendanceRate) &&
        matchesCertificateEligible &&
        matchesCertificateIssued
      );
    });
  }, [studentFilters, students]);
  const filteredStudentCount = filteredStudents.length;
  const totalPages = Math.ceil(filteredStudentCount / PAGE_SIZE);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const visibleStudents = filteredStudents.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );
  const startStudent = filteredStudentCount
    ? (safeCurrentPage - 1) * PAGE_SIZE + 1
    : 0;
  const endStudent = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredStudentCount,
  );
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);
  const hasActiveFilters = Object.values(studentFilters).some(Boolean);
  const attendedStudents = students.filter(
    (student) => student.attended === true,
  ).length;
  const totalSessions = totalStudents
    ? Number(students[0]?.total_sessions) || 0
    : null;

  const handleViewStudent = (student) => {
    navigate(
      `/admin/reports/courses/${courseId}/openings/${openingId}/students/${student.registration_id}${currentSearch}`,
      {
        state: {
          course: navigationCourse,
          opening: displayedOpening,
          student,
        },
      },
    );
  };

  const handleStudentFilterChange = (name, value) => {
    setStudentFilters((previous) => ({ ...previous, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetStudentFilters = () => {
    setStudentFilters(INITIAL_STUDENT_FILTERS);
    setCurrentPage(1);
  };

  const handleExportStudents = async (scope) => {
    if (exportingScope) {
      return;
    }

    setExportingScope(scope);
    setExportError("");

    try {
      const params = {
        scope,
        ...getExportPeriodParams(currentSearch),
        ...(scope === "FILTERED"
          ? getActiveExportFilters(studentFilters)
          : {}),
      };
      const response = await courseReportApi.exportOpeningStudents(
        openingId,
        params,
      );
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = getDownloadFilename(
        response.headers?.["content-disposition"],
        openingId,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportRequestError) {
      console.error("Lỗi xuất báo cáo học viên theo lớp:", exportRequestError);
      setExportError(await getExportErrorMessage(exportRequestError));
    } finally {
      setExportingScope(null);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
      >
        <ArrowLeft size={18} />
        Quay lại chi tiết khóa
      </button>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Báo cáo</span>
          <span>/</span>
          <span>Khóa đào tạo</span>
          <span>/</span>
          <span>{navigationCourse?.course_name || "Chi tiết khóa"}</span>
          <span>/</span>
          <span className="font-medium text-slate-700">
            {displayedOpening?.class_name || "Chi tiết lớp"}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {displayedOpening?.class_name || "Báo cáo lớp / đợt tổ chức"}
        </h1>
      </div>

      {displayedOpening && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Thông tin lớp / đợt tổ chức
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <OpeningInfo
              label="Tên lớp"
              value={displayedOpening.class_name}
            />
            <OpeningInfo label="Mã lớp" value={displayedOpening.class_code} />
            <OpeningInfo
              label="Ngày bắt đầu"
              value={formatDate(displayedOpening.organization_start_date)}
            />
            <OpeningInfo
              label="Ngày kết thúc"
              value={formatDate(displayedOpening.organization_end_date)}
            />
            <OpeningInfo
              label="Địa điểm"
              value={displayedOpening.location}
            />
          </div>
        </section>
      )}

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
              Đang tải danh sách học viên...
            </p>
          </div>
        </div>
      ) : !pageError ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Tổng học viên</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatNumber(totalStudents)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Đã đi học</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {formatNumber(attendedStudents)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Chưa đi học</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatNumber(totalStudents - attendedStudents)}
              </p>
            </div>
            {totalSessions !== null && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Tổng số buổi</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatNumber(totalSessions)}
                </p>
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách học viên
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {totalStudents} học viên trong lớp / đợt tổ chức.
              </p>
            </div>

            <StudentReportFilters
              filters={studentFilters}
              genderOptions={genderOptions}
              userTypeOptions={userTypeOptions}
              registerStatusOptions={registerStatusOptions}
              onChange={handleStudentFilterChange}
              onReset={handleResetStudentFilters}
            />

            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                {hasActiveFilters
                  ? `Kết quả lọc: ${filteredStudentCount} / ${totalStudents} học viên`
                  : `Tổng cộng ${totalStudents} học viên`}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={filteredStudentCount === 0 || exportingScope !== null}
                  onClick={() => handleExportStudents("FILTERED")}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportingScope === "FILTERED" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {exportingScope === "FILTERED"
                    ? "Đang xuất kết quả..."
                    : "Xuất kết quả lọc"}
                </button>

                <button
                  type="button"
                  disabled={totalStudents === 0 || exportingScope !== null}
                  onClick={() => handleExportStudents("ALL")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportingScope === "ALL" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {exportingScope === "ALL"
                    ? "Đang xuất toàn bộ..."
                    : "Xuất toàn bộ lớp"}
                </button>
              </div>
            </div>

            {exportError && (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                {exportError}
              </div>
            )}

            {students.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Chưa có học viên trong lớp / đợt tổ chức này.
              </div>
            ) : filteredStudentCount === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Không có học viên phù hợp với bộ lọc.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1480px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Học viên</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Điện thoại</th>
                      <th className="px-4 py-3">Đối tượng</th>
                      <th className="px-4 py-3">Trạng thái ĐK</th>
                      <th className="px-4 py-3 text-center">Buổi học</th>
                      <th className="px-4 py-3 text-center">Đã đi</th>
                      <th className="px-4 py-3 text-center">Tỷ lệ</th>
                      <th className="px-4 py-3">Chứng nhận</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr
                        key={student.registration_id}
                        className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {displayValue(student.full_name)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {displayValue(student.gender)} · {displayValue(student.company)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {displayValue(student.position)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(student.email)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(student.phone)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(student.user_type)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                              student.register_status,
                            )}`}
                          >
                            {getRegistrationStatusLabel(student.register_status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {formatNumber(student.attended_sessions)} / {formatNumber(student.total_sessions)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <BooleanBadge
                            value={student.attended === true}
                            trueLabel="Đã đi học"
                            falseLabel="Chưa đi học"
                          />
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-slate-700">
                          {formatAttendanceRate(student.attendance_rate)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <BooleanBadge
                              value={student.certificate_eligible === true}
                              trueLabel="Đủ điều kiện"
                              falseLabel="Chưa đủ điều kiện"
                            />
                            <BooleanBadge
                              value={student.certificate_issued === true}
                              trueLabel="Đã cấp"
                              falseLabel="Chưa cấp"
                            />
                            <span className="text-xs text-slate-500">
                              Số: {displayValue(student.certificate_no)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleViewStudent(student)}
                              title="Xem lịch sử điểm danh"
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

                <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Hiển thị {startStudent}–{endStudent} /{" "}
                    {filteredStudentCount} học viên
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() =>
                        setCurrentPage((previous) => Math.max(previous - 1, 1))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Trước
                    </button>

                    {paginationItems.map((item) =>
                      typeof item === "number" ? (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-semibold ${
                            item === safeCurrentPage
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item}
                        </button>
                      ) : (
                        <span
                          key={item}
                          className="px-1 text-sm text-slate-400"
                        >
                          ...
                        </span>
                      ),
                    )}

                    <button
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((previous) =>
                          Math.min(previous + 1, totalPages),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sau →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
