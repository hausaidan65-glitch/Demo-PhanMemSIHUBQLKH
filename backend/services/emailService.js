const nodemailer = require("nodemailer");

class EmailService {
  static transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER,

      pass: process.env.EMAIL_PASS,
    },
  });

  static async sendRegisterMail(email, name, course) {
    const subject = "Đăng ký khóa học thành công";

    const html = `

            <h2>Xin chào ${name}</h2>

            <p>

            Bạn đã đăng ký thành công khóa học

            <b>${course}</b>

            </p>

            <br>

            <p>

            SIHUB sẽ liên hệ với bạn trong thời gian sớm nhất.

            </p>

        `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,

      to: email,

      subject,

      html,
    });

    return {
      subject,

      html,
    };
  }
}

module.exports = EmailService;
