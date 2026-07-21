const express = require("express");
const cors = require("cors");
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
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-classes", courseClassRoutes);
app.use("/api/course-class-sessions", courseClassSessionRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: " SIHUB Backend API Running...",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running: http://localhost:${PORT}`);
});
