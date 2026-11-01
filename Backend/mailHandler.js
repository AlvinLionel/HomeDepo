const path = require("node:path");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER;
const smtpPassword = process.env.SMTP_PASS || process.env.MAILTRAP_PASS;
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: smtpUser,
        pass: smtpPassword
    }
});

const supportCategories = {
    order: "Orders and products",
    peer_marketplace: "Pre-loved marketplace",
    store_account: "Local store account",
    account_security: "Account and security",
    other: "Something else",
};

function isSupportEmailConfigured() {
    const values = [
        process.env.SUPPORT_EMAIL,
        smtpUser,
        smtpPassword,
        process.env.EMAIL_NAME,
        process.env.EMAIL_USER,
    ];
    return values.every((value) => {
        const normalized = value?.trim() || "";
        return normalized.length > 0 &&
            !/^(your[_-]|change.?me|example|placeholder|<)/i.test(normalized);
    });
}

function getPublicSupportDetails() {
    return {
        email: process.env.SUPPORT_EMAIL?.trim() || "",
        phone: process.env.SUPPORT_PHONE?.trim() || "",
        whatsapp: (process.env.SUPPORT_WHATSAPP || "").replace(/\D/g, ""),
        hours: process.env.SUPPORT_HOURS?.trim() || "",
        formAvailable: isSupportEmailConfigured(),
    };
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

async function sendSupportRequest({ name, email, category, orderReference, message }) {
    if (!isSupportEmailConfigured()) {
        const error = new Error("Customer support email is not configured.");
        error.code = "SUPPORT_NOT_CONFIGURED";
        throw error;
    }

    const categoryLabel = supportCategories[category];
    if (!categoryLabel) {
        throw new Error("Unsupported support request category.");
    }
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeOrderReference = escapeHtml(orderReference || "Not provided");
    const safeMessage = escapeHtml(message);
    const text = [
        `From: ${name} <${email}>`,
        `Category: ${categoryLabel}`,
        `Order/reference: ${orderReference || "Not provided"}`,
        "",
        message,
    ].join("\n");

    await transporter.sendMail({
        from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
        to: process.env.SUPPORT_EMAIL.trim(),
        replyTo: email,
        subject: `HomeX support: ${categoryLabel}`,
        text,
        html: `<h2>HomeX support request</h2>
            <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
            <p><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
            <p><strong>Order/reference:</strong> ${safeOrderReference}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap">${safeMessage}</p>`,
    });
}

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

module.exports = {
    getPublicSupportDetails,
    isSupportEmailConfigured,
    sendResetEmail,
    sendSupportRequest,
};