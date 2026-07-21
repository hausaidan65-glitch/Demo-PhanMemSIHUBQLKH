import { useEffect, useState } from "react";

import { useParams, Link } from "react-router-dom";

import axios from "axios";

export default function CourseDetail() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/courses/${id}`);

      setCourse(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  if (!course)
    return (
      <div
        className="
p-10
"
      >
        Đang tải...
      </div>
    );

  return (
    <div>
      <section
        className="
bg-green-700
text-white
py-16
"
      >
        <div
          className="
max-w-6xl
mx-auto
px-6
"
        >
          <h1
            className="
text-5xl
font-bold
"
          >
            {course.course_name}
          </h1>

          <p
            className="
mt-5
text-lg
"
          >
            {course.short_description}
          </p>
        </div>
      </section>

      <div
        className="
max-w-6xl
mx-auto
px-6
py-12
grid
md:grid-cols-3
gap-10
"
      >
        <div
          className="
md:col-span-2
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
text-gray-700
leading-8
"
          >
            {course.description}
          </p>

          <h2
            className="
text-3xl
font-bold
mt-10
"
          >
            Kết quả đạt được
          </h2>

          <p
            className="
mt-5
"
          >
            {course.learning_outcomes}
          </p>
        </div>

        <div
          className="
bg-white
shadow
rounded-3xl
p-6
h-fit
"
        >
          <h3
            className="
font-bold
text-xl
"
          >
            Thông tin
          </h3>

          <p className="mt-4">⏱ {course.duration}</p>

          <p className="mt-3">👥 {course.target_audience}</p>

          <Link
            to={`/register/${course.id}`}
            className="
block
mt-6
bg-green-600
text-white
text-center
py-3
rounded-xl
"
          >
            Đăng ký lớp này
          </Link>
        </div>
      </div>
    </div>
  );
}
