import { Link } from "react-router-dom";

const QuickActions = () => {
  const actions = [
    {
      title: "Thêm khóa học",
      path: "/courses",
    },

    {
      title: "Thêm lớp học",
      path: "/classes",
    },

    {
      title: "Học viên",
      path: "/users",
    },

    {
      title: "Đăng ký",
      path: "/registrations",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold mb-5">Thao tác nhanh</h2>

      <div className="grid gap-4">
        {actions.map((item) => (
          <Link
            key={item.title}
            to={item.path}
            className="bg-indigo-600 text-white text-center rounded-lg py-3 hover:bg-indigo-700 transition"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
