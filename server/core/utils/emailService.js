/**
 * Email Service — Nodemailer + Gmail SMTP
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPLETELY FREE. No credit card. No third-party billing.
 * Gmail allows 500 emails/day which is more than enough for a growing platform.
 *
 * SETUP (one-time, 2 minutes):
 *  1. Create / use a Gmail account (e.g. farm2home.noreply@gmail.com)
 *  2. Enable 2-Factor Authentication on that Google account
 *  3. Go to: myaccount.google.com → Security → 2-Step Verification → App passwords
 *  4. Create a new App Password → choose "Mail" + "Other (custom)" → copy the 16-char key
 *  5. Set in server/.env:
 *       EMAIL_USER=your_gmail@gmail.com
 *       EMAIL_PASS=abcd efgh ijkl mnop   ← the 16-char app password (spaces ok)
 *       EMAIL_FROM=Farm2Home <your_gmail@gmail.com>
 */

const nodemailer = require('nodemailer');

// ── Transporter ───────────────────────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASS in .env');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s/g, ''), // strip spaces from app password
    },
  });
  return transporter;
};

// ── Send helper ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL SKIPPED - not configured] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || `Farm2Home <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    console.log(`✉️  Email sent → ${to} | ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Brand wrapper ─────────────────────────────────────────────────────────────
const branded = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f3f4f6; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#16a34a,#15803d); padding:32px 36px; text-align:center; }
    .header img { width:48px; height:48px; }
    .header h1 { margin:12px 0 0; color:#fff; font-size:22px; font-weight:800; letter-spacing:-0.3px; }
    .header p  { margin:4px 0 0; color:rgba(255,255,255,0.8); font-size:13px; }
    .body { padding:32px 36px; }
    .body h2 { margin:0 0 16px; color:#111827; font-size:20px; font-weight:700; }
    .body p  { margin:0 0 14px; color:#374151; font-size:15px; line-height:1.6; }
    .btn { display:inline-block; margin:8px 0; padding:13px 28px; background:#16a34a; color:#fff; font-weight:700; font-size:15px; text-decoration:none; border-radius:10px; }
    .info-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px 20px; margin:16px 0; }
    .info-box p { margin:4px 0; font-size:14px; color:#166534; }
    .info-box strong { color:#15803d; }
    .badge { display:inline-block; padding:4px 12px; border-radius:99px; font-size:12px; font-weight:700; background:#dcfce7; color:#166534; }
    .divider { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
    .footer { padding:20px 36px 28px; text-align:center; }
    .footer p { margin:4px 0; font-size:12px; color:#9ca3af; }
    .otp-box { font-size:36px; font-weight:900; letter-spacing:8px; color:#16a34a; text-align:center; padding:24px; background:#f0fdf4; border-radius:12px; margin:20px 0; border:2px dashed #86efac; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🌾 Farm2Home</h1>
      <p>Fresh from farms, delivered to your door</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <hr class="divider" style="margin:0"/>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Farm2Home · Connecting farmers and families</p>
      <p>If you didn't request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Email Verification OTP
 */
const sendVerificationEmail = async ({ to, name, otp }) => {
  return sendEmail({
    to,
    subject: '🌿 Verify your Farm2Home email',
    html: branded('Verify Your Email', `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to Farm2Home! Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div class="otp-box">${otp}</div>
      <p style="text-align:center;color:#6b7280;font-size:13px;">Enter this code in the app to continue.</p>
      <p>If you didn't sign up for Farm2Home, you can safely ignore this email.</p>
    `),
  });
};

/**
 * 2. Forgot Password — Reset Link
 */
const sendPasswordResetEmail = async ({ to, name, resetToken, baseUrl }) => {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  return sendEmail({
    to,
    subject: '🔑 Reset your Farm2Home password',
    html: branded('Reset Your Password', `
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your Farm2Home password. Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" class="btn">Reset Password →</a>
      </div>
      <p style="font-size:13px;color:#9ca3af;word-break:break-all;">Or copy this link: ${resetUrl}</p>
      <p>If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
    `),
  });
};

/**
 * 3. Order Confirmation (sent to customer after placing order)
 */
const sendOrderConfirmationEmail = async ({ to, name, order }) => {
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${item.product?.name || item.name || 'Product'}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;">${item.quantity} ${item.unit || ''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827;font-size:14px;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const addr = order.deliveryAddress;
  const addressStr = addr ? `${addr.street}, ${addr.city}, ${addr.state} — ${addr.pincode}` : '—';

  return sendEmail({
    to,
    subject: `✅ Order confirmed — #${order.orderNumber || order._id?.toString().slice(-8).toUpperCase()}`,
    html: branded('Order Confirmed! 🎉', `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for your order! We've received it and the farmer has been notified. Here's your order summary:</p>

      <div class="info-box">
        <p><strong>Order ID:</strong> #${order.orderNumber || order._id?.toString().slice(-8).toUpperCase()}</p>
        <p><strong>Status:</strong> <span class="badge">${order.status || 'pending'}</span></p>
        <p><strong>Payment:</strong> ${(order.payment?.method || 'cod').toUpperCase()} — ₹${(order.payment?.totalAmount || 0).toLocaleString('en-IN')}</p>
        <p><strong>Delivery to:</strong> ${addressStr}</p>
      </div>

      <p style="font-weight:700;color:#111827;margin-bottom:8px;">Items ordered:</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:8px;font-size:12px;color:#9ca3af;text-transform:uppercase;">Product</th>
            <th style="text-align:center;padding-bottom:8px;font-size:12px;color:#9ca3af;text-transform:uppercase;">Qty</th>
            <th style="text-align:right;padding-bottom:8px;font-size:12px;color:#9ca3af;text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:right;margin-top:12px;padding-top:12px;border-top:2px solid #111827;">
        <span style="font-size:18px;font-weight:900;color:#16a34a;">Total: ₹${(order.payment?.totalAmount || 0).toLocaleString('en-IN')}</span>
      </div>

      <p style="margin-top:24px;">We'll send you another email once your order is out for delivery. You can also track your order anytime from your dashboard.</p>
    `),
  });
};

/**
 * 4. Order Status Update (shipped, delivered etc.)
 */
const sendOrderStatusEmail = async ({ to, name, order, newStatus }) => {
  const statusMessages = {
    'confirmed':      { emoji: '✅', title: 'Order Confirmed', msg: 'Your order has been confirmed and the farmer is preparing it.' },
    'preparing':      { emoji: '👨‍🌾', title: 'Being Prepared', msg: 'The farmer is carefully packing your fresh produce.' },
    'ready-to-ship':  { emoji: '📦', title: 'Ready to Ship', msg: 'Your order is packed and ready for pickup by the delivery agent.' },
    'shipped':        { emoji: '🛵', title: 'Out for Delivery', msg: 'Your order is on the way! A delivery agent has picked it up.' },
    'delivered':      { emoji: '🏠', title: 'Delivered!', msg: 'Your order has been delivered. Enjoy your fresh farm produce!' },
    'cancelled':      { emoji: '❌', title: 'Order Cancelled', msg: 'Your order has been cancelled. If you paid online, a refund will be processed.' },
    'payment-approved':{ emoji: '💳', title: 'Payment Approved', msg: 'Your payment has been verified and the order is now confirmed.' },
  };

  const s = statusMessages[newStatus] || { emoji: '📋', title: `Order ${newStatus}`, msg: `Your order status has been updated to: ${newStatus}.` };

  return sendEmail({
    to,
    subject: `${s.emoji} Order #${order.orderNumber} — ${s.title}`,
    html: branded(`${s.emoji} ${s.title}`, `
      <p>Hi <strong>${name}</strong>,</p>
      <p>${s.msg}</p>
      <div class="info-box">
        <p><strong>Order ID:</strong> #${order.orderNumber || order._id?.toString().slice(-8).toUpperCase()}</p>
        <p><strong>New Status:</strong> <span class="badge">${newStatus}</span></p>
        <p><strong>Total:</strong> ₹${(order.payment?.totalAmount || 0).toLocaleString('en-IN')}</p>
      </div>
      ${newStatus === 'delivered' ? '<p>🌟 Please rate your experience on the Farm2Home app — it helps farmers grow their business!</p>' : ''}
    `),
  });
};

/**
 * 5. Welcome Email (after registration)
 */
const sendWelcomeEmail = async ({ to, name, role }) => {
  const roleMessages = {
    farmer:   { msg: 'Start listing your fresh produce and connect with customers in your area.', cta: 'Go to Farmer Dashboard' },
    delivery: { msg: 'Once approved, you can start accepting delivery assignments in the app.', cta: 'Go to Delivery Dashboard' },
    customer: { msg: 'Browse fresh vegetables, fruits, and dairy products directly from local farmers.', cta: 'Browse Products' },
  };
  const r = roleMessages[role] || roleMessages.customer;

  return sendEmail({
    to,
    subject: '🌾 Welcome to Farm2Home!',
    html: branded('Welcome to Farm2Home! 🎉', `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for joining Farm2Home — your gateway to fresh, locally-grown produce straight from the farm.</p>
      <p>${r.msg}</p>
      <p style="color:#6b7280;font-size:13px;">If you need help getting started, just reply to this email and we'll be happy to assist.</p>
    `),
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendWelcomeEmail,
};
