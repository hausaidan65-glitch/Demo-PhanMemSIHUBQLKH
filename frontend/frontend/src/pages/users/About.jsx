import { Lightbulb, Users, Rocket, Target, Award } from "lucide-react";

export default function About() {
  const values = [
    {
      icon: <Lightbulb />,
      title: "Đổi mới sáng tạo",
      desc: "Thúc đẩy tư duy sáng tạo và ứng dụng công nghệ vào giải quyết vấn đề thực tế.",
    },

    {
      icon: <Users />,
      title: "Kết nối cộng đồng",
      desc: "Xây dựng mạng lưới Startup, doanh nghiệp, chuyên gia và sinh viên.",
    },

    {
      icon: <Rocket />,
      title: "Phát triển Startup",
      desc: "Đồng hành cùng các ý tưởng từ giai đoạn hình thành đến phát triển.",
    },
  ];

  return (
    <div>
      {/* HERO */}

      <section
        className="
            bg-green-700
            text-white
            py-20
            "
      >
        <div
          className="
                max-w-7xl
                mx-auto
                px-6
                text-center
                "
        >
          <h1
            className="
                    text-5xl
                    font-bold
                    "
          >
            Về SIHUB
          </h1>

          <p
            className="
                    mt-6
                    text-lg
                    text-green-100
                    max-w-3xl
                    mx-auto
                    "
          >
            SIHUB là nền tảng kết nối đổi mới sáng tạo, hỗ trợ Startup, doanh
            nghiệp và sinh viên phát triển ý tưởng thành giá trị thực tế.
          </p>
        </div>
      </section>

      {/* INTRODUCTION */}

      <section
        className="
            max-w-7xl
            mx-auto
            px-6
            py-20
            grid
            md:grid-cols-2
            gap-12
            items-center
            "
      >
        <div>
          <h2
            className="
                    text-4xl
                    font-bold
                    "
          >
            Trung tâm đổi mới sáng tạo
          </h2>

          <p
            className="
                    mt-5
                    text-gray-600
                    leading-8
                    "
          >
            SIHUB đồng hành cùng cộng đồng khởi nghiệp thông qua các chương
            trình đào tạo, hội thảo, workshop và hoạt động kết nối chuyên gia.
          </p>

          <p
            className="
                    mt-5
                    text-gray-600
                    leading-8
                    "
          >
            Chúng tôi hướng đến việc xây dựng một hệ sinh thái đổi mới sáng tạo,
            nơi mọi ý tưởng đều có cơ hội phát triển.
          </p>
        </div>

        <div
          className="
                bg-green-100
                rounded-3xl
                p-10
                "
        >
          <Target
            size={70}
            className="
                    text-green-700
                    "
          />

          <h3
            className="
                    text-2xl
                    font-bold
                    mt-5
                    "
          >
            Sứ mệnh
          </h3>

          <p
            className="
                    mt-3
                    text-gray-700
                    "
          >
            Kết nối tri thức, công nghệ và cộng đồng để thúc đẩy đổi mới sáng
            tạo.
          </p>
        </div>
      </section>

      {/* VISION */}

      <section
        className="
            bg-gray-100
            py-20
            "
      >
        <div
          className="
                max-w-7xl
                mx-auto
                px-6
                "
        >
          <h2
            className="
                    text-4xl
                    font-bold
                    text-center
                    "
          >
            Tầm nhìn của SIHUB
          </h2>

          <p
            className="
                    text-center
                    mt-5
                    text-gray-600
                    max-w-3xl
                    mx-auto
                    "
          >
            Trở thành hệ sinh thái đổi mới sáng tạo hàng đầu, nơi kết nối
            Startup, doanh nghiệp và nguồn nhân lực trẻ.
          </p>
        </div>
      </section>

      {/* VALUES */}

      <section
        className="
            max-w-7xl
            mx-auto
            px-6
            py-20
            "
      >
        <h2
          className="
                text-4xl
                font-bold
                text-center
                "
        >
          Giá trị cốt lõi
        </h2>

        <div
          className="
                grid
                md:grid-cols-3
                gap-8
                mt-12
                "
        >
          {values.map((item, index) => (
            <div
              key={index}
              className="
                            bg-white
                            rounded-3xl
                            shadow
                            p-8
                            hover:-translate-y-2
                            transition
                            "
            >
              <div
                className="
                                text-green-600
                                "
              >
                {item.icon}
              </div>

              <h3
                className="
                                text-xl
                                font-bold
                                mt-5
                                "
              >
                {item.title}
              </h3>

              <p
                className="
                                mt-3
                                text-gray-600
                                "
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ACHIEVEMENT */}

      <section
        className="
            bg-green-700
            text-white
            py-20
            "
      >
        <div
          className="
                max-w-5xl
                mx-auto
                px-6
                grid
                md:grid-cols-3
                gap-8
                text-center
                "
        >
          <div>
            <Award
              className="
                        mx-auto
                        "
            />

            <h3
              className="
                        text-4xl
                        font-bold
                        mt-3
                        "
            >
              100+
            </h3>

            <p>Chương trình đào tạo</p>
          </div>

          <div>
            <Users
              className="
                        mx-auto
                        "
            />

            <h3
              className="
                        text-4xl
                        font-bold
                        mt-3
                        "
            >
              5000+
            </h3>

            <p>Thành viên cộng đồng</p>
          </div>

          <div>
            <Rocket
              className="
                        mx-auto
                        "
            />

            <h3
              className="
                        text-4xl
                        font-bold
                        mt-3
                        "
            >
              200+
            </h3>

            <p>Startup được hỗ trợ</p>
          </div>
        </div>
      </section>
    </div>
  );
}
