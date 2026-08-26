import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  CalendarDays,
  MapPin,
  Building2,
  ArrowRight,
  Loader2,
  Presentation,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Exhibitions() {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadExhibitions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/startup-connection/events?type=EXHIBITION`,
        );

        setExhibitions(response.data?.data || []);
      } catch (error) {
        console.error("Lỗi tải triển lãm:", error);

        setError(
          error.response?.data?.message || "Không thể tải danh sách triển lãm.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadExhibitions();
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={42} className="mx-auto animate-spin text-green-600" />

          <p className="mt-4 text-slate-500">Đang tải danh sách triển lãm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-green-900 via-green-700 to-emerald-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Presentation size={30} />
            </div>

            <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
              Triển lãm SIHUB
            </h1>

            <p className="mt-5 text-lg leading-8 text-green-50">
              Thông tin các chương trình triển lãm và khảo sát kết quả sau
              chương trình.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Các triển lãm</h2>

          <span className="text-sm text-slate-500">
            {exhibitions.length} triển lãm
          </span>
        </div>

        {!error && exhibitions.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Presentation size={42} className="mx-auto text-slate-300" />

            <h3 className="mt-4 text-lg font-bold text-slate-700">
              Chưa có triển lãm
            </h3>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((item) => (
            <article
              key={item.id}
              className="flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex w-full flex-col">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.event_name}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-gradient-to-br from-green-700 to-emerald-400 text-white">
                    <Presentation size={52} />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    TRIỂN LÃM
                  </span>

                  <h3 className="mt-4 text-xl font-bold leading-relaxed text-slate-900">
                    {item.event_name}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {item.short_description ||
                      item.description ||
                      "Thông tin triển lãm đang được cập nhật."}
                  </p>

                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                    <div className="flex gap-3">
                      <CalendarDays size={18} className="text-green-600" />
                      <span className="text-sm text-slate-700">
                        {formatDate(item.start_datetime)}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <MapPin size={18} className="text-green-600" />
                      <span className="text-sm text-slate-700">
                        {item.location || "Đang cập nhật"}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <Building2 size={18} className="text-green-600" />
                      <span className="text-sm text-slate-700">
                        {item.organizer || "SIHUB"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-7">
                    <Link
                      to={`/exhibitions/${item.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                    >
                      Xem chi tiết
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
