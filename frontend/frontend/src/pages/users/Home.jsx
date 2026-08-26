import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Loader2,
  MapPin,
  Network,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [startupEvents, setStartupEvents] = useState([]);
  const [networkingEvents, setNetworkingEvents] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  // =====================================================
  // LOAD HOME DATA
  // =====================================================
  const fetchHomeData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        axios.get(`${API_URL}/courses`),

        axios.get(`${API_URL}/startup-connection/events`),

        axios.get(`${API_URL}/networking-events`),

        axios.get(`${API_URL}/incubation-programs`),
      ]);

      const courseResult = results[0];
      const startupResult = results[1];
      const networkingResult = results[2];
      const incubationResult = results[3];

      if (courseResult.status === "fulfilled") {
        setCourses((courseResult.value.data?.data || []).slice(0, 3));
      }

      if (startupResult.status === "fulfilled") {
        setStartupEvents(startupResult.value.data?.data || []);
      }

      if (networkingResult.status === "fulfilled") {
        setNetworkingEvents(networkingResult.value.data?.data || []);
      }

      if (incubationResult.status === "fulfilled") {
        setPrograms(incubationResult.value.data?.data || []);
      }
    } catch (error) {
      console.log("Lỗi tải trang chủ:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MERGE EVENT
  // =====================================================
  const featuredEvents = useMemo(() => {
    const startup = startupEvents.map((item) => ({
      ...item,

      home_type: "STARTUP",

      title: item.event_name || item.title || "Startup Connection Day",

      date: item.start_datetime || item.event_date || null,

      link: `/startup-connection-day/${item.id}`,

      category:
        String(item.event_type || "").toUpperCase() === "SEMINAR"
          ? "Hội thảo"
          : "Triển lãm",
    }));

    const networking = networkingEvents.map((item) => ({
      ...item,

      home_type: "NETWORKING",

      title: item.event_name || item.name || item.title || "Sự kiện kết nối",

      date: item.start_datetime || item.event_date || item.start_date || null,

      link: `/networking-events/${item.id}`,

      category: "Sự kiện kết nối",
    }));

    return [...startup, ...networking]
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;

        const dateB = b.date ? new Date(b.date).getTime() : 0;

        return dateB - dateA;
      })
      .slice(0, 3);
  }, [startupEvents, networkingEvents]);

  const featuredProgram = useMemo(() => {
    if (!programs.length) {
      return null;
    }

    return (
      programs.find(
        (item) => String(item.status || "").toUpperCase() === "OPEN",
      ) || programs[0]
    );
  }, [programs]);

  // =====================================================
  // FORMAT DATE
  // =====================================================
  const formatDate = (value) => {
    if (!value) {
      return "Đang cập nhật";
    }

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

  return (
    <div className="overflow-hidden bg-white">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-700 to-emerald-500 text-white">
        {/* DECORATION */}
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          {/* LEFT */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-green-50 backdrop-blur">
              <Sparkles size={17} />
              Trung tâm Khởi nghiệp sáng tạo TP.HCM
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.12] sm:text-5xl lg:text-6xl">
              Nơi kết nối
              <span className="text-green-200"> đổi mới sáng tạo</span>
              <br />
              và hệ sinh thái Startup
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-green-50/90 sm:text-lg">
              SIHUB đồng hành cùng Startup, doanh nghiệp, sinh viên và cộng đồng
              trong hành trình phát triển ý tưởng, nâng cao năng lực và kết nối
              cơ hội.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/incubation-programs"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-green-700 shadow-lg shadow-green-950/10 transition hover:-translate-y-0.5 hover:bg-green-50"
              >
                Khám phá chương trình
                <ArrowRight size={19} />
              </Link>

              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Xem sự kiện
                <CalendarDays size={18} />
              </Link>
            </div>

            {/* SMALL INFO */}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-200" />
                Đào tạo thực tiễn
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-200" />
                Kết nối hệ sinh thái
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-200" />
                Đồng hành Startup
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">
            <div className="rounded-[32px] border border-white/20 bg-white/15 p-5 shadow-2xl shadow-green-950/20 backdrop-blur-xl sm:p-7">
              <div className="grid grid-cols-2 gap-4">
                <HeroFeature
                  icon={<Rocket size={25} />}
                  title="Startup"
                  description="Ươm tạo và phát triển dự án"
                  link="/incubation-programs"
                />

                <HeroFeature
                  icon={<GraduationCap size={25} />}
                  title="Đào tạo"
                  description="Nâng cao kiến thức và năng lực"
                  link="/courses"
                />

                <HeroFeature
                  icon={<Network size={25} />}
                  title="Kết nối"
                  description="Doanh nghiệp và cộng đồng"
                  link="/events"
                />

                <HeroFeature
                  icon={<Lightbulb size={25} />}
                  title="Đổi mới"
                  description="Kiến tạo giá trị tương lai"
                  link="/about"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK MODULES
      ===================================================== */}
      <section className="relative z-10 -mt-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:grid-cols-3">
            <QuickModule
              icon={<BookOpen size={24} />}
              title="Chương trình đào tạo"
              description="Khóa học dành cho Startup, sinh viên và doanh nghiệp."
              link="/courses"
            />

            <QuickModule
              icon={<CalendarDays size={24} />}
              title="Sự kiện SIHUB"
              description="Triển lãm, hội thảo và hoạt động kết nối."
              link="/events"
            />

            <QuickModule
              icon={<Rocket size={24} />}
              title="Chương trình ươm tạo"
              description="Đồng hành cùng Startup và dự án đổi mới sáng tạo."
              link="/incubation-programs"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          INTRO
      ===================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-600">
              Về SIHUB
            </p>

            <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Kết nối nguồn lực để thúc đẩy hệ sinh thái đổi mới sáng tạo
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              SIHUB tạo môi trường kết nối giữa Startup, chuyên gia, doanh
              nghiệp, nhà đầu tư và cộng đồng thông qua đào tạo, sự kiện, chương
              trình ươm tạo và các hoạt động hỗ trợ.
            </p>

            <Link
              to="/about"
              className="mt-7 inline-flex items-center gap-2 font-bold text-green-600 transition hover:text-green-700"
            >
              Tìm hiểu thêm về SIHUB
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Rocket size={22} />}
              value="Startup"
              label="Phát triển dự án"
            />

            <StatCard
              icon={<Users size={22} />}
              value="Cộng đồng"
              label="Kết nối nguồn lực"
            />

            <StatCard
              icon={<BookOpen size={22} />}
              value="Đào tạo"
              label="Nâng cao năng lực"
            />

            <StatCard
              icon={<Building2 size={22} />}
              value="Doanh nghiệp"
              label="Hợp tác đổi mới"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          COURSES
      ===================================================== */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Đào tạo"
            title="Khóa học mới nhất"
            description="Các chương trình đào tạo giúp nâng cao kiến thức, kỹ năng và năng lực đổi mới sáng tạo."
            link="/courses"
            linkText="Xem tất cả khóa học"
          />

          {loading ? (
            <LoadingBlock />
          ) : courses.length === 0 ? (
            <EmptyBlock text="Chưa có khóa học mới." />
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-emerald-50">
                    {course.thumbnail ? (
                      <img
                        src={
                          course.thumbnail.startsWith("http")
                            ? course.thumbnail
                            : `http://localhost:5000${course.thumbnail}`
                        }
                        alt={course.course_name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen size={48} className="text-green-300" />
                      </div>
                    )}

                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-green-700 shadow-sm backdrop-blur">
                      Khóa học SIHUB
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="line-clamp-2 text-xl font-bold leading-relaxed text-slate-900">
                      {course.course_name}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                      {course.short_description ||
                        "Chương trình đào tạo nâng cao năng lực cùng SIHUB."}
                    </p>

                    <Link
                      to={`/courses/${course.id}`}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-green-600 transition group-hover:gap-3"
                    >
                      Xem chi tiết
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          EVENTS
      ===================================================== */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Kết nối"
            title="Sự kiện nổi bật"
            description="Cập nhật các triển lãm, hội thảo và hoạt động kết nối trong hệ sinh thái SIHUB."
            link="/events"
            linkText="Xem tất cả sự kiện"
          />

          {loading ? (
            <LoadingBlock />
          ) : featuredEvents.length === 0 ? (
            <EmptyBlock text="Chưa có sự kiện nổi bật." />
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredEvents.map((event) => (
                <article
                  key={`${event.home_type}-${event.id}`}
                  className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                      {event.home_type === "NETWORKING" ? (
                        <Network size={23} />
                      ) : (
                        <CalendarDays size={23} />
                      )}
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                      {event.category}
                    </span>
                  </div>

                  <h3 className="mt-6 line-clamp-3 text-xl font-bold leading-relaxed text-slate-900">
                    {event.title}
                  </h3>

                  <div className="mt-5 space-y-3 text-sm text-slate-500">
                    <div className="flex items-start gap-2.5">
                      <CalendarDays
                        size={17}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <span>{formatDate(event.date)}</span>
                    </div>

                    {event.location && (
                      <div className="flex items-start gap-2.5">
                        <MapPin
                          size={17}
                          className="mt-0.5 shrink-0 text-green-600"
                        />

                        <span className="line-clamp-2">{event.location}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={event.link}
                    className="mt-auto pt-7 inline-flex items-center gap-2 text-sm font-bold text-green-600 transition group-hover:gap-3"
                  >
                    Xem chi tiết
                    <ArrowRight size={17} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          INCUBATION FEATURE
      ===================================================== */}
      {featuredProgram && (
        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300">
                  <Rocket size={17} />
                  Chương trình ươm tạo
                </div>

                <h2 className="mt-6 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                  {featuredProgram.program_name}
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                  {featuredProgram.short_description ||
                    "Chương trình đồng hành cùng Startup trong quá trình phát triển sản phẩm và mô hình kinh doanh."}
                </p>

                <div className="mt-7 flex flex-wrap gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-green-400" />
                    Đăng ký đến {formatDate(featuredProgram.application_close)}
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-green-400" />

                    {featuredProgram.organizer || "SIHUB"}
                  </div>
                </div>

                <Link
                  to={`/incubation-programs/${featuredProgram.id}`}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 font-bold text-white transition hover:bg-green-400"
                >
                  Xem chương trình
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "Mentor & cố vấn",
                  "Hoàn thiện sản phẩm",
                  "Kết nối đối tác",
                  "Tiếp cận đầu tư",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/15 font-bold text-green-400">
                      {index + 1}
                    </div>

                    <p className="mt-4 font-semibold text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-600">
              Đồng hành cùng SIHUB
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Bắt đầu hành trình của bạn
            </h2>

            <p className="mt-4 leading-7 text-slate-500">
              Khám phá chương trình phù hợp và kết nối với hệ sinh thái đổi mới
              sáng tạo.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            <ProcessStep
              number="01"
              title="Khám phá"
              description="Tìm chương trình hoặc sự kiện phù hợp."
            />

            <ProcessStep
              number="02"
              title="Đăng ký"
              description="Cung cấp thông tin và gửi hồ sơ."
            />

            <ProcessStep
              number="03"
              title="Kết nối"
              description="Tham gia hoạt động cùng SIHUB."
            />

            <ProcessStep
              number="04"
              title="Phát triển"
              description="Tiếp cận kiến thức và nguồn lực."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-r from-green-700 to-emerald-500 px-6 py-12 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div>
            <h2 className="text-3xl font-bold">Sẵn sàng kết nối cùng SIHUB?</h2>

            <p className="mt-3 max-w-2xl leading-7 text-green-50">
              Khám phá các khóa học, sự kiện và chương trình hỗ trợ đang mở dành
              cho cộng đồng đổi mới sáng tạo.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:pl-10">
            <Link
              to="/events"
              className="rounded-xl border border-white/30 px-5 py-3 font-semibold transition hover:bg-white/10"
            >
              Xem sự kiện
            </Link>

            <Link
              to="/incubation-programs"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-green-700 transition hover:bg-green-50"
            >
              Chương trình ươm tạo
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// =====================================================
// HERO FEATURE
// =====================================================
function HeroFeature({ icon, title, description, link }) {
  return (
    <Link
      to={link}
      className="group rounded-2xl bg-white p-5 text-slate-900 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-6"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

// =====================================================
// QUICK MODULE
// =====================================================
function QuickModule({ icon, title, description, link }) {
  return (
    <Link
      to={link}
      className="group flex items-start gap-4 rounded-2xl p-4 transition hover:bg-green-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
        {icon}
      </div>

      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-green-600">
          Khám phá
          <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
}

// =====================================================
// STAT CARD
// =====================================================
function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
        {icon}
      </div>

      <p className="mt-5 text-xl font-bold text-slate-900">{value}</p>

      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

// =====================================================
// SECTION HEADER
// =====================================================
function SectionHeader({ eyebrow, title, description, link, linkText }) {
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-600">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          {title}
        </h2>

        <p className="mt-3 max-w-2xl leading-7 text-slate-500">{description}</p>
      </div>

      <Link
        to={link}
        className="inline-flex shrink-0 items-center gap-2 font-bold text-green-600 transition hover:text-green-700"
      >
        {linkText}
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}

// =====================================================
// PROCESS
// =====================================================
function ProcessStep({ number, title, description }) {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-6">
      <span className="text-sm font-black text-green-600">{number}</span>

      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

// =====================================================
// LOADING
// =====================================================
function LoadingBlock() {
  return (
    <div className="flex min-h-56 items-center justify-center">
      <div className="text-center">
        <Loader2 size={36} className="mx-auto animate-spin text-green-600" />

        <p className="mt-3 text-sm text-slate-500">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}

// =====================================================
// EMPTY
// =====================================================
function EmptyBlock({ text }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
      {text}
    </div>
  );
}
