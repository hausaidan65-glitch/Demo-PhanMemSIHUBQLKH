import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";

import Login from "./pages/login/Login";

// ADMIN

import ProtectedAdminRoute from "./router/ProtectedAdminRoute";
import Dashboard from "./pages/dashboard/Dashboard";
import Courses from "./pages/courses/Courses";
import RegistrationsManagement from "./admin/RegisterManagement";
import AdminImportStudents from "./admin/AdminImportStudents";
import ClassManagement from "./admin/ClassManagement";
import ClassAttendance from "./admin/attendance/ClassAttendance";
import Programs from "./admin/Programs";
import AdminImportClassStudent from "./admin/AdminImportClassStudents";
import StartupConnectionDay from "./admin/StartupConnectionDay";
import NetworkingEventManagement from "./admin/NetworkingEventManagement";
import AdminIncubationPrograms from "./admin/AdminIncubationPrograms";
import AdminIncubationProfiles from "./admin/AdminIncubationProfiles";
import AdminActivityLogs from "./admin/AdminActivityLogs";
import AdminTrash from "./admin/AdminTrash";

// USER

import Home from "./pages/users/Home";
import UserCourses from "./pages/users/Courses";
import CourseDetail from "./pages/users/CourseDetail";
import Register from "./pages/users/Register";
import Events from "./pages/users/Events";
import Workshops from "./pages/users/Workshops";
import About from "./pages/users/About";
import Program from "./pages/users/Program";
import StartupEventDetail from "./pages/users/StartupEventDetail";
import StartupEventRegister from "./pages/users/StartupEventRegister";
import IncubationPrograms from "./pages/users/IncubationPrograms";
import IncubationProgramDetail from "./pages/users/IncubationProgramDetail";
import IncubationApplication from "./pages/users/IncubationApplication";
import Exhibitions from "./pages/users/Exhibitions";
import ExhibitionDetail from "./pages/users/ExhibitionDetail";
import ExhibitionSurvey from "./pages/users/ExhibitionSurvey";
import NetworkingEventDetail from "./pages/users/NetworkingEventDetail";
import NetworkingEventRegister from "./pages/users/NetworkingEventRegister";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================
LOGIN
===================== */}

        <Route path="/login" element={<Login />} />

        {/* =====================
USER WEBSITE
===================== */}

        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />

          <Route path="/courses" element={<UserCourses />} />

          <Route path="/courses/:id" element={<CourseDetail />} />

          <Route path="/register/:classId" element={<Register />} />

          <Route path="/events" element={<Events />} />

          <Route path="/workshops" element={<Workshops />} />

          <Route path="/about" element={<About />} />

          <Route
            path="/startup-connection-day/:id"
            element={<StartupEventDetail />}
          />
          <Route
            path="/startup-connection-day/:id/register"
            element={<StartupEventRegister />}
          />
          <Route path="/incubation-programs" element={<IncubationPrograms />} />
          <Route
            path="/incubation-programs/:id"
            element={<IncubationProgramDetail />}
          />
          <Route
            path="/incubation-programs/:id/apply"
            element={<IncubationApplication />}
          />
          <Route path="exhibitions" element={<Exhibitions />} />

          <Route path="exhibitions/:id" element={<ExhibitionDetail />} />

          <Route path="exhibitions/:id/survey" element={<ExhibitionSurvey />} />
          <Route
            path="/networking-events/:id"
            element={<NetworkingEventDetail />}
          />

          <Route
            path="/networking-events/:id/register"
            element={<NetworkingEventRegister />}
          />
        </Route>

        {/* =====================
ADMIN
===================== */}

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />

            <Route path="programs" element={<Programs />} />

            <Route path="courses" element={<Courses />} />

            <Route path="registrations" element={<RegistrationsManagement />} />

            <Route path="import-students" element={<AdminImportStudents />} />

            <Route path="classes" element={<ClassManagement />} />
            <Route
              path="classes/openings/:classId/attendance"
              element={<ClassAttendance />}
            />

            <Route
              path="import-class-students"
              element={<AdminImportClassStudent />}
            />

            <Route
              path="startup-connection-day/exhibitions"
              element={<StartupConnectionDay eventType="EXHIBITION" />}
            />

            <Route
              path="startup-connection-day/seminars"
              element={<StartupConnectionDay eventType="SEMINAR" />}
            />
            <Route
              path="networking-events"
              element={<NetworkingEventManagement />}
            />
            <Route
              path="/admin/incubation-programs"
              element={<AdminIncubationPrograms />}
            />

            <Route
              path="/admin/incubation-profiles"
              element={<AdminIncubationProfiles />}
            />
            <Route path="activity-logs" element={<AdminActivityLogs />} />

            <Route path="trash" element={<AdminTrash />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
