import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import eventReportApi from "../../../services/eventReportApi";
import {
  displayValue,
  formatDateTime,
  getCheckedInLabel,
  getRegistrationStatusLabel,
  getStatusLabel,
  parsePositiveInteger,
} from "./eventReportUtils";

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold text-slate-800">
        {displayValue(value)}
      </p>
    </div>
  );
}

function InfoSection({ title, items }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <InfoItem key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

export default function SeminarParticipantDetailPage() {
  const {
    seminarId: rawSeminarId,
    participantId: rawParticipantId,
  } = useParams();
  const seminarId = parsePositiveInteger(rawSeminarId);
  const participantId = parsePositiveInteger(rawParticipantId);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationSeminar =
    seminarId && Number(location.state?.seminar?.seminar_id) === seminarId
      ? location.state.seminar
      : null;
  const navigationParticipant =
    participantId &&
    Number(location.state?.participant?.participant_id) === participantId
      ? location.state.participant
      : null;
  const [seminar, setSeminar] = useState(navigationSeminar);
  const [participant, setParticipant] = useState(navigationParticipant);
  const [loading, setLoading] = useState(Boolean(seminarId && participantId));
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadDetail = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await eventReportApi.getSeminarParticipantDetail(
        seminarId,
        participantId,
      );
      const data = response.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSeminar(data.seminar || navigationSeminar);
      setParticipant(data.participant || navigationParticipant);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải chi tiết người tham gia hội thảo.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [navigationParticipant, navigationSeminar, participantId, seminarId]);

  useEffect(() => {
    if (!seminarId || !participantId) {
      return undefined;
    }

    const timer = setTimeout(loadDetail, 0);

    return () => {
      clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [loadDetail, participantId, seminarId]);

  const currentSearch = location.search || "";
  const backUrl = seminarId
    ? `/admin/reports/seminars/${seminarId}${currentSearch}`
    : `/admin/reports${currentSearch}`;
  const pageError = !seminarId
    ? "ID hội thảo không hợp lệ."
    : !participantId
      ? "ID người tham gia không hợp lệ."
      : error;
  const seminarName = seminar?.event_name || `Hội thảo #${rawSeminarId}`;
  const participantName = participant?.full_name || "Người tham gia";

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
      >
        <ArrowLeft size={18} />
        Quay lại danh sách người tham gia
      </button>

      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Báo cáo</span>
          <span>/</span>
          <span>Hội thảo</span>
          <span>/</span>
          <span>{seminarName}</span>
          <span>/</span>
          <span className="font-medium text-slate-700">{participantName}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Chi tiết đăng ký và check-in
        </h1>
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
              Đang tải chi tiết người tham gia...
            </p>
          </div>
        </div>
      ) : !pageError && seminar && participant ? (
        <>
          <InfoSection
            title="Hội thảo"
            items={[
              { label: "Tên hội thảo", value: seminar.event_name },
              { label: "Mã", value: seminar.event_code },
              { label: "Bắt đầu", value: formatDateTime(seminar.start_datetime) },
              { label: "Kết thúc", value: formatDateTime(seminar.end_datetime) },
              { label: "Địa điểm", value: seminar.location },
              { label: "Trạng thái", value: getStatusLabel(seminar.status) },
            ]}
          />
          <InfoSection
            title="Người tham gia"
            items={[
              { label: "Họ tên", value: participant.full_name },
              { label: "Email", value: participant.email },
              { label: "Điện thoại", value: participant.phone },
              { label: "Giới tính", value: participant.gender },
              { label: "Nhóm tuổi", value: participant.age_group },
              { label: "Nhóm đối tượng", value: participant.user_type },
              { label: "Đơn vị", value: participant.organization },
              { label: "Chức vụ", value: participant.position },
              { label: "Vai trò", value: participant.participant_role },
            ]}
          />
          <InfoSection
            title="Startup / dự án"
            items={[
              {
                label: "Có dự án",
                value:
                  participant.has_project === 1 || participant.has_project === true
                    ? "Có"
                    : participant.has_project === 0 || participant.has_project === false
                      ? "Không"
                      : "-",
              },
              { label: "Lĩnh vực dự án", value: participant.project_field },
              { label: "Giai đoạn khởi nghiệp", value: participant.startup_stage },
              {
                label: "Trạng thái lựa chọn chương trình",
                value: participant.program_selection_status,
              },
            ]}
          />
          <InfoSection
            title="Đăng ký"
            items={[
              {
                label: "Trạng thái đăng ký",
                value: getRegistrationStatusLabel(participant.registration_status),
              },
              { label: "Nhu cầu hỗ trợ", value: participant.support_needs },
              { label: "Câu hỏi cho ban tổ chức", value: participant.organizer_question },
              { label: "Ghi chú", value: participant.note },
            ]}
          />
          <InfoSection
            title="Check-in"
            items={[
              { label: "Trạng thái", value: getCheckedInLabel(participant.checked_in) },
              { label: "Thời gian check-in", value: formatDateTime(participant.checked_in_at) },
            ]}
          />
        </>
      ) : !pageError ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-500">
          Không có dữ liệu chi tiết người tham gia.
        </div>
      ) : null}
    </div>
  );
}
