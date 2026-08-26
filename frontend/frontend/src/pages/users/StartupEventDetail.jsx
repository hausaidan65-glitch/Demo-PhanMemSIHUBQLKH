import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  CalendarDays,
  MapPin,
  Users,
  Building2,
  ArrowLeft,
  Loader2,
  Clock3,
  ExternalLink,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function StartupEventDetail() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // =====================================================
  // LOAD EVENT DETAIL
  // =====================================================
  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_URL}/startup-connection/events/${id}`);

      setEvent(res.data?.data || null);
    } catch (error) {
      console.log("Lỗi tải chi tiết sự kiện:", error.response?.data || error);

      setError(
        error.response?.data?.message || "Không thể tải thông tin sự kiện.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================
  const formatDate = (value) => {
    if (!value) return "Đang cập nhật";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Đang cập nhật";
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================
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

  // =====================================================
  // EVENT TYPE
  // =====================================================
  const getEventTypeLabel = (type) => {
    switch (String(type || "").toUpperCase()) {
      case "SEMINAR":
        return "Hội thảo";

      case "EXHIBITION":
        return "Triển lãm";

      default:
        return "Sự kiện";
    }
  };

  // =====================================================
  // STATUS
  // =====================================================
  const getStatusLabel = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "OPEN":
        return "Đang mở đăng ký";

      case "CLOSED":
        return "Đã đóng đăng ký";

      case "DRAFT":
        return "Sắp mở";

      case "COMPLETED":
        return "Đã kết thúc";

      default:
        return status || "Đang cập nhật";
    }
  };

  const canRegister = String(event?.status || "").toUpperCase() === "OPEN";

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-green-600" size={42} />

          <p className="mt-4 text-sm text-slate-500">
            Đang tải thông tin sự kiện...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================
  if (error || !event) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Không tìm thấy sự kiện
          </h1>

          <p className="mt-3 text-slate-500">
            {error || "Sự kiện bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."}
          </p>

          <Link
            to="/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách sự kiện
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-emerald-500 text-white">
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-green-100 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Quay lại sự kiện
          </Link>

          <div className="mt-8 max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
                {getEventTypeLabel(event.event_type)}
              </span>

              {event.status && (
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    canRegister
                      ? "bg-emerald-300/20 text-emerald-50"
                      : "bg-white/10 text-green-50"
                  }`}
                >
                  {getStatusLabel(event.status)}
                </span>
              )}
            </div>

            <h1 className="mt-6 max-w-5xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {event.event_name}
            </h1>

            <p className="mt-5 max-w-4xl text-base leading-7 text-green-50 sm:text-lg">
              {event.short_description ||
                "Sự kiện kết nối hệ sinh thái đổi mới sáng tạo SIHUB."}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* =====================================================
              LEFT
          ===================================================== */}
          <div className="space-y-8">
            {/* IMAGE */}
            {event.thumbnail && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <img
                  src={event.thumbnail}
                  alt={event.event_name}
                  className="h-auto max-h-[520px] w-full object-cover"
                />
              </div>
            )}

            {/* PARENT EVENT */}
            {event.event_type === "SEMINAR" && event.parent_event_name && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                  Thuộc triển lãm
                </p>

                <h2 className="mt-2 text-lg font-bold leading-relaxed text-emerald-950">
                  {event.parent_event_name}
                </h2>
              </div>
            )}

            {/* DESCRIPTION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Thông tin sự kiện
              </h2>

              <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">
                {event.description ||
                  "Nội dung chi tiết của sự kiện đang được cập nhật."}
              </div>
            </div>

            {/* EVENT INFORMATION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Thông tin tham gia
              </h2>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                {/* DATE */}
                <InfoCard
                  icon={<CalendarDays size={21} />}
                  title="Ngày tổ chức"
                  value={formatDate(event.start_datetime)}
                />

                {/* TIME */}
                <InfoCard
                  icon={<Clock3 size={21} />}
                  title="Thời gian"
                  value={
                    event.start_datetime
                      ? `${formatTime(event.start_datetime)}${
                          event.end_datetime
                            ? ` - ${formatTime(event.end_datetime)}`
                            : ""
                        }`
                      : "Đang cập nhật"
                  }
                />

                {/* LOCATION */}
                <InfoCard
                  icon={<MapPin size={21} />}
                  title="Địa điểm"
                  value={event.location || "Đang cập nhật"}
                />

                {/* ORGANIZER */}
                <InfoCard
                  icon={<Building2 size={21} />}
                  title="Đơn vị tổ chức"
                  value={event.organizer || "SIHUB - TP.HCM"}
                />

                {/* PARTICIPANTS */}
                <InfoCard
                  icon={<Users size={21} />}
                  title="Người tham gia"
                  value={`${event.current_participants || 0}${
                    Number(event.max_participants) > 0
                      ? ` / ${event.max_participants}`
                      : ""
                  } người`}
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              RIGHT SIDEBAR
          ===================================================== */}
          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-green-600">
                  {getEventTypeLabel(event.event_type)}
                </p>

                <h3 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                  Đăng ký tham gia sự kiện
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Hoàn tất thông tin đăng ký để tham gia sự kiện cùng cộng đồng
                  đổi mới sáng tạo SIHUB.
                </p>
              </div>

              <div className="mt-6 space-y-4 border-y border-slate-100 py-5">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    className="mt-0.5 shrink-0 text-green-600"
                    size={19}
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Ngày
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDate(event.start_datetime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 shrink-0 text-green-600"
                    size={19}
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Địa điểm
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {event.location || "Đang cập nhật"}
                    </p>
                  </div>
                </div>
              </div>

              {canRegister ? (
                <Link
                  to={`/startup-connection-day/${id}/register`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white transition hover:bg-green-700"
                >
                  Đăng ký tham gia
                  <ExternalLink size={18} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3.5 font-semibold text-slate-500"
                >
                  {getStatusLabel(event.status)}
                </button>
              )}

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Thông tin đăng ký của bạn sẽ được sử dụng cho sự kiện này.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

// =====================================================
// INFO CARD
// =====================================================
function InfoCard({ icon, title, value }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
        {icon}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <p className="mt-1.5 leading-6 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
