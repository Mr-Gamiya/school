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

// Sends the ticket PDF as an attachment via the Brevo SMTP relay.
// Returns { ok, skipped?, error?, message? }.
async function sendTicketEmail(recipient, name, ticketId, pdfInstance) {
  if (!recipient) return { ok: true, skipped: true }; // no email given — nothing to send

  if (!(window.Email && typeof window.Email.send === 'function')) {
    console.error('SMTP.js not loaded — ticket email not sent.');
    return { ok: false, error: 'SMTP.js not loaded' };
  }
  if (!EMAIL_CONFIG.SENDER.email) {
    console.warn('No verified sender email set in js/email.js — ticket email not sent.');
    return { ok: false, error: 'sender address not configured' };
  }

  const dataUrl = pdfInstance.output('datauristring');
  const base64 = (dataUrl.split(',')[1] || '').replace(/\s+/g, '');

  try {
    const message = await window.Email.send({
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
        '<p style="margin:0 0 12px">Your LUMIRA &#39;26 ticket is attached as a PDF. ' +
        'Present it (printed or on your phone) at the entrance to be scanned.</p>' +
        '<p style="color:#a89f8a;font-size:13px;margin:0">Ticket ID: <strong style="color:#d4af37">' + escapeHtml(ticketId) + '</strong></p>' +
        '</div>',
      Attachments: [
        {
          name: ticketId + '.pdf',
          data: base64
        }
      ]
    });
    const msg = String(message || '').trim();
    if (!/^OK/i.test(msg)) {
      console.warn('SMTP relay response:', msg);
      return { ok: false, error: msg || 'SMTP relay returned an unexpected response' };
    }
    return { ok: true, message: msg };
  } catch (err) {
    console.error('Ticket email send failed:', err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}