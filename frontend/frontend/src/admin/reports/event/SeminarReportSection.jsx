import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import eventReportApi from "../../../services/eventReportApi";
import SeminarListFilters from "./SeminarListFilters";
import SeminarReportFilters from "./SeminarReportFilters.jsx";
import {
  filterSeminars,
  getParentFilterOptions,
  getRawFilterOptions,
  INITIAL_SEMINAR_LIST_FILTERS,
} from "./seminarReportFilters";
import {
  buildPeriodParams,
  buildSeminarSearch,
  currentYear,
  displayValue,
  formatDateTime,
  formatNumber,
  getGroupValueLabel,
  getPeriodFilters,
  getStatusLabel,
} from "./eventReportUtils";

const SUMMARY_ITEMS = [
  { key: "total_seminars", label: "Tổng hội thảo" },
  { key: "total_participants", label: "Tổng lượt tham gia" },
];

const STATUS_ITEMS = [
  { key: "open", label: "Đang mở" },
  { key: "closed", label: "Đã đóng" },
  { key: "finished", label: "Đã kết thúc" },
  { key: "draft", label: "Bản nháp" },
];

const GROUP_LABELS = {
  gender: "Giới tính",
  age_group: "Nhóm tuổi",
  user_type: "Nhóm đối tượng",
  project_field: "Lĩnh vực dự án",
  startup_stage: "Giai đoạn khởi nghiệp",
  program_selection_status: "Trạng thái lựa chọn chương trình",
  registration_status: "Trạng thái đăng ký",
  checked_in: "Check-in",
};

