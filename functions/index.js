// ============================================================
// LUMIRA '26 — ticket e-mail sender (Firebase Cloud Function v2)
// ============================================================
// Sends the ticket PDF/PNG attachments via Brevo SMTP using
// nodemailer. The SMTP *password* lives in Firebase Secret
// Manager — never in this file or in client-side code.
//
// Deploy:
//   firebase login
//   firebase functions:secrets:set SMTP_PASS      (paste your Brevo API key once)
//   firebase deploy --only functions:sendTicketEmail
// ============================================================
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// SMTP password from Secret Manager → HTTP endpoint accepts
// viewers, so only the password is ever treated as a secret.
const SMTP_PASS = defineSecret('SMTP_PASS');

// Non-secret SMTP values (Brevo relay). Adjust SMTP_LOGIN to the
// "SMTP login" shown in Brevo → Settings → SMTP & API keys.
const SMTP_HOST = 'smtp-relay.brevo.com';
const SMTP_PORT = 587;
const SMTP_LOGIN = 'pahanwelivita@gmail.com';
const FROM_EMAIL = 'pahanwelivita@gmail.com'; // verified Brevo sender
const FROM_NAME = "LUMIRA '26";
const SUBJECT = "Your LUMIRA '26 Ticket";

// Attachment budget (base64 chars). Brevo caps a message at ~7 MB,
// so keep the combined payload below that even with both files.
const MAX_ATTACH_TOTAL_BASE64 = 6656000; // ~6.5 MB base64 (~4.9 MB binary)
const MAX_ATTACH_ONE_BASE64 = 5767168;   // ~5.5 MB base64 (~4.1 MB binary)

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanB64(v) {
  return String(v || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
}

function buildHtml(name, ticketId) {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#f5efe0;padding:24px;border-radius:12px">' +
    '<h2 style="color:#d4af37;letter-spacing:2px;margin:0 0 6px">LUMIRA &#39;26</h2>' +
    '<p style="color:#a89f8a;margin:0 0 18px;font-size:13px">ENTRY PASS &middot; Lumbini College 2026 A/L Batch</p>' +
    '<p style="margin:0 0 12px">Hi ' + esc(name) + ',</p>' +
    '<p style="margin:0 0 12px">Your LUMIRA &#39;26 ticket is attached. ' +
    'Present it (printed or on your phone) at the entrance to be scanned.</p>' +
    '<p style="color:#a89f8a;font-size:13px;margin:0">Ticket ID: <strong style="color:#d4af37">' + esc(ticketId) + '</strong></p>' +
    '</div>'
  );
}

// HTTPS endpoint. Body: { to, name, ticketId, pdf:{base64}, png:{base64} }
exports.sendTicketEmail = onRequest(
  { secrets: [SMTP_PASS], region: 'asia-south1', maxInstances: 20, cors: true },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed (POST only).' });
      return;
    }

    try {
      const b = req.body || {};
      const to = String(b.to || '').trim().toLowerCase();
      const name = String(b.name || '').trim();
      const ticketId = String(b.ticketId || '').trim();

      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ ok: false, error: 'A valid recipient e-mail is required.' });
      }
      if (!ticketId) {
        return res.status(400).json({ ok: false, error: 'ticketId is required.' });
      }

      const pdfB64 = cleanB64(b.pdf && b.pdf.base64);
      const pngB64 = cleanB64(b.png && b.png.base64);
      const total = pdfB64.length + pngB64.length;

      const attachments = [];
      if (pdfB64.length > 0 && pdfB64.length <= MAX_ATTACH_ONE_BASE64 && total <= MAX_ATTACH_TOTAL_BASE64) {
        attachments.push({ filename: ticketId + '.pdf', content: Buffer.from(pdfB64, 'base64'), contentType: 'application/pdf' });
      }
      if (pngB64.length > 0 && pngB64.length <= MAX_ATTACH_ONE_BASE64 && total <= MAX_ATTACH_TOTAL_BASE64) {
        attachments.push({ filename: ticketId + '.png', content: Buffer.from(pngB64, 'base64'), contentType: 'image/png' });
      }
      if (attachments.length === 0) {
        return res.status(400).json({ ok: false, error: 'No usable ticket attachment was provided (too large?).' });
      }

      const isPdf = /\.pdf$/i.test(attachments[0].filename);
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_LOGIN, pass: SMTP_PASS.value() }
      });

      const info = await transporter.sendMail({
        from: '"' + FROM_NAME + '" <' + FROM_EMAIL + '>',
        to: to,
        subject: SUBJECT,
        html: buildHtml(name, ticketId),
        attachments
      });

      res.json({ ok: true, messageId: info.messageId, format: isPdf ? 'pdf' : 'png', sentTo: to });
    } catch (err) {
      console.error('sendTicketEmail failed:', err);
      res.status(500).json({ ok: false, error: String((err && err.message) || err).slice(0, 300) });
    }
  }
);