import {
  LayoutDashboard,
  BookOpen,
  School,
  Users,
  ClipboardList,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menus = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: <LayoutDashboard />,
    },

    {
      name: "Khóa học",
      path: "/admin/courses",
      icon: <BookOpen />,
    },

    {
      name: "Lớp học",
      path: "/admin/classes",
      icon: <School />,
    },

    {
      name: "Học viên",
      path: "/admin/users",
      icon: <Users />,
    },

    {
      name: "Đăng ký",
      path: "/admin/registrations",
      icon: <ClipboardList />,
    },

    {
      name: "Cài đặt",
      path: "#",
      icon: <Settings />,
    },
  ];

  return (
    <aside
      className="
fixed
left-0
top-0
w-64
h-screen
bg-slate-900
text-white
"
    >
      <div
        className="
h-20
flex
items-center
justify-center
border-b
border-slate-700
"
      >
        <h1
          className="
text-2xl
font-bold
"
        >
          SIHUB
          <span className="text-blue-400">ADMIN</span>
        </h1>
      </div>

      <div className="p-4">
        {menus.map((menu) => (
          <NavLink
            key={menu.name}
            to={menu.path}
            className={({ isActive }) =>
              `
flex
items-center
gap-3
px-4
py-3
mb-2
rounded-lg

${isActive ? "bg-blue-600" : "hover:bg-slate-800"}

`
            }
          >
            {menu.icon}

            <span>{menu.name}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
