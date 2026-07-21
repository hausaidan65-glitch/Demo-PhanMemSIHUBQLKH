return (
  <div className="space-y-6">
    <h1
      className="
text-3xl
font-bold
"
    >
      Dashboard
    </h1>

    <div
      className="
grid
grid-cols-4
gap-6
"
    >
      <StatCard title="Khóa học" value={stats.courses} />

      <StatCard title="Lớp học" value={stats.classes} />

      <StatCard title="Đăng ký" value={stats.registrations} />

      <StatCard title="Hôm nay" value={stats.todayRegistrations} />
    </div>

    <div
      className="
grid
grid-cols-3
gap-6
"
    >
      <div
        className="
col-span-2
bg-white
rounded-xl
shadow
p-6
"
      >
        <h2
          className="
font-bold
text-xl
mb-4
"
        >
          Thống kê đăng ký
        </h2>

        <RegistrationChart />
      </div>

      <QuickActions />
    </div>

    <RecentRegistrations />
  </div>
);
