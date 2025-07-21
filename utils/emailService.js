// utils/emailService.js (or wherever you prefer to put it)
const nodemailer = require("nodemailer");

const sendResetCodeEmail = async (recipientEmail, resetCode) => {
  try {
    // Create a Nodemailer transporter using Gmail SMTP
    // IMPORTANT: For security, avoid hardcoding credentials directly in your code.
    // Use environment variables (e.g., process.env.GMAIL_APP_PASSWORD, process.env.GMAIL_USER)
    // You'll need to generate an "App password" for your Gmail account if you have 2-factor authentication enabled.
    // See: https://support.google.com/accounts/answer/185833
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: recipientEmail,
      subject: "Password Reset Code",
      html: `
                <p>You requested a password reset. Your reset code is:</p>
                <h3>${resetCode}</h3>
                <p>This code is valid for a short period. Do not share it with anyone.</p>
                <p>If you did not request a password reset, please ignore this email.</p>
            `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Reset code email sent successfully!");
  } catch (error) {
    console.error("Error sending reset code email:", error);
    throw new Error("Failed to send reset code email");
  }
};

module.exports = sendResetCodeEmail;
