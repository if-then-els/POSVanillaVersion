const nodemailer = require("nodemailer");

const sendResetLinkEmail = async (recipientEmail, resetLink) => {
  try {
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
      subject: "Password Reset Link for SwiftPOS",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetLink}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; 
                    color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>If you didn't request this, please ignore this email.</p>
          <p><strong>Note:</strong> This link expires in 1 hour.</p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Can't click the button? Copy and paste this URL into your browser:<br>
            ${resetLink}
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Reset link email sent successfully!");
  } catch (error) {
    console.error("Error sending reset link email:", error);
    throw new Error("Failed to send reset link email");
  }
};

module.exports = sendResetLinkEmail;
