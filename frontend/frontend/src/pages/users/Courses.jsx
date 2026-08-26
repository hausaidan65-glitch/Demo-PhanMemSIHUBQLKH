import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  Search,
  BookOpen,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  GraduationCap,
  RotateCcw,
} from "lucide-react";

import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

export default function Courses() {
  const [sort, setSort] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const courseListRef = useRef(null);
  const coursesPerPage = 9;
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [audience, setAudience] = useState("");

  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_URL}/courses`);

      setCourses(res.data.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const changePage = (page) => {
    setCurrentPage(page);

    setTimeout(() => {
      courseListRef.current?.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });
    }, 100);
  };
  const filteredCourses = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    let result = courses.filter((course) => {
      const matchSearch =
        !keyword ||
        [
          course.course_name,
          course.program_name,
          course.target_audience,
          course.duration,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchAudience =
        !audience ||
        course.target_audience?.toLowerCase().includes(audience.toLowerCase());

      const matchStatus = !status || course.status === status;

      return matchSearch && matchAudience && matchStatus;
    });

    if (sort === "newest") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (sort === "popular") {
      result.sort((a, b) => (b.total_classes || 0) - (a.total_classes || 0));
    }

    return result;
  }, [courses, search, audience, status, sort]);

  useEffect(() => {
    setCurrentPage(1);

    courseListRef.current?.scrollIntoView({
      behavior: "smooth",

      block: "start",
    });
  }, [search, audience, status]);

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  const currentCourses = filteredCourses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage,
  );

  const resetFilter = () => {
    setSearch("");

    setAudience("");

    setStatus("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}

      <section
        className="
bg-gradient-to-br
from-green-800
via-green-700
to-emerald-500
text-white
"
      >
        <div
          className="
max-w-7xl
mx-auto
px-6
py-20
"
        >
          <div
            className="
max-w-3xl
"
          >
            <div
              className="
inline-flex
items-center
gap-2
bg-white/20
px-4
py-2
rounded-full
"
            >
              <Sparkles size={16} />
              Chương trình đào tạo SIHUB
            </div>

            <h1
              className="
mt-6
text-5xl
font-bold
leading-tight
"
            >
              Khám phá khóa học
              <br />
              Phát triển năng lực đổi mới
            </h1>

            <p
              className="
mt-5
text-green-100
text-lg
leading-8
"
            >
              Các chương trình đào tạo dành cho Startup, sinh viên và doanh
              nghiệp.
            </p>
          </div>
        </div>
      </section>

      <section
        className="
max-w-7xl
mx-auto
px-6
py-16
"
      >
        <div
          className="
flex
justify-between
items-center
"
        >
          <div>
            <h2
              className="
text-4xl
font-bold
"
            >
              Khóa học SIHUB
            </h2>

            <p
              className="
mt-2
text-slate-500
"
            >
              Tìm chương trình phù hợp với mục tiêu của bạn.
            </p>
          </div>

          <button
            onClick={resetFilter}
            className="
flex
items-center
gap-2
text-green-600
font-semibold
"
          >
            <RotateCcw size={18} />
            Xóa bộ lọc
          </button>
        </div>

        {/* FILTER */}

        <div
          className="
mt-10
bg-white
rounded-3xl
p-6
border
border-slate-100
shadow-sm
"
        >
          {/* SEARCH */}

          <div className="relative">
            <Search
              className="
absolute
left-4
top-1/2
-translate-y-1/2
text-slate-400
"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              className="
w-full
rounded-full
border
border-slate-200
px-12
py-3
text-slate-700
outline-none
focus:border-green-500
focus:ring-4
focus:ring-green-100
"
            />
          </div>

          <div
            className="
mt-6
grid
md:grid-cols-3
gap-6
"
          >
            {/* ĐỐI TƯỢNG */}

            <div>
              <p
                className="
text-sm
font-semibold
text-slate-500
mb-3
"
              >
                Đối tượng tham gia
              </p>

              <div
                className="
flex
flex-wrap
gap-2
"
              >
                {["", "Startup", "Sinh viên", "Doanh nghiệp", "Cá nhân"].map(
                  (item) => (
                    <button
                      key={item}
                      onClick={() => setAudience(item)}
                      className={`
