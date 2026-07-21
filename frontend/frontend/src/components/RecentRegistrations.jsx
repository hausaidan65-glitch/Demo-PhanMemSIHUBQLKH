const data = [
  {
    name: "Nguyễn Văn A",
    course: "AI Marketing",
    time: "5 phút trước",
  },

  {
    name: "Trần Thị Bình",
    course: "Startup",
    time: "15 phút trước",
  },

  {
    name: "Lê Minh Cường",
    course: "Business",
    time: "30 phút trước",
  },
];

const RecentRegistrations = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold mb-5">Đăng ký gần đây</h2>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center border-b pb-3"
          >
            <div>
              <h3 className="font-semibold">{item.name}</h3>

              <p className="text-sm text-gray-500">{item.course}</p>
            </div>

            <span className="text-gray-400 text-sm">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentRegistrations;
