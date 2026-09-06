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

// ---- Ticket design template (background image "01.png") ----
// Canvas 1774 x 887 px (2:1) → printed at 210 x 105 mm (scale = 210/1774 mm per px).
const TICKET_TEMPLATE = {
  src: '01.png',
  wPx: 1774,
  hPx: 887,
  outW: 210,
  outH: 105,
  // White QR placeholder box on the right side of the template (px on 1774x887)
  qrBox: { x: 1338, y: 238, w: 305, h: 298 },
  qrFill: 0.86, // QR fills 86% of the box (leaves quiet-zone margin)
  // Ticket-holder details go in the flat area below the QR box (px)
  holderOnly: true,
  name:  { cx: 1464, y: 718 },
  sub:   { cx: 1464, y: 732 },
  id:    { cx: 1464, y: 746 },
  // Small status stamp above the QR box (used for admin re-downloads)
  status: { cx: 1490, y: 150 }
};

let _tplImg = null;
function loadTemplateImage() {
  if (_tplImg) return _tplImg;
  _tplImg = (async () => {
    let blob = null;
    try {
      const res = await fetch(TICKET_TEMPLATE.src);
      if (res.ok) blob = await res.blob();
    } catch (e) { /* offline/file:// — fall through to <img> fallback */ }

    if (blob) {
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        return img;
      } finally { URL.revokeObjectURL(url); }
    }
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = TICKET_TEMPLATE.src; });
    return img;
  })();
  _tplImg.catch(() => { _tplImg = null; });
  return _tplImg;
}

// ---- Composite the full ticket card onto a canvas at a given scale ----
// Draws the "01" background, the guest QR, and the holder details exactly like
// the PDF layout (same mm-based metrics), so the same ticket renders as PNG.
async function renderTicketCanvas(scale, data, qrDataUrl, scanned, withStatus) {
  const T = TICKET_TEMPLATE;
  const img = await loadTemplateImage();
  const w = Math.max(1, Math.round(T.wPx * scale));
  const h = Math.max(1, Math.round(T.hPx * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0, w, h);

  if (qrDataUrl) {
    const qimg = await loadDataUrlImage(qrDataUrl);
    const b = T.qrBox;
    const q = Math.min(b.w, b.h) * T.qrFill;
    ctx.drawImage(qimg, (b.x + (b.w - q) / 2) * scale, (b.y + (b.h - q) / 2) * scale, q * scale, q * scale);
  }

  const pxPerMm = T.wPx / T.outW * scale; // canvas px per printed mm at this scale
  const family = 'Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(8 * pxPerMm) + 'px ' + family;
  ctx.fillText(String(data.name || '—'), T.name.cx * scale, T.name.y * scale);

  ctx.fillStyle = '#e0c67a';
  ctx.font = Math.round(4 * pxPerMm) + 'px ' + family;
  ctx.fillText([data.cls || '', data.phone || ''].filter(Boolean).join('   ·   '), T.sub.cx * scale, T.sub.y * scale);

  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold ' + Math.round(4.5 * pxPerMm) + 'px ' + family;
  ctx.fillText('TICKET ' + (data.uid || data.id), T.id.cx * scale, T.id.y * scale);

  if (withStatus && typeof scanned === 'boolean') {
    ctx.fillStyle = scanned ? '#e74c3c' : '#2ecc71';
    ctx.font = Math.round(4 * pxPerMm) + 'px ' + family;
    ctx.fillText(scanned ? 'ALREADY SCANNED' : 'STATUS: ACTIVE', T.status.cx * scale, T.status.y * scale);
  }

  return canvas;
}

// ---- Build the ticket as a lightweight PNG ----
// Returns { dataUrl, base64, width, height }. Auto-downscales the composite so
// the base64 stays within the SMTP relay payload budget (e.g. ~180 KB binary).
async function buildTicketPng(data, qrDataUrl, scanned, withStatus, maxBase64) {
  const budget = maxBase64 || 240 * 1024;
  let scale = 1;
  for (let i = 0; i < 5; i++) {
    const canvas = await renderTicketCanvas(scale, data, qrDataUrl, scanned, withStatus);
    const base64 = (canvas.toDataURL('image/png').split(',')[1] || '').replace(/\s+/g, '');
    const result = { base64, width: canvas.width, height: canvas.height };
    if (base64.length <= budget || scale <= 0.28) return result;
    scale = Math.max(0.25, scale * 0.7);
  }
  const last = await renderTicketCanvas(scale, data, qrDataUrl, scanned, withStatus);
  return { base64: (last.toDataURL('image/png').split(',')[1] || '').replace(/\s+/g, ''), width: last.width, height: last.height };
}

function loadDataUrlImage(src) {
  return new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => bad(new Error('Could not load image data'));
    im.src = src;
  });
}

// ---- Build the template-based ticket PDF (async, returns jsPDF instance) ----
// Overlays the unique guest QR code precisely inside the white placeholder box
// of the "01" background and stamps the ticket-holder details.
// opts = { bgScale, jpegQuality } control how the (dominant) background is
// encoded so email/attachments stay small; downloads keep full resolution.
async function buildTicketPdf(data, qrDataUrl, scanned, withStatus, opts) {
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF library not loaded');

  const O = opts || {};
  const bgScale = O.bgScale || 1;
  const jpegQuality = O.jpegQuality == null ? 0.92 : O.jpegQuality;

  const img = await loadTemplateImage();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * bgScale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * bgScale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const bg = canvas.toDataURL('image/jpeg', jpegQuality);

  const { jsPDF } = window.jspdf;
  const T = TICKET_TEMPLATE;
  const s = T.outW / T.wPx; // mm per template pixel
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [T.outW, T.outH] });

  // Full-bleed template background
  pdf.addImage(bg, 'JPEG', 0, 0, T.outW, T.outH);

  // QR code → precisely centred inside the template's white placeholder box
  if (qrDataUrl) {
    const b = T.qrBox;
    const q = Math.min(b.w, b.h) * T.qrFill;
    const qx = (b.x + (b.w - q) / 2) * s;
    const qy = (b.y + (b.h - q) / 2) * s;
    pdf.addImage(qrDataUrl, 'PNG', qx, qy, q * s, q * s);
  }

  // Ticket-holder details (flat area below the QR box)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(data.name || '—'), T.name.cx * s, T.name.y * s, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(4);
  pdf.setTextColor(224, 198, 122);
  pdf.text([data.cls || '', data.phone || ''].filter(Boolean).join('   ·   '), T.sub.cx * s, T.sub.y * s, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(4.5);
  pdf.setTextColor(212, 175, 55);
  pdf.text('TICKET ' + (data.uid || data.id), T.id.cx * s, T.id.y * s, { align: 'center' });

  // Optional status stamp (admin re-downloads)
  if (withStatus && typeof scanned === 'boolean') {
    pdf.setFontSize(4);
    pdf.setTextColor(scanned ? 231 : 46, scanned ? 76 : 204, scanned ? 60 : 113);
    pdf.text(scanned ? 'ALREADY SCANNED' : 'STATUS: ACTIVE', T.status.cx * s, T.status.y * s, { align: 'center' });
  }

  return pdf;
}
