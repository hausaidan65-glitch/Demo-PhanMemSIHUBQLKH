import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import {
  X,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock3,
  UserCheck,
} from "lucide-react";
import StatisticsFilter from "./StatisticsFilter";
import ChartRenderer from "./ChartRenderer";

const PIE_COLORS = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#64748b",
];

const genderLabels = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
  UNKNOWN: "Chưa xác định",
};

const statusLabels = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

function normalizeLabels(items, labels = {}) {
  return (items || []).map((item) => ({
    ...item,
    name: labels[item.name] || item.name,
  }));
}

function StatCard({ title, value, icon: Icon, className = "" }) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            bg-green-50
            text-green-600
          "
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children, className = "" }) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        ${className}
      `}
    >
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      className="
        flex
        h-[300px]
        items-center
        justify-center
        text-sm
        text-slate-400
      "
    >
      Chưa có dữ liệu phù hợp.
    </div>
  );
}

export default function RegistrationCharts({
  open,

  onClose,

  loading,

  statistics,

  filters,

  setFilters,

  onApply,
  onReset,
}) {
  const [openCourses, setOpenCourses] = useState({});
  const [openTopics, setOpenTopics] = useState({});
  const chartRef = useRef(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [customMetric, setCustomMetric] = useState("genders");
  const summary = statistics?.summary || {};

  const charts = statistics?.charts || {};
  // const courses = charts.courses?.map((item) => item.name) || [];

  // const classes = charts.classes?.map((item) => item.name) || [];
  const topics = charts.topics || [];
  const treeData = {};

  (charts.class_topics || []).forEach((item) => {
    if (!treeData[item.course]) {
      treeData[item.course] = [];
    }

    let topicItem = treeData[item.course].find((x) => x.topic === item.topic);

    if (!topicItem) {
      topicItem = {
        topic: item.topic,
        classes: [],
      };

      treeData[item.course].push(topicItem);
    }

    topicItem.classes.push({
      name: item.class,

      value: item.value,
    });
  });

  const ageGroups = charts.age_groups?.map((item) => item.name) || [];
  const projectFields = charts.project_fields?.map((item) => item.name) || [];
  const genders = normalizeLabels(
    charts.genders?.filter((item) => item.name !== "UNKNOWN"),
    genderLabels,
  );
  const genderAgeGroups = charts.gender_age_groups || [];
  function normalizeAgeLabel(label) {
    if (label === "18_24") {
      return "18-25";
    }

    if (label === "UNDER_18") {
      return "Dưới 18";
    }

    return label;
  }

  function mergeAgeGroups(data, hideUnknown = true) {
    const result = {};

    data.forEach((item) => {
      if (!item.age_group) {
        return;
      }

      if (
        hideUnknown &&
        (item.age_group === "Chưa xác định" || item.age_group === "UNKNOWN")
      ) {
        return;
      }

      const label = normalizeAgeLabel(item.age_group);

      if (!result[label]) {
        result[label] = 0;
      }

      result[label] += Number(item.value);
    });

    return Object.entries(result).map(([name, value]) => ({
      age_group: name,
      value,
    }));
  }
  const normalizedAgeGroups = mergeAgeGroups(
    (charts.age_groups || []).map((item) => ({
      age_group: item.name,
      value: item.value,
    })),
    true,
  );
  const customChartOptions = {
    genders: {
      label: "Giới tính",

      data: genders.map((item) => ({
        name: item.name,
        value: item.value,
      })),
    },

    age_groups: {
      label: "Độ tuổi",

      data: normalizedAgeGroups.map((item) => ({
        name: item.age_group,
        value: item.value,
      })),
    },

    project_fields: {
      label: "Lĩnh vực dự án",
      data: charts.project_fields || [],
    },

    startup_stages: {
      label: "Giai đoạn Startup",
      data: charts.startup_stages || [],
    },

    female_founders: {
      label: "Nữ Founder/Co-founder",
      data: charts.female_founders || [],
    },

    statuses: {
      label: "Trạng thái đăng ký",

      data: normalizeLabels(charts.statuses, statusLabels),
    },

    courses: {
      label: "Khóa đào tạo",
      data: charts.courses || [],
    },
  };
  const statuses = normalizeLabels(charts.statuses, statusLabels).map(
    (item) => item.name,
  );
  const [exporting, setExporting] = useState(false);

  if (!open) {
    return null;
  }
  const exportPNG = async () => {
    try {
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: "#fff",

        style: {
          margin: "0",
          padding: "24px",
          display: "block",
        },

        filter: (node) => {
          if (!node.classList) {
            return true;
          }

          return !node.classList.contains("no-export");
        },
      });
      const link = document.createElement("a");

      link.download = "bao-cao-sihub.png";

      link.href = dataUrl;

      link.click();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[110]
        overflow-y-auto
        bg-slate-950/60
        p-4
        backdrop-blur-sm
      "
    >
      <div
        ref={chartRef}
        className="
chart-export
mx-auto
w-full
max-w-6xl
overflow-hidden
rounded-3xl
bg-slate-50
shadow-2xl
"
      >
        {/* HEADER */}

        <div
          className="
            sticky
            top-0
            z-10
            flex
            items-center
            justify-between
            rounded-t-3xl
            border-b
            border-slate-200
            bg-white/95
            px-6
            py-5
            backdrop-blur
          "
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Báo cáo đăng ký đào tạo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Số liệu được tính theo bộ lọc đang áp dụng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setExporting(true);

                setTimeout(() => {
                  exportPNG();

                  setExporting(false);
                }, 300);
              }}
              className="
 rounded-xl
 bg-green-600
 px-4
 py-2
 text-sm
 font-medium
 text-white
 hover:bg-green-700
 "
            >
              Xuất PNG
            </button>

            <button
              type="button"
              onClick={onClose}
              className="
 rounded-xl
 p-2.5
 text-slate-500
 hover:bg-slate-100
 "
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {loading ? (
          <div
            className="
              flex
              min-h-[600px]
              items-center
              justify-center
            "
          >
            <div className="text-center">
              <div
                className="
                  mx-auto
                  h-10
                  w-10
                  animate-spin
                  rounded-full
                  border-4
                  border-green-100
                  border-t-green-600
                "
              />

              <p className="mt-4 text-sm text-slate-500">
                Đang tổng hợp số liệu...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="no-export">
              <StatisticsFilter
                ageGroups={ageGroups}
                projectFields={projectFields}
                statuses={statuses}
                filters={filters}
                setFilters={setFilters}
                onApply={onApply}
                onReset={onReset}
              />
            </div>
            {/* SUMMARY */}
            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
                xl:grid-cols-5
              "
            >
              <StatCard
                title="Tổng lượt đăng ký"
                value={summary.total_registrations || 0}
                icon={ClipboardList}
              />

              <StatCard
                title="Học viên"
                value={summary.total_users || 0}
                icon={Users}
              />

              <StatCard
                title="Đã xác nhận"
                value={summary.confirmed || 0}
                icon={CheckCircle2}
              />

              <StatCard
                title="Đang chờ"
                value={summary.pending || 0}
                icon={Clock3}
              />

              <StatCard
                title="Đã check-in"
                value={summary.checked_in || 0}
                icon={UserCheck}
              />
            </div>
            {/* FIRST ROW */}
            <div
              className="
grid
grid-cols-1
xl:grid-cols-2
gap-6
"
            >
              <ChartCard
                title="Phân bố giới tính"
                description="Tổng quan số lượng học viên theo giới tính. Nhấn vào từng nhóm để xem phân bố độ tuổi."
              >
                <div className="mb-4 flex flex-wrap gap-3">
                  {genders.map((item) => (
                    <button
                      key={`${item.name}-${item.value}`}
                      onClick={() => setSelectedGender(item.name)}
                      className={`
