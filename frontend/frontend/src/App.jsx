import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";

import Login from "./pages/login/Login";

// ADMIN

import Dashboard from "./pages/dashboard/Dashboard";
import Courses from "./pages/courses/Courses";
import Classes from "./pages/classes/Classes";

// USER

import Home from "./pages/users/Home";
import UserCourses from "./pages/users/Courses";
import CourseDetail from "./pages/users/CourseDetail";
import Register from "./pages/users/Register";
import Events from "./pages/users/Events";
import Workshops from "./pages/users/Workshops";
import About from "./pages/users/About";

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
        </Route>

        {/* =====================
ADMIN
===================== */}

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />

          <Route path="/admin/courses" element={<Courses />} />

          <Route path="/admin/classes" element={<Classes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
