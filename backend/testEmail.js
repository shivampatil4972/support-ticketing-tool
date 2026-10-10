require('dotenv').config();

const { sendEmail } = require('./utils/email');

(async () => {
  await sendEmail({
    to: process.env.EMAIL_USER,
    subject: 'Support Ticket Tool Test',
    html: `
      <h2>Email Test Successful 🎉</h2>
      <p>Your Nodemailer configuration is working correctly.</p>
    `
  });

  process.exit();
})();