const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const categoryRoutes = require("./routes/categoryRoutes");
const activityRoutes = require("./routes/activityRoutes");
const courseRoutes = require("./routes/courseRoutes");
const courseClassRoutes = require("./routes/courseClassRoutes");
const courseClassSessionRoutes = require("./routes/courseClassSessionRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const importRoutes = require("./routes/importRoutes");
const classContentRoutes = require("./routes/classContentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const trainingClassRoutes = require("./routes/trainingClassRoutes");
const trainingProgramRoutes = require("./routes/trainingProgramRoutes");
const trainingCourseRoutes = require("./routes/trainingCourseRoutes");
const sihubImportRoutes = require("./routes/sihubImportRoutes");
const startupConnectionRoutes = require("./routes/startupConnectionRoutes");
const networkingEventRoutes = require("./routes/networkingEventRoutes");
const incubationProfileRoutes = require("./routes/incubationProfileRoutes");
const incubationProgramRoutes = require("./routes/incubationProgramRoutes");
const adminRoutes = require("./routes/adminRoutes");
const exhibitionSurveyRoutes = require("./routes/exhibitionSurveyRoutes");
const incubationImportRoutes = require("./routes/incubationImportRoutes");
const adminActivityLogRoutes = require("./routes/adminActivityLogRoutes");
const eventImageRoutes = require("./routes/eventImageRoutes");
const courseAttendanceRoutes = require("./routes/courseAttendanceRoutes");
const courseReportRoutes = require("./routes/courseReportRoutes");
const eventReportRoutes = require("./routes/eventReportRoutes");
const SyncCourseClassStatusJob = require("./jobs/syncCourseClassStatusJob");
const googleFormImportRoutes = require("./routes/googleFormImportRoutes");
const app = express();

const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/*
 * Nếu chạy sau Nginx hoặc reverse proxy.
 */
app.set("trust proxy", 1);

/*
 * Chỉ cho phép frontend hợp lệ gọi API.
 * Khi frontend và backend cùng domain, CORS gần như không còn là vấn đề,
 * nhưng vẫn giữ cấu hình này để chạy local.
 */
const allowedOrigins = ["http://localhost:5173", FRONTEND_URL].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Cho phép request không có Origin:
       * Postman, server-to-server, health check.
       */
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin không được phép: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

/*
 * Public uploads
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/*
 * API routes
 */
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-classes", courseClassRoutes);
app.use("/api/course-class-sessions", courseClassSessionRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/import", importRoutes);
app.use("/api/class-contents", classContentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/classes", trainingClassRoutes);
app.use("/api/training-programs", trainingProgramRoutes);
app.use("/api/training-courses", trainingCourseRoutes);
app.use("/api/sihub-import", sihubImportRoutes);
app.use("/api/startup-connection", startupConnectionRoutes);
app.use("/api/networking-events", networkingEventRoutes);
app.use("/api/incubation-profiles", incubationProfileRoutes);
app.use("/api/incubation-programs", incubationProgramRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/exhibition-surveys", exhibitionSurveyRoutes);
app.use("/api/incubation-import", incubationImportRoutes);
app.use("/api/admin-activity-logs", adminActivityLogRoutes);
app.use("/api/event-images", eventImageRoutes);
app.use("/api/course-attendance", courseAttendanceRoutes);
app.use("/api/reports/courses", courseReportRoutes);
app.use("/api/reports/events", eventReportRoutes);
app.use("/api/google-form-import", googleFormImportRoutes);
/*
 * Health check dùng khi deploy.
 */
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "SIHUB Backend API đang hoạt động.",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/*
 * Route gốc Backend.
 */
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "SIHUB Backend API Running",
  });
});

/*
 * Không tìm thấy API.
 */
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Không tìm thấy API.",
  });
});

/*
 * Error handler cuối cùng.
 */
app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  return res.status(error.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Hệ thống đang gặp lỗi. Vui lòng thử lại sau."
        : error.message || "Lỗi máy chủ.",
  });
});
const STATUS_SYNC_INTERVAL = 5 * 60 * 1000;

const syncCourseClassStatus = async () => {
  try {
    const result = await SyncCourseClassStatusJob.run();

    if (result.closed > 0) {
      console.log(`[Class Status] Đã chuyển ${result.closed} đợt sang CLOSED.`);
    }

    if (result.finished > 0) {
      console.log(
        `[Class Status] Đã chuyển ${result.finished} đợt sang FINISHED.`,
      );
    }
  } catch (error) {
    console.error("[Class Status] Sync lỗi:", error);
  }
};
// Chạy ngay khi Backend khởi động
syncCourseClassStatus();

// Sau đó mỗi 5 phút chạy lại
setInterval(syncCourseClassStatus, STATUS_SYNC_INTERVAL);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SIHUB Backend chạy tại cổng ${PORT}`);
});
