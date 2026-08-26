import { Search, Bell, Menu, ChevronDown, ExternalLink } from "lucide-react";

import { useEffect, useState } from "react";

import axios from "axios";

import { Link } from "react-router-dom";

export default function Topbar({ onOpenSidebar }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const [showNotifications, setShowNotifications] = useState(false);

  let admin = null;

  try {
    admin = JSON.parse(localStorage.getItem("admin_info") || "null");
  } catch {
    admin = null;
  }

  const handleNotificationClick = async (item) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/notifications/${item.id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        },
      );

      await Promise.all([fetchNotifications(), fetchUnread()]);

      setShowNotifications(false);

      if (item.reference_id) {
        window.location.href = `/admin/registrations?registration_id=${item.reference_id}`;
      }
    } catch (error) {
      console.log("Lỗi click notification:", error.response?.data || error);
    }
  };
  const fetchUnread = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      const res = await axios.get(
        "http://localhost:5000/api/notifications/count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUnreadCount(res.data.total);
    } catch (error) {
      console.log("Lỗi unread notification:", error.response?.data || error);
    }
  };
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(res.data.data || []);
    } catch (error) {
      console.log("Lỗi lấy thông báo:", error.response?.data || error);
    }
  };
  useEffect(() => {
    // Lấy thông báo ngay khi Admin mở trang
    fetchNotifications();
    fetchUnread();

    // Sau mỗi 15 giây tự kiểm tra thông báo mới
    const notificationInterval = setInterval(() => {
      fetchNotifications();
      fetchUnread();
    }, 15000);

    // Dọn interval khi Topbar bị unmount
    return () => {
      clearInterval(notificationInterval);
    };
  }, []);

  const getInitials = () => {
    if (!admin?.fullname) {
      return "A";
    }

    return admin.fullname
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };
  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-[72px]
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white/95
        px-4
        backdrop-blur
        sm:px-6
        lg:px-8
      "
    >
      {/* LEFT */}

      <div
        className="
          flex
          min-w-0
          flex-1
          items-center
          gap-3
        "
      >
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Mở menu"
          className="
            rounded-xl
            border
            border-slate-200
            p-2.5
            text-slate-600
            hover:bg-slate-100
            lg:hidden
          "
        >
          <Menu size={21} />
        </button>
      </div>

      {/* RIGHT */}

      <div
        className="
          ml-4
          flex
          items-center
          gap-2
          sm:gap-3
        "
      >
        <Link
          to="/"
          title="Xem website"
          className="
            hidden
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            px-3
            py-2
            text-sm
            font-medium
            text-slate-600
            transition
            hover:border-green-300
            hover:bg-green-50
            hover:text-green-700
            md:flex
          "
        >
          <ExternalLink size={17} />
          Xem website
        </Link>

        <div className="relative">
          <button
            type="button"
            aria-label="Thông báo"
            onClick={() => setShowNotifications(!showNotifications)}
            className="
    relative
    rounded-xl
    p-2.5
    text-slate-600
    transition
    hover:bg-slate-100
  "
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span
                className="
absolute
right-1
top-1
flex
h-4
w-4
items-center
justify-center
rounded-full
bg-red-500
text-[10px]
font-bold
text-white
"
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="
absolute
right-0
top-12
z-50
w-96
max-h-[420px]
overflow-y-auto
rounded-xl
border
bg-white
shadow-xl
"
            >
              <div
                className="
sticky
top-0
z-10
border-b
bg-white
p-4
font-semibold
"
              >
                Thông báo
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  Không có thông báo
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`
cursor-pointer
border-b
p-3
hover:bg-gray-50
${item.is_read === 0 ? "bg-green-50" : ""}
`}
                  >
                    <p className="font-medium">{item.title}</p>

                    <p className="text-sm text-gray-600">{item.message}</p>

                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="
            flex
            items-center
            gap-3
            rounded-xl
            p-1.5
            text-left
            transition
            hover:bg-slate-100
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-full
              bg-green-600
              text-xs
              font-bold
              text-white
            "
          >
            {admin?.avatar ? (
              <img
                src={admin.avatar}
                alt={admin.fullname}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              getInitials()
            )}
          </div>

          <div className="hidden sm:block">
            <p
              className="
                max-w-36
                truncate
                text-sm
                font-semibold
                text-slate-800
              "
            >
              {admin?.fullname || "Quản trị viên"}
            </p>

            <p
              className="
                text-xs
                text-slate-500
              "
            >
              {admin?.role || "ADMIN"}
            </p>
          </div>

          <ChevronDown
            size={16}
            className="
              hidden
              text-slate-400
              sm:block
            "
          />
        </button>
      </div>
    </header>
  );
}
