import { useRef, useState } from "react";

import {
  X,
  CalendarDays,
  Users,
  CheckCircle2,
  Clock3,
  BarChart3,
} from "lucide-react";

import { toPng } from "html-to-image";

import ChartRenderer from "./ChartRenderer";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import ChartTypeSelector from "./ChartTypeSelector";

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? 0}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children, className = "" }) {
  return (
    <div
      className={`
        rounded-2xl
        border border-slate-200
        bg-white
        p-5
        shadow-sm
        ${className}
      `}
    >
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
      Chưa có dữ liệu phù hợp.
    </div>
  );
}

const statusLabels = {
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  FINISHED: "Đã kết thúc",
  DRAFT: "Bản nháp",
};
const EVENT_CHART_COLORS = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
  "#65a30d",
  "#ea580c",
  "#0d9488",
  "#4f46e5",
];
const genderLabels = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
  UNKNOWN: "Chưa xác định",
};

const userTypeLabels = {
  STARTUP: "Startup/Dự án",
  BUSINESS: "Doanh nghiệp",
  STUDENT: "Sinh viên",
  UNIVERSITY: "Trường đại học / Viện nghiên cứu",
  OTHER: "Khác",
  UNKNOWN: "Chưa xác định",
};

function relabel(items, labels = {}) {
  return (items || []).map((item) => ({
    ...item,

    name: labels[item.name] || item.name || "Chưa xác định",
  }));
}
function truncateChartLabel(value, maxLength = 34) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function prepareEventChartData(data = []) {
  return [...data]
    .map((item) => ({
      ...item,

      name: String(item?.name || "").trim() || "Chưa xác định",

      value: Number(item?.value) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function EventTooltip({ active, payload }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="max-w-[360px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-semibold leading-5 text-slate-800">
        {item.name}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Số lượng:{" "}
        <span className="font-bold text-green-600">
          {Number(item.value || 0).toLocaleString("vi-VN")}
        </span>
      </p>
    </div>
  );
}
function EventMetricChart({
  data = [],
  valueLabel = "Số lượng",
  entityLabel = "sự kiện",
  defaultType = "horizontal",
}) {
  const [chartType, setChartType] = useState(defaultType);

  const preparedData = prepareEventChartData(data);

  if (preparedData.length === 0) {
    return <EmptyChart />;
  }

  // Pie không nên hiện các mục = 0
  const pieData = preparedData.filter((item) => Number(item.value) > 0);

  const horizontalHeight = Math.max(360, preparedData.length * 48);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40">
      {/* HEADER CỦA CHART */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Có{" "}
            <span className="font-semibold text-slate-700">
              {preparedData.length}
            </span>{" "}
            {entityLabel}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Sắp xếp từ cao xuống thấp
          </p>
        </div>

        <ChartTypeSelector
          value={chartType}
          onChange={setChartType}
          allowedTypes={["horizontal", "bar", "pie"]}
        />
      </div>

      {/* =========================
          THANH NGANG
      ========================== */}
      {chartType === "horizontal" && (
        <div className="max-h-[620px] overflow-y-auto overflow-x-hidden px-2 py-4">
          <div
            style={{
              height: horizontalHeight,
              minWidth: "100%",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preparedData}
                layout="vertical"
                barCategoryGap={10}
                margin={{
                  top: 8,
                  right: 70,
                  bottom: 8,
                  left: 18,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={230}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#475569",
                  }}
                  tickFormatter={(value) => truncateChartLabel(value, 30)}
                />

                <Tooltip
                  content={<EventTooltip />}
                  cursor={{
                    fill: "#f8fafc",
                  }}
                />

                <Bar
                  dataKey="value"
                  name={valueLabel}
                  fill="#16a34a"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={23}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{
                      fontSize: 11,
                      fill: "#64748b",
                      fontWeight: 600,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================
          BIỂU ĐỒ CỘT
      ========================== */}
      {chartType === "bar" && (
        <div className="overflow-x-auto px-4 py-5">
          <div
            style={{
              width: Math.max(760, preparedData.length * 90),
              height: 430,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preparedData}
                margin={{
                  top: 20,
                  right: 25,
                  left: 5,
                  bottom: 100,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                  tickFormatter={(value) => truncateChartLabel(value, 22)}
                />

                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <Tooltip
                  content={<EventTooltip />}
                  cursor={{
                    fill: "#f8fafc",
                  }}
                />

                <Bar
                  dataKey="value"
                  name={valueLabel}
                  fill="#16a34a"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={46}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    style={{
                      fontSize: 11,
                      fill: "#64748b",
                      fontWeight: 600,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================
          BIỂU ĐỒ TRÒN
      ========================== */}
      {chartType === "pie" && (
        <div className="px-4 py-5">
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <div className="h-[430px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={125}
                      paddingAngle={2}
                      labelLine={false}
                      label={({ percent }) =>
                        percent >= 0.04 ? `${Math.round(percent * 100)}%` : ""
                      }
                    >
                      {pieData.map((item, index) => (
                        <Cell
                          key={`${item.name}-${index}`}
                          fill={
                            EVENT_CHART_COLORS[
                              index % EVENT_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<EventTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* LEGEND RIÊNG ĐỂ TÊN DÀI KHÔNG VỠ */}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {pieData.map((item, index) => (
                  <div
                    key={`${item.name}-legend-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            EVENT_CHART_COLORS[
                              index % EVENT_CHART_COLORS.length
                            ],
                        }}
                      />

                      <span
                        className="truncate text-xs text-slate-600"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>

                    <span className="shrink-0 text-xs font-bold text-slate-800">
                      {Number(item.value).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default function EventStatisticsCharts({
  open,
  onClose,
  loading,
  statistics,
}) {
  const chartRef = useRef(null);

  if (!open) {
    return null;
  }

  const type = statistics?.type || "";

  const summary = statistics?.summary || {};

  const charts = statistics?.charts || {};

  const title =
    type === "EXHIBITION"
      ? "Báo cáo Triển lãm"
      : type === "SEMINAR"
        ? "Báo cáo Hội thảo"
        : "Báo cáo Sự kiện kết nối";

  const exportPNG = async () => {
    if (!chartRef.current) {
      return;
    }

    const dataUrl = await toPng(chartRef.current, {
      cacheBust: true,
      backgroundColor: "#fff",
    });

    const link = document.createElement("a");

    link.download = `bao-cao-${type.toLowerCase() || "event"}.png`;

    link.href = dataUrl;

    link.click();
  };

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        ref={chartRef}
        className="mx-auto w-full max-w-7xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

            <p className="mt-1 text-sm text-slate-500">
              Số liệu được tính theo bộ lọc đang áp dụng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportPNG}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Xuất PNG
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[600px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

              <p className="mt-4 text-sm text-slate-500">
                Đang tổng hợp số liệu...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* SUMMARY */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={
                  type === "EXHIBITION"
                    ? "Tổng triển lãm"
                    : type === "SEMINAR"
                      ? "Tổng hội thảo"
                      : "Tổng sự kiện"
                }
                value={summary.total_events || 0}
                icon={CalendarDays}
              />

              <StatCard
                title="Đang mở"
                value={summary.open || 0}
                icon={CheckCircle2}
              />

              <StatCard
                title={
                  type === "EXHIBITION" ? "Phản hồi khảo sát" : "Người tham dự"
                }
                value={
                  type === "EXHIBITION"
                    ? summary.total_surveys || 0
                    : summary.total_participants || 0
                }
                icon={Users}
              />

              <StatCard
                title={type === "EXHIBITION" ? "Tổng khách ghé" : "Đã kết thúc"}
                value={
                  type === "EXHIBITION"
                    ? summary.total_visitors || 0
                    : summary.finished || 0
                }
                icon={Clock3}
              />
            </div>

            {/* EVENT COUNT */}

            <ChartCard
              title={
                type === "EXHIBITION"
                  ? "Phản hồi theo Triển lãm"
                  : type === "SEMINAR"
                    ? "Người tham dự theo Hội thảo"
                    : "Người tham dự theo Sự kiện kết nối"
              }
              description={
                type === "EXHIBITION"
                  ? "So sánh số phản hồi khảo sát giữa các Triển lãm."
                  : type === "SEMINAR"
                    ? "So sánh lượng người tham dự giữa các Hội thảo."
                    : "So sánh lượng người tham dự giữa các Sự kiện kết nối."
              }
            >
              <EventMetricChart
                data={
                  type === "EXHIBITION"
                    ? charts.surveys_by_event
                    : charts.events
                }
                valueLabel={
                  type === "EXHIBITION" ? "Phản hồi" : "Người tham dự"
                }
                entityLabel={
                  type === "EXHIBITION"
                    ? "triển lãm"
                    : type === "SEMINAR"
                      ? "hội thảo"
                      : "sự kiện"
                }
                defaultType="horizontal"
              />
            </ChartCard>
            {type === "EXHIBITION" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard
                  title="Khách tham quan"
                  description="Tổng khách ghé theo từng Triển lãm."
                >
                  <EventMetricChart
                    data={charts.visitors_by_event}
                    valueLabel="Khách tham quan"
                    entityLabel="triển lãm"
                    defaultType="horizontal"
                  />
                </ChartCard>

                <ChartCard
                  title="Kết nối B2B"
                  description="Số lượt kết nối B2B theo Triển lãm."
                >
                  <EventMetricChart
                    data={charts.b2b_by_event}
                    valueLabel="Kết nối B2B"
                    entityLabel="triển lãm"
                    defaultType="horizontal"
                  />
                </ChartCard>
              </div>
            )}

            {type !== "EXHIBITION" && (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <ChartCard
                    title="Giới tính"
                    description="Phân bố người tham dự theo giới tính."
                  >
                    {!charts.genders?.length ? (
                      <EmptyChart />
                    ) : (
                      <div className="h-[340px]">
                        <ChartRenderer
                          data={relabel(charts.genders, genderLabels)}
                          defaultType="pie"
                          allowedTypes={["pie", "bar", "horizontal"]}
                        />
                      </div>
                    )}
                  </ChartCard>

                  <ChartCard
                    title="Nhóm đối tượng"
                    description="Phân bố người tham dự theo nhóm đối tượng."
                  >
                    {!charts.user_types?.length ? (
                      <EmptyChart />
                    ) : (
                      <div className="h-[340px]">
                        <ChartRenderer
                          data={relabel(charts.user_types, userTypeLabels)}
                          defaultType="pie"
                          allowedTypes={["pie", "bar", "horizontal"]}
                        />
                      </div>
                    )}
                  </ChartCard>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <ChartCard
                    title="Lĩnh vực dự án"
                    description="Phân bố theo lĩnh vực dự án."
                  >
                    {!charts.project_fields?.length ? (
                      <EmptyChart />
                    ) : (
                      <div
                        style={{
                          height: Math.max(
                            340,
                            charts.project_fields.length * 45,
                          ),
                        }}
                      >
                        <ChartRenderer
                          data={charts.project_fields}
                          defaultType="horizontal"
                          allowedTypes={["horizontal", "bar", "pie"]}
                        />
                      </div>
                    )}
                  </ChartCard>

                  <ChartCard
                    title="Giai đoạn Startup"
                    description="Phân bố theo giai đoạn phát triển."
                  >
                    {!charts.startup_stages?.length ? (
                      <EmptyChart />
                    ) : (
                      <div className="h-[340px]">
                        <ChartRenderer
                          data={charts.startup_stages}
                          defaultType="pie"
                          allowedTypes={["pie", "bar", "horizontal"]}
                        />
                      </div>
                    )}
                  </ChartCard>
                </div>

                <ChartCard
                  title="Đăng ký theo thời gian"
                  description="Xu hướng đăng ký tham gia."
                >
                  {!charts.timeline?.length ? (
                    <EmptyChart />
                  ) : (
                    <div className="h-[350px]">
                      <ChartRenderer
                        data={charts.timeline}
                        defaultType="line"
                        allowedTypes={["line", "bar"]}
                      />
                    </div>
                  )}
                </ChartCard>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
