export default function ChartCard({ title, children }) {
  return (
    <div
      className="
        rounded-2xl
        bg-white
        p-5
        shadow
        border
        "
    >
      <h2
        className="
            mb-4
            text-lg
            font-bold
            text-slate-800
            "
      >
        {title}
      </h2>

      <div>{children}</div>
    </div>
  );
}
