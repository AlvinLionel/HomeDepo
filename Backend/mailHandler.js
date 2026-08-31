const path = require("node:path");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
    }
});

const sendResetEmail = async (to, token) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Password reset request",
        text: `Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 30 minutes.`,
        html: ` <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Link</a>
                <p>This link will expire in 30 minutes.</p>`,
    })
}

module.exports = { sendResetEmail };