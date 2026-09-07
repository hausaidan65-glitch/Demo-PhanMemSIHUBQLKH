import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

import { useState } from "react";

import ChartTypeSelector from "./ChartTypeSelector";

const COLORS = [
  "#15803d",
  "#1d4ed8",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#0e7490",
  "#475569",
];

const formatValue = (value) => Number(value || 0).toLocaleString("vi-VN");
const READABLE_ROW_HEIGHT = 34;
const READABLE_VERTICAL_PADDING = 48;
const READABLE_MAX_HEIGHT = 620;

function ReadableCategoryTick({ x, y, payload }) {
  const fullLabel = String(payload?.value || "");
  const words = fullLabel.split(/\s+/).filter(Boolean);
  const lines = [""];
  const maxLineLength = 30;

  words.forEach((word) => {
    const currentLine = lines[lines.length - 1];
    if (currentLine && `${currentLine} ${word}`.length > 26 && lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = currentLine ? `${currentLine} ${word}` : word;
    }
  });
  const displayLines = lines.map((line) =>
    line.length > maxLineLength
      ? `${line.slice(0, maxLineLength - 1).trimEnd()}…`
      : line,
  );

  return (
    <text x={x} y={y} textAnchor="end" fill="#475569" fontSize={12}>
      <title>{fullLabel}</title>
      {displayLines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? -4 : 15}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function AnalyticsTooltip({
  active,
  payload,
  total,
  valueLabel,
  showPercentage,
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload || {};
  const value = Number(payload[0]?.value || 0);
  const name = item.name || item.age_group || "Chưa xác định";
  const rate = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="font-semibold text-slate-800">{name}</p>
      <p className="mt-1 text-sm text-slate-600">
        {value.toLocaleString("vi-VN")} {valueLabel}
      </p>
      {showPercentage && (
        <p className="mt-0.5 text-xs font-medium text-green-600">{rate}%</p>
      )}
    </div>
  );
}

export default function ChartRenderer({
  data = [],
  defaultType = "bar",
  allowedTypes = ["bar", "horizontal", "pie", "line"],
  valueLabel = "học viên",
  showPercentage = true,
  readabilityMode = false,
}) {
  const [type, setType] = useState(defaultType);
  const labelKey = data[0]?.name ? "name" : "age_group";
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const horizontalHeight = Math.max(
    320,
    readabilityMode
      ? data.length * READABLE_ROW_HEIGHT + READABLE_VERTICAL_PADDING
      : data.length * 46,
  );
  const longestLabel = Math.max(
    0,
    ...data.map((item) => String(item[labelKey] || "").length),
  );
  const longestFormattedValue = Math.max(
    0,
    ...data.map((item) => formatValue(item.value).length),
  );
  const categoryChartWidth = Math.max(
    640,
    data.length * (readabilityMode ? 110 : 96),
  );
  const horizontalLabelWidth = readabilityMode
    ? Math.min(320, Math.max(160, longestLabel * 6.5))
    : 140;
  const horizontalRightMargin = readabilityMode
    ? Math.max(80, longestFormattedValue * 8 + 28)
    : 40;
  const tooltip = (
    <Tooltip
      content={
        <AnalyticsTooltip
          total={total}
          valueLabel={valueLabel}
          showPercentage={showPercentage}
        />
      }
    />
  );

  return (
    <div className={readabilityMode ? "min-w-0" : undefined}>
      <div className="mb-3 flex justify-end">
        <ChartTypeSelector
          value={type}
          onChange={setType}
          allowedTypes={allowedTypes}
        />
      </div>

      <div
        className={
          type === "bar" || type === "line"
            ? "w-full overflow-x-auto pb-2"
            : type === "horizontal" && readabilityMode
              ? "w-full overflow-auto pb-2 pr-2"
              : "w-full"
        }
        style={
          type === "horizontal" && readabilityMode
            ? { maxHeight: READABLE_MAX_HEIGHT }
            : undefined
        }
      >
        <div
          className="w-full"
          style={{
            height: type === "horizontal" ? horizontalHeight : readabilityMode ? 340 : 320,
            minWidth:
              type === "bar" || type === "line"
                ? categoryChartWidth
                : type === "horizontal" && readabilityMode
                  ? Math.max(600, horizontalLabelWidth + 360)
                : undefined,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
          {type === "pie" && (
            <PieChart margin={readabilityMode ? { top: 10, right: 20, bottom: 10, left: 20 } : undefined}>
              <Pie
                data={data}
                dataKey="value"
                nameKey={labelKey}
                innerRadius={readabilityMode ? 52 : 0}
                outerRadius={readabilityMode ? 105 : 110}
                paddingAngle={readabilityMode ? 2 : 0}
                labelLine={!readabilityMode}
                label={readabilityMode
                  ? ({ percent }) =>
                      percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                  : true}
              >
                {data.map((item, index) => (
                  <Cell
                    key={`${item.name || item.age_group}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              {tooltip}

              {readabilityMode ? (
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm text-slate-700">{value}</span>
                  )}
                />
              ) : (
                <Legend />
              )}
            </PieChart>
          )}

          {type === "bar" && (
            <BarChart data={data} margin={readabilityMode ? { top: 16, right: 24, left: 8, bottom: 76 } : { top: 8, right: 20, left: 0, bottom: 70 }}>
              <CartesianGrid stroke={readabilityMode ? "#e2e8f0" : undefined} strokeDasharray="3 3" vertical={!readabilityMode} />

              <XAxis dataKey={labelKey} angle={-35} textAnchor="end" interval={0} height={78} tick={{ fontSize: 12 }} />

              <YAxis tickFormatter={readabilityMode ? formatValue : undefined} tick={readabilityMode ? { fontSize: 12 } : undefined} />

              {tooltip}

              <Bar dataKey="value" fill="#2563eb" radius={readabilityMode ? [8, 8, 0, 0] : undefined} maxBarSize={readabilityMode ? 56 : undefined}>
                {readabilityMode && <LabelList dataKey="value" position="top" formatter={formatValue} fill="#475569" fontSize={12} />}
              </Bar>
            </BarChart>
          )}

          {type === "horizontal" && (
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: readabilityMode ? 24 : 20,
                right: horizontalRightMargin,
                left: readabilityMode ? 8 : 20,
                bottom: readabilityMode ? 24 : 20,
              }}
            >
              <XAxis type="number" hide />

              <YAxis
                type="category"
                dataKey={labelKey}
                width={horizontalLabelWidth}
                tickLine={false}
                axisLine={false}
                tick={readabilityMode ? <ReadableCategoryTick /> : undefined}
              />

              {tooltip}

              <Bar
                dataKey="value"
                fill="#16a34a"
                radius={[0, 10, 10, 0]}
                barSize={readabilityMode ? 22 : 32}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={readabilityMode ? 10 : 5}
                  formatter={readabilityMode ? formatValue : undefined}
                  fill={readabilityMode ? "#334155" : undefined}
                  fontSize={readabilityMode ? 12 : undefined}
                  fontWeight={readabilityMode ? 600 : undefined}
                />
              </Bar>
            </BarChart>
          )}

          {type === "line" && (
            <LineChart data={data} margin={readabilityMode ? { top: 16, right: 24, left: 8, bottom: 76 } : { top: 8, right: 20, left: 0, bottom: 70 }}>
              <CartesianGrid stroke={readabilityMode ? "#e2e8f0" : undefined} strokeDasharray="3 3" vertical={!readabilityMode} />

              <XAxis dataKey={labelKey} angle={-35} textAnchor="end" interval={0} height={78} tick={{ fontSize: 12 }} />

              <YAxis tickFormatter={readabilityMode ? formatValue : undefined} tick={readabilityMode ? { fontSize: 12 } : undefined} />

              {tooltip}

              <Line dataKey="value" stroke={readabilityMode ? "#15803d" : "#16a34a"} strokeWidth={readabilityMode ? 3 : undefined} dot={readabilityMode ? { r: 4, fill: "#15803d" } : undefined} activeDot={readabilityMode ? { r: 6 } : undefined} />
            </LineChart>
          )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
