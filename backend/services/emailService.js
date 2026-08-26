const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
class EmailService {
  static transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER,

      pass: process.env.EMAIL_PASS,
    },
  });

  static async sendRegisterMail(email, name, course, qrToken) {
    const subject = "Đăng ký khóa học thành công";

    const qrContent = `SIHUB:CHECKIN:${qrToken}`;

    const qrBuffer = await QRCode.toBuffer(qrContent, {
      type: "png",
      width: 400,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    const html = `
    <div
      style="
        font-family: Arial, Helvetica, sans-serif;
        max-width: 620px;
        margin: 0 auto;
        color: #222;
        line-height: 1.6;
      "
    >
      <h2>Đăng ký khóa học thành công</h2>

      <p>
        Xin chào <strong>${name}</strong>
      </p>

      <p>
        Bạn đã đăng ký thành công khóa học
        <strong>${course}</strong>.
      </p>

      <p>
        Vui lòng sử dụng mã QR dưới đây để
        <strong>điểm danh khi tham gia lớp học</strong>.
      </p>

      <div
        style="
          text-align: center;
          margin: 30px 0;
          padding: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        "
      >
        <p style="font-weight: bold;">
          MÃ QR ĐIỂM DANH
        </p>

        <img
          src="cid:sihub-checkin-qr"
          width="280"
          height="280"
          alt="Mã QR điểm danh SIHUB"
          style="display: block; margin: 15px auto;"
        />

        <p style="font-size: 13px; color: #666;">
          Vui lòng lưu lại email hoặc ảnh QR này
          để sử dụng khi điểm danh.
        </p>
      </div>

      <p>
        <strong>Lưu ý:</strong>
        Mã QR này được cấp riêng cho hồ sơ đăng ký của bạn.
        Vui lòng không chia sẻ cho người khác.
      </p>

      <p style="margin-top: 30px;">
        Trân trọng,<br />
        <strong>SIHUB</strong>
      </p>
    </div>
  `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,

      attachments: [
        {
          filename: "SIHUB-QR-Diem-Danh.png",
          content: qrBuffer,
          cid: "sihub-checkin-qr",
        },
      ],
    });

    return {
      subject,
      html,
    };
  }
}

module.exports = EmailService;
