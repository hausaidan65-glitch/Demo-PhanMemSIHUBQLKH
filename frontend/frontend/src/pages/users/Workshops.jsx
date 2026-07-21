import { Clock, MapPin } from "lucide-react";

export default function Workshops() {
  const workshops = [
    {
      id: 1,
      title: "Workshop AI 2026",
      time: "20/08/2026",
      location: "TP.HCM",
      description: "Workshop thực hành các công cụ AI mới nhất cho Startup.",
    },

    {
      id: 2,
      title: "Workshop ChatGPT",
      time: "05/09/2026",
      location: "Đà Nẵng",
      description: "Hướng dẫn Prompt Engineering và xây dựng AI Assistant.",
    },

    {
      id: 3,
      title: "AI Automation Workshop",
      time: "18/10/2026",
      location: "SIHUB",
      description: "Ứng dụng AI tự động hóa quy trình doanh nghiệp.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1
        className="
            text-4xl
            font-bold
            "
      >
        Workshop SIHUB
      </h1>

      <p
        className="
            text-gray-500
            mt-3
            mb-10
            "
      >
        Chương trình thực hành dành cho Startup và sinh viên.
      </p>

      <div
        className="
            grid
            md:grid-cols-3
            gap-8
            "
      >
        {workshops.map((item) => (
          <div
            key={item.id}
            className="
                    bg-white
                    rounded-3xl
                    shadow
                    p-6
                    "
          >
            <div
              className="
                        bg-green-100
                        w-14
                        h-14
                        rounded-full
                        flex
                        items-center
                        justify-center
                        "
            >
              <Clock className="text-green-600" />
            </div>

            <h2
              className="
                        text-xl
                        font-bold
                        mt-5
                        "
            >
              {item.title}
            </h2>

            <p
              className="
                        text-gray-600
                        mt-3
                        "
            >
              {item.description}
            </p>

            <div
              className="
                        mt-5
                        text-gray-500
                        space-y-2
                        "
            >
              <p>📅 {item.time}</p>

              <p className="flex gap-2">
                <MapPin size={18} />

                {item.location}
              </p>
            </div>

            <button
              className="
                        mt-6
                        border
                        border-green-600
                        text-green-600
                        px-5
                        py-2
                        rounded-full
                        "
            >
              Đăng ký
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