px-4
py-2
rounded-full
text-sm
font-medium
transition

${
  audience === item
    ? "bg-green-600 text-white"
    : "bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-700"
}

`}
                    >
                      {item || "Tất cả"}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* TRẠNG THÁI */}

            <div>
              <p
                className="
text-sm
font-semibold
text-slate-500
mb-3
"
              >
                Trạng thái
              </p>

              <div
                className="
flex
gap-2
"
              >
                <button
                  onClick={() => setStatus("")}
                  className={`
px-4
py-2
rounded-full
text-sm
font-medium

${status === "" ? "bg-green-600 text-white" : "bg-slate-50 text-slate-600"}

`}
                >
                  Tất cả
                </button>

                <button
                  onClick={() => setStatus("OPEN")}
                  className={`
px-4
py-2
rounded-full
text-sm
font-medium

${status === "OPEN" ? "bg-green-600 text-white" : "bg-slate-50 text-slate-600"}

`}
                >
                  Đang mở
                </button>
              </div>
            </div>

            {/* SORT */}

            <div>
              <p
                className="
text-sm
font-semibold
text-slate-500
mb-3
"
              >
                Sắp xếp
              </p>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="
w-full
px-4
py-2
rounded-full
border
border-slate-200
outline-none
focus:border-green-500
"
              >
                <option value="">Mặc định</option>

                <option value="newest">Mới nhất</option>

                <option value="popular">Phổ biến</option>
              </select>
            </div>
          </div>
        </div>
        <p
          className="
mt-8
text-slate-500
"
        >
          Tìm thấy
          <span
            className="
font-bold
text-green-600
mx-1
"
          >
            {filteredCourses.length}
          </span>
          chương trình phù hợp
        </p>
        {/* LIST */}

        <div
          ref={courseListRef}
          className="
mt-12
grid
md:grid-cols-2
xl:grid-cols-3
gap-8
"
        >
          {loading ? (
            <p>Đang tải...</p>
          ) : filteredCourses.length === 0 ? (
            <div
              className="
col-span-full
bg-white
rounded-3xl
p-16
text-center
"
            >
              <Search
                className="
mx-auto
text-slate-300
"
                size={50}
              />

              <h3
                className="
mt-5
text-xl
font-bold
"
              >
                Không tìm thấy khóa học
              </h3>
            </div>
          ) : (
            currentCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div
            className="
      mt-14
      flex
      justify-center
      items-center
      gap-3
      "
          >
            <button
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
              className="
        px-4
        py-2
        rounded-full
        border
        disabled:opacity-40
        "
            >
              ←
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => changePage(page)}
                  className={`
            w-10
            h-10
            rounded-full

            ${
              currentPage === page
                ? "bg-green-600 text-white"
                : "bg-white border"
            }
            `}
                >
                  {page}
                </button>
              ),
            )}

            <button
              disabled={currentPage === totalPages}
              onClick={() => changePage(currentPage + 1)}
              className="
        px-4
        py-2
        rounded-full
        border
        disabled:opacity-40
        "
            >
              →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <div
      className="
bg-white
rounded-3xl
overflow-hidden
border
shadow-sm
group
hover:-translate-y-3
hover:shadow-2xl
transition-all
duration-300
animate-in
fade-in
slide-in-from-bottom-6

"
    >
      <div
        className="
  h-52
  overflow-hidden
  bg-gradient-to-br
  from-green-100
  to-emerald-50
  flex
  items-center
  justify-center
  "
      >
        {course.thumbnail ? (
          <img
            src={`http://localhost:5000${course.thumbnail}`}
            alt={course.course_name}
            className="
      w-full
      h-full
      object-cover
      transition
      duration-500
      group-hover:scale-110
      "
          />
        ) : (
          <BookOpen size={65} className="text-green-600" />
        )}
      </div>

      <div
        className="
