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

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];

export default function ChartRenderer({
  data = [],
  defaultType = "bar",
  allowedTypes = ["bar", "horizontal", "pie", "line"],
}) {
  const [type, setType] = useState(defaultType);
  const labelKey = data[0]?.name ? "name" : "age_group";

  return (
    <div>
      <div
        className="
flex
justify-end
mb-3
"
      >
        <ChartTypeSelector
          value={type}
          onChange={setType}
          allowedTypes={allowedTypes}
        />
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" && (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey={labelKey}
                outerRadius={110}
                label
              >
                {data.map((item, index) => (
                  <Cell
                    key={`${item.name || item.age_group}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />

              <Legend />
            </PieChart>
          )}

          {type === "bar" && (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey={labelKey} />

              <YAxis />

              <Tooltip />

              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          )}

          {type === "horizontal" && (
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 20,
                right: 40,
                left: 20,
                bottom: 20,
              }}
            >
              <XAxis type="number" hide />

              <YAxis
                type="category"
                dataKey={labelKey}
                width={140}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip />

              <Bar
                dataKey="value"
                fill="#16a34a"
                radius={[0, 10, 10, 0]}
                barSize={32}
              >
                <LabelList dataKey="value" position="right" />
              </Bar>
            </BarChart>
          )}

          {type === "line" && (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey={labelKey} />

              <YAxis />

              <Tooltip />

              <Line dataKey="value" stroke="#16a34a" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
