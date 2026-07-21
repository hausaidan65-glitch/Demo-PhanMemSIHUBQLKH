import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const { classId } = useParams();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    email: "",
    gender: "MALE",
    age_group: "",
    company: "",
    position: "",
    user_type: "STARTUP",

    commitment_file: "",

    has_project: true,

    project_field: "",

    startup_stage: "",

    project_description: "",

    incubation_status: "Chưa tham gia",
  });

  const change = (e) => {
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        class_id: Number(classId),

        ...form,
      };

      const res = await axios.post(
        "http://localhost:5000/api/registrations",

        data,
      );

      alert(res.data.message);

      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi đăng ký");
    }
  };

  return (
    <div
      className="
max-w-4xl
mx-auto
p-6
"
    >
      <div
        className="
bg-white
rounded-2xl
shadow
p-8
"
      >
        <h1
          className="
text-3xl
font-bold
mb-6
"
        >
          Đăng ký chương trình SIHUB
        </h1>

        <form
          onSubmit={submit}
          className="
space-y-5
"
        >
          <input
            name="fullname"
            placeholder="Họ và tên"
            onChange={change}
            className="input"
          />

          <input
            name="email"
            placeholder="Email"
            onChange={change}
            className="input"
          />

          <input
            name="phone"
            placeholder="Số điện thoại"
            onChange={change}
            className="input"
          />

          <select name="gender" onChange={change} className="input">
            <option value="MALE">Nam</option>

            <option value="FEMALE">Nữ</option>

            <option value="OTHER">Khác</option>
          </select>

          <input
            name="company"
            placeholder="Công ty"
            onChange={change}
            className="input"
          />

          <input
            name="position"
            placeholder="Chức vụ"
            onChange={change}
            className="input"
          />

          <select name="user_type" onChange={change} className="input">
            <option value="STARTUP">Startup</option>

            <option value="STUDENT">Sinh viên</option>

            <option value="BUSINESS">Doanh nghiệp</option>

            <option value="OTHER">Khác</option>
          </select>

          <h2
            className="
text-xl
font-bold
pt-4
"
          >
            Thông tin dự án
          </h2>

          <input
            name="project_field"
            placeholder="Lĩnh vực dự án"
            onChange={change}
            className="input"
          />

          <input
            name="startup_stage"
            placeholder="Giai đoạn Startup"
            onChange={change}
            className="input"
          />

          <textarea
            name="project_description"
            placeholder="Mô tả dự án"
            onChange={change}
            className="
input
h-32
"
          />

          <button
            className="
bg-blue-600
text-white
px-8
py-3
rounded-xl
"
          >
            Gửi đăng ký
          </button>
        </form>
      </div>
    </div>
  );
}
