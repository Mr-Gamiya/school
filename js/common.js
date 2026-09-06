// ============================================================
// LUMIRA '26 — Shared utilities
// ============================================================

// ---- Toast notifications ----
function toast(msg, type) {
  const zone = document.getElementById('toastZone') || createToastZone();
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  zone.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 2600);
  setTimeout(() => el.remove(), 3100);
}
function createToastZone() {
  const z = document.createElement('div');
  z.id = 'toastZone';
  z.className = 'toast-zone';
  document.body.appendChild(z);
  return z;
}

// ---- Gold floating particles ----
function initParticles(container) {
  const c = document.getElementById(container) || document.body;
  const count = 22;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (9 + Math.random() * 14) + 's';
    p.style.animationDelay = (Math.random() * 12) + 's';
    p.style.transform = 'scale(' + (0.6 + Math.random() * 1.4) + ')';
    c.appendChild(p);
  }
}

// ---- Unique numeric ticket ID generator ----
function uid() {
  const t = Date.now().toString().slice(-8);
  const r = String(Math.floor(100 + Math.random() * 900));
  return t + r;
}

// ---- Status label helpers ----
function statusClass(scanned) { return scanned ? 'status-scanned' : 'status-active'; }
function statusText(scanned) { return scanned ? 'Already Scanned' : 'Active'; }

// ---- HTML escaping ----
function escapeHtml(str) {
  return str == null ? '' : String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- Generate a QR code as a base64 data URL ----
function makeQrDataUrl(text, size) {
  return QRCode.toDataURL(String(text), {
    width: size || 230,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });
}

// ---- Build the branded VIP ticket PDF (returns jsPDF instance) ----
function buildTicketPdf(data, qrDataUrl, scanned) {
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF library not loaded');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 15;
  const w = 210 - margin * 2;
  const h = 297 - margin * 2;

  // Card background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, 210, 297, 'F');

  // Gold border frame
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.8);
  pdf.rect(margin, margin, w, h);
  pdf.setLineWidth(0.3);
  pdf.rect(margin + 3, margin + 3, w - 6, h - 6);

  // Branding
  pdf.setTextColor(212, 175, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.text('LUMIRA', 105, 40, { align: 'center' });
  pdf.setFontSize(18);
  pdf.setTextColor(240, 212, 122);
  pdf.text('\'26 — VIP PASS', 105, 48, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(168, 159, 138);
  pdf.text('Lumbini College · 2026 A/L Batch', 105, 56, { align: 'center' });

  // Person details
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name', 22, 80);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(15);
  pdf.text(data.name || '—', 22, 87);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(212, 175, 55);
  pdf.text('Ticket ID:  ' + (data.uid || data.id), 22, 100);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Class / Stream:  ' + (data.cls || '—'), 22, 110);
  pdf.text('Phone:  ' + (data.phone || '—'), 22, 117);
  if (data.email) pdf.text('Email:  ' + data.email, 22, 124);

  // QR code
  if (qrDataUrl) {
    const qrSize = 55;
    pdf.addImage(qrDataUrl, 'PNG', 105 - qrSize / 2, 138, qrSize, qrSize);
  }

  // Status
  const isScanned = !!scanned;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(isScanned ? 231 : 46, isScanned ? 76 : 204, isScanned ? 60 : 113);
  pdf.text(isScanned ? '● STATUS: ALREADY SCANNED' : '● STATUS: ACTIVE', 105, 205, { align: 'center' });

  // Footer
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.3);
  pdf.line(margin + 3, 245, 210 - margin - 3, 245);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(168, 159, 138);
  pdf.text('Present this ticket at the entrance to be scanned for entry.', 105, 252, { align: 'center' });
  pdf.text('LUMIRA \'26 · Lumbini College · 2026', 105, 258, { align: 'center' });

  return pdf;
}
