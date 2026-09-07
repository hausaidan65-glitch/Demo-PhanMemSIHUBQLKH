import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import WelcomeCard from "../../components/WelcomeCard";
import { getDashboard } from "../../services/dashboardApi";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"];

const EMPTY_STATS = {
  courses: { total: 0 },
  classes: { total: 0 },
  registrations: { total: 0 },
  todayRegistrations: { total: 0 },
  charts: {
    registrationTrend: [],
    topCourses: [],
    classStatus: [],
    programRanking: [],
  },
  overview: {},
};

const Dashboard = () => {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const shortName = (text) => {
    const value = String(text || "");

    if (value.length > 18) {
      return value.substring(0, 18) + "...";
    }

    return value;
  };
  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        const res = await getDashboard();

        if (active) {
          setStats(res.data?.data || EMPTY_STATS);
          setError("");
        }
      } catch {
        if (active) {
          setStats(EMPTY_STATS);
          setError("Không thể tải dữ liệu Dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, []);
  if (loading) {
    return (
      <div
        className="
        flex
        justify-center
        items-center
        h-64
        text-slate-500
        "
      >
        Đang tải dashboard...
      </div>
    );
  }

  const charts = stats.charts || {};
  const overview = stats.overview || {};
  const startupConnectionDay = overview.startup_connection_day || {};
  const lifecycleChartData = [
    { name: "Khóa đào tạo", ...overview.training },
    { name: "Hội thảo", ...startupConnectionDay.seminars },
    { name: "Triển lãm", ...startupConnectionDay.exhibitions },
    { name: "Sự kiện kết nối", ...overview.networking },
  ].map((item) => ({
    name: item.name,
    finished: Number(item.finished) || 0,
    ongoing: Number(item.ongoing) || 0,
    upcoming: Number(item.upcoming) || 0,
    missing: Number(item.missing_official_dates) || 0,
  }));

  return (
    <div
      className="
      space-y-6
      "
    >
      <WelcomeCard />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tổng quan SIHUB</h2>
          <p className="mt-1 text-sm text-slate-500">
            Số liệu toàn thời gian theo dữ liệu hiện có trong hệ thống.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardModuleCard
            title="Khóa đào tạo"
            metrics={[
              ["Khóa học", overview.training?.total_courses],
              ["Đợt tổ chức", overview.training?.total_openings],
              ["Đăng ký hợp lệ", overview.training?.valid_registrations],
              ["Đăng ký hôm nay", stats.todayRegistrations?.total],
            ]}
            lifecycle={overview.training}
          />
          <DashboardModuleCard
            title="Hội thảo"
            metrics={[
              ["Tổng hội thảo", startupConnectionDay.seminars?.total_events],
              ["Lượt tham gia", startupConnectionDay.seminars?.total_participants],
            ]}
            lifecycle={startupConnectionDay.seminars}
          />
          <DashboardModuleCard
            title="Triển lãm / Startup Connection Day"
            metrics={[
              ["Tổng triển lãm", startupConnectionDay.exhibitions?.total_events],
              ["Phản hồi khảo sát", startupConnectionDay.exhibitions?.survey_responses],
            ]}
            lifecycle={startupConnectionDay.exhibitions}
          />
          <DashboardModuleCard
            title="Sự kiện kết nối"
            metrics={[
              ["Tổng sự kiện", overview.networking?.total_events],
              ["Đăng ký hợp lệ", overview.networking?.valid_registrations],
            ]}
            lifecycle={overview.networking}
          />
          <DashboardModuleCard
            title="Ươm tạo"
            metrics={[
              ["Tổng chương trình", overview.incubation?.total_programs],
              ["Tổng hồ sơ", overview.incubation?.total_profiles],
              ["Đang xét duyệt", overview.incubation?.under_review_profiles],
              ["Hồ sơ được duyệt", overview.incubation?.approved_profiles],
            ]}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Phân tích hoạt động</h2>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          <h3 className="mb-2 text-xl font-bold text-slate-800">
            Tình hình tổ chức các hoạt động
          </h3>
          <p className="mb-6 text-sm text-slate-500">
            Tổng hợp tình trạng tổ chức của các hoạt động trong hệ thống SIHUB.
          </p>

          <div className="h-[360px] w-full">
            <ResponsiveContainer>
              <BarChart
                data={lifecycleChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="finished" name="Đã kết thúc" stackId="lifecycle" fill="#15803d" />
                <Bar dataKey="ongoing" name="Đang diễn ra" stackId="lifecycle" fill="#2563eb" />
                <Bar dataKey="upcoming" name="Sắp tổ chức" stackId="lifecycle" fill="#f59e0b" />
                <Bar dataKey="missing" name="Thiếu thời gian" stackId="lifecycle" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <h2 className="text-2xl font-bold text-slate-800">Đào tạo</h2>

      {/* CHART 1 */}

      <div
        className="
      bg-white
rounded-3xl
border
border-slate-100
shadow-[0_8px_30px_rgb(0,0,0,0.05)]
p-6
        "
      >
        <h2
          className="
          text-xl
          font-bold
          text-slate-800
          mb-6
          "
        >
          Xu hướng đăng ký học viên
        </h2>

        <div
          className="
          h-[320px]
          "
        >
          <ResponsiveContainer>
            <LineChart data={charts.registrationTrend}>
              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="total"
                stroke="#16a34a"
                strokeWidth={4}
                dot={{
                  r: 5,
                  strokeWidth: 3,
                  fill: "#fff",
                }}
                activeDot={{
                  r: 8,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 CHART SIDE BY SIDE */}

      <div
        className="
        grid
        grid-cols-1
        xl:grid-cols-2
        gap-6
        "
      >
        {/* TOP COURSE */}

        <div
          className="
       bg-white
rounded-3xl
border
border-slate-100
shadow-[0_8px_30px_rgb(0,0,0,0.05)]
p-6
          "
        >
          <h2
            className="
            text-xl
            font-bold
            mb-5
            "
          >
            Lớp học có nhiều học viên nhất
          </h2>

          <div
            className="
            h-[320px]
            "
          >
            <ResponsiveContainer>
              <BarChart
                data={charts.topCourses}
                margin={{
                  top: 20,
                  right: 20,
                  left: 10,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickFormatter={shortName}
                  angle={-25}
                  textAnchor="end"
                />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="value"
                  fill="#16a34a"
                  radius={[10, 10, 0, 0]}
                  barSize={35}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CLASS STATUS */}

        <div
          className="
       bg-white
rounded-3xl
border
border-slate-100
shadow-[0_8px_30px_rgb(0,0,0,0.05)]
p-6
          "
        >
          <h2
            className="
            text-xl
            font-bold
            mb-5
            "
          >
            Trạng thái lớp học
          </h2>

          <div
            className="
            h-[320px]
            "
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={charts.classStatus}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  innerRadius={60}
                  paddingAngle={5}
                  label
                >
                  {charts.classStatus.map((item, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PROGRAM RANKING */}

      <div
        className="
       bg-white
rounded-3xl
border
border-slate-100
shadow-[0_8px_30px_rgb(0,0,0,0.05)]
p-6
        "
      >
        <h2
          className="
          text-xl
          font-bold
          mb-5
          "
        >
          Khóa đào tạo nổi bật
        </h2>

        <div
          className="
          h-[350px]
          "
        >
          <ResponsiveContainer>
            <BarChart data={charts.programRanking} layout="vertical">
              <XAxis type="number" />

              <YAxis dataKey="name" type="category" width={350} />

              <Tooltip />

              <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#15803d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

function DashboardModuleCard({ title, metrics, lifecycle }) {
  const missingDates = Number(lifecycle?.missing_official_dates) || 0;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">
              {Number(value) || 0}
            </div>
          </div>
        ))}
      </div>

      {lifecycle && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
          <LifecycleItem label="Đã kết thúc" value={lifecycle.finished} />
          <LifecycleItem label="Đang diễn ra" value={lifecycle.ongoing} />
          <LifecycleItem label="Sắp tổ chức" value={lifecycle.upcoming} />
        </div>
      )}

      {missingDates > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          {missingDates} mục thiếu thời gian tổ chức chính thức
        </p>
      )}
    </article>
  );
}

function LifecycleItem({ label, value }) {
  return (
    <div>
      <div className="text-lg font-bold text-emerald-700">
        {Number(value) || 0}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default Dashboard;
