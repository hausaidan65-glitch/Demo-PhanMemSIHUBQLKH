import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function PieChartBox({ data }) {
  return (
    <PieChart width={350} height={300}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label
      >
        {data.map((item, index) => (
          <Cell key={index} />
        ))}
      </Pie>

      <Tooltip />

      <Legend />
    </PieChart>
  );
}
