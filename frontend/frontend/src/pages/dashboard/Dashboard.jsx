import { useEffect, useState } from "react";
import axios from "axios";

import WelcomeCard from "../../components/WelcomeCard";
import StatCard from "../../components/StatCard";
import RegistrationChart from "./RegistrationChart";
import RecentRegistrations from "../../components/RecentRegistrations";
import QuickActions from "../../components/QuickActions";
const Dashboard = () => {
  const [stats, setStats] = useState({
    courses: 0,
    classes: 0,
    registrations: 0,
    todayRegistrations: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard");

      setStats(res.data.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      <WelcomeCard />

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Khóa học" value={stats.courses} color="bg-blue-500" />

        <StatCard title="Lớp học" value={stats.classes} color="bg-green-500" />

        <StatCard
          title="Đăng ký"
          value={stats.registrations}
          color="bg-purple-500"
        />

        <StatCard
          title="Hôm nay"
          value={stats.todayRegistrations}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RegistrationChart />
        </div>

        <QuickActions />
      </div>

      <RecentRegistrations />
    </div>
  );
};

export default Dashboard;
