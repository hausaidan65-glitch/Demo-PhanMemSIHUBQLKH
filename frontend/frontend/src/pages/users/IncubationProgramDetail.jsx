import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Building2,
  Users,
  Rocket,
  Loader2,
  Clock3,
  ArrowRight,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function IncubationProgramDetail() {
  const { id } = useParams();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_URL}/incubation-programs/${id}`);

      setProgram(res.data?.data || null);
    } catch (error) {
      console.log(
        "Lỗi tải chi tiết chương trình:",
        error.response?.data || error,
      );

      setError(
        error.response?.data?.message || "Không thể tải chi tiết chương trình.",
      );
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusInfo = (value) => {
    switch (String(value || "").toUpperCase()) {
      case "OPEN":
        return {
          label: "Đang mở đăng ký",
          className: "bg-emerald-100 text-emerald-700",
        };

      case "ONGOING":
        return {
          label: "Đang diễn ra",
          className: "bg-blue-100 text-blue-700",
        };

      case "FINISHED":
        return {
          label: "Đã kết thúc",
          className: "bg-slate-100 text-slate-600",
        };

      case "DRAFT":
        return {
          label: "Sắp mở",
          className: "bg-amber-100 text-amber-700",
        };

      default:
        return {
          label: value || "Đang cập nhật",
          className: "bg-slate-100 text-slate-600",
        };
    }
  };

  const canApply = String(program?.status || "").toUpperCase() === "OPEN";

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-green-600" size={42} />

          <p className="mt-4 text-sm text-slate-500">
            Đang tải chương trình...
          </p>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Không tìm thấy chương trình
          </h1>

          <p className="mt-3 text-slate-500">
            {error || "Chương trình này không tồn tại hoặc đã bị xóa."}
          </p>

          <Link
            to="/incubation-programs"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(program.status);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-emerald-500 text-white">
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <Link
            to="/incubation-programs"
            className="inline-flex items-center gap-2 text-sm font-medium text-green-100 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Quay lại chương trình
          </Link>

          <div className="mt-8 max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
                Chương trình ươm tạo
              </span>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>

            {program.program_code && (
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-green-100">
                {program.program_code}
              </p>
            )}

            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {program.program_name}
            </h1>

            <p className="mt-5 max-w-4xl text-base leading-7 text-green-50 sm:text-lg">
              {program.short_description ||
                "Chương trình hỗ trợ Startup và dự án đổi mới sáng tạo phát triển bền vững cùng SIHUB."}
            </p>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div className="space-y-8">
            {/* DESCRIPTION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Rocket size={22} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Giới thiệu chương trình
                </h2>
              </div>

              <div className="mt-6 whitespace-pre-line text-base leading-8 text-slate-600">
                {program.description ||
                  program.short_description ||
                  "Thông tin chi tiết chương trình đang được cập nhật."}
              </div>
            </div>

            {/* PROGRAM INFO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Thông tin chương trình
              </h2>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <InfoCard
                  icon={<CalendarDays size={21} />}
                  title="Mở đăng ký"
                  value={formatDate(program.application_open)}
                />

                <InfoCard
                  icon={<Clock3 size={21} />}
                  title="Đóng đăng ký"
                  value={formatDate(program.application_close)}
                />

                <InfoCard
                  icon={<CalendarDays size={21} />}
                  title="Bắt đầu chương trình"
                  value={formatDate(program.start_date)}
                />

                <InfoCard
                  icon={<CalendarDays size={21} />}
                  title="Kết thúc chương trình"
                  value={formatDate(program.end_date)}
                />

                <InfoCard
                  icon={<MapPin size={21} />}
                  title="Địa điểm"
                  value={program.location || "Đang cập nhật"}
                />

                <InfoCard
                  icon={<Building2 size={21} />}
                  title="Đơn vị tổ chức"
                  value={program.organizer || "SIHUB"}
                />

                <InfoCard
                  icon={<Users size={21} />}
                  title="Hồ sơ đăng ký"
                  value={`${program.total_profiles || 0}${
                    Number(program.max_profiles) > 0
                      ? ` / ${program.max_profiles}`
                      : ""
                  } hồ sơ`}
                />

                <InfoCard
                  icon={<Rocket size={21} />}
                  title="Năm chương trình"
                  value={program.year || "Đang cập nhật"}
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-green-600">
                Chương trình ươm tạo SIHUB
              </p>

              <h3 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                Đăng ký tham gia chương trình
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Gửi hồ sơ Startup / dự án của bạn để SIHUB xem xét và hỗ trợ
                trong chương trình ươm tạo.
              </p>

              <div className="mt-6 space-y-4 border-y border-slate-100 py-5">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    className="mt-0.5 shrink-0 text-green-600"
                    size={19}
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Hạn đăng ký
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDate(program.application_close)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2
                    className="mt-0.5 shrink-0 text-green-600"
                    size={19}
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Tổ chức
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {program.organizer || "SIHUB"}
                    </p>
                  </div>
                </div>
              </div>

              {canApply ? (
                <Link
                  to={`/incubation-programs/${id}/apply`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white transition hover:bg-green-700"
                >
                  Đăng ký chương trình
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3.5 font-semibold text-slate-500"
                >
                  {statusInfo.label}
                </button>
              )}

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Hồ sơ sẽ được gửi tới SIHUB để xem xét.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

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
