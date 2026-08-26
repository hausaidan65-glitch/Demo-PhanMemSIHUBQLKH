import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { Users, ClipboardList, CheckCircle, UserCheck } from "lucide-react";
import ChartCard from "../admin/ChartCard";

import PieChartBox from "../admin/PieChartBox";
import RegistrationCharts from "../admin/RegistrationCharts";
export default function StatisticsDashboard() {
  const [statistics, setStatistics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [openCharts, setOpenCharts] = useState(true);
  const [filters, setFilters] = useState({
    training_course_id: "",
    course_id: "",
    class_id: "",

    year: "",
    month: "",

    age_groups: [],
    project_fields: [],
    statuses: [],

    date_from: "",
    date_to: "",
  });

  const chartRef = useRef(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async (customFilters = {}) => {
    try {
      const token = localStorage.getItem("admin_token");

      const res = await axios.get(
        "http://localhost:5000/api/registrations/statistics",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: customFilters,
        },
      );

      setStatistics(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const handleApply = (newFilters = filters) => {
    fetchStatistics(newFilters);
  };
  const handleReset = async () => {
    console.log("RESET FILTER");

    const reset = {
      training_course_id: "",
      course_id: "",
      class_id: "",

      year: "",
      month: "",

      age_groups: [],
      project_fields: [],
      statuses: [],

      date_from: "",
      date_to: "",
    };

    setFilters(reset);

    await fetchStatistics({});
  };
  if (loading) {
    return <div>Đang tải thống kê...</div>;
  }

  const summary = statistics.summary;

  return (
    <div
      className="
space-y-6
"
      ref={chartRef}
    >
      <h1
        className="
text-3xl
font-bold
text-slate-800
"
      >
        Dashboard thống kê
      </h1>

      {/* SUMMARY CARD */}

      <div
        className="
grid
grid-cols-1
md:grid-cols-4
gap-5
"
      >
        <Card
          title="Tổng đăng ký"
          value={summary.total_registrations}
          icon={<ClipboardList />}
        />

        <Card
          title="Tổng học viên"
          value={summary.total_users}
          icon={<Users />}
        />

        <Card
          title="Đã xác nhận"
          value={summary.confirmed}
          icon={<CheckCircle />}
        />

        <Card
          title="Đã check-in"
          value={summary.checked_in}
          icon={<UserCheck />}
        />
      </div>
      <RegistrationCharts
        open={openCharts}
        onClose={() => setOpenCharts(false)}
        loading={loading}
        statistics={statistics}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApply}
        onReset={handleReset}
      />
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div
      className="
rounded-2xl
bg-white
p-5
shadow
border
"
    >
      <div
        className="
flex
items-center
justify-between
"
      >
        <div>
          <p
            className="
text-sm
text-gray-500
"
          >
            {title}
          </p>

          <p
            className="
text-3xl
font-bold
mt-2
"
          >
            {value}
          </p>
        </div>

        <div
          className="
rounded-xl
bg-green-100
p-3
text-green-600
"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