export default function SeminarReportSection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    getPeriodFilters(searchParams),
  );
  const [summary, setSummary] = useState({});
  const [period, setPeriod] = useState(null);
  const [seminars, setSeminars] = useState([]);
  const [listFilters, setListFilters] = useState(
    INITIAL_SEMINAR_LIST_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadReport = useCallback(async (params) => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, seminarsResponse] = await Promise.all([
        eventReportApi.getSeminarSummary(params),
        eventReportApi.getSeminars(params),
      ]);
      const summaryData = summaryResponse.data?.data || {};
      const seminarsData = seminarsResponse.data?.data || {};

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary(summaryData);
      setPeriod(summaryData.period || seminarsData.period || null);
      setSeminars(
        Array.isArray(seminarsData.seminars) ? seminarsData.seminars : [],
      );
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary({});
      setPeriod(null);
      setSeminars([]);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Không thể tải báo cáo hội thảo.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
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
      requestIdRef.current += 1;
    };
  }, [loadReport, searchParams]);

  const updateFilter = (name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const changePeriodType = (periodType) => {
    setFilters((previous) => ({
      ...previous,
      periodType,
      quarter: periodType === "QUARTER" ? previous.quarter : "",
      month: periodType === "MONTH" ? previous.month : "",
    }));
  };

  const applyPeriod = (params) => {
    const nextSearch = buildSeminarSearch(params);

    if (nextSearch === searchParams.toString()) {
      loadReport(params);
    } else {
      setSearchParams(nextSearch);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      applyPeriod(buildPeriodParams(filters));
    } catch (validationError) {
      setError(validationError.message);
    }
  };

  const handleReset = () => {
    const nextFilters = {
      year: currentYear,
      periodType: "YEAR",
      quarter: "",
      month: "",
    };

    setFilters(nextFilters);
    applyPeriod({ year: Number(currentYear) });
  };

  const periodSearch = period
    ? buildSeminarSearch({
        year: period.year,
        quarter: period.type === "QUARTER" ? period.quarter : null,
        month: period.type === "MONTH" ? period.month : null,
      })
    : buildSeminarSearch(buildPeriodParams(getPeriodFilters(searchParams)));

  const participantGroups = summary.participant_groups || {};
  const statusOptions = useMemo(
    () => getRawFilterOptions(seminars, "status"),
    [seminars],
  );
  const parentOptions = useMemo(
    () => getParentFilterOptions(seminars),
    [seminars],
  );
  const missionOptions = useMemo(
    () => getRawFilterOptions(seminars, "mission"),
    [seminars],
  );
  const filteredSeminars = useMemo(
    () => filterSeminars(seminars, listFilters),
    [listFilters, seminars],
  );

  const updateListFilter = (name, value) => {
    setListFilters((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <section className="space-y-5 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Báo cáo hội thảo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tổng hợp theo thời gian tổ chức chính thức của hội thảo.
        </p>
      </div>

      <SeminarReportFilters
        filters={filters}
        loading={loading}
        onChange={updateFilter}
        onPeriodTypeChange={changePeriodType}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 size={30} className="mx-auto animate-spin text-green-600" />
            <p className="mt-3 text-sm text-slate-500">
              Đang tải báo cáo hội thảo...
            </p>
          </div>
        </div>
      ) : !error ? (
        <>
          {period && (
            <p className="text-sm text-slate-500">
              Kỳ dữ liệu: {formatDateTime(period.report_start)} đến{" "}
              {formatDateTime(period.report_end)}
            </p>
          )}

          {Number(summary.missing_official_dates) > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Hội thảo thiếu thời gian tổ chức hợp lệ:{" "}
              {formatNumber(summary.missing_official_dates)}
            </div>
          )}

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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STATUS_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatNumber(summary.statuses?.[item.key])}
                </p>
              </div>
            ))}
            {Number(summary.statuses?.other_status_count) > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Trạng thái khác</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatNumber(summary.statuses.other_status_count)}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(GROUP_LABELS).map(([field, label]) => {
              const groups = Array.isArray(participantGroups[field])
                ? participantGroups[field]
                : [];

              return (
                <div
                  key={field}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="font-bold text-slate-900">{label}</h3>
                  {groups.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">Chưa có dữ liệu.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {groups.map((group) => (
                        <div
                          key={String(group.value)}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-slate-600">
                            {getGroupValueLabel(field, group.value)}
                          </span>
                          <strong className="text-slate-900">
                            {formatNumber(group.count)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-bold text-slate-900">Danh sách hội thảo</h3>
              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {formatNumber(filteredSeminars.length)} /{" "}
                {formatNumber(seminars.length)} hội thảo.
              </p>
            </div>

            <SeminarListFilters
              filters={listFilters}
              statusOptions={statusOptions}
              parentOptions={parentOptions}
              missionOptions={missionOptions}
              onChange={updateListFilter}
              onReset={() => setListFilters(INITIAL_SEMINAR_LIST_FILTERS)}
            />

            {seminars.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Chưa có hội thảo trong kỳ báo cáo.
              </div>
            ) : filteredSeminars.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                Không có kết quả phù hợp bộ lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Tên hội thảo</th>
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Triển lãm trực thuộc</th>
                      <th className="px-4 py-3">Nhiệm vụ</th>
                      <th className="px-4 py-3">Địa điểm</th>
                      <th className="px-4 py-3">Bắt đầu</th>
                      <th className="px-4 py-3">Kết thúc</th>
                      <th className="px-4 py-3">Đơn vị tổ chức</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Lượt tham gia</th>
                      <th className="px-4 py-3 text-center">Đã check-in</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeminars.map((seminar) => (
                      <tr
                        key={seminar.seminar_id}
                        className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {displayValue(seminar.event_name)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(seminar.event_code)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(seminar.parent_exhibition_name)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(seminar.mission)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(seminar.location)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDateTime(seminar.start_datetime)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDateTime(seminar.end_datetime)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {displayValue(seminar.organizer)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {getStatusLabel(seminar.status)}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-slate-800">
                          {formatNumber(seminar.total_participants)}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-emerald-700">
                          {formatNumber(seminar.checked_in_participants)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              title="Xem người tham gia hội thảo"
                              onClick={() =>
                                navigate(
                                  `/admin/reports/seminars/${seminar.seminar_id}?${periodSearch}`,
                                  { state: { seminar } },
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
          </div>
        </>
      ) : null}
    </section>
  );
}
