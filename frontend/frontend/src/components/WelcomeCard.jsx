const WelcomeCard = () => {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg p-6 text-white">
      <h1 className="text-3xl font-bold">Xin chào Admin </h1>

      <p className="mt-2 opacity-90">Chúc bạn một ngày làm việc hiệu quả.</p>

      <p className="mt-1 text-sm">{today}</p>
    </div>
  );
};

export default WelcomeCard;
