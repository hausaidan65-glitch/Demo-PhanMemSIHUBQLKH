import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  CheckCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function CourseDetail() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);

  const [classes, setClasses] = useState([]);
  const openClasses = classes.filter((item) => item.status === "OPEN");

  const singleOpenClass = openClasses.length === 1 ? openClasses[0] : null;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);
  const fetchDetail = async () => {
    try {
      setLoading(true);

      const [courseRes, classRes] = await Promise.all([
        axios.get(`${API_URL}/courses/${id}`),

        axios.get(`${API_URL}/course-classes/course/${id}`),
      ]);

      setCourse(courseRes.data?.data || null);

      setClasses(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
    } catch (error) {
      console.error(
        "Lỗi tải chi tiết khóa học:",
        error.response?.data || error,
      );

      setCourse(null);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="
min-h-screen
flex
items-center
justify-center
"
      >
        Đang tải...
      </div>
    );
  }

  if (!course) {
    return (
      <div
        className="
min-h-screen
flex
items-center
justify-center
"
      >
        Không tìm thấy khóa học
      </div>
    );
  }

  return (
    <div
      className="
min-h-screen
bg-slate-50
"
    >
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
max-w-4xl
"
          >
            <span
              className="
inline-flex
px-4
py-2
rounded-full
bg-white/20
text-sm
font-semibold
"
            >
              Chương trình đào tạo SIHUB
            </span>

            <h1
              className="
mt-6
text-5xl
font-bold
leading-tight
"
            >
              {course.course_name}
            </h1>

            <p
              className="
mt-5
text-green-100
text-lg
leading-8
"
            >
              {course.short_description ||
                "Chương trình đào tạo giúp phát triển năng lực đổi mới sáng tạo."}
            </p>

            <div
              className="
mt-8
flex
flex-wrap
gap-4
"
            >
              <span
                className={`
    px-5
    py-3
    rounded-full
    font-semibold
    ${
      openClasses.length > 0
        ? "bg-white text-green-700"
        : "bg-white/20 text-white"
    }
  `}
              >
                {openClasses.length > 0 ? "Đang mở đăng ký" : "Chưa có lớp mở"}
              </span>

              {course.target_audience && (
                <span
                  className="
bg-white/20
px-5
py-3
rounded-full
"
                >
                  🎯 {course.target_audience}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="
max-w-7xl
mx-auto
px-6
py-14
"
      >
        {/* INFO CARD */}

        <div
          className="
grid
md:grid-cols-4
gap-6
"
        >
          <InfoCard
            icon={<Clock />}
            title="Thời lượng"
            value={course.duration || "Đang cập nhật"}
          />

          <InfoCard
            icon={<Users />}
            title="Lớp đang mở"
            value={`${openClasses.length} lớp đang mở`}
          />

          <InfoCard
            icon={<GraduationCap />}
            title="Đối tượng"
            value={course.target_audience || "Học viên SIHUB"}
          />

          <InfoCard icon={<MapPin />} title="Địa điểm" value="SIHUB" />
        </div>

        {/* INTRO */}

        <div
          className="
mt-14
grid
lg:grid-cols-3
gap-10
"
        >
          <div
            className="
lg:col-span-2
bg-white
rounded-3xl
p-8
shadow-sm
border
border-slate-100
"
          >
            <h2
              className="
text-3xl
font-bold
"
            >
              Giới thiệu khóa học
            </h2>

            <p
              className="
mt-5
text-slate-600
leading-8
"
            >
              {course.description ||
                course.short_description ||
                "Thông tin chương trình đào tạo SIHUB."}
            </p>
          </div>

          <div
            className="
bg-green-600
rounded-3xl
p-8
text-white
"
          >
            <h3
              className="
text-2xl
font-bold
"
            >
              Sẵn sàng tham gia?
            </h3>

            <p
              className="
mt-3
text-green-100
"
            >
              Đăng ký ngay để tham gia chương trình.
            </p>

            {singleOpenClass ? (
              <Link
                to={`/register/${singleOpenClass.id}`}
                className="
      mt-6
      inline-flex
      items-center
      gap-2
      bg-white
      text-green-700
      px-6
      py-3
      rounded-full
      font-semibold
      transition
      hover:bg-green-50
    "
              >
                Đăng ký ngay
                <ArrowRight size={18} />
              </Link>
            ) : openClasses.length > 1 ? (
              <a
                href="#open-classes"
                className="
      mt-6
      inline-flex
      items-center
      gap-2
      bg-white
      text-green-700
      px-6
      py-3
      rounded-full
      font-semibold
      transition
      hover:bg-green-50
    "
              >
                Chọn lớp để đăng ký
                <ArrowRight size={18} />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="
      mt-6
      inline-flex
      items-center
      gap-2
      rounded-full
      bg-white/60
      px-6
      py-3
      font-semibold
      text-green-900/60
      cursor-not-allowed
    "
              >
                Chưa có lớp mở đăng ký
              </button>
            )}
          </div>
        </div>

        {/* CONTENT */}

        <div className="mt-14">
          <h2
            className="
text-3xl
font-bold
"
          >
            Nội dung đào tạo
          </h2>

          <div
            className="
mt-6
grid
md:grid-cols-2
gap-5
"
          >
            {[
              "Kiến thức nền tảng",
              "Kỹ năng thực hành",
              "Case study thực tế",
              "Ứng dụng đổi mới sáng tạo",
            ].map((item) => (
              <div
                key={item}
                className="
flex
items-center
gap-3
bg-green-50
rounded-2xl
p-4
"
              >
                <CheckCircle
                  className="
text-green-600
"
                />

                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CLASS LIST */}

        <div
          id="open-classes"
          className="
    mt-14
    scroll-mt-28
  "
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                Lịch khai giảng
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Các lớp đang mở
              </h2>

              <p className="mt-2 text-slate-500">
                Chọn lớp phù hợp với lịch trình của bạn để đăng ký tham gia.
              </p>
            </div>

            {openClasses.length > 0 && (
              <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                {openClasses.length} lớp đang nhận đăng ký
              </span>
            )}
          </div>

          <div
            className="
      mt-6
      grid
      gap-6
      md:grid-cols-2
    "
          >
            {openClasses.length === 0 ? (
              <div
                className="
          md:col-span-2
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-10
          text-center
          shadow-sm
        "
              >
                <Calendar size={38} className="mx-auto text-slate-300" />

                <h3 className="mt-4 text-lg font-bold text-slate-800">
                  Hiện chưa có lớp mở đăng ký
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Lịch lớp mới sẽ được SIHUB cập nhật trong thời gian tới.
                </p>
              </div>
            ) : (
              openClasses.map((item) => (
                <div
                  key={item.id}
                  className="
            group
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-6
            shadow-sm
            transition-all
            duration-300
            hover:-translate-y-1
            hover:border-green-200
            hover:shadow-xl
          "
                >
                  {console.log("CLASS USER:", item)}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className="
                  inline-flex
                  rounded-full
                  bg-green-50
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  text-green-700
                "
                      >
                        Đang mở đăng ký
                      </span>

                      <h3 className="mt-3 text-xl font-bold text-slate-900">
                        {item.class_name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <Calendar
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <span>
                        {item.schedule_note || "Lịch học đang được cập nhật"}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <GraduationCap
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <span>
                        {item.trainer_name || "Giảng viên đang cập nhật"}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <span>{item.location || "Địa điểm đang cập nhật"}</span>
                    </div>
                  </div>
                  {/* =====================================================
    TIẾN ĐỘ ĐĂNG KÝ
    Chỉ hiện khi đã có ít nhất 1 học viên
===================================================== */}
                  {Number(item.current_students || 0) > 0 && (
                    <RegistrationCapacity
                      current={Number(item.current_students || 0)}
                      max={Number(item.max_students || 0)}
                    />
                  )}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <Link
                      to={`/register/${item.id}`}
                      className="
                inline-flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-green-600
                px-5
                py-3
                font-semibold
                text-white
                transition
                hover:bg-green-700
              "
                    >
                      Đăng ký lớp này
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <div
      className="
bg-white
rounded-3xl
p-6
border
shadow-sm
hover:-translate-y-1
transition
"
    >
      <div
        className="
text-green-600
"
      >
        {icon}
      </div>

      <p
        className="
mt-4
text-sm
text-slate-500
"
      >
        {title}
      </p>

      <h3
        className="
mt-1
font-bold
"
      >
        {value}
      </h3>
    </div>
  );
}
// =====================================================
// REGISTRATION CAPACITY
// Thanh sức chứa đăng ký kiểu "pin"
// Chỉ dùng hiển thị UI, không thay đổi logic đăng ký.
// =====================================================
function RegistrationCapacity({ current = 0, max = 0 }) {
  const safeCurrent = Math.max(0, Number(current) || 0);

  const safeMax = Math.max(0, Number(max) || 0);

  // Nếu không có học viên thì không hiển thị.
  if (safeCurrent <= 0) {
    return null;
  }

  const percentage =
    safeMax > 0 ? Math.min(100, Math.round((safeCurrent / safeMax) * 100)) : 0;

  const isFull = safeMax > 0 && safeCurrent >= safeMax;

  const isAlmostFull = safeMax > 0 && percentage >= 80 && !isFull;

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <Users size={16} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              {safeCurrent} người đã đăng ký
            </p>

            {safeMax > 0 && (
              <p className="mt-0.5 text-xs text-slate-400">
                {safeCurrent} / {safeMax} chỗ
              </p>
            )}
          </div>
        </div>

        {safeMax > 0 && (
          <span
            className={`
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

      {/* BATTERY / PROGRESS BAR */}
      {safeMax > 0 && (
        <div className="mt-4">
          <div className="relative flex items-center">
            {/* THÂN PIN */}
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

            {/* ĐẦU PIN */}
            <div className="ml-1 h-6 w-1.5 rounded-r bg-slate-300" />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Còn chỗ</span>

            {isFull ? (
              <span className="font-semibold text-red-500">Đã đầy</span>
            ) : (
              <span>Còn {Math.max(safeMax - safeCurrent, 0)} chỗ</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
