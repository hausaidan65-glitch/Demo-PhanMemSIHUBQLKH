import { useState } from "react";
import { LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log({
      email,
      password,
    });

    // sau này nối API:
    // POST /api/auth/login
  };

  return (
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-gray-100
        "
    >
      <div
        className="
            bg-white
            w-full
            max-w-md
            rounded-xl
            shadow-lg
            p-8
            "
      >
        <div className="text-center mb-6">
          <h1
            className="
                    text-3xl
                    font-bold
                    text-blue-700
                    "
          >
            SIHUB ADMIN
          </h1>

          <p className="text-gray-500 mt-2">Đăng nhập quản trị hệ thống</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-2">Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sihub.com"
              className="
                        w-full
                        border
                        rounded-lg
                        px-4
                        py-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                        "
            />
          </div>

          <div>
            <label className="block mb-2">Mật khẩu</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="
                        w-full
                        border
                        rounded-lg
                        px-4
                        py-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                        "
            />
          </div>

          <button
            className="
                    w-full
                    bg-blue-600
                    text-white
                    py-3
                    rounded-lg
                    flex
                    justify-center
                    items-center
                    gap-2
                    hover:bg-blue-700
                    "
          >
            <LogIn size={20} />
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
