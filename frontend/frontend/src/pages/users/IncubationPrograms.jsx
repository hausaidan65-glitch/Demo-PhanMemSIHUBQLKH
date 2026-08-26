import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Building2,
  Search,
  Loader2,
  Rocket,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function IncubationPrograms() {
  const [programs, setPrograms] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchPrograms();
  }, []);

  // =====================================================
  // LOAD PROGRAMS
  // =====================================================
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_URL}/incubation-programs`);

      setPrograms(res.data?.data || []);
    } catch (error) {
      console.log(
        "Lỗi tải Chương trình ươm tạo:",
        error.response?.data || error,
      );

      setError(
        error.response?.data?.message ||
          "Không thể tải danh sách Chương trình ươm tạo.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTER
  // =====================================================
  const filteredPrograms = useMemo(() => {
    return programs.filter((item) => {
      const searchText = keyword.trim().toLowerCase();

      const matchKeyword =
        !searchText ||
        String(item.program_name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.program_code || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.organizer || "")
          .toLowerCase()
          .includes(searchText);

      const matchStatus =
        !status || String(item.status || "").toUpperCase() === status;

      return matchKeyword && matchStatus;
    });
  }, [programs, keyword, status]);

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
  // STATUS
  // =====================================================
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

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-green-600" size={42} />

          <p className="mt-4 text-sm text-slate-500">
            Đang tải Chương trình ươm tạo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="bg-gradient-to-br from-green-900 via-green-700 to-emerald-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Rocket size={30} />
            </div>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Chương trình ươm tạo SIHUB
            </h1>

            <p className="mt-5 text-lg leading-8 text-green-50">
              Đồng hành cùng Startup và dự án đổi mới sáng tạo trong quá trình
              phát triển sản phẩm, mô hình kinh doanh và kết nối hệ sinh thái.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN
      ===================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* SEARCH + FILTER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_230px]">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm chương trình..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-50"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-50"
            >
              <option value="">Tất cả trạng thái</option>

              <option value="OPEN">Đang mở đăng ký</option>

              <option value="ONGOING">Đang diễn ra</option>

              <option value="FINISHED">Đã kết thúc</option>

              <option value="DRAFT">Sắp mở</option>
            </select>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* RESULT COUNT */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            Các chương trình
          </h2>

          <span className="text-sm text-slate-500">
            {filteredPrograms.length} chương trình
          </span>
        </div>

        {/* EMPTY */}
        {!error && filteredPrograms.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Rocket size={42} className="mx-auto text-slate-300" />

            <h3 className="mt-4 text-lg font-bold text-slate-700">
              Chưa có chương trình phù hợp
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
          </div>
        )}

        {/* LIST */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => {
            const statusInfo = getStatusInfo(program.status);

            return (
              <article
                key={program.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* CARD TOP */}
                <div className="bg-gradient-to-br from-green-800 to-emerald-500 p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Rocket size={25} />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mt-8">
                    {program.program_code && (
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-100">
                        {program.program_code}
                      </p>
                    )}

                    <h3 className="mt-2 line-clamp-3 text-2xl font-bold leading-snug">
                      {program.program_name}
                    </h3>
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="flex flex-1 flex-col p-6">
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {program.short_description ||
                      program.description ||
                      "Chương trình hỗ trợ Startup và dự án đổi mới sáng tạo."}
                  </p>

                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                    <div className="flex items-start gap-3">
                      <CalendarDays
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Thời gian đăng ký
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {formatDate(program.application_open)}
                          {" - "}
                          {formatDate(program.application_close)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Đơn vị tổ chức
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {program.organizer || "SIHUB"}
                        </p>
                      </div>
                    </div>

                    {program.location && (
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-green-600"
                        />

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Địa điểm
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {program.location}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-7">
                    <Link
                      to={`/incubation-programs/${program.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                    >
                      Xem chi tiết
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