rounded-xl
border
px-4
py-2
text-sm
font-medium
transition

${
  selectedGender === item.name
    ? "bg-green-600 text-white border-green-600"
    : "bg-white text-slate-600 hover:bg-slate-100"
}

`}
                    >
                      {item.name}

                      <span className="ml-2">({item.value})</span>
                    </button>
                  ))}
                </div>
                {genders.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div>
                    <div className="h-[360px]">
                      <ChartRenderer
                        data={genders.map((item) => ({
                          name: item.name,
                          value: item.value,
                        }))}
                        defaultType="horizontal"
                        allowedTypes={["pie", "bar", "horizontal"]}
                      />
                    </div>
                    {selectedGender && (
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          Đang xem:
                          <span
                            className="
                ml-2
                font-semibold
                text-green-600
            "
                          >
                            {selectedGender}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedGender(null)}
                          className="
                rounded-lg
                border
                border-slate-300
                px-3
                py-1.5
                text-sm
                font-medium
                text-slate-600
                hover:bg-slate-100
            "
                        >
                          Xóa lọc
                        </button>
                      </div>
                    )}

                    {selectedGender && (
                      <ChartCard
                        title={`Độ tuổi của giới tính ${selectedGender}`}
                        description="Phân bố độ tuổi chi tiết"
                      >
                        <div className="h-[340px] w-full">
                          <ChartRenderer
                            data={mergeAgeGroups(
                              genderAgeGroups.filter(
                                (item) =>
                                  genderLabels[
                                    item.gender?.trim().toUpperCase()
                                  ] === selectedGender,
                              ),
                              true,
                            )}
                            defaultType="horizontal"
                            allowedTypes={["horizontal", "bar"]}
                          />
                        </div>
                      </ChartCard>
                    )}
                  </div>
                )}
              </ChartCard>
              <ChartCard
                title="Lĩnh vực dự án"
                description="Số lượt đăng ký theo từng lĩnh vực dự án."
              >
                {!charts.project_fields?.length ? (
                  <EmptyChart />
                ) : (
                  <div
                    style={{
                      height: Math.max(360, charts.project_fields.length * 45),
                    }}
                  >
                    <ChartRenderer
                      data={charts.project_fields}
                      defaultType="horizontal"
                      allowedTypes={["horizontal", "bar", "pie"]}
                    />
                  </div>
                )}
              </ChartCard>
              <ChartCard
                title="Phân bố độ tuổi"
                description="Số lượng học viên theo từng nhóm tuổi."
                className="xl:col-span-2"
              >
                {normalizedAgeGroups.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div className="h-[350px]">
                    <ChartRenderer
                      data={normalizedAgeGroups.map((item) => ({
                        name: item.age_group,
                        value: item.value,
                      }))}
                      defaultType="bar"
                      allowedTypes={["bar", "horizontal", "pie"]}
                    />
                  </div>
                )}
              </ChartCard>
            </div>
            {/* PROJECT FIELDS */}
            {/* SECOND ROW */}
            <div
              className="
                grid
                gap-6
                xl:grid-cols-2
              "
            >
              <ChartCard
                title="Giai đoạn Startup"
                description="Tỷ lệ đăng ký theo giai đoạn phát triển dự án."
              >
                {!charts.startup_stages?.length ? (
                  <EmptyChart />
                ) : (
                  <div className="h-[340px] w-full">
                    <ChartRenderer
                      data={charts.startup_stages}
                      defaultType="pie"
                      allowedTypes={["pie", "bar", "horizontal"]}
                    />
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Nữ Founder/Co-founder"
                description="Tỷ lệ dự án có nữ sáng lập hoặc đồng sáng lập."
              >
                {!charts.female_founders?.length ? (
                  <EmptyChart />
                ) : (
                  <div className="h-[340px]">
                    <ChartRenderer
                      data={charts.female_founders}
                      defaultType="pie"
                      allowedTypes={["pie", "bar", "horizontal"]}
                    />
                  </div>
                )}
              </ChartCard>
            </div>
            <ChartCard
              title="Số lượng đăng ký theo thời gian"
              description="Theo dõi xu hướng đăng ký theo ngày."
            >
              {!charts.timeline?.length ? (
                <EmptyChart />
              ) : (
                <div className="h-[350px] w-full">
                  <ChartRenderer
                    data={charts.timeline}
                    defaultType="line"
                    allowedTypes={["line", "bar"]}
                  />
                </div>
              )}
            </ChartCard>
            {/* COURSES */}
            <ChartCard
              title="Đăng ký theo khóa học"
              description="So sánh số lượt đăng ký giữa các khóa đào tạo."
            >
              {!charts.courses?.length ? (
                <EmptyChart />
              ) : (
                <div className="h-[380px]">
                  <ChartRenderer
                    data={charts.courses}
                    defaultType="bar"
                    allowedTypes={["bar", "horizontal", "pie"]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={100}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      name="Lượt đăng ký"
                      fill="#7c3aed"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={70}
                    />
                  </ChartRenderer>
                </div>
              )}
            </ChartCard>
            {/* STATUS*/}
            <ChartCard
              title="Trạng thái đăng ký"
              description="Phân bố hồ sơ theo trạng thái xử lý."
            >
              {!charts.statuses?.length ? (
                <EmptyChart />
              ) : (
                <div className="h-[330px]">
                  <ChartRenderer
                    data={normalizeLabels(charts.statuses, statusLabels)}
                    defaultType="pie"
                    allowedTypes={["pie", "bar", "horizontal"]}
                  />
                </div>
              )}
            </ChartCard>
            <ChartCard
              title="Biểu đồ tùy chọn"
              description="Chọn nhóm dữ liệu và kiểu biểu đồ muốn xem."
            >
              <div className="mb-5 max-w-sm">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Dữ liệu thống kê
                </label>

                <select
                  value={customMetric}
                  onChange={(event) => setCustomMetric(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                >
                  {Object.entries(customChartOptions).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {!customChartOptions[customMetric]?.data?.length ? (
                <EmptyChart />
              ) : (
                <div className="h-[420px]">
                  <ChartRenderer
                    data={customChartOptions[customMetric].data}
                    defaultType="bar"
                    allowedTypes={["bar", "horizontal", "pie", "line"]}
                  />
                </div>
              )}
            </ChartCard>
            {/* TOPICS
            <ChartCard
              title="Đăng ký theo chủ đề"
              description="Số lượng học viên theo từng chủ đề đào tạo."
            >
              {!charts.topics?.length ? (
                <EmptyChart />
              ) : (
                <div
                  style={{
                    height: Math.max(350, charts.topics.length * 45),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.topics}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 30,
                        left: 40,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                      <XAxis type="number" allowDecimals={false} />

                      <YAxis type="category" dataKey="name" width={220} />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        name="Học viên"
                        fill="#ea580c"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard> */}
          </div>
        )}
      </div>
    </div>
  );
}
