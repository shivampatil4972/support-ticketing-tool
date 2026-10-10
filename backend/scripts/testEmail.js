// Sends a test email to EMAIL_USER to confirm the SMTP settings in .env.
//
//   npm run test:email

require('dotenv').config();

const { sendEmail } = require('../utils/email');

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
