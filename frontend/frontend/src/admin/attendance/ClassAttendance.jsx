import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import axios from "axios";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCcw,
  ScanLine,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parts = String(value).slice(0, 10).split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

function ClassAttendance() {
  const { classId } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const openingFromState = location.state?.opening || null;

  const parentClass = location.state?.parentClass || null;

  const [sessions, setSessions] = useState([]);

  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [attendanceData, setAttendanceData] = useState(null);

  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [qrValue, setQrValue] = useState("");

  const [checkingIn, setCheckingIn] = useState(false);

  const [lastCheckIn, setLastCheckIn] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");

  const token = localStorage.getItem("admin_token");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  // ============================
  // DANH SÁCH BUỔI
  // ============================

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);

      const response = await axios.get(
        `${API_URL}/course-attendance/class/${classId}/sessions`,
        authConfig,
      );

      const rows = response.data?.data || [];

      setSessions(rows);

      setSelectedSessionId((current) => {
        if (current) {
          return current;
        }

        return rows[0]?.id ? String(rows[0].id) : "";
      });
    } catch (error) {
      console.error("Lỗi tải buổi học:", error.response?.data || error);

      setSessions([]);

      alert(
        error.response?.data?.message || "Không thể tải danh sách buổi học.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [classId, authConfig]);

  // ============================
  // DANH SÁCH ĐIỂM DANH
  // ============================

  const fetchAttendance = useCallback(async () => {
    if (!selectedSessionId) {
      setAttendanceData(null);
      return;
    }

    try {
      setAttendanceLoading(true);

      const response = await axios.get(
        `${API_URL}/course-attendance/session/${selectedSessionId}/attendance`,
        authConfig,
      );

      setAttendanceData(response.data?.data || null);
    } catch (error) {
      console.error("Lỗi tải điểm danh:", error.response?.data || error);

      setAttendanceData(null);

      alert(
        error.response?.data?.message || "Không thể tải danh sách điểm danh.",
      );
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedSessionId, authConfig]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ============================
  // CHECK-IN QR
  // ============================

  const handleCheckIn = async () => {
    const value = qrValue.trim();

    if (!selectedSessionId) {
      alert("Vui lòng chọn buổi học.");
      return;
    }

    if (!value) {
      alert("Vui lòng nhập hoặc quét mã QR.");
      return;
    }

    try {
      setCheckingIn(true);

      const response = await axios.post(
        `${API_URL}/course-attendance/check-in`,
        {
          qr_value: value,
          session_id: Number(selectedSessionId),
        },
        authConfig,
      );

      setLastCheckIn({
        success: true,
        message: response.data?.message,
        data: response.data?.data,
      });

      setQrValue("");

      // Sau check-in tải lại cả summary + table
      await Promise.all([fetchAttendance(), fetchSessions()]);
    } catch (error) {
      console.error("Lỗi check-in:", error.response?.data || error);

      setLastCheckIn({
        success: false,

        message: error.response?.data?.message || "Không thể điểm danh.",

        data: null,
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const selectedSession = sessions.find(
    (item) => String(item.id) === String(selectedSessionId),
  );

  const students = attendanceData?.students || [];

  const filteredStudents = students.filter((item) => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    const values = [
      item.student?.fullname,
      item.student?.email,
      item.student?.phone,
      item.student?.company,
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword),
    );
  });

  const summary = attendanceData?.summary || {
    registered: 0,
    checked_in: 0,
    absent: 0,
    rate: 0,
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/classes")}
            className="
              mb-3
              inline-flex
              items-center
              gap-2
              text-sm
              font-semibold
              text-slate-500
              hover:text-green-700
            "
          >
            <ArrowLeft size={18} />
            Quay lại quản lý lớp học
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Điểm danh lớp học
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {openingFromState?.class_name ||
              openingFromState?.intake_name ||
              `Đợt tổ chức #${classId}`}
          </p>

          {parentClass?.class_name && (
            <p className="mt-1 text-xs text-slate-400">
              Lớp: {parentClass.class_name}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            fetchSessions();
            fetchAttendance();
          }}
          disabled={sessionsLoading || attendanceLoading}
          className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-2.5
            text-sm
            font-semibold
            text-slate-700
            hover:bg-slate-50
            disabled:opacity-50
          "
        >
          <RefreshCcw
            size={18}
            className={
              sessionsLoading || attendanceLoading ? "animate-spin" : ""
            }
          />
          Làm mới
        </button>
      </div>

      {/* SESSION */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-xl">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Buổi học
            </label>

            {sessionsLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                <Loader2 size={17} className="animate-spin" />
                Đang tải buổi học...
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Đợt tổ chức này chưa có buổi học.
              </div>
            ) : (
              <select
                value={selectedSessionId}
                onChange={(event) => {
                  setSelectedSessionId(event.target.value);

                  setLastCheckIn(null);
                }}
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-3
                  text-sm
                  outline-none
                  focus:border-green-500
                  focus:ring-4
                  focus:ring-green-100
                "
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    Buổi {session.session_no} -{" "}
                    {formatDate(session.session_date)} -{" "}
                    {formatTime(session.start_time)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedSession && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={17} />
                {formatDate(selectedSession.session_date)}
              </span>

              <span className="inline-flex items-center gap-2">
                <Clock3 size={17} />
                {formatTime(selectedSession.start_time)} -{" "}
                {formatTime(selectedSession.end_time)}
              </span>

              <span className="inline-flex items-center gap-2">
                <MapPin size={17} />
                {selectedSession.location || "Chưa cập nhật"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users size={20} />}
          label="Học viên đăng ký"
          value={summary.registered}
        />

        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Đã điểm danh"
          value={summary.checked_in}
          valueClass="text-green-600"
        />

        <SummaryCard
          icon={<XCircle size={20} />}
          label="Chưa điểm danh"
          value={summary.absent}
          valueClass="text-amber-600"
        />

        <SummaryCard
          icon={<ScanLine size={20} />}
          label="Tỷ lệ tham dự"
          value={`${summary.rate}%`}
          valueClass="text-blue-600"
        />
      </div>

      {/* QR TEST */}

      {selectedSessionId && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Điểm danh QR</h2>

            <p className="mt-1 text-sm text-slate-500">
              Hiện tại có thể dán nội dung QR để kiểm tra. Camera scanner sẽ
              được gắn ở bước tiếp theo.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <input
              value={qrValue}
              onChange={(event) => setQrValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCheckIn();
                }
              }}
              placeholder="SIHUB:CHECKIN:..."
              className="
                min-w-0
                flex-1
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-4
                py-3
                text-sm
                outline-none
                focus:border-green-500
                focus:ring-4
                focus:ring-green-100
              "
            />

            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn || !qrValue.trim()}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-green-600
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                hover:bg-green-700
                disabled:opacity-50
              "
            >
              {checkingIn ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ScanLine size={18} />
              )}

              {checkingIn ? "Đang điểm danh..." : "Điểm danh"}
            </button>
          </div>

          {/* KẾT QUẢ QUÉT GẦN NHẤT */}

          {lastCheckIn && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                lastCheckIn.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {lastCheckIn.success ? (
                  <CheckCircle2
                    size={22}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                ) : (
                  <XCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
                )}

                <div>
                  <p
                    className={`font-semibold ${
                      lastCheckIn.success ? "text-green-800" : "text-red-700"
                    }`}
                  >
                    {lastCheckIn.message}
                  </p>

                  {lastCheckIn.data?.student && (
                    <>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lastCheckIn.data.student.fullname}
                      </p>

                      <p className="text-sm text-slate-600">
                        {lastCheckIn.data.student.email}
                      </p>
                    </>
                  )}

                  {lastCheckIn.data?.attendance?.checked_in_at && (
                    <p className="mt-1 text-xs text-slate-500">
                      Thời gian: {lastCheckIn.data.attendance.checked_in_at}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STUDENTS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách học viên
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {summary.checked_in}/{summary.registered} học viên đã điểm danh.
            </p>
          </div>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search size={17} className="text-slate-400" />

            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Tìm học viên..."
              className="w-64 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Học viên</th>

                <th className="px-5 py-4">Liên hệ</th>

                <th className="px-5 py-4">Đơn vị</th>

                <th className="px-5 py-4">Trạng thái</th>

                <th className="px-5 py-4">Thời gian</th>

                <th className="px-5 py-4">Hình thức</th>
              </tr>
            </thead>

            <tbody>
              {attendanceLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách...
                    </p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có học viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item) => (
                  <tr
                    key={item.registration_id}
                    className="border-t border-slate-100 text-sm hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.student?.fullname || "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Mã đăng ký #{item.registration_id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">
                        {item.student?.email || "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.student?.phone || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">
                        {item.student?.company || "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.student?.position || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {item.attendance?.checked_in ? (
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          Đã điểm danh
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                          Chưa điểm danh
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.attendance?.checked_in_at || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.attendance?.method || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <p className="text-sm font-medium">{label}</p>
      </div>

      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export default ClassAttendance;