p-6
"
      >
        {course.status === "OPEN" && (
          <span
            className="
text-xs
bg-green-100
text-green-700
px-3
py-1
rounded-full
font-semibold
"
          >
            Đang mở đăng ký
          </span>
        )}

        <h3
          className="
mt-4
text-xl
font-bold
"
        >
          {course.course_name}
        </h3>
        {course.program_name && (
          <span
            className="
inline-flex
mt-3
px-3
py-1
rounded-full
bg-emerald-50
text-emerald-700
text-xs
font-semibold
"
          >
            {course.program_name}
          </span>
        )}
        <p
          className="
mt-3
text-slate-500
line-clamp-2
"
        >
          {course.short_description || "Chương trình đào tạo SIHUB"}
        </p>

        <div
          className="
mt-5
space-y-3
text-sm
"
        >
          <div className="flex gap-2">
            <Users size={18} />

            {course.target_audience || "Học viên SIHUB"}
          </div>

          <div className="flex gap-2">
            <Clock size={18} />

            {course.duration || "Chưa cập nhật"}
          </div>

          <div
            className="
flex
items-center
justify-between
bg-green-50
rounded-xl
px-4
py-3
"
          >
            <div
              className="
flex
items-center
gap-2
text-green-700
font-semibold
"
            >
              <GraduationCap size={18} />
              <span>{course.total_classes || 0} lớp đang mở</span>
            </div>
          </div>
          {Number(course.total_students || 0) > 0 &&
            (() => {
              const totalStudents = Number(course.total_students) || 0;

              const totalCapacity = Number(course.total_capacity) || 0;

              const percentage =
                totalCapacity > 0
                  ? Math.min(
                      100,
                      Math.round((totalStudents / totalCapacity) * 100),
                    )
                  : 0;

              const remaining =
                totalCapacity > 0
                  ? Math.max(totalCapacity - totalStudents, 0)
                  : 0;

              const isFull =
                totalCapacity > 0 && totalStudents >= totalCapacity;

              const isAlmostFull = !isFull && percentage >= 80;

              return (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  {/* HEADER */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        <Users size={16} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">
                          {totalStudents} người đã đăng ký
                        </p>

                        {totalCapacity > 0 && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {totalStudents} / {totalCapacity} chỗ
                          </p>
                        )}
                      </div>
                    </div>

                    {totalCapacity > 0 && (
                      <span
                        className={`
              shrink-0
              rounded-full
              px-2.5
              py-1
              text-xs
              font-bold
              ${
                isFull
                  ? "bg-red-100 text-red-700"
                  : isAlmostFull
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
              }
            `}
                      >
                        {isFull ? "Đã đủ chỗ" : `${percentage}%`}
                      </span>
                    )}
                  </div>

                  {/* THANH PIN */}
                  {totalCapacity > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center">
                        <div className="h-3.5 flex-1 overflow-hidden rounded-full border border-slate-200 bg-white p-[2px]">
                          <div
                            className={`
                  h-full
                  rounded-full
                  transition-all
                  duration-700
                  ${
                    isFull
                      ? "bg-red-500"
                      : isAlmostFull
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-400"
                  }
                `}
                            style={{
                              width: `${Math.max(percentage, 4)}%`,
                            }}
                          />
                        </div>

                        <div className="ml-1 h-6 w-1.5 rounded-r bg-slate-300" />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>
                          {totalStudents} / {totalCapacity} chỗ
                        </span>

                        {isFull ? (
                          <span className="font-semibold text-red-500">
                            Đã đầy
                          </span>
                        ) : (
                          <span>Còn {remaining} chỗ</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>

        <Link
          to={`/courses/${course.id}`}
          className="
mt-6
inline-flex
items-center
gap-2
font-semibold
text-green-600
"
        >
          Xem chi tiết
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
