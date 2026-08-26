import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  GraduationCap,
  Handshake,
  Lightbulb,
  Network,
  Rocket,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import aboutHero from "../../assets/about/sihub (2).jpg";
import aboutSpace from "../../assets/about/sihub-space.jpg";
import aboutTraining from "../../assets/about/sihub-train.webp";
import aboutCommunity from "../../assets/about/sihub-community.webp";

export default function About() {
  const values = [
    {
      icon: Lightbulb,
      title: "Đổi mới sáng tạo",
      desc: "Khuyến khích tư duy mới, thử nghiệm giải pháp mới và ứng dụng công nghệ để giải quyết các bài toán thực tế.",
    },
    {
      icon: Network,
      title: "Kết nối hệ sinh thái",
      desc: "Kết nối cơ quan quản lý, doanh nghiệp, Startup, trường viện, chuyên gia, quỹ đầu tư và cộng đồng hỗ trợ khởi nghiệp.",
    },
    {
      icon: Rocket,
      title: "Đồng hành phát triển",
      desc: "Hỗ trợ dự án từ giai đoạn hình thành ý tưởng đến hoàn thiện mô hình, kết nối thị trường và mở rộng hợp tác.",
    },
    {
      icon: GraduationCap,
      title: "Nâng cao năng lực",
      desc: "Tổ chức chương trình huấn luyện, workshop, hội thảo và hoạt động chia sẻ kiến thức cho nhiều nhóm đối tượng.",
    },
  ];

  const ecosystem = [
    {
      icon: Rocket,
      title: "Startup & dự án đổi mới sáng tạo",
      desc: "Tiếp cận chương trình đào tạo, chuyên gia, hoạt động kết nối và các cơ hội phát triển sản phẩm, thị trường.",
    },
    {
      icon: Building2,
      title: "Doanh nghiệp",
      desc: "Kết nối giải pháp đổi mới sáng tạo, công nghệ mới, nguồn nhân lực và cộng đồng khởi nghiệp.",
    },
    {
      icon: GraduationCap,
      title: "Trường viện & sinh viên",
      desc: "Tham gia huấn luyện, workshop và các hoạt động xây dựng tư duy đổi mới sáng tạo, khởi nghiệp.",
    },
    {
      icon: Handshake,
      title: "Chuyên gia & đối tác",
      desc: "Tham gia cố vấn, kết nối nguồn lực, hợp tác triển khai chương trình và hỗ trợ các dự án tiềm năng.",
    },
  ];

  const activities = [
    "Chương trình huấn luyện và nâng cao năng lực về khởi nghiệp đổi mới sáng tạo.",
    "Workshop, hội thảo, tọa đàm và hoạt động chia sẻ kiến thức.",
    "Kết nối Startup với doanh nghiệp, chuyên gia, nhà đầu tư và các đơn vị hỗ trợ.",
    "Tạo môi trường để thử nghiệm ý tưởng, phát triển dự án và mở rộng hợp tác.",
    "Kết nối các nguồn lực trong và ngoài nước của hệ sinh thái đổi mới sáng tạo.",
  ];

  const ecosystemStats = [
    {
      value: "7,5 tỷ USD",
      label: "Giá trị hệ sinh thái khởi nghiệp TP.HCM",
      note: "Nguồn được SIHUB dẫn: Startup Genome 2024",
    },
    {
      value: "260 triệu USD",
      label: "Vốn đầu tư mạo hiểm",
      note: "Số liệu được SIHUB công bố trên trang hệ sinh thái",
    },
    {
      value: "77",
      label: "Thương vụ đầu tư mạo hiểm",
      note: "Số liệu được SIHUB dẫn nguồn tổng hợp",
    },
    {
      value: "~100",
      label: "Quỹ đầu tư",
      note: "Theo báo cáo ĐMST Việt Nam 2025 được SIHUB dẫn nguồn",
    },
  ];

  return (
    <div className="overflow-hidden bg-white text-slate-900">
      {/* HERO */}
      <section className="relative isolate min-h-[560px] overflow-hidden">
        <img
          src={aboutHero}
          alt="Không gian đổi mới sáng tạo SIHUB"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-green-950/90 via-green-900/65 to-transparent" />

        <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-6 py-24">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-green-50 backdrop-blur">
              Startup & Innovation Hub of Ho Chi Minh City
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Trung tâm Khởi nghiệp sáng tạo Thành phố Hồ Chí Minh
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              SIHUB là đơn vị thuộc Sở Khoa học và Công nghệ TP.HCM, giữ vai trò
              kết nối các nguồn lực của hệ sinh thái khởi nghiệp và đổi mới sáng
              tạo trong Thành phố, trong nước và quốc tế.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-green-700"
              >
                Khám phá chương trình
                <ArrowRight size={18} />
              </Link>

              <a
                href="#about-overview"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Tìm hiểu SIHUB
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section
        id="about-overview"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center"
      >
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">
            Tổng quan
          </p>

          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Hạt nhân kết nối hệ sinh thái khởi nghiệp và đổi mới sáng tạo
          </h2>

          <p className="mt-6 leading-8 text-slate-600">
            SIHUB là nơi tập hợp, kết nối và thúc đẩy sự tương tác giữa Startup,
            doanh nghiệp, trường viện, chuyên gia, nhà đầu tư, các tổ chức hỗ
            trợ và cơ quan quản lý.
          </p>

          <p className="mt-4 leading-8 text-slate-600">
            Thông qua các chương trình huấn luyện, hội thảo, hoạt động kết nối,
            hỗ trợ dự án và xây dựng cộng đồng, SIHUB góp phần tạo môi trường
            thuận lợi để ý tưởng được phát triển, thử nghiệm và mở rộng giá trị.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Đơn vị thuộc Sở KH&CN TP.HCM",
              "Kết nối nguồn lực hệ sinh thái",
              "Hỗ trợ khởi nghiệp đổi mới sáng tạo",
              "Mở rộng hợp tác trong và ngoài nước",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-green-50 px-4 py-3"
              >
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0 text-green-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[32px] shadow-2xl shadow-slate-200">
            <img
              src={aboutSpace}
              alt="Không gian làm việc và kết nối tại SIHUB"
              className="h-[470px] w-full object-cover"
            />
          </div>

          <div className="absolute -bottom-6 left-4 max-w-xs rounded-2xl border border-slate-100 bg-white p-5 shadow-xl sm:left-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Globe2 size={23} />
              </div>

              <div>
                <p className="font-bold text-slate-900">Kết nối đa chiều</p>
                <p className="mt-1 text-sm text-slate-500">
                  Thành phố • Việt Nam • Quốc tế
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION & MISSION */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">
              Định hướng phát triển
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Tầm nhìn & sứ mệnh
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              SIHUB hướng tới vai trò trung tâm kết nối và dẫn dắt các nguồn lực
              đổi mới sáng tạo của Thành phố.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[30px] bg-green-700 p-8 text-white shadow-xl shadow-green-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Target size={28} />
              </div>

              <h3 className="mt-6 text-2xl font-bold">Tầm nhìn</h3>

              <p className="mt-4 leading-8 text-green-50">
                Trở thành hạt nhân của hệ sinh thái khởi nghiệp và đổi mới sáng
                tạo, hướng tới vị thế trung tâm khởi nghiệp sáng tạo hàng đầu
                trong khu vực.
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <Handshake size={28} />
              </div>

              <h3 className="mt-6 text-2xl font-bold">Sứ mệnh</h3>

              <p className="mt-4 leading-8 text-slate-600">
                Kết nối tri thức, công nghệ, thị trường, chuyên gia và các nguồn
                lực hỗ trợ để thúc đẩy hoạt động khởi nghiệp đổi mới sáng tạo và
                tạo môi trường hợp tác cho cộng đồng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITIES */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="grid grid-cols-2 gap-4">
          <img
            src={aboutTraining}
            alt="Chương trình đào tạo tại SIHUB"
            className="h-[430px] w-full rounded-[28px] object-cover"
          />

          <img
            src={aboutCommunity}
            alt="Hoạt động kết nối cộng đồng tại SIHUB"
            className="mt-12 h-[430px] w-full rounded-[28px] object-cover"
          />
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">
            Hoạt động trọng tâm
          </p>

          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Từ đào tạo đến kết nối và phát triển dự án
          </h2>

          <p className="mt-5 leading-8 text-slate-600">
            Các hoạt động của SIHUB không chỉ dừng ở đào tạo kiến thức. Trung
            tâm còn tạo không gian gặp gỡ, kết nối, chia sẻ kinh nghiệm và hợp
            tác giữa nhiều thành phần trong hệ sinh thái.
          </p>

          <div className="mt-7 space-y-4">
            {activities.map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                  {index + 1}
                </div>
                <p className="leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="bg-green-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-300">
              Hệ sinh thái SIHUB
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Kết nối nhiều nhóm đối tượng trên cùng một hệ sinh thái
            </h2>

            <p className="mt-5 leading-8 text-green-100">
              Mỗi nhóm đối tượng tham gia SIHUB theo một nhu cầu khác nhau,
              nhưng đều được kết nối thông qua các chương trình, hoạt động và
              nguồn lực chung của hệ sinh thái.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {ecosystem.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-400/15 text-green-300">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-green-100">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">
            Giá trị cốt lõi
          </p>

          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Những giá trị định hướng cách SIHUB kết nối và đồng hành
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {values.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
                <Icon size={25} />
              </div>

              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NUMBERS */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-600">
              Hệ sinh thái khởi nghiệp sáng tạo TP.HCM
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Một hệ sinh thái đang phát triển mạnh mẽ
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Đây là số liệu hệ sinh thái được SIHUB công bố và dẫn nguồn trên
              website chính thức, không phải thống kê riêng của phần mềm quản lý
              đào tạo.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {ecosystemStats.map((item) => (
              <div
                key={item.label}
                className="rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-3xl font-bold text-green-700">
                  {item.value}
                </p>
                <p className="mt-3 font-semibold text-slate-800">
                  {item.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-r from-green-700 to-emerald-600 px-8 py-12 text-white shadow-2xl shadow-green-100 sm:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold">
                Khám phá các chương trình đào tạo và hoạt động của SIHUB
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-green-50">
                Theo dõi các khóa đào tạo, lớp học đang mở và những hoạt động
                dành cho Startup, doanh nghiệp, sinh viên và cộng đồng đổi mới
                sáng tạo.
              </p>
            </div>

            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-green-700 transition hover:bg-green-50"
            >
              Xem chương trình
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
