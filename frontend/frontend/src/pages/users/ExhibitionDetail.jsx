import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Building2,
  ClipboardList,
  Loader2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ExhibitionDetail() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/startup-connection/events/${id}`,
        );

        const data = response.data?.data || null;

        if (String(data?.event_type || "").toUpperCase() !== "EXHIBITION") {
          setError("Đây không phải là triển lãm.");
          return;
        }

        setEvent(data);
      } catch (error) {
        setError(
          error.response?.data?.message || "Không thể tải thông tin triển lãm.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  const formatDateTime = (value) => {
    if (!value) return "Đang cập nhật";

    return new Date(value).toLocaleString("vi-VN");
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 size={42} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Không tìm thấy triển lãm</h1>

          <p className="mt-3 text-slate-500">{error}</p>

          <Link
            to="/exhibitions"
            className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 font-semibold text-white"
          >
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-green-900 via-green-700 to-emerald-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Link
            to="/exhibitions"
            className="inline-flex items-center gap-2 text-green-100"
          >
            <ArrowLeft size={18} />
            Quay lại triển lãm
          </Link>

          <span className="mt-8 block w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            Triển lãm
          </span>

          <h1 className="mt-5 max-w-5xl text-4xl font-bold leading-tight">
            {event.event_name}
          </h1>

          <p className="mt-5 max-w-4xl text-lg leading-8 text-green-50">
            {event.short_description ||
              "Thông tin chương trình triển lãm SIHUB."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Thông tin triển lãm
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <Info
                icon={<CalendarDays size={20} />}
                label="Bắt đầu"
                value={formatDateTime(event.start_datetime)}
              />

              <Info
                icon={<CalendarDays size={20} />}
                label="Kết thúc"
                value={formatDateTime(event.end_datetime)}
              />

              <Info
                icon={<MapPin size={20} />}
                label="Địa điểm"
                value={event.location || "Đang cập nhật"}
              />

              <Info
                icon={<Building2 size={20} />}
                label="Đơn vị tổ chức"
                value={event.organizer || "SIHUB"}
              />
            </div>

            <div className="mt-8 border-t border-slate-100 pt-7">
              <h3 className="text-lg font-bold">Giới thiệu</h3>

              <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                {event.description ||
                  event.short_description ||
                  "Thông tin đang được cập nhật."}
              </p>
            </div>
          </div>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <ClipboardList size={25} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Khảo sát triển lãm
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Nếu đơn vị của bạn đã tham gia chương trình, vui lòng hoàn thành
                khảo sát để SIHUB tổng hợp kết quả.
              </p>

              <Link
                to={`/exhibitions/${id}/survey`}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white transition hover:bg-green-700"
              >
                Thực hiện khảo sát
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-5">
      <div className="text-green-600">{icon}</div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-400">{label}</p>

        <p className="mt-1 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
