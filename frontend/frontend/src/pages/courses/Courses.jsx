import { Plus, Search, Edit, Trash2, BookOpen } from "lucide-react";

import { useEffect, useState } from "react";

import courseApi from "../../api/courseApi";

export default function Courses() {
  const [courses, setCourses] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await courseApi.getAll();

      console.log(res.data);

      setCourses(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.course_name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div
        className="
flex
justify-center
items-center
h-96
"
      >
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="
flex
justify-between
items-center
"
      >
        <div>
          <h1
            className="
text-3xl
font-bold
"
          >
            Quản lý khóa học
          </h1>

          <p
            className="
text-gray-500
"
          >
            Quản lý chương trình đào tạo SIHUB
          </p>
        </div>

        <button
          className="
bg-blue-600
text-white
px-5
py-3
rounded-xl
flex
items-center
gap-2
hover:bg-blue-700
"
        >
          <Plus size={20} />
          Thêm khóa học
        </button>
      </div>

      <div
        className="
bg-white
p-4
rounded-xl
shadow
flex
gap-3
"
      >
        <Search className="text-gray-400" />

        <input
          className="
outline-none
w-full
"
          placeholder="Tìm kiếm khóa học..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div
        className="
bg-white
rounded-xl
shadow
overflow-hidden
"
      >
        <table className="w-full">
          <thead
            className="
bg-gray-50
"
          >
            <tr>
              <th className="p-4 text-left">STT</th>

              <th className="p-4 text-left">Khóa học</th>

              <th className="p-4 text-left">Thời lượng</th>

              <th className="p-4 text-left">Đối tượng</th>

              <th className="p-4 text-left">Trạng thái</th>

              <th className="p-4 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredCourses.map((course, index) => (
              <tr
                key={course.id}
                className="
border-b
hover:bg-gray-50
"
              >
                <td className="p-4">{index + 1}</td>

                <td className="p-4">
                  <div
                    className="
flex
items-center
gap-3
"
                  >
                    <div
                      className="
bg-blue-100
p-2
rounded-lg
"
                    >
                      <BookOpen className="text-blue-600" />
                    </div>

                    <div>
                      <p
                        className="
font-semibold
"
                      >
                        {course.course_name}
                      </p>

                      <p
                        className="
text-sm
text-gray-500
"
                      >
                        {course.short_description}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="p-4">{course.duration}</td>

                <td className="p-4">{course.target_audience}</td>

                <td className="p-4">
                  <span
                    className="
bg-green-100
text-green-600
px-3
py-1
rounded-full
text-sm
"
                  >
                    {course.status}
                  </span>
                </td>

                <td
                  className="
p-4
"
                >
                  <div
                    className="
flex
justify-center
gap-3
"
                  >
                    <button
                      className="
text-blue-600
"
                    >
                      <Edit size={18} />
                    </button>

                    <button
                      className="
text-red-600
"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
