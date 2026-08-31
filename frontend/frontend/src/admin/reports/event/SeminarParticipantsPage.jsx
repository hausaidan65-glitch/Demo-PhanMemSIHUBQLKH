import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import eventReportApi from "../../../services/eventReportApi";
import SeminarParticipantFilters from "./SeminarParticipantFilters";
import {
  filterParticipants,
  buildParticipantExportParams,
  getCheckInOptions,
  getRawFilterOptions,
  INITIAL_PARTICIPANT_FILTERS,
} from "./seminarReportFilters";
import {
  displayValue,
  formatDateTime,
  getCheckedInLabel,
  getRegistrationStatusLabel,
  parsePositiveInteger,
} from "./eventReportUtils";

export default function SeminarParticipantsPage() {
  const { seminarId: rawSeminarId } = useParams();
  const seminarId = parsePositiveInteger(rawSeminarId);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationSeminar =
    seminarId && Number(location.state?.seminar?.seminar_id) === seminarId
      ? location.state.seminar
      : null;
  const [seminar, setSeminar] = useState(navigationSeminar);
  const [participants, setParticipants] = useState([]);
  const [filters, setFilters] = useState(INITIAL_PARTICIPANT_FILTERS);
  const [loading, setLoading] = useState(Boolean(seminarId));
  const [error, setError] = useState("");
  const [exportingScope, setExportingScope] = useState("");
  const [exportError, setExportError] = useState("");
  const requestIdRef = useRef(0);

  const loadParticipants = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await eventReportApi.getSeminarParticipants(seminarId);
      const data = response.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSeminar(data.seminar || navigationSeminar);
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setParticipants([]);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải danh sách người tham gia hội thảo.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [navigationSeminar, seminarId]);

  useEffect(() => {
    if (!seminarId) {
      return undefined;
    }

    const timer = setTimeout(loadParticipants, 0);

    return () => {
      clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [loadParticipants, seminarId]);

  const currentSearch = location.search || "";
  const backUrl = `/admin/reports${currentSearch}`;
  const pageError = seminarId ? error : "ID hội thảo không hợp lệ.";
  const seminarName = seminar?.event_name || `Hội thảo #${rawSeminarId}`;
  const registrationStatusOptions = useMemo(
    () => getRawFilterOptions(participants, "registration_status"),
    [participants],
  );
  const checkInOptions = useMemo(
    () => getCheckInOptions(participants),
    [participants],
  );
  const userTypeOptions = useMemo(
    () => getRawFilterOptions(participants, "user_type"),
    [participants],
  );
  const genderOptions = useMemo(
    () => getRawFilterOptions(participants, "gender"),
    [participants],
  );
  const filteredParticipants = useMemo(
    () => filterParticipants(participants, filters),
    [filters, participants],
  );

  const updateFilter = (name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleExport = async (scope) => {
    setExportingScope(scope);
    setExportError("");

    try {
      const params = buildParticipantExportParams(
        filters,
        new URLSearchParams(location.search),
        scope,
      );
      const response = await eventReportApi.exportSeminarParticipants(
        seminarId,
        params,
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `seminar-participants-${seminarId}-${scope.toLowerCase()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setExportError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể xuất danh sách người tham gia.",
      );
    } finally {
      setExportingScope("");
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
        Quay lại báo cáo hội thảo
      </button>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Báo cáo</span>
          <span>/</span>
          <span>Hội thảo</span>
          <span>/</span>
          <span className="font-medium text-slate-700">{seminarName}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Người tham gia hội thảo
        </h1>
        {seminar && (
          <p className="mt-2 text-sm text-slate-500">
            {displayValue(seminar.event_code)} ·{" "}
            {formatDateTime(seminar.start_datetime)} ·{" "}
            {displayValue(seminar.location)}
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
            <Loader2 size={32} className="mx-auto animate-spin text-green-600" />
            <p className="mt-3 text-sm text-slate-500">
              Đang tải người tham gia...
            </p>
          </div>
        </div>
      ) : !pageError ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách người tham gia
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {filteredParticipants.length.toLocaleString("vi-VN")} /{" "}
                {participants.length.toLocaleString("vi-VN")} người tham gia.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(exportingScope)}
                onClick={() => handleExport("ALL")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingScope === "ALL" ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Download size={17} />
                )}
                {exportingScope === "ALL" ? "Đang xuất..." : "Xuất tất cả"}
              </button>
              <button
                type="button"
                disabled={Boolean(exportingScope)}
                onClick={() => handleExport("FILTERED")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingScope === "FILTERED" ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Download size={17} />
                )}
                {exportingScope === "FILTERED"
                  ? "Đang xuất..."
                  : "Xuất theo bộ lọc"}
              </button>
            </div>
          </div>

          {exportError && (
            <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {exportError}
            </div>
          )}

          <SeminarParticipantFilters
            filters={filters}
            registrationStatusOptions={registrationStatusOptions}
            checkInOptions={checkInOptions}
            userTypeOptions={userTypeOptions}
            genderOptions={genderOptions}
            onChange={updateFilter}
            onReset={() => setFilters(INITIAL_PARTICIPANT_FILTERS)}
          />

          {participants.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-slate-500">
              Chưa có người tham gia.
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-slate-500">
              Không có kết quả phù hợp bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Điện thoại</th>
                    <th className="px-4 py-3">Giới tính</th>
                    <th className="px-4 py-3">Nhóm tuổi</th>
                    <th className="px-4 py-3">Nhóm đối tượng</th>
                    <th className="px-4 py-3">Đơn vị</th>
                    <th className="px-4 py-3">Chức vụ</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái đăng ký</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Thời gian check-in</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr
                      key={participant.participant_id}
                      className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {displayValue(participant.full_name)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.email)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.phone)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.gender)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.age_group)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.user_type)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.organization)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.position)}</td>
                      <td className="px-4 py-4 text-slate-600">{displayValue(participant.participant_role)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {getRegistrationStatusLabel(participant.registration_status)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {getCheckedInLabel(participant.checked_in)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDateTime(participant.checked_in_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            title="Xem chi tiết người tham gia"
                            onClick={() =>
                              navigate(
                                `/admin/reports/seminars/${seminarId}/participants/${participant.participant_id}${currentSearch}`,
                                { state: { seminar, participant } },
                              )
                            }
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
      ) : null}
    </div>
  );
}
