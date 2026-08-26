import { BookOpen, GraduationCap, Users, ClipboardCheck } from "lucide-react";

const icons = {
  "Khóa học": BookOpen,

  "Lớp học": GraduationCap,

  "Học viên đăng ký": Users,

  "Đăng ký": Users,

  "Đăng ký hôm nay": ClipboardCheck,

  "Hôm nay": ClipboardCheck,
};

const StatCard = ({ title, value, color }) => {
  const Icon = icons[title] || BookOpen;

  return (
    <div
      className="
            bg-white
            rounded-3xl
            border
            border-slate-100
            shadow-sm
            p-6
            flex
            justify-between
            items-center
            hover:shadow-lg
            transition
            "
    >
      <div>
        <p
          className="
                    text-slate-500
                    text-sm
                    "
        >
          {title}
        </p>

        <h2
          className="
                    text-4xl
                    font-bold
                    mt-3
                    text-slate-900
                    "
        >
          {value}
        </h2>
      </div>

      <div
        className={`
                ${color}
                rounded-2xl
                p-4
                text-white
                `}
      >
        <Icon size={28} />
      </div>
    </div>
  );
};

export default StatCard;
