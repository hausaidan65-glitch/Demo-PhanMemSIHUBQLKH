import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    month: "T1",
    value: 20,
  },

  {
    month: "T2",
    value: 35,
  },

  {
    month: "T3",
    value: 25,
  },

  {
    month: "T4",
    value: 50,
  },

  {
    month: "T5",
    value: 65,
  },

  {
    month: "T6",
    value: 80,
  },
];

export default function RegistrationChart() {
  return (
    <div
      className="
h-80
"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#4f46e5"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
