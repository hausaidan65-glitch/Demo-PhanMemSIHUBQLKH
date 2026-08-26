export default function ChartTypeSelector({
  value,
  onChange,
  allowedTypes = ["pie", "bar", "horizontal", "line"],
}) {
  const options = [
    {
      value: "pie",
      label: "Biểu đồ tròn",
    },
    {
      value: "bar",
      label: "Biểu đồ cột",
    },
    {
      value: "horizontal",
      label: "Thanh ngang",
    },
    {
      value: "line",
      label: "Biểu đồ đường",
    },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
            border
            rounded-lg
            px-3
            py-1.5
            text-sm
            bg-white
            "
    >
      {options
        .filter((item) => allowedTypes.includes(item.value))
        .map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
    </select>
  );
}
