import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* SIDEBAR */}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/40
            lg:hidden
          "
        />
      )}

      {/* MAIN CONTENT */}

      <div
        className="
          min-h-screen
          transition-all
          duration-300
          lg:ml-64
        "
      >
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <main
          className="
            min-h-[calc(100vh-72px)]
            p-4
            sm:p-6
            lg:p-8
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
