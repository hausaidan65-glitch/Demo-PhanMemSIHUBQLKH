import { Plus, Search, Edit, Trash2 } from "lucide-react";

import { useState } from "react";

const Classes = () => {
  const [search, setSearch] = useState("");

  const [classes, setClasses] = useState([
    {
      id: 1,
      name: "Startup K01",
      course: "Startup Basic",
      capacity: 30,
      students: 25,
      status: "OPEN",
    },

    {
      id: 2,
      name: "AI Startup K02",
      course: "AI Startup",
      capacity: 40,
      students: 40,
      status: "FULL",
    },

    {
      id: 3,
      name: "Business K01",
      course: "Business Model",
      capacity: 35,
      students: 0,
      status: "CLOSED",
    },
  ]);

  const filtered = classes.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

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
            Quản lý lớp học
          </h1>

          <p className="text-gray-500">Danh sách lớp đào tạo</p>
        </div>

        <button
          className="
flex
items-center
gap-2
bg-blue-600
text-white
px-4
py-2
rounded-lg
"
        >
          <Plus size={18} />
          Thêm lớp
        </button>
      </div>

      <div
        className="
bg-white
p-4
rounded-xl
shadow
flex
items-center
gap-3
"
      >
        <Search />

        <input
          placeholder="Tìm lớp học..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
border
rounded-lg
px-3
py-2
w-full
"
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
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">STT</th>

              <th className="p-4 text-left">Tên lớp</th>

              <th className="p-4 text-left">Khóa học</th>

              <th className="p-4 text-left">Sĩ số</th>

              <th className="p-4 text-left">Trạng thái</th>

              <th className="p-4 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, index) => (
              <tr
                key={item.id}
                className="
border-b
hover:bg-gray-50
"
              >
                <td className="p-4">{index + 1}</td>

                <td className="p-4 font-semibold">{item.name}</td>

                <td className="p-4">{item.course}</td>

                <td className="p-4">
                  {item.students}/{item.capacity}
                </td>

                <td className="p-4">
                  <span
                    className={`

px-3
py-1
rounded-full

${
  item.status === "OPEN"
    ? "bg-green-100 text-green-700"
    : item.status === "FULL"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-200 text-gray-700"
}

`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="p-4">
                  <div
                    className="
flex
justify-center
gap-3
"
                  >
                    <button className="text-blue-600">
                      <Edit size={18} />
                    </button>

                    <button className="text-red-600">
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
};

export default Classes;
