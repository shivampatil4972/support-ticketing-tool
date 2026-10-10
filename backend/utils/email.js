const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    // Skip email sending if credentials are not configured
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === "your-email@gmail.com" ||
      process.env.EMAIL_PASS === "your-email-app-password"
    ) {
      console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject} (SMTP not configured)`);
      return;
    }

    await getTransporter().sendMail({
      from: `"Support Ticket System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Email Error:", error.message);
  }
};

module.exports = { sendEmail };
