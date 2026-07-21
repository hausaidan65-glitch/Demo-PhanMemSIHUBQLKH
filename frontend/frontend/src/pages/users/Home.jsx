import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import axios from "axios";

import {
  BookOpen,
  Users,
  CalendarDays,
  Rocket,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

export default function Home() {
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourses();
  }, []);

  const getCourses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/courses");

      setCourses(res.data.data.slice(0, 3));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ================= HERO ================= */}

      <section
        className="
bg-gradient-to-r
from-green-700
to-green-500
text-white
"
      >
        <div
          className="
max-w-7xl
mx-auto
px-6
py-24
grid
md:grid-cols-2
gap-10
items-center
"
        >
          <div>
            <h1
              className="
text-5xl
font-bold
leading-tight
"
            >
              Đổi mới sáng tạo
              <br />
              Kết nối tương lai
              <br />
              Startup Việt Nam
            </h1>

            <p
              className="
mt-6
text-lg
text-green-100
"
            >
              SIHUB đồng hành cùng doanh nghiệp, startup và sinh viên trong hành
              trình phát triển ý tưởng thành giá trị thực tế.
            </p>

            <div
              className="
mt-8
flex
gap-4
"
            >
              <Link
                to="/courses"
                className="
bg-white
text-green-700
px-8
py-3
rounded-full
font-semibold
flex
items-center
gap-2
"
              >
                Khám phá khóa học
                <ArrowRight />
              </Link>

              <Link
                to="/events"
                className="
border
border-white
px-8
py-3
rounded-full
"
              >
                Sự kiện
              </Link>
            </div>
          </div>

          <div
            className="
bg-white/20
rounded-3xl
p-10
backdrop-blur
"
          >
            <div
              className="
grid
grid-cols-2
gap-5
"
            >
              <div
                className="
bg-white
text-green-700
rounded-2xl
p-6
"
              >
                <Rocket />

                <h3
                  className="
font-bold
mt-3
"
                >
                  Startup
                </h3>

                <p>Ươm tạo ý tưởng</p>
              </div>

              <div
                className="
bg-white
text-green-700
rounded-2xl
p-6
"
              >
                <BookOpen />

                <h3
                  className="
font-bold
mt-3
"
                >
                  Đào tạo
                </h3>

                <p>Nâng cao năng lực</p>
              </div>

              <div
                className="
bg-white
text-green-700
rounded-2xl
p-6
"
              >
                <Users />

                <h3
                  className="
font-bold
mt-3
"
                >
                  Cộng đồng
                </h3>

                <p>Kết nối doanh nghiệp</p>
              </div>

              <div
                className="
bg-white
text-green-700
rounded-2xl
p-6
"
              >
                <Lightbulb />

                <h3
                  className="
font-bold
mt-3
"
                >
                  Đổi mới
                </h3>

                <p>Sáng tạo tương lai</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROGRAM ================= */}

      <section
        className="
max-w-7xl
mx-auto
px-6
py-20
"
      >
        <h2
          className="
text-4xl
font-bold
text-center
"
        >
          Chương trình nổi bật
        </h2>

        <p
          className="
text-center
text-gray-500
mt-3
"
        >
          Các hoạt động hỗ trợ cộng đồng SIHUB
        </p>

        <div
          className="
grid
md:grid-cols-3
gap-8
mt-12
"
        >
          <div
            className="
bg-white
shadow
rounded-2xl
p-8
"
          >
            <BookOpen className="text-green-600" />

            <h3
              className="
text-xl
font-bold
mt-5
"
            >
              Khóa học
            </h3>

            <p
              className="
text-gray-600
mt-3
"
            >
              Các chương trình đào tạo Startup, AI, Marketing...
            </p>
          </div>

          <div
            className="
bg-white
shadow
rounded-2xl
p-8
"
          >
            <CalendarDays className="text-green-600" />

            <h3
              className="
text-xl
font-bold
mt-5
"
            >
              Workshop
            </h3>

            <p
              className="
text-gray-600
mt-3
"
            >
              Chia sẻ kiến thức, kỹ năng thực chiến.
            </p>
          </div>

          <div
            className="
bg-white
shadow
rounded-2xl
p-8
"
          >
            <Users className="text-green-600" />

            <h3
              className="
text-xl
font-bold
mt-5
"
            >
              Hội thảo
            </h3>

            <p
              className="
text-gray-600
mt-3
"
            >
              Kết nối chuyên gia và cộng đồng.
            </p>
          </div>
        </div>
      </section>

      {/* ================= COURSES API ================= */}

      <section
        className="
bg-gray-100
py-20
"
      >
        <div
          className="
max-w-7xl
mx-auto
px-6
"
        >
          <div
            className="
flex
justify-between
items-center
"
          >
            <h2
              className="
text-4xl
font-bold
"
            >
              Khóa học mới nhất
            </h2>

            <Link
              to="/courses"
              className="
text-green-600
font-semibold
"
            >
              Xem tất cả
            </Link>
          </div>

          <div
            className="
grid
md:grid-cols-3
gap-8
mt-10
"
          >
            {loading ? (
              <div>Đang tải...</div>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="
bg-white
rounded-2xl
shadow
overflow-hidden
"
                >
                  <div
                    className="
h-40
bg-gray-200
flex
items-center
justify-center
"
                  >
                    {course.thumbnail ? (
                      <img
                        src={`http://localhost:5000/uploads/${course.thumbnail}`}
                        className="
w-full
h-full
object-cover
"
                      />
                    ) : (
                      "SIHUB"
                    )}
                  </div>

                  <div
                    className="
p-6
"
                  >
                    <h3
                      className="
text-xl
font-bold
"
                    >
                      {course.course_name}
                    </h3>

                    <p
                      className="
text-gray-500
mt-3
"
                    >
                      {course.short_description}
                    </p>

                    <Link
                      to={`/courses/${course.id}`}
                      className="
text-green-600
mt-5
inline-block
font-semibold
"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ================= EVENTS MOCK ================= */}

      <section
        className="
max-w-7xl
mx-auto
px-6
py-20
"
      >
        <h2
          className="
text-4xl
font-bold
"
        >
          Sự kiện nổi bật
        </h2>

        <div
          className="
grid
md:grid-cols-3
gap-8
mt-10
"
        >
          {[
            {
              title: "Workshop AI Startup",
              date: "20/08/2026",
            },
            {
              title: "Startup Networking",
              date: "05/09/2026",
            },
            {
              title: "Hội thảo đổi mới sáng tạo",
              date: "15/09/2026",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="
bg-white
shadow
rounded-2xl
p-6
"
            >
              <CalendarDays className="text-green-600" />

              <h3
                className="
font-bold
text-xl
mt-4
"
              >
                {item.title}
              </h3>

              <p
                className="
text-gray-500
mt-2
"
              >
                {item.date}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PROCESS ================= */}

      <section
        className="
bg-green-700
text-white
py-20
"
      >
        <div
          className="
max-w-5xl
mx-auto
px-6
text-center
"
        >
          <h2
            className="
text-4xl
font-bold
"
          >
            Tham gia cùng SIHUB
          </h2>

          <div
            className="
grid
md:grid-cols-4
gap-6
mt-10
"
          >
            {["Đăng ký", "Đánh giá", "Tham gia", "Phát triển"].map((x, i) => (
              <div
                key={i}
                className="
bg-white/20
rounded-xl
p-5
"
              >
                <b>{i + 1}</b>

                <p className="mt-2">{x}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
