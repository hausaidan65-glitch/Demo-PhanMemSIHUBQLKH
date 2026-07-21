import { CalendarDays, MapPin, User } from "lucide-react";

export default function Events() {
  const events = [
    {
      id: 1,
      title: "Hội nghị AI Quốc gia 2026",
      date: "15/09/2026",
      location: "Hà Nội",
      speaker: "TS. Nguyễn Văn B",
      description: "Chia sẻ xu hướng AI và chuyển đổi số tại Việt Nam.",
    },

    {
      id: 2,
      title: "Diễn đàn Startup Việt Nam",
      date: "25/09/2026",
      location: "TP. Hồ Chí Minh",
      speaker: "Đặng Minh Q",
      description: "Kết nối Startup với nhà đầu tư và doanh nghiệp.",
    },

    {
      id: 3,
      title: "Networking Innovation Day",
      date: "10/10/2026",
      location: "SIHUB TP.HCM",
      speaker: "SIHUB",
      description: "Sự kiện kết nối cộng đồng đổi mới sáng tạo.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Sự kiện SIHUB</h1>

        <p className="text-gray-500 mt-3">
          Các hội thảo, diễn đàn và hoạt động kết nối cộng đồng.
        </p>
      </div>

      <div
        className="
            grid
            md:grid-cols-3
            gap-8
            "
      >
        {events.map((event) => (
          <div
            key={event.id}
            className="
                    bg-white
                    rounded-3xl
                    shadow
                    hover:shadow-xl
                    transition
                    overflow-hidden
                    "
          >
            <div
              className="
                        h-48
                        bg-green-600
                        flex
                        items-center
                        justify-center
                        "
            >
              <CalendarDays size={60} className="text-white" />
            </div>

            <div className="p-6">
              <h2
                className="
                            text-xl
                            font-bold
                            "
              >
                {event.title}
              </h2>

              <p
                className="
                            text-gray-600
                            mt-3
                            "
              >
                {event.description}
              </p>

              <div className="mt-5 space-y-2 text-gray-500">
                <p className="flex gap-2">📅 {event.date}</p>

                <p className="flex gap-2">
                  <MapPin size={18} />
                  {event.location}
                </p>

                <p className="flex gap-2">
                  <User size={18} />
                  {event.speaker}
                </p>
              </div>

              <button
                className="
                            mt-6
                            bg-green-600
                            text-white
                            px-5
                            py-2
                            rounded-full
                            "
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
