import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import courseReportApi from "../../../services/courseReportApi";

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

function formatRate(value) {
  return `${Number(value) || 0}%`;
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const text = String(value);

  return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
}

function formatSessionTime(startTime, endTime) {
  if (!startTime || !endTime) {
    return "-";
  }

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : displayValue(value);
}

function formatDateTime(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/,
  );

  return match
    ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`
    : displayValue(value);
}

function getRegistrationStatusLabel(status) {
  return (
    {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
    }[status] || displayValue(status)
  );
}

function StudentInfo({ label, value }) {
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

export default function StudentAttendanceReportPage() {
  const {
    courseId: rawCourseId,
    openingId: rawOpeningId,
    registrationId: rawRegistrationId,
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = parsePositiveInteger(rawCourseId);
  const openingId = parsePositiveInteger(rawOpeningId);
  const registrationId = parsePositiveInteger(rawRegistrationId);
  const navigationCourse =
    courseId && Number(location.state?.course?.course_id) === courseId
      ? location.state.course
      : null;
  const navigationOpening =
    openingId && Number(location.state?.opening?.opening_id) === openingId
      ? location.state.opening
      : null;
  const navigationStudent =
    registrationId &&
    Number(location.state?.student?.registration_id) === registrationId
      ? location.state.student
      : null;
  const [opening, setOpening] = useState(navigationOpening);
  const [student, setStudent] = useState(navigationStudent);
  const [summary, setSummary] = useState({});
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadAttendance = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await courseReportApi.getStudentAttendance(
        openingId,
        registrationId,
      );
      const data = response.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setOpening((previous) => ({
        ...(Number(previous?.opening_id) === openingId ? previous : {}),
        ...(data.opening || {}),
      }));
      setStudent((previous) => ({
        ...(Number(previous?.registration_id) === registrationId
          ? previous
          : {}),
        ...(data.student || {}),
      }));
      setSummary(data.summary || {});
      setAttendanceHistory(
        Array.isArray(data.attendance_history) ? data.attendance_history : [],
      );
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary({});
      setAttendanceHistory([]);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải lịch sử điểm danh học viên.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [openingId, registrationId]);

  useEffect(() => {
    if (!courseId || !openingId || !registrationId) {
      return undefined;
    }

    const initialLoadTimer = setTimeout(() => {
      loadAttendance();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
      requestIdRef.current += 1;
    };
  }, [courseId, loadAttendance, openingId, registrationId]);

  const currentSearch = location.search || "";
  const backUrl =
    courseId && openingId
      ? `/admin/reports/courses/${courseId}/openings/${openingId}${currentSearch}`
      : `/admin/reports${currentSearch}`;
  const pageError = !courseId
    ? "ID khóa đào tạo không hợp lệ."
    : !openingId
      ? "ID lớp / đợt tổ chức không hợp lệ."
      : !registrationId
        ? "ID đăng ký học viên không hợp lệ."
        : error;
  const displayedOpening =
    Number(opening?.opening_id) === openingId ? opening : null;
  const displayedStudent =
    Number(student?.registration_id) === registrationId ? student : null;
  const extraStudentInfo = [
    { key: "gender", label: "Giới tính" },
    { key: "user_type", label: "Đối tượng" },
    { key: "company", label: "Đơn vị" },
    { key: "position", label: "Chức vụ" },
    { key: "certificate_no", label: "Số chứng nhận" },
  ].filter((item) =>
    Object.prototype.hasOwnProperty.call(displayedStudent || {}, item.key),
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
      >
        <ArrowLeft size={18} />
        Quay lại danh sách học viên
      </button>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Báo cáo</span>
          <span>/</span>
          <span>Khóa đào tạo</span>
          <span>/</span>
          <span>{navigationCourse?.course_name || "Khóa đào tạo"}</span>
          <span>/</span>
          <span>{displayedOpening?.class_name || "Lớp"}</span>
          <span>/</span>
          <span className="font-medium text-slate-700">
            {displayedStudent?.full_name || "Học viên"}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Lịch sử điểm danh học viên
        </h1>
      </div>

      {displayedStudent && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Thông tin học viên
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StudentInfo label="Họ tên" value={displayedStudent.full_name} />
            <StudentInfo label="Email" value={displayedStudent.email} />
            <StudentInfo label="Điện thoại" value={displayedStudent.phone} />
            <StudentInfo
              label="Trạng thái đăng ký"
              value={getRegistrationStatusLabel(displayedStudent.register_status)}
            />
            {extraStudentInfo.map((item) => (
              <StudentInfo
                key={item.key}
                label={item.label}
                value={displayedStudent[item.key]}
              />
            ))}
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
              Đang tải lịch sử điểm danh...
            </p>
          </div>
        </div>
      ) : !pageError ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Tổng số buổi</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatNumber(summary.total_sessions)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Đã tham dự</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {formatNumber(summary.attended_sessions)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Tỷ lệ tham dự</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatRate(summary.attendance_rate)}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Lịch sử điểm danh
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {attendanceHistory.length} buổi học.
              </p>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Chưa có buổi học trong lớp / đợt tổ chức này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Buổi</th>
                      <th className="px-4 py-3">Ngày</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Địa điểm</th>
                      <th className="px-4 py-3">Phòng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Thời gian check-in</th>
                      <th className="px-4 py-3">Phương thức</th>
                      <th className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceHistory.map((session) => (
                      <tr
                        key={session.session_id}
                        className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {session.session_no !== null &&
                          session.session_no !== undefined
                            ? `Buổi ${session.session_no}`
                            : "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(session.session_date)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatSessionTime(
                            session.start_time,
                            session.end_time,
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(session.location)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(session.room)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              session.checked_in === true
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {session.checked_in === true
                              ? "Đã điểm danh"
                              : "Chưa điểm danh"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDateTime(session.checked_in_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(session.checkin_method)}
                        </td>
                        <td className="max-w-sm whitespace-pre-line px-4 py-4 text-slate-600">
                          {displayValue(session.note)}
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
