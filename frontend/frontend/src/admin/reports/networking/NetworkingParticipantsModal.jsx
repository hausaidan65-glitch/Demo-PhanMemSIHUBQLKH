import { useMemo, useState } from 'react';
import { Download, Eye, Loader2, X } from 'lucide-react';

import networkingReportApi from '../../../services/networkingReportApi';
import NetworkingExportFieldSelector from './NetworkingExportFieldSelector';
import { DEFAULT_NETWORKING_EXPORT_FIELDS } from './networkingExportFields';
import {
  INITIAL_NETWORKING_PARTICIPANT_FILTERS,
  UNKNOWN_FILTER_VALUE,
  buildNetworkingParticipantExportParams,
  filterNetworkingParticipants,
  getFilterOptions,
} from './networkingParticipantFilters';

import {
  displayValue,
  formatDateTime,
  getCheckedInLabel,
  getOperationalStatusLabel,
  getRegistrationStatusLabel,
} from './networkingReportUtils';

const OPTION_FIELDS = [
  ['registration_status', 'registrationStatus'], ['user_type', 'userType'],
  ['gender', 'gender'], ['age_group', 'ageGroup'], ['organization', 'organization'],
  ['position', 'position'], ['role', 'role'],
];

export default function NetworkingParticipantsModal({
  event,
  period,
  participants,
  loading,
  error,
  onClose,
  onViewDetail,
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [filters, setFilters] = useState(INITIAL_NETWORKING_PARTICIPANT_FILTERS);
  const [selectedFields, setSelectedFields] = useState([
    ...DEFAULT_NETWORKING_EXPORT_FIELDS,
  ]);

  const filteredParticipants = useMemo(
    () => filterNetworkingParticipants(participants, filters),
    [participants, filters],
  );
  const hasActiveFilters = Object.values(filters).some((value) => value !== '');
  const filterOptions = useMemo(
    () => Object.fromEntries(OPTION_FIELDS.map(([field, key]) => [key, getFilterOptions(participants, field)])),
    [participants],
  );

  if (!event) return null;

  const getDownloadFilename = (contentDisposition) => {
    const match = String(contentDisposition || '').match(
      /filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i,
    );
    return String(match?.[1] || match?.[2] || '').trim() ||
      `networking-participants-${event.event_id}.xlsx`;
  };

  const getExportErrorMessage = async (requestError) => {
    const errorData = requestError.response?.data;
    if (errorData instanceof Blob) {
      try {
        const parsed = JSON.parse(await errorData.text());
        if (parsed?.message) return parsed.message;
      } catch {
        return 'Không thể xuất danh sách người tham gia. Vui lòng thử lại.';
      }
    }
    return errorData?.message ||
      'Không thể xuất danh sách người tham gia. Vui lòng thử lại.';
  };

  const exportParticipants = async (scope) => {
    setExporting(true);
    setExportError('');
    try {
      const response = await networkingReportApi.exportNetworkingEventParticipants(
        event.event_id,
        buildNetworkingParticipantExportParams(
          filters,
          period,
          scope,
          selectedFields,
        ),
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFilename(
        response.headers?.['content-disposition'],
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setExportError(await getExportErrorMessage(requestError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Người tham gia sự kiện
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {displayValue(event.event_name)} · {displayValue(event.event_code)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(event.start_datetime)} –{' '}
              {formatDateTime(event.end_datetime)} · {displayValue(event.location)} ·{' '}
              {getOperationalStatusLabel(event.operational_status)}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700" aria-live="polite">
              {hasActiveFilters
                ? `Đang hiển thị ${filteredParticipants.length.toLocaleString('vi-VN')} / ${participants.length.toLocaleString('vi-VN')} người tham gia`
                : `${participants.length.toLocaleString('vi-VN')} người tham gia`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <NetworkingExportFieldSelector selectedFields={selectedFields} onChange={setSelectedFields} />
            <button
              type="button"
              disabled={loading || participants.length === 0 || exporting || selectedFields.length === 0}
              onClick={() => exportParticipants('ALL')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              Xuất tất cả
            </button>
            <button
              type="button"
              disabled={loading || !hasActiveFilters || exporting || selectedFields.length === 0}
              onClick={() => exportParticipants('FILTERED')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              Xuất theo bộ lọc
            </button>
            <button
              type="button"
              aria-label="Đóng danh sách người tham gia"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-110px)] overflow-auto">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <label className="text-xs font-semibold text-slate-600">Từ khóa
                <input value={filters.keyword} onChange={(event) => setFilters((old) => ({ ...old, keyword: event.target.value }))} placeholder="Tên, email, SĐT..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <FilterSelect label="Trạng thái đăng ký" value={filters.registrationStatus} onChange={(value) => setFilters((old) => ({ ...old, registrationStatus: value }))} options={filterOptions.registrationStatus} />
              <label className="text-xs font-semibold text-slate-600">Check-in
                <select value={filters.checkedIn} onChange={(event) => setFilters((old) => ({ ...old, checkedIn: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"><option value="">Tất cả</option><option value="CHECKED">Đã check-in</option><option value="UNCHECKED">Chưa check-in</option><option value="UNKNOWN">Không xác định</option></select>
              </label>
              <FilterSelect label="Nhóm đối tượng" value={filters.userType} onChange={(value) => setFilters((old) => ({ ...old, userType: value }))} options={filterOptions.userType} />
              <FilterSelect label="Giới tính" value={filters.gender} onChange={(value) => setFilters((old) => ({ ...old, gender: value }))} options={filterOptions.gender} />
              <FilterSelect label="Nhóm tuổi" value={filters.ageGroup} onChange={(value) => setFilters((old) => ({ ...old, ageGroup: value }))} options={filterOptions.ageGroup} />
              <FilterSelect label="Đơn vị" value={filters.organization} onChange={(value) => setFilters((old) => ({ ...old, organization: value }))} options={filterOptions.organization} />
              <FilterSelect label="Chức vụ" value={filters.position} onChange={(value) => setFilters((old) => ({ ...old, position: value }))} options={filterOptions.position} />
              <FilterSelect label="Vai trò" value={filters.role} onChange={(value) => setFilters((old) => ({ ...old, role: value }))} options={filterOptions.role} />
              <div className="flex items-end"><button type="button" disabled={!hasActiveFilters} onClick={() => setFilters(INITIAL_NETWORKING_PARTICIPANT_FILTERS)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Đặt lại bộ lọc</button></div>
            </div>
          </div>
          {exportError && (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {exportError}
            </div>
          )}
          {error && (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-green-600" size={30} />
                <p className="mt-3 text-sm text-slate-500">
                  Đang tải danh sách người tham gia...
                </p>
              </div>
            </div>
          ) : !error && participants.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Chưa có người tham gia cho sự kiện này.
            </div>
          ) : !error && filteredParticipants.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Không có người tham gia khớp bộ lọc.</div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px]">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Đơn vị</th>
                    <th className="px-4 py-3">Chức vụ</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Nhóm đối tượng</th>
                    <th className="px-4 py-3">Giới tính</th>
                    <th className="px-4 py-3">Nhóm tuổi</th>
                    <th className="px-4 py-3">Trạng thái đăng ký</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr
                      key={participant.participant_id}
                      className="border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {displayValue(participant.full_name)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.organization)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.position)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.role)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.user_type)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.gender)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {displayValue(participant.age_group)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          participant.registration_status === 'CANCELLED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {getRegistrationStatusLabel(
                            participant.registration_status,
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {getCheckedInLabel(participant.checked_in)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => onViewDetail(participant)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="text-xs font-semibold text-slate-600">{label}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal">
      <option value="">Tất cả</option>
      {options.values.map((option) => <option key={option} value={option}>{option}</option>)}
      {options.hasUnknown && <option value={UNKNOWN_FILTER_VALUE}>Không xác định</option>}
    </select>
  </label>;
}
