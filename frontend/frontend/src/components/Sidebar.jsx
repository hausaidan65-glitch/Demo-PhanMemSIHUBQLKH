import {
  LayoutDashboard,
  BookOpen,
  School,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  X,
  Mail,
  CalendarDays,
  FileSpreadsheet,
  Sprout,
  History,
  RotateCcw,
  ShieldCheck,
  Network,
} from "lucide-react";
import logoSihub from "../assets/logoadmin.png";
import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isStartupActive = location.pathname.startsWith(
    "/admin/startup-connection-day",
  );

  const [startupOpen, setStartupOpen] = useState(isStartupActive);
  const isIncubationActive =
    location.pathname.startsWith("/admin/incubation-programs") ||
    location.pathname.startsWith("/admin/incubation-profiles");

  const [incubationOpen, setIncubationOpen] = useState(isIncubationActive);
  const isTrainingActive =
    location.pathname === "/admin/courses" ||
    location.pathname.startsWith("/admin/classes") ||
    location.pathname.startsWith("/admin/registrations");

  const [trainingOpen, setTrainingOpen] = useState(isTrainingActive);
  let admin = null;

  try {
    admin = JSON.parse(localStorage.getItem("admin_info") || "null");
  } catch {
    admin = null;
  }
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const menus = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: "Import lớp & học viên",
      path: "/admin/import-class-students",
      icon: FileSpreadsheet,
    },
  ];
  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_info");

    navigate("/login", {
      replace: true,
    });
  };

  const getInitials = () => {
    if (!admin?.fullname) {
      return "A";
    }

    const words = admin.fullname.trim().split(/\s+/);

    return words
      .slice(-2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  return (
    <aside
      className={`
        fixed
        inset-y-0
        left-0
        z-50
        flex
        w-64
        flex-col
        bg-slate-950
        text-white
        shadow-2xl
        transition-transform
        duration-300

        ${open ? "translate-x-0" : "-translate-x-full"}

        lg:translate-x-0
      `}
    >
      {/* LOGO */}

      <div
        className="
          flex
          h-[72px]
          shrink-0
          items-center
          justify-between
          border-b
          border-slate-800
          px-5
        "
      >
        <NavLink
          to="/admin"
          onClick={onClose}
          className="
            flex
            items-center
            gap-3
          "
        >
          <img
            src={logoSihub}
            alt="SIHUB"
            className="
    h-12
    w-auto
    object-contain
  "
          />
        </NavLink>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng menu"
          className="
            rounded-lg
            p-2
            text-slate-400
            hover:bg-slate-800
            hover:text-white
            lg:hidden
          "
        >
          <X size={20} />
        </button>
      </div>

      {/* MENU */}

      <nav
        className="
          flex-1
          overflow-y-auto
          px-3
          py-5
        "
      >
        <p
          className="
            mb-3
            px-3
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.16em]
            text-slate-500
          "
        >
          Quản lý hệ thống
        </p>

        <div className="space-y-1">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.name}
                to={menu.path}
                end={menu.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `
                    group
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-medium
                    transition-all

                    ${
                      isActive
                        ? `
                          bg-green-600
                          text-white
                          shadow-lg
                          shadow-green-950/30
                        `
                        : `
                          text-slate-300
                          hover:bg-slate-800
                          hover:text-white
                        `
                    }
                  `
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={19}
                      strokeWidth={2}
                      className={
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-green-400"
                      }
                    />

                    <span className="truncate">{menu.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
          {/* =====================================================
    KHÓA ĐÀO TẠO
===================================================== */}

          <div className="pt-1">
            <div
              className={`
      group
      flex
      min-h-11
      w-full
      items-center
      rounded-xl
      text-sm
      font-medium
      transition-all

      ${
        isTrainingActive
          ? "bg-slate-800 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `}
            >
              {/* BẤM PHẦN NÀY → VÀO TRANG KHÓA ĐÀO TẠO */}
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/courses");

                  if (onClose) {
                    onClose();
                  }
                }}
                className="
        flex
        min-w-0
        flex-1
        items-center
        gap-3
        px-3
        py-2.5
        text-left
      "
              >
                <BookOpen
                  size={19}
                  strokeWidth={2}
                  className={
                    isTrainingActive
                      ? "text-green-400"
                      : "text-slate-400 group-hover:text-green-400"
                  }
                />

                <span className="truncate">Khóa đào tạo</span>
              </button>

              {/* BẤM MŨI TÊN → CHỈ XỔ MENU CON */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  setTrainingOpen((previous) => !previous);
                }}
                aria-label={
                  trainingOpen
                    ? "Thu gọn menu khóa đào tạo"
                    : "Mở menu khóa đào tạo"
                }
                className="
        flex
        h-11
        w-11
        shrink-0
        items-center
        justify-center
        rounded-xl
        text-slate-400
        hover:bg-slate-700
        hover:text-white
      "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`
          h-4
          w-4
          transition-transform
          duration-200

          ${trainingOpen ? "rotate-180" : ""}
        `}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* MENU CON */}

            {trainingOpen && (
              <div className="relative ml-5 mt-1 space-y-1 pl-4">
                {/* Đường dọc menu con */}

                <div
                  className="
          absolute
          bottom-2
          left-0
          top-2
          w-px
          bg-slate-700
        "
                />

                {/* ==============================
          LỚP HỌC
      ============================== */}

                <NavLink
                  to="/admin/classes"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all

            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <School
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Lớp học</span>
                    </>
                  )}
                </NavLink>

                {/* ==============================
          DANH SÁCH HỌC VIÊN
      ============================== */}

                <NavLink
                  to="/admin/registrations"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all

            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <ClipboardList
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Danh sách quản lý học viên</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>
          {/* STARTUP CONNECTION DAY */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setStartupOpen((prev) => !prev)}
              className={`
      group
      flex
      min-h-11
      w-full
      items-center
      gap-3
      rounded-xl
      px-3
      py-2.5
      text-sm
      font-medium
      transition-all
      ${
        isStartupActive
          ? "bg-slate-800 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `}
            >
              <Network
                size={19}
                strokeWidth={2}
                className={
                  isStartupActive
                    ? "text-green-400"
                    : "text-slate-400 group-hover:text-green-400"
                }
              />

              <span className="flex-1 text-left">Startup Connection Day</span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`
        h-4 w-4
        text-slate-400
        transition-transform
        duration-200
        ${startupOpen ? "rotate-180" : ""}
      `}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* MENU CON */}
            {startupOpen && (
              <div className="relative ml-5 mt-1 space-y-1 pl-4">
                {/* Đường nối menu con */}
                <div className="absolute bottom-2 left-0 top-2 w-px bg-slate-700" />

                <NavLink
                  to="/admin/startup-connection-day/exhibitions"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all
            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <School
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Triển lãm</span>
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/admin/startup-connection-day/seminars"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all
            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <CalendarDays
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Hội thảo</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>
          <NavLink
            to="/admin/networking-events"
            onClick={onClose}
            className={({ isActive }) =>
              `
      group
      flex
      min-h-11
      items-center
      gap-3
      rounded-xl
      px-3
      py-2.5
      text-sm
      font-medium
      transition-all
      ${
        isActive
          ? "bg-green-600 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `
            }
          >
            {({ isActive }) => (
              <>
                <Users
                  size={19}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-green-400"
                  }
                />

                <span>Sự kiện kết nối</span>
              </>
            )}
          </NavLink>
          {/* =====================================================
    CHƯƠNG TRÌNH ƯƠM TẠO
===================================================== */}

          <div className="pt-1">
            <div
              className={`
      group
      flex
      min-h-11
      w-full
      items-center
      rounded-xl
      text-sm
      font-medium
      transition-all

      ${
        isIncubationActive
          ? "bg-slate-800 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }
    `}
            >
              {/* BẤM TÊN → VÀO DANH SÁCH CHƯƠNG TRÌNH */}
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/incubation-programs");

                  if (onClose) {
                    onClose();
                  }
                }}
                className="
        flex
        min-w-0
        flex-1
        items-center
        gap-3
        px-3
        py-2.5
        text-left
      "
              >
                <Sprout
                  size={19}
                  strokeWidth={2}
                  className={
                    isIncubationActive
                      ? "text-green-400"
                      : "text-slate-400 group-hover:text-green-400"
                  }
                />

                <span className="truncate">Chương trình ươm tạo</span>
              </button>

              {/* MŨI TÊN → MỞ MENU CON */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  setIncubationOpen((previous) => !previous);
                }}
                aria-label={
                  incubationOpen
                    ? "Thu gọn menu Chương trình ươm tạo"
                    : "Mở menu Chương trình ươm tạo"
                }
                className="
        flex
        h-11
        w-11
        shrink-0
        items-center
        justify-center
        rounded-xl
        text-slate-400
        hover:bg-slate-700
        hover:text-white
      "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`
          h-4
          w-4
          transition-transform
          duration-200

          ${incubationOpen ? "rotate-180" : ""}
        `}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* MENU CON */}
            {incubationOpen && (
              <div className="relative ml-5 mt-1 space-y-1 pl-4">
                {/* Đường dọc */}
                <div
                  className="
          absolute
          bottom-2
          left-0
          top-2
          w-px
          bg-slate-700
        "
                />

                {/* =========================
          CHƯƠNG TRÌNH
      ========================= */}

                <NavLink
                  to="/admin/incubation-programs"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all

            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <Sprout
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Chương trình</span>
                    </>
                  )}
                </NavLink>

                {/* =========================
          DANH SÁCH HỒ SƠ
      ========================= */}

                <NavLink
                  to="/admin/incubation-profiles"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
            group
            relative
            flex
            min-h-10
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-all

            ${
              isActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }
          `
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="
                absolute
                -left-4
                top-1/2
                h-px
                w-4
                bg-slate-700
              "
                      />

                      <ClipboardList
                        size={17}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-green-400"
                        }
                      />

                      <span>Danh sách hồ sơ</span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>
        </div>
        {/* =====================================================
    HỆ THỐNG
===================================================== */}

        <div className="mt-5 border-t border-slate-800 pt-4">
          <p
            className="
      mb-2
      px-3
      text-[11px]
      font-semibold
      uppercase
      tracking-[0.16em]
      text-slate-500
    "
          >
            Hệ thống
          </p>

          {/* AUDIT LOG - SUPER_ADMIN + ADMIN */}
          <NavLink
            to="/admin/activity-logs"
            onClick={onClose}
            className={({ isActive }) =>
              `
        group
        flex
        min-h-11
        items-center
        gap-3
        rounded-xl
        px-3
        py-2.5
        text-sm
        font-medium
        transition-all

        ${
          isActive
            ? "bg-green-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }
      `
            }
          >
            {({ isActive }) => (
              <>
                <History
                  size={19}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-green-400"
                  }
                />

                <span>Nhật ký hoạt động</span>
              </>
            )}
          </NavLink>

          {/* TRASH / RESTORE - SUPER_ADMIN + ADMIN */}
          <NavLink
            to="/admin/trash"
            onClick={onClose}
            className={({ isActive }) =>
              `
        group
        flex
        min-h-11
        items-center
        gap-3
        rounded-xl
        px-3
        py-2.5
        text-sm
        font-medium
        transition-all

        ${
          isActive
            ? "bg-green-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }
      `
            }
          >
            {({ isActive }) => (
              <>
                <RotateCcw
                  size={19}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-green-400"
                  }
                />

                <span>Thùng rác</span>
              </>
            )}
          </NavLink>

          {/* ACCOUNT MANAGEMENT - SUPER_ADMIN ONLY */}
          {isSuperAdmin && (
            <NavLink
              to="/admin/admin-accounts"
              onClick={onClose}
              className={({ isActive }) =>
                `
          group
          flex
          min-h-11
          items-center
          gap-3
          rounded-xl
          px-3
          py-2.5
          text-sm
          font-medium
          transition-all

          ${
            isActive
              ? "bg-green-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }
        `
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheck
                    size={19}
                    className={
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-green-400"
                    }
                  />

                  <span>Tài khoản quản trị</span>
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>

      {/* ADMIN PROFILE */}

      <div
        className="
          shrink-0
          border-t
          border-slate-800
          p-3
        "
      >
        <div
          className="
            mb-2
            flex
            items-center
            gap-3
            rounded-xl
            bg-slate-900
            p-3
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-full
              bg-green-600
              text-sm
              font-bold
              text-white
            "
          >
            {admin?.avatar ? (
              <img
                src={admin.avatar}
                alt={admin.fullname}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              getInitials()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-sm
                font-semibold
                text-white
              "
            >
              {admin?.fullname || "Quản trị viên"}
            </p>

            <p
              className="
                truncate
                text-xs
                text-slate-400
              "
            >
              {admin?.role || "ADMIN"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="
            flex
            w-full
            items-center
            gap-3
            rounded-xl
            px-3
            py-2.5
            text-sm
            font-medium
            text-red-400
            transition
            hover:bg-red-500/10
            hover:text-red-300
          "
        >
          <LogOut size={19} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
