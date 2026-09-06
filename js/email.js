// ============================================================
// LUMIRA '26 — Ticket email delivery via Brevo (Sendinblue)
// ============================================================
// Brevo transactional e-mail API: https://developers.brevo.com
//
// 1) Create a free account at https://brevo.com
// 2) Get your API key: Settings > API Keys
// 3) Verify your sender e-mail address (Sender identity)
// 4) Paste your API key below.

const EMAIL_CONFIG = {
  ENABLED: true,
  API_KEY: 'YOUR_BREVO_API_KEY',                 // <-- paste your key here
  SENDER: { name: 'LUMIRA \'26', email: 'your-verified-sender@example.com' },
  SUBJECT: 'Your LUMIRA \'26 Ticket',
  FROM_NAME: 'LUMIRA \'26'
};

// Sends the ticket PDF attached to the recipient's email.
// Returns { ok, status, message }.
async function sendTicketEmail(recipient, name, ticketId, pdfInstance) {
  if (!EMAIL_CONFIG.ENABLED) return { ok: false, message: 'Email feature disabled.' };
  if (!EMAIL_CONFIG.API_KEY || EMAIL_CONFIG.API_KEY.indexOf('YOUR_') === 0) {
    return { ok: false, message: 'Brevo API key not configured.' };
  }
  if (!recipient) return { ok: false, message: 'No recipient email provided.' };

  const dataUrl = pdfInstance.output('datauristring');
  const base64 = dataUrl.split(',')[1] || '';

  const payload = {
    sender: { name: EMAIL_CONFIG.SENDER.name, email: EMAIL_CONFIG.SENDER.email },
    to: [{ email: recipient, name: name || recipient }],
    subject: EMAIL_CONFIG.SUBJECT,
    htmlContent:
      '<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#f5efe0;padding:24px;border-radius:12px">' +
        '<h2 style="color:#d4af37;letter-spacing:2px;margin:0 0 6px">LUMIRA &#39;26</h2>' +
        '<p style="color:#a89f8a;margin:0 0 18px;font-size:13px">ENTRY PASS &middot; Lumbini College 2026 A/L Batch</p>' +
        '<p style="margin:0 0 12px">Hi ' + escapeHtml(name || '') + ',</p>' +
        '<p style="margin:0 0 12px">Your LUMIRA &#39;26 ticket is attached as a PDF. ' +
          'Present the QR code at the entrance for scanning.</p>' +
        '<p style="color:#a89f8a;font-size:13px;margin:0">Ticket ID: <strong style="color:#d4af37">' + escapeHtml(ticketId) + '</strong></p>' +
      '</div>',
    attachment: [
      {
        name: ticketId + '.pdf',
        content: base64
      }
    ]
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': EMAIL_CONFIG.API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Brevo API error ' + res.status + ': ' + text);
  }
  return { ok: true, status: res.status };
}