import { Outlet, Link } from "react-router-dom";

import { ChevronDown, Leaf } from "lucide-react";

export default function UserLayout() {
  return (
    <div
      className="
min-h-screen
bg-gray-50
"
    >
      {/* HEADER */}

      <header
        className="
bg-white
shadow-sm
sticky
top:0
z-50
"
      >
        <div
          className="
max-w-7xl
mx-auto
px-6
h-20
flex
items-center
justify-between
"
        >
          {/* LOGO */}

          <Link
            to="/"
            className="
flex
items-center
gap-3
"
          >
            <div
              className="
w-12
h-12
rounded-full
bg-green-600
flex
items-center
justify-center
text-white
"
            >
              <Leaf />
            </div>

            <div>
              <h1
                className="
font-bold
text-2xl
text-green-700
"
              >
                SIHUB
              </h1>

              <p
                className="
text-xs
text-gray-500
"
              >
                Innovation Hub
              </p>
            </div>
          </Link>

          {/* MENU */}

          <nav
            className="
flex
items-center
gap-8
text-gray-700
"
          >
            <Link to="/" className="hover:text-green-600">
              Trang chủ
            </Link>

            <Link to="/about" className="hover:text-green-600">
              Về SIHUB
            </Link>

            <div
              className="
relative
group
"
            >
              <button
                className="
flex
items-center
gap-1
hover:text-green-600
"
              >
                Chương trình
                <ChevronDown size={16} />
              </button>

              <div
                className="
absolute
hidden
group-hover:block
bg-white
shadow-xl
rounded-xl
p-4
w-60
"
              >
                <Link
                  className="
block
py-2
hover:text-green-600
"
                  to="/courses"
                >
                  Khóa học
                </Link>

                <a
                  className="
block
py-2
hover:text-green-600
"
                >
                  Ươm tạo Startup
                </a>

                <a
                  className="
block
py-2
hover:text-green-600
"
                >
                  Cố vấn doanh nghiệp
                </a>
              </div>
            </div>

            <div
              className="
relative
group
"
            >
              <button
                className="
flex
items-center
gap-1
hover:text-green-600
"
              >
                Sự kiện
                <ChevronDown size={16} />
              </button>

              <div
                className="
absolute
hidden
group-hover:block
bg-white
shadow-xl
rounded-xl
p-4
w-60
"
              >
                <Link
                  to="/events"
                  className="
block
py-2
hover:text-green-600
"
                >
                  Hội thảo
                </Link>

                <Link
                  to="/workshops"
                  className="
block
py-2
hover:text-green-600
"
                >
                  Workshop
                </Link>

                <a
                  className="
block
py-2
hover:text-green-600
"
                >
                  Networking
                </a>
              </div>
            </div>

            <Link to="/news" className="hover:text-green-600">
              Tin tức
            </Link>

            <Link
              to="/courses"
              className="
bg-green-600
text-white
px-5
py-2
rounded-full
hover:bg-green-700
"
            >
              Đăng ký ngay
            </Link>
          </nav>
        </div>
      </header>

      {/* CONTENT */}

      <main>
        <Outlet />
      </main>

      {/* FOOTER */}

      <footer
        className="
bg-green-900
text-white
mt-20
"
      >
        <div
          className="
max-w-7xl
mx-auto
p-10
grid
md:grid-cols-3
gap-8
"
        >
          <div>
            <h2
              className="
text-2xl
font-bold
"
            >
              SIHUB
            </h2>

            <p
              className="
mt-3
text-green-100
"
            >
              Kết nối đổi mới sáng tạo và cộng đồng Startup Việt Nam.
            </p>
          </div>

          <div>
            <h3
              className="
font-bold
mb-3
"
            >
              Chương trình
            </h3>

            <p>Khóa học</p>

            <p>Workshop</p>

            <p>Hội thảo</p>
          </div>

          <div>
            <h3
              className="
font-bold
mb-3
"
            >
              Liên hệ
            </h3>

            <p>Sài Gòn Innovation Hub</p>

            <p>TP.HCM</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
