import { useEffect, useState } from "react";
import axios from "axios";
import { TrendingUp, BookOpen, Users, Layers } from "lucide-react";
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
import StatCard from "../../components/StatCard";
import RecentRegistrations from "../../components/RecentRegistrations";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  },
});
const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"];

const Dashboard = () => {
  const [stats, setStats] = useState({
    courses: {
      total: 0,
    },

    classes: {
      total: 0,
    },

    registrations: {
      total: 0,
    },

    todayRegistrations: {
      total: 0,
    },

    charts: {
      registrationTrend: [],
      topCourses: [],
      classStatus: [],
      programRanking: [],
    },
  });

  const [loading, setLoading] = useState(true);
  const shortName = (text) => {
    const value = String(text || "");

    if (value.length > 18) {
      return value.substring(0, 18) + "...";
    }

    return value;
  };
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}/api/dashboard`, getAuthConfig());

      setStats(
        res.data?.data || {
          courses: {
            total: 0,
          },

          classes: {
            total: 0,
          },

          registrations: {
            total: 0,
          },

          todayRegistrations: {
            total: 0,
          },

          charts: {
            registrationTrend: [],
            topCourses: [],
            classStatus: [],
            programRanking: [],
          },
        },
      );
    } catch (error) {
      console.error("Dashboard error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
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

  return (
    <div
      className="
      space-y-6
      "
    >
      <WelcomeCard />

      {/* STAT CARD */}

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-4
        gap-6
        "
      >
        <StatCard
          title="Khóa học"
          value={stats.courses.total}
          color="bg-green-600"
        />

        <StatCard
          title="Lớp học"
          value={stats.classes.total}
          color="bg-emerald-600"
        />

        <StatCard
          title="Học viên đăng ký"
          value={stats.registrations.total}
          color="bg-green-500"
        />

        <StatCard
          title="Đăng ký hôm nay"
          value={stats.todayRegistrations.total}
          color="bg-lime-600"
        />
      </div>

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

      {/* BOTTOM */}

      <div
        className="
        grid
        grid-cols-1
        xl:grid-cols-3
        gap-6
        "
      >
        <div
          className="
          xl:col-span-2
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
            Đăng ký gần đây
          </h2>

          <RecentRegistrations />
        </div>

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
            "
          >
            Tổng quan hệ thống
          </h2>

          <div
            className="
            mt-6
            space-y-4
            "
          >
            <OverviewItem label="Tổng khóa học" value={stats.courses.total} />

            <OverviewItem label="Tổng lớp học" value={stats.classes.total} />

            <OverviewItem
              label="Tổng học viên"
              value={stats.registrations.total}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function OverviewItem({ label, value }) {
  return (
    <div
      className="
flex
justify-between
items-center
bg-green-50
rounded-2xl
px-4
py-3
"
    >
      <span
        className="
text-slate-600
text-sm
"
      >
        {label}
      </span>

      <span
        className="
font-bold
text-green-700
"
      >
        {value}
      </span>
    </div>
  );
}

export default Dashboard;
