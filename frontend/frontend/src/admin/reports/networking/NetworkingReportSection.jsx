import { Download, Eye, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import networkingReportApi from '../../../services/networkingReportApi';
import NetworkingParticipantDetailModal from './NetworkingParticipantDetailModal';
import NetworkingParticipantsModal from './NetworkingParticipantsModal';
import NetworkingEventListFilters from './NetworkingEventListFilters';
import NetworkingEventExportFieldSelector from './NetworkingEventExportFieldSelector';
import { DEFAULT_NETWORKING_EVENT_EXPORT_FIELDS } from './networkingEventExportFields';
import {
  buildNetworkingEventExportParams,
  filterNetworkingEvents,
  getExactFilterOptions,
  hasActiveNetworkingEventFilter,
  INITIAL_NETWORKING_EVENT_FILTERS,
} from './networkingEventFilterUtils';
import {
  formatWeekPreview,
  formatReportPeriodLabel,
  getDefaultIsoWeek,
  getWeekOptions,
  isValidIsoWeek,
} from '../reportPeriodUtils';
import {
  buildNetworkingSearch,
  buildPeriodParams,
  currentYear,
  displayValue,
  formatDateTime,
  formatNumber,
  getBusinessError,
  getOperationalStatusLabel,
  getPeriodFilters,
} from './networkingReportUtils';

const SUMMARY_ITEMS = [
  ['total_events', 'Tổng sự kiện'],
  ['total_registered', 'Tổng đăng ký hợp lệ'],
  ['total_finished', 'Đã kết thúc'],
  ['total_ongoing', 'Đang diễn ra'],
  ['total_upcoming', 'Sắp tổ chức'],
  ['missing_official_dates', 'Thiếu thời gian tổ chức'],
];
const FIELD_CLASS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100';
const DEFAULT_EXPORT_FILENAME = 'SIHUB_Networking_Report.xlsx';

function getExportPeriodParams(period) {
  if (!period) return null;
  const params = { year: Number(period.year) };
  if (period.type === 'QUARTER') params.quarter = Number(period.quarter);
  if (period.type === 'MONTH') params.month = Number(period.month);
  if (period.type === 'WEEK') params.week = Number(period.week);
  return params;
}

function getDownloadFilename(contentDisposition) {
  const match = String(contentDisposition || '').match(/filename="?([^";]+)"?/i);
  return match?.[1] || DEFAULT_EXPORT_FILENAME;
}

async function getExportErrorMessage(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const payload = JSON.parse(await data.text());
      if (payload?.message) return payload.message;
    } catch {
      // Fall through to the friendly default below.
    }
  }
  return data?.message || 'Không thể xuất báo cáo Excel. Vui lòng thử lại.';
}

