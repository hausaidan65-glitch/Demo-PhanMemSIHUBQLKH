import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import { Clock, Users, ArrowRight } from "lucide-react";

export default function Courses() {
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/courses");

      setCourses(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="
text-center
p-10
"
      >
        Đang tải khóa học...
      </div>
    );
  }

  return (
    <div
      className="
max-w-7xl
mx-auto
px-6
py-10
"
    >
      {/* TITLE */}

      <div
        className="
mb-10
"
      >
        <h1
          className="
text-4xl
font-bold
text-gray-900
"
        >
          Các khóa học SIHUB
        </h1>

        <p
          className="
text-gray-500
mt-2
"
        >
          Chương trình đào tạo dành cho Startup, Sinh viên và Doanh nghiệp
        </p>
      </div>

      {/* LIST */}

      <div
        className="
grid
md:grid-cols-2
lg:grid-cols-3
gap-8
"
      >
        {courses.map((course) => (
          <div
            key={course.id}
            className="
bg-white
rounded-2xl
shadow
hover:shadow-xl
transition
overflow-hidden
"
          >
            {/* IMAGE */}

            <div
              className="
h-48
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
                <span
                  className="
text-gray-400
"
                >
                  SIHUB COURSE
                </span>
              )}
            </div>

            <div
              className="
p-6
space-y-4
"
            >
              <h2
                className="
text-xl
font-bold
"
              >
                {course.course_name}
              </h2>

              <p
                className="
text-gray-600
line-clamp-3
"
              >
                {course.short_description}
              </p>

              <div
                className="
flex
items-center
gap-2
text-gray-500
"
              >
                <Clock size={18} />

                {course.duration}
              </div>

              <div
                className="
flex
items-center
gap-2
text-gray-500
"
              >
                <Users size={18} />

                {course.target_audience}
              </div>

              <div
                className="
flex
justify-between
items-center
pt-4
"
              >
                <span
                  className="
bg-green-100
text-green-700
px-3
py-1
rounded-full
text-sm
"
                >
                  {course.status}
                </span>

                <Link
                  to={`/courses/${course.id}`}
                  className="
flex
items-center
gap-2
text-blue-600
font-semibold
"
                >
                  Xem chi tiết
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
