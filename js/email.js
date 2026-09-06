// ============================================================
// LUMIRA '26 — Ticket e-mail delivery via Firebase Cloud Function
// ============================================================
// The ticket is built in the browser (PDF + PNG) and POSTed to
// a Firebase Cloud Function (functions/index.js), which forwards
// it via Brevo SMTP using nodemailer + Secret Manager. No API key
// lives in client-side code; CORS / IP whitelists no longer apply.
//
// Deploy steps (one-time):
//   firebase login
//   firebase functions:secrets:set SMTP_PASS     ← your Brevo API key
//   firebase deploy --only functions:sendTicketEmail

const EMAIL_CONFIG = {
  FUNCTIONS_URL: 'https://asia-south1-badge-party.cloudfunctions.net/sendTicketEmail'
};

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

// Sends the ticket attachment(s) to the Cloud Function, which e-mails
// them via Brevo SMTP. attachment = { pdf: jsPDFInstance, png: { base64 } }.
// Returns { ok, skipped?, error?, message?, format? } — same contract as
// the old direct-Brevo send, so callers (register.js) are unchanged.
async function sendTicketEmail(recipient, name, ticketId, attachment) {
  if (!recipient) return { ok: true, skipped: true }; // no e-mail given — nothing to send

  if (!EMAIL_CONFIG.FUNCTIONS_URL) {
    console.error('Cloud Function URL is not configured (js/email.js → EMAIL_CONFIG.FUNCTIONS_URL).');
    return { ok: false, error: 'E-mail service not configured' };
  }

  let pdfBase64 = '';
  let pngBase64 = '';
  if (attachment && attachment.pdf) {
    try { pdfBase64 = stripB64(attachment.pdf.output('datauristring')); } catch (e) { pdfBase64 = ''; }
  }
  if (attachment && attachment.png && attachment.png.base64) {
    pngBase64 = String(attachment.png.base64).replace(/\s+/g, '');
  }
  if (!pdfBase64 && !pngBase64) {
    return { ok: false, error: 'No ticket attachment was available to send.' };
  }

  const payload = {
    to: recipient,
    name: name || '',
    ticketId: String(ticketId || ''),
    pdf: pdfBase64 ? { base64: pdfBase64 } : null,
    png: pngBase64 ? { base64: pngBase64 } : null
  };

  try {
    const res = await withTimeout(
      30000,
      fetch(EMAIL_CONFIG.FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify(payload)
      })
    );

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* non-JSON error body */ }

    if (!res.ok) {
      const errMsg = (json && json.error) || text || ('HTTP ' + res.status);
      console.error('sendTicketEmail failed (' + res.status + '):', json || text);
      return { ok: false, error: String(errMsg).slice(0, 300) };
    }

    return { ok: true, message: (json && json.messageId) || 'queued', format: (json && json.format) || 'pdf' };
  } catch (err) {
    console.error('Ticket e-mail send failed:', err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}