export default function NetworkingReportSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => getPeriodFilters(searchParams));
  const [summary, setSummary] = useState({});
  const [period, setPeriod] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [eventFilters, setEventFilters] = useState(INITIAL_NETWORKING_EVENT_FILTERS);
  const [selectedEventExportFields, setSelectedEventExportFields] = useState(
    DEFAULT_NETWORKING_EVENT_EXPORT_FIELDS,
  );
  const [exportingEventScope, setExportingEventScope] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const reportRequestRef = useRef(0);
  const participantsRequestRef = useRef(0);
  const detailRequestRef = useRef(0);

  const filteredEvents = useMemo(
    () => filterNetworkingEvents(events, eventFilters),
    [eventFilters, events],
  );
  const storedStatusOptions = useMemo(
    () => getExactFilterOptions(events, 'stored_status'),
    [events],
  );
  const operationalStatusOptions = useMemo(
    () => getExactFilterOptions(events, 'operational_status'),
    [events],
  );
  const missionOptions = useMemo(
    () => getExactFilterOptions(events, 'mission'),
    [events],
  );
  const hasActiveEventFilter = hasActiveNetworkingEventFilter(eventFilters);

  const loadReport = useCallback(async (params) => {
    const requestId = ++reportRequestRef.current;
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, eventsResponse] = await Promise.all([
        networkingReportApi.getNetworkingSummary(params),
        networkingReportApi.getNetworkingEvents(params),
      ]);
      if (requestId !== reportRequestRef.current) return;
      setSummary(summaryResponse.data?.data?.summary || {});
      setPeriod(summaryResponse.data?.data?.period || null);
      const rows = eventsResponse.data?.data?.events;
      setEvents(Array.isArray(rows) ? rows : []);
    } catch (requestError) {
      if (requestId !== reportRequestRef.current) return;
      setSummary({});
      setPeriod(null);
      setEvents([]);
      setError(getBusinessError(requestError, 'Không thể tải báo cáo sự kiện kết nối.'));
    } finally {
      if (requestId === reportRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextFilters = getPeriodFilters(searchParams);
    const timer = setTimeout(() => {
      setFilters(nextFilters);
      loadReport(buildPeriodParams(nextFilters));
    }, 0);
    return () => {
      clearTimeout(timer);
      reportRequestRef.current += 1;
    };
  }, [loadReport, searchParams]);

  const changePeriodType = (periodType) => setFilters((previous) => ({
    ...previous,
    periodType,
    quarter: periodType === 'QUARTER' ? previous.quarter : '',
    month: periodType === 'MONTH' ? previous.month : '',
    week: periodType === 'WEEK' ? previous.week || String(getDefaultIsoWeek(Number(previous.year))) : '',
  }));
  const applyPeriod = (params) => {
    const nextSearch = buildNetworkingSearch(params);
    if (nextSearch === searchParams.toString()) loadReport(params);
    else setSearchParams(nextSearch);
  };
  const submitPeriod = (event) => {
    event.preventDefault();
    try { applyPeriod(buildPeriodParams(filters)); }
    catch (validationError) { setError(validationError.message); }
  };
  const resetPeriod = () => {
    setFilters({ year: currentYear, periodType: 'YEAR', quarter: '', month: '', week: '' });
    applyPeriod({ year: Number(currentYear) });
  };

  const openParticipants = async (event) => {
    const requestId = ++participantsRequestRef.current;
    setSelectedEvent(event);
    setParticipants([]);
    setParticipantsError('');
    setParticipantsLoading(true);
    try {
      const response = await networkingReportApi.getNetworkingEventParticipants(event.event_id);
      if (requestId !== participantsRequestRef.current) return;
      const data = response.data?.data || {};
      setSelectedEvent(data.event || event);
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
    } catch (requestError) {
      if (requestId !== participantsRequestRef.current) return;
      setParticipantsError(getBusinessError(requestError, 'Không thể tải danh sách người tham gia.'));
    } finally {
      if (requestId === participantsRequestRef.current) setParticipantsLoading(false);
    }
  };

  const openParticipantDetail = async (participant) => {
    const requestId = ++detailRequestRef.current;
    setSelectedParticipant(participant);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await networkingReportApi.getNetworkingParticipantDetail(
        selectedEvent.event_id,
        participant.participant_id,
      );
      if (requestId !== detailRequestRef.current) return;
      setSelectedParticipant(response.data?.data?.participant || participant);
    } catch (requestError) {
      if (requestId !== detailRequestRef.current) return;
      setDetailError(getBusinessError(requestError, 'Không thể tải chi tiết người tham gia.'));
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  };

  const closeParticipants = () => {
    participantsRequestRef.current += 1;
    detailRequestRef.current += 1;
    setSelectedEvent(null);
    setSelectedParticipant(null);
  };
  const closeDetail = () => {
    detailRequestRef.current += 1;
    setSelectedParticipant(null);
    setDetailError('');
    setDetailLoading(false);
  };

  const exportSummary = async () => {
    const params = getExportPeriodParams(period);
    if (!params || exporting) return;

    setExporting(true);
    setExportError('');
    try {
      const response = await networkingReportApi.exportNetworkingSummary(params);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFilename(response.headers?.['content-disposition']);
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

  const exportEventList = async (scope) => {
    const periodParams = getExportPeriodParams(period);
    if (!periodParams || exportingEventScope || !selectedEventExportFields.length) return;

    setExportingEventScope(scope);
    setExportError('');
    try {
      const params = buildNetworkingEventExportParams(
        eventFilters,
        periodParams,
        scope,
      );
      params.fields = selectedEventExportFields.join(',');
      const response = await networkingReportApi.exportNetworkingEvents(params);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFilename(response.headers?.['content-disposition']);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setExportError(await getExportErrorMessage(requestError));
    } finally {
      setExportingEventScope('');
    }
  };

  return (
    <section className="space-y-5 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Báo cáo sự kiện kết nối</h2>
          <p className="mt-1 text-sm text-slate-500">Tổng hợp theo thời gian tổ chức chính thức của sự kiện kết nối.</p>
        </div>
        <button type="button" disabled={loading || !period || exporting} onClick={exportSummary} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {exporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
          {exporting ? 'Đang xuất...' : 'Xuất báo cáo Excel'}
        </button>
      </div>
      <form onSubmit={submitPeriod} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-medium text-slate-700">Năm báo cáo
          <input type="number" min="2000" max="2100" required value={filters.year} onChange={(event) => setFilters((old) => ({ ...old, year: event.target.value, week: old.periodType === 'WEEK' ? String(isValidIsoWeek(Number(event.target.value), Number(old.week)) ? old.week : getDefaultIsoWeek(Number(event.target.value))) : old.week }))} className={`${FIELD_CLASS} mt-2`} />
        </label>
        <label className="text-sm font-medium text-slate-700">Kỳ báo cáo
          <select value={filters.periodType} onChange={(event) => changePeriodType(event.target.value)} className={`${FIELD_CLASS} mt-2`}>
            <option value="YEAR">Năm</option><option value="QUARTER">Quý</option><option value="MONTH">Tháng</option><option value="WEEK">Tuần</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Quý
          <select disabled={filters.periodType !== 'QUARTER'} required={filters.periodType === 'QUARTER'} value={filters.quarter} onChange={(event) => setFilters((old) => ({ ...old, quarter: event.target.value }))} className={`${FIELD_CLASS} mt-2 disabled:bg-slate-100`}>
            <option value="">Chọn quý</option>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>Quý {value}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Tháng
          <select disabled={filters.periodType !== 'MONTH'} required={filters.periodType === 'MONTH'} value={filters.month} onChange={(event) => setFilters((old) => ({ ...old, month: event.target.value }))} className={`${FIELD_CLASS} mt-2 disabled:bg-slate-100`}>
            <option value="">Chọn tháng</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>Tháng {value}</option>)}
          </select>
        </label>
        {filters.periodType === 'WEEK' && <label className="text-sm font-medium text-slate-700">Tuần ISO
          <select required value={filters.week} onChange={(event) => setFilters((old) => ({ ...old, week: event.target.value }))} className={`${FIELD_CLASS} mt-2`}>
            {getWeekOptions(Number(filters.year)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">{formatWeekPreview(Number(filters.year), Number(filters.week))}</span>
        </label>}
        <div className="flex items-end gap-2">
          <button type="submit" disabled={loading} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Xem báo cáo</button>
          <button type="button" disabled={loading} onClick={resetPeriod} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-60">Đặt lại</button>
        </div>
      </form>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {exportError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>}
      {period && !loading && !error && <p className="text-sm text-slate-500">Kỳ báo cáo: {formatReportPeriodLabel(period)} — {formatDateTime(period.start_date)} đến {formatDateTime(period.end_date)}</p>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto animate-spin text-green-600" size={30} /><p className="mt-3 text-sm text-slate-500">Đang tải báo cáo sự kiện kết nối...</p></div></div>
      ) : !error ? <>
        {Number(summary.missing_official_dates) > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Có {formatNumber(summary.missing_official_dates)} sự kiện chưa có đầy đủ thời gian tổ chức chính thức và chưa được tính vào kỳ báo cáo.</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SUMMARY_ITEMS.map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary[key])}</p></div>)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Danh sách sự kiện kết nối</h3>
              <p className="mt-1 text-sm text-slate-500">
                {hasActiveEventFilter
                  ? `Đang hiển thị ${formatNumber(filteredEvents.length)} / ${formatNumber(events.length)} sự kiện kết nối`
                  : `${formatNumber(events.length)} sự kiện kết nối`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NetworkingEventExportFieldSelector selectedFields={selectedEventExportFields} onChange={setSelectedEventExportFields} />
              <button type="button" disabled={!events.length || !selectedEventExportFields.length || Boolean(exportingEventScope)} onClick={() => exportEventList('ALL')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                {exportingEventScope === 'ALL' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exportingEventScope === 'ALL' ? 'Đang xuất...' : 'Xuất tất cả'}
              </button>
              <button type="button" disabled={!hasActiveEventFilter || !filteredEvents.length || !selectedEventExportFields.length || Boolean(exportingEventScope)} onClick={() => exportEventList('FILTERED')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
                {exportingEventScope === 'FILTERED' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                {exportingEventScope === 'FILTERED' ? 'Đang xuất...' : 'Xuất theo bộ lọc'}
              </button>
            </div>
          </div>
          {!selectedEventExportFields.length && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">Vui lòng chọn ít nhất một trường để xuất.</div>}
          <NetworkingEventListFilters
            filters={eventFilters}
            storedStatusOptions={storedStatusOptions}
            operationalStatusOptions={operationalStatusOptions}
            missionOptions={missionOptions}
            onChange={(name, value) => setEventFilters((previous) => ({ ...previous, [name]: value }))}
            onReset={() => setEventFilters(INITIAL_NETWORKING_EVENT_FILTERS)}
          />
          {events.length === 0 ? <div className="px-5 py-14 text-center text-sm text-slate-500">Không có sự kiện kết nối trong kỳ báo cáo này.</div> : filteredEvents.length === 0 ? <div className="px-5 py-14 text-center text-sm text-slate-500">Không có kết quả phù hợp bộ lọc.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1250px]">
            <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Tên sự kiện</th><th className="px-4 py-3">Mã sự kiện</th><th className="px-4 py-3">Nhiệm vụ</th><th className="px-4 py-3">Địa điểm</th><th className="px-4 py-3">Thời gian tổ chức</th><th className="px-4 py-3">Trạng thái hoạt động</th><th className="px-4 py-3 text-center">Đăng ký hợp lệ</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
            <tbody>{filteredEvents.map((event) => <tr key={event.event_id} className="border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50/70"><td className="px-4 py-4 font-semibold text-slate-900">{displayValue(event.event_name)}</td><td className="px-4 py-4 text-slate-600">{displayValue(event.event_code)}</td><td className="px-4 py-4 text-slate-600">{displayValue(event.mission)}</td><td className="px-4 py-4 text-slate-600">{displayValue(event.location)}</td><td className="px-4 py-4 text-slate-600">{formatDateTime(event.start_datetime)} – {formatDateTime(event.end_datetime)}</td><td className="px-4 py-4 text-slate-600">{getOperationalStatusLabel(event.operational_status)}</td><td className="px-4 py-4 text-center font-semibold">{formatNumber(event.total_registered)}</td><td className="px-4 py-4 text-right"><button type="button" title="Xem người tham gia" onClick={() => openParticipants(event)} className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"><Eye size={17} /></button></td></tr>)}</tbody>
          </table></div>}
        </div>
      </> : null}
      <NetworkingParticipantsModal event={selectedEvent} period={period} participants={participants} loading={participantsLoading} error={participantsError} onClose={closeParticipants} onViewDetail={openParticipantDetail} />
      <NetworkingParticipantDetailModal participant={selectedParticipant} loading={detailLoading} error={detailError} onClose={closeDetail} />
    </section>
  );
}
