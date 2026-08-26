import { useState } from "react";
import { LogIn } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setMessage("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("admin_token", res.data.token);

      localStorage.setItem("admin_info", JSON.stringify(res.data.admin));

      navigate("/admin", {
        replace: true,
      });
    } catch (error) {
      console.error("LOGIN ERROR:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 401) {
        setMessage(
          error.response?.data?.message ||
            "Tên đăng nhập hoặc mật khẩu không chính xác.",
        );

        return;
      }

      if (error.response?.status === 403) {
        setMessage(
          error.response?.data?.message ||
            "Tài khoản hiện không được phép đăng nhập.",
        );

        return;
      }

      setMessage(
        error.response?.data?.message || "Không thể kết nối tới hệ thống.",
      );
    }
  };

  return (
    <div
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-gray-100
        px-4
      "
    >
      <div
        className="
          w-full
          max-w-md
          rounded-xl
          bg-white
          p-8
          shadow-lg
        "
      >
        <div className="mb-6 text-center">
          <h1
            className="
              text-3xl
              font-bold
              text-blue-700
            "
          >
            SIHUB ADMIN
          </h1>

          <p className="mt-2 text-gray-500">Đăng nhập quản trị hệ thống</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block">Tên đăng nhập</label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              className="
                w-full
                rounded-lg
                border
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          <div>
            <label className="mb-2 block">Mật khẩu</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              className="
                w-full
                rounded-lg
                border
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          {message && (
            <p
              className="
                rounded-lg
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-600
              "
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-blue-600
              py-3
              text-white
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <LogIn size={20} />

            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
