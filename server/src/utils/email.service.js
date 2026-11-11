
const { Resend } = require("resend");

async function sendVerificationEmail({ to, username, verificationUrl }) {
  // Initialize Resend only when an email actually needs to be sent.
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.");
    throw new Error("Unable to send verification email.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [to],
    subject: "Verify your InstaSpace email",
    text: [
      `Hi ${username},`,
      "",
      "Thanks for registering with InstaSpace.",
      "Verify your email using the link below:",
      verificationUrl,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Welcome to InstaSpace!</h2>
        <p>Hi ${escapeHtml(username)},</p>
        <p>Please verify your email address to activate your account.</p>
        <p>
          <a href="${verificationUrl}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">
            Verify email
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Unable to send verification email.");
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

module.exports = { sendVerificationEmail };
