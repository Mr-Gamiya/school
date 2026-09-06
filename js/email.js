// ============================================================
// LUMIRA '26 — Ticket email delivery via Brevo HTTP API
// ============================================================
// Sends the ticket straight to api.brevo.com from the browser.
// Brevo allows CORS for GitHub Pages origins, so no third-party
// SMTP relay (e.g. smtpjs.com) is required.
//
// Setup:
//   1) Brevo → Settings → SMTP & API → API keys → "Create a key".
//      Make sure the key is active and entitled to transactional
//      e-mails (the default permission set is fine).
//   2) Paste the key into EMAIL_CONFIG.API_KEY below.
//   3) Verify the sender address at Brevo → Senders & IPs and put
//      it into EMAIL_CONFIG.SENDER.email.
//
// NOTE: the key lives in client-side JS, visible to anyone who
// inspects the page — inherent to a serverless GitHub Pages app.

const EMAIL_CONFIG = {
  API_KEY: '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',
  API_URL: 'https://api.brevo.com/v3/smtp/email',
  SENDER: {
    name: 'LUMIRA \'26',
    email: 'pahanwelivita@gmail.com'            // verified Brevo sender
  },
  SUBJECT: 'Your LUMIRA \'26 Ticket'
};

// Attachment safety cap (base64 characters). Brevo accepts ~10 MB per request
// (attachments up to ~7 MB), so this comfortably fits a full-quality 2x
// ticket while still keeping submissions fast.
const MAX_ATTACH_BASE64 = 5767168; // ~5.5 MB base64 (~4.1 MB binary)

// Strips the "data:...;base64," prefix + whitespace → raw base64 body.
function stripB64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

// Race any promise against a timeout so a hanging request can't "succeed".
function withTimeout(ms, promise) {
  return new Promise((ok, bad) => {
    const t = setTimeout(() => bad(new Error('Request timed out after ' + ms + 'ms')), ms);
    promise.then(
      (v) => { clearTimeout(t); ok(v); },
      (e) => { clearTimeout(t); bad(e); }
    );
  });
}

// Sends the ticket as an email attachment via the Brevo HTTP API.
// attachment = { pdf: jsPDFInstance, png: { base64, width, height } }.
// Prefers the PDF when it fits within the payload budget, otherwise falls
// back to the lightweight PNG so the email is always delivered.
// Returns { ok, skipped?, error?, message?, format? }.
async function sendTicketEmail(recipient, name, ticketId, attachment) {
  if (!recipient) return { ok: true, skipped: true }; // no email given — nothing to send

  if (!EMAIL_CONFIG.API_KEY) {
    console.error('Brevo API key is not configured (js/email.js → EMAIL_CONFIG.API_KEY) — ticket email not sent.');
    return { ok: false, error: 'Brevo API key not configured' };
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
        error: 'Ticket image (' + Math.round(pngB64.length / 1024) + ' KB) still exceeds the size limit.'
      };
    }
    attachName = ticketId + '.png';
    data64 = pngB64;
  } else {
    return { ok: false, error: 'No ticket attachment was available to send.' };
  }

  const isPdf = /\.pdf$/i.test(attachName);
  const payload = {
    sender: { name: EMAIL_CONFIG.SENDER.name, email: EMAIL_CONFIG.SENDER.email },
    to: [{ email: recipient, name: name || '' }],
    subject: EMAIL_CONFIG.SUBJECT,
    htmlContent:
      '<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#f5efe0;padding:24px;border-radius:12px">' +
      '<h2 style="color:#d4af37;letter-spacing:2px;margin:0 0 6px">LUMIRA &#39;26</h2>' +
      '<p style="color:#a89f8a;margin:0 0 18px;font-size:13px">ENTRY PASS &middot; Lumbini College 2026 A/L Batch</p>' +
      '<p style="margin:0 0 12px">Hi ' + escapeHtml(name || '') + ',</p>' +
      '<p style="margin:0 0 12px">Your LUMIRA &#39;26 ticket is attached as ' +
      (isPdf ? 'a PDF' : 'your ticket image (PNG)') +
      '. Present it (printed or on your phone) at the entrance to be scanned.</p>' +
      '<p style="color:#a89f8a;font-size:13px;margin:0">Ticket ID: <strong style="color:#d4af37">' + escapeHtml(ticketId) + '</strong></p>' +
      '</div>',
    attachment: [
      {
        content: data64,
        name: attachName
      }
    ]
  };

  try {
    const res = await withTimeout(
      30000,
      fetch(EMAIL_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': EMAIL_CONFIG.API_KEY
        },
        body: JSON.stringify(payload)
      })
    );

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* non-JSON error body */ }

    if (!res.ok) {
      const errMsg = (json && (json.message || json.code)) || text || ('HTTP ' + res.status);
      console.error('Brevo API error (' + res.status + '):', json || text);
      return { ok: false, error: String(errMsg).slice(0, 300) };
    }

    return { ok: true, message: (json && json.messageId) || 'queued', format: isPdf ? 'pdf' : 'png' };
  } catch (err) {
    console.error('Ticket email send failed:', err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}
