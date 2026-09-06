// ============================================================
// LUMIRA '26 — Ticket email delivery via Brevo SMTP relay
// ============================================================
// SMTP.js library (https://smtpjs.com) relays the mail to your
// Brevo SMTP server. Credentials are read from EMAIL_CONFIG.
//
// Setup:
//   1) In Brevo > Settings > Senders & IPs, verify the sender
//      e-mail address used below.
//   2) Paste the verified sender e-mail into EMAIL_CONFIG.SENDER.email.
//   3) The SMTP key below comes from Brevo > SMTP & API.
//
// NOTE: credentials in client-side JS are visible to anyone who
// inspects the page — inherent to a serverless GitHub Pages app.

const EMAIL_CONFIG = {
  HOST: 'smtp-relay.brevo.com',
  PORT: '587',
  USERNAME: 'b81424001@smtp-brevo.com',
  PASSWORD: 'xsmtpsib-8204cf6846b4bbf61d9f6d2bc204b60fbc6b2a93c3b163909c42f40a6369c240-mI7wUwzenLxBzQdg',
  SENDER: {
    name: 'LUMIRA \'26',
    email: 'pahanwelivita@gmail.com'            // verified Brevo sender
  },
  SUBJECT: 'Your LUMIRA \'26 Ticket'
};

// SMTP.js / relay safety cap (base64 characters). Payloads above this are
// dropped or rejected, so pick the attachment that actually fits.
const MAX_ATTACH_BASE64 = 280 * 1024; // ~= 210 KB binary

// Strips the "data:...;base64," prefix and any whitespace → raw base64 body.
function stripB64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

// Race any promise against a timeout so a hung relay can never "succeed".
function withTimeout(ms, promise) {
  return new Promise((ok, bad) => {
    const t = setTimeout(() => bad(new Error('SMTP relay timed out after ' + ms + 'ms')), ms);
    promise.then(
      (v) => { clearTimeout(t); ok(v); },
      (e) => { clearTimeout(t); bad(e); }
    );
  });
}

// Sends the ticket as an email attachment via the Brevo SMTP relay.
// attachment = { pdf: jsPDFInstance, png: { base64, width, height } }.
// Prefers the PDF when it fits within the relay budget, otherwise falls back to
// the lightweight PNG so the email is always delivered.
// Returns { ok, skipped?, error?, message?, format? }.
async function sendTicketEmail(recipient, name, ticketId, attachment) {
  if (!recipient) return { ok: true, skipped: true }; // no email given — nothing to send

  if (!(window.Email && typeof window.Email.send === 'function')) {
    console.error('SMTP.js not loaded — ticket email not sent.');
    return { ok: false, error: 'SMTP.js not loaded' };
  }
  if (!EMAIL_CONFIG.SENDER.email) {
    console.warn('No verified sender email set in js/email.js — ticket email not sent.');
    return { ok: false, error: 'sender address not configured' };
  }

  // 1) Decide the attachment: PDF if it fits, otherwise the PNG fallback.
  let attachName = null;
  let data64 = null;
  let pdfBase64 = null;

  if (attachment && attachment.pdf) {
    try { pdfBase64 = stripB64(attachment.pdf.output('datauristring')); } catch (e) { pdfBase64 = ''; }
  }
  if (pdfBase64 && pdfBase64.length > 0 && pdfBase64.length <= MAX_ATTACH_BASE64) {
    attachName = ticketId + '.pdf';
    data64 = pdfBase64;
  } else if (attachment && attachment.png && attachment.png.base64) {
    const pngB64 = String(attachment.png.base64).replace(/\s+/g, '');
    if (pngB64.length > MAX_ATTACH_BASE64) {
      return {
        ok: false,
        error: 'Ticket image (' + Math.round(pngB64.length / 1024) + ' KB) still exceeds the relay size limit.'
      };
    }
    attachName = ticketId + '.png';
    data64 = pngB64;
  } else {
    return { ok: false, error: 'No ticket attachment was available to send.' };
  }

  const isPdf = /\.pdf$/i.test(attachName);
  const payload = {
    Host: EMAIL_CONFIG.HOST,
    Port: EMAIL_CONFIG.PORT,
    Username: EMAIL_CONFIG.USERNAME,
    Password: EMAIL_CONFIG.PASSWORD,
    To: recipient,
    From: EMAIL_CONFIG.SENDER.email,
    FromName: EMAIL_CONFIG.SENDER.name,
    Subject: EMAIL_CONFIG.SUBJECT,
    Body:
      '<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#f5efe0;padding:24px;border-radius:12px">' +
      '<h2 style="color:#d4af37;letter-spacing:2px;margin:0 0 6px">LUMIRA &#39;26</h2>' +
      '<p style="color:#a89f8a;margin:0 0 18px;font-size:13px">ENTRY PASS &middot; Lumbini College 2026 A/L Batch</p>' +
      '<p style="margin:0 0 12px">Hi ' + escapeHtml(name || '') + ',</p>' +
      '<p style="margin:0 0 12px">Your LUMIRA &#39;26 ticket is attached as ' +
      (isPdf ? 'a PDF' : 'your ticket image (PNG)') +
      '. Present it (printed or on your phone) at the entrance to be scanned.</p>' +
      '<p style="color:#a89f8a;font-size:13px;margin:0">Ticket ID: <strong style="color:#d4af37">' + escapeHtml(ticketId) + '</strong></p>' +
      '</div>',
    Attachments: [
      {
        name: attachName,
        data: data64
      }
    ]
  };

  try {
    const message = await withTimeout(30000, window.Email.send(payload));
    const msg = String(message || '').trim();
    if (!/^OK/i.test(msg)) {
      console.warn('SMTP relay response:', msg);
      return { ok: false, error: msg || 'SMTP relay returned an unexpected response' };
    }
    return { ok: true, message: msg, format: isPdf ? 'pdf' : 'png' };
  } catch (err) {
    console.error('Ticket email send failed:', err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}