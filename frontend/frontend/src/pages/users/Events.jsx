import { useEffect, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  MapPin,
  Users,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

export default function Events() {
  const [startupEvents, setStartupEvents] = useState([]);
  const [networkingEvents, setNetworkingEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const [startupRes, networkingRes] = await Promise.all([
        axios.get(`${API_URL}/startup-connection/events?type=SEMINAR`),
        axios.get(`${API_URL}/networking-events`),
      ]);

      setStartupEvents(
        Array.isArray(startupRes.data?.data) ? startupRes.data.data : [],
      );

      setNetworkingEvents(
        Array.isArray(networkingRes.data?.data) ? networkingRes.data.data : [],
      );
    } catch (error) {
      console.error("Lỗi tải sự kiện:", error.response?.data || error);

      setError("Không thể tải danh sách sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Chưa cập nhật";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventLink = (type, id) => {
    if (type === "STARTUP") {
      return `/startup-connection-day/${id}`;
    }

    return `/networking-events/${id}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="bg-gradient-to-br from-green-800 via-green-700 to-emerald-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <CalendarDays size={18} />
              Sự kiện SIHUB
            </span>

            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Kết nối cộng đồng
              <br />
              đổi mới sáng tạo
            </h1>

            <p className="mt-5 text-green-100 text-lg leading-8">
              Khám phá các sự kiện, hội thảo và hoạt động kết nối đang được tổ
              chức tại SIHUB.
            </p>
          </div>
        </div>
      </section>
      {/* =====================================================
    QUICK EVENT NAVIGATION
===================================================== */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4">
          <a
            href="#startup-connection-day"
            className="inline-flex items-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Startup Connection Day
          </a>

          <a
            href="#networking-events"
            className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
          >
            Sự kiện kết nối
          </a>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-14">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-green-600" />

            <p className="mt-4 text-slate-500">Đang tải danh sách sự kiện...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border p-12 text-center">
            <p className="text-red-500">{error}</p>

            <button
              onClick={fetchEvents}
              className="mt-5 inline-flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-full font-semibold hover:bg-green-700"
            >
              <RotateCcw size={18} />
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* STARTUP CONNECTION DAY */}
            <section id="startup-connection-day" className="scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wide text-green-600">
                    Startup Connection Day
                  </span>

                  <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    Sự kiện Startup Connection Day
                  </h2>

                  <p className="mt-2 text-slate-500">
                    Các hội thảo thuộc Startup Connection Day.
                  </p>
                </div>

                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  {startupEvents.length} sự kiện
                </span>
              </div>

              {startupEvents.length === 0 ? (
                <EmptyEvent text="Hiện chưa có sự kiện Startup Connection Day." />
              ) : (
                <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {startupEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      type="STARTUP"
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getEventLink={getEventLink}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* NETWORKING */}
            <section id="networking-events" className="mt-20 scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wide text-green-600">
                    Sự kiện kết nối
                  </span>

                  <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    Sự kiện kết nối
                  </h2>

                  <p className="mt-2 text-slate-500">
                    Các hoạt động kết nối doanh nghiệp, startup và cộng đồng đổi
                    mới sáng tạo.
                  </p>
                </div>

                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  {networkingEvents.length} sự kiện
                </span>
              </div>

              {networkingEvents.length === 0 ? (
                <EmptyEvent text="Hiện chưa có sự kiện kết nối." />
              ) : (
                <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {networkingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      type="NETWORKING"
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getEventLink={getEventLink}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}

function EventCard({ event, type, formatDate, formatTime, getEventLink }) {
  const isSeminar = event.event_type === "SEMINAR";

  const detailLink = getEventLink(type, event.id);

  const capacity =
    Number(event.max_participants) > 0
      ? `${Number(event.current_participants) || 0}/${Number(
          event.max_participants,
        )}`
      : `${Number(event.current_participants) || 0}`;

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
      {/* IMAGE */}
      <div className="h-52 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center overflow-hidden">
        {event.thumbnail ? (
          <img
            src={`${API_URL.replace("/api", "")}${event.thumbnail}`}
            alt={event.event_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <CalendarDays size={65} className="text-green-600" />
        )}
      </div>

      <div className="p-6">
        {/* TYPE */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            {event.event_type === "SEMINAR"
              ? "Hội thảo"
              : event.event_type === "EXHIBITION"
                ? "Triển lãm"
                : "Sự kiện"}
          </span>

          {event.status === "OPEN" && (
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Đang mở đăng ký
            </span>
          )}
        </div>

        {/* TITLE */}
        <h3 className="mt-4 text-xl font-bold text-slate-900 line-clamp-2">
          {event.event_name}
        </h3>

        {/* PARENT EVENT */}
        {isSeminar && event.parent_event_name && (
          <p className="mt-3 text-sm text-slate-500">
            Thuộc sự kiện:{" "}
            <span className="font-semibold text-slate-700">
              {event.parent_event_name}
            </span>
          </p>
        )}

        {/* DESCRIPTION */}
        <p className="mt-3 text-slate-500 line-clamp-2">
          {event.short_description ||
            event.description ||
            "Thông tin sự kiện SIHUB."}
        </p>

        {/* INFO */}
        <div className="mt-5 space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <CalendarDays
              size={18}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <span>
              {formatDate(event.start_datetime)}

              {formatTime(event.start_datetime) && (
                <> · {formatTime(event.start_datetime)}</>
              )}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-green-600" />

            <span>{event.location || "Địa điểm đang cập nhật"}</span>
          </div>

          <div className="flex items-start gap-3">
            <Users size={18} className="mt-0.5 shrink-0 text-green-600" />

            <span>
              {event.max_participants > 0
                ? `${capacity} người tham dự`
                : `${event.current_participants || 0} người đã đăng ký`}
            </span>
          </div>
        </div>

        {/* BUTTON */}
        <Link
          to={detailLink}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
        >
          Xem chi tiết
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

function EmptyEvent({ text }) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center">
      <CalendarDays size={42} className="mx-auto text-slate-300" />

      <p className="mt-4 text-slate-500">{text}</p>
    </div>
  );
}
