import { Loader2, X } from 'lucide-react';

import {
  displayValue,
  formatDateTime,
  getCheckedInLabel,
  getRegistrationStatusLabel,
} from './networkingReportUtils';

function InfoSection({ title, items }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm font-semibold text-slate-800">
              {displayValue(item.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function NetworkingParticipantDetailModal({
  participant,
  loading,
  error,
  onClose,
}) {
  if (!participant && !loading && !error) return null;

  const hasProject = participant
    ? participant.has_project === true || participant.has_project === 1
      ? 'Có'
      : participant.has_project === false || participant.has_project === 0
        ? 'Không'
        : '—'
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Chi tiết người tham gia
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {displayValue(participant?.full_name)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng chi tiết người tham gia"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-100px)] space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-green-600" size={30} />
                <p className="mt-3 text-sm text-slate-500">
                  Đang tải chi tiết người tham gia...
                </p>
              </div>
            </div>
          ) : participant && !error ? (
            <>
              <InfoSection
                title="Thông tin cá nhân"
                items={[
                  { label: 'Họ và tên', value: participant.full_name },
                  { label: 'Email', value: participant.email },
                  { label: 'Điện thoại', value: participant.phone },
                  { label: 'Giới tính', value: participant.gender },
                  { label: 'Nhóm tuổi', value: participant.age_group },
                  { label: 'Nhóm đối tượng', value: participant.user_type },
                ]}
              />
              <InfoSection
                title="Công việc"
                items={[
                  { label: 'Đơn vị', value: participant.organization },
                  { label: 'Chức vụ', value: participant.position },
                  { label: 'Vai trò', value: participant.role },
                ]}
              />
              <InfoSection
                title="Thông tin dự án"
                items={[
                  { label: 'Có dự án', value: hasProject },
                  { label: 'Lĩnh vực dự án', value: participant.project_field },
                  { label: 'Giai đoạn startup', value: participant.startup_stage },
                  {
                    label: 'Trạng thái lựa chọn chương trình',
                    value: participant.program_selection_status,
                  },
                ]}
              />
              <InfoSection
                title="Nhu cầu / trao đổi"
                items={[
                  { label: 'Nhu cầu hỗ trợ', value: participant.support_needs },
                  {
                    label: 'Câu hỏi cho ban tổ chức',
                    value: participant.organizer_question,
                  },
                  { label: 'Nhu cầu kết nối', value: participant.connection_need },
                  { label: 'Ghi chú', value: participant.note },
                ]}
              />
              <InfoSection
                title="Đăng ký"
                items={[
                  {
                    label: 'Trạng thái đăng ký',
                    value: getRegistrationStatusLabel(
                      participant.registration_status,
                    ),
                  },
                  {
                    label: 'Check-in',
                    value: getCheckedInLabel(participant.checked_in),
                  },
                  {
                    label: 'Thời gian check-in',
                    value: formatDateTime(participant.checked_in_at),
                  },
                  {
                    label: 'Thời gian đăng ký',
                    value: formatDateTime(participant.created_at),
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
