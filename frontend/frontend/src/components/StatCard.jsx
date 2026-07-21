import { BookOpen, School, Users, CalendarDays } from "lucide-react";

const icons = {
  "Khóa học": BookOpen,
  "Lớp học": School,
  "Đăng ký": Users,
  "Hôm nay": CalendarDays,
};

const StatCard = ({ title, value, color }) => {
  const Icon = icons[title];

  return (
    <div className="bg-white rounded-xl shadow-md p-5 flex justify-between items-center">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>

        <h2 className="text-3xl font-bold mt-2">{value}</h2>
      </div>

      <div className={`${color} rounded-full p-4 text-white`}>
        <Icon size={28} />
      </div>
    </div>
  );
};

export default StatCard;
