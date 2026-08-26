import { Outlet, Link, NavLink } from "react-router-dom";
import {
  ChevronDown,
  CircleUserRound,
  Leaf,
  LogIn,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import logoSihub from "../assets/logo1.png";
import logoSihubfooter from "../assets/logoadmin.png";
import { useEffect, useState } from "react";

export default function UserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const adminToken = localStorage.getItem("admin_token");
  const isAdminLoggedIn = Boolean(adminToken);

  const adminPath = isAdminLoggedIn ? "/admin" : "/login";

  const adminLabel = isAdminLoggedIn
    ? "Vào trang quản trị"
    : "Đăng nhập quản trị";

  const menuClass = ({ isActive }) =>
    `
    transition
    ${
      isActive
        ? "text-green-600 font-semibold"
        : "text-slate-700 hover:text-green-600"
    }
    `;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[90px] max-w-7xl items-center justify-between px-6">
          {/* LOGO */}
          <Link to="/" className="flex shrink-0 items-center">
            <img
              src={logoSihub}
              alt="SIHUB"
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* MENU */}
          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Khóa huấn luyện
            </NavLink>

            <NavLink
              to="/events"
              className={({ isActive }) =>
                `text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Sự kiện
            </NavLink>
            <NavLink
              to="/exhibitions"
              className={({ isActive }) =>
                `text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Triển lãm
            </NavLink>
            <NavLink
              to="/incubation-programs"
              className={({ isActive }) =>
                `whitespace-nowrap text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Chương trình ươm tạo
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap text-[15px] font-medium transition ${
                  isActive
                    ? "font-semibold text-green-600"
                    : "text-slate-600 hover:text-green-600"
                }`
              }
            >
              Về SIHUB
            </NavLink>
          </nav>

          {/* ADMIN BUTTON */}
          <div className="flex shrink-0 items-center">
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-green-300 hover:text-green-600"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
                🛡
              </span>
              Quản trị
            </Link>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}

      <main>
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}

      <footer
        className="
        mt-20
        bg-green-900
        text-white
        "
      >
        <div
          className="
          max-w-7xl
          mx-auto
          px-6
          py-14 
          grid
          md:grid-cols-3
          gap-10
          "
        >
          <div>
            <div
              className="
              flex
              items-center
              gap-3
              "
            >
              <Link
                to="/"
                className="
  flex
  items-center
  "
              >
                <img
                  src={logoSihubfooter}
                  alt="SIHUB"
                  className="
    h-14
    w-auto
    object-contain
    "
                />
              </Link>
            </div>

            <p
              className="
              mt-5
              text-green-100
              leading-7
              "
            >
              Kết nối đổi mới sáng tạo, đào tạo và phát triển cộng đồng Startup
              Việt Nam.
            </p>
          </div>

          <div>
            <h3
              className="
              font-bold
              text-lg
              "
            >
              Khám phá
            </h3>

            <div
              className="
              mt-4
              space-y-3
              text-green-100
              "
            >
              <p>Khóa huấn luyện</p>

              <p>Hội thảo</p>
              <p>Sự kiện kết nối </p>

              <p>Triển lãm </p>
              <p>Chương trình ươm tạo </p>
            </div>
          </div>

          <div>
            <h3
              className="
              font-bold
              text-lg
              "
            >
              Liên hệ
            </h3>

            <div
              className="
              mt-4
              space-y-3
              text-green-100
              "
            >
              <p>Saigon Innovation Hub</p>

              <p>TP. Hồ Chí Minh</p>

              <p>Email: contact@sihub.vn</p>
            </div>
          </div>
        </div>

        <div
          className="
          border-t
          border-green-800
          py-5
          text-center
          text-sm
          text-green-200
          "
        >
          © 2026 SIHUB. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
