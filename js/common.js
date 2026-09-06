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
    width: size || 600, // high source resolution → crisp when scaled into the ticket
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
  qrFill: 0.92, // QR fills 92% of the box — as large as the quiet-zone allows
  // The flat area below the QR box carries only the guest's full name (px)
  name: { cx: 1464, y: 728 },
  nameColor: '#FFD700', // premium golden
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
// `dpr` is the Retina/High-DPI multiplier: drawing the template, QR and text at
// a higher pixel resolution makes the exported ticket sharp and easy to scan.
// Only the guest's full name (premium gold) is stamped below the QR code.
async function renderTicketCanvas(scale, dpr, data, qrDataUrl, scanned, withStatus) {
  const T = TICKET_TEMPLATE;
  const img = await loadTemplateImage();
  const w = Math.max(1, Math.round(T.wPx * scale * dpr));
  const h = Math.max(1, Math.round(T.hPx * scale * dpr));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0, w, h);

  if (qrDataUrl) {
    const qimg = await loadDataUrlImage(qrDataUrl);
    const b = T.qrBox;
    const q = Math.min(b.w, b.h) * T.qrFill;
    ctx.drawImage(qimg, (b.x + (b.w - q) / 2) * scale * dpr, (b.y + (b.h - q) / 2) * scale * dpr, q * scale * dpr, q * scale * dpr);
  }

  const pxPerMm = T.wPx / T.outW * scale * dpr; // canvas px per printed mm at this resolution
  const family = 'Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = T.nameColor;
  ctx.font = 'bold ' + Math.round(8.5 * pxPerMm) + 'px ' + family;
  ctx.fillText(String(data.name || '—'), T.name.cx * scale * dpr, T.name.y * scale * dpr);

  if (withStatus && typeof scanned === 'boolean') {
    ctx.fillStyle = scanned ? '#e74c3c' : '#2ecc71';
    ctx.font = Math.round(4 * pxPerMm) + 'px ' + family;
    ctx.fillText(scanned ? 'ALREADY SCANNED' : 'STATUS: ACTIVE', T.status.cx * scale * dpr, T.status.y * scale * dpr);
  }

  return canvas;
}

// ---- Build the ticket as a high-resolution lossless PNG ----
// Returns { base64, width, height, dpr }. Renders at 2x (Retina) first and steps
// down only if needed to stay inside the payload budget.
async function buildTicketPng(data, qrDataUrl, scanned, withStatus, maxBase64) {
  const budget = maxBase64 || 5767168; // ~5.5 MB base64 — lets the full 2x render fit
  for (const dpr of [2, 1.5, 1.25, 1]) {
    const canvas = await renderTicketCanvas(1, dpr, data, qrDataUrl, scanned, withStatus);
    const base64 = (canvas.toDataURL('image/png').split(',')[1] || '').replace(/\s+/g, '');
    if (base64.length <= budget) {
      return { base64, width: canvas.width, height: canvas.height, dpr };
    }
  }
  const canvas = await renderTicketCanvas(1, 1, data, qrDataUrl, scanned, withStatus);
  return {
    base64: (canvas.toDataURL('image/png').split(',')[1] || '').replace(/\s+/g, ''),
    width: canvas.width,
    height: canvas.height,
    dpr: 1
  };
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
// of the "01" background and stamps the guest's full name in premium gold.
// The background is embedded as lossless PNG so there are no compression
// artifacts; text is vector (always crisp) and the QR is rendered large.
async function buildTicketPdf(data, qrDataUrl, scanned, withStatus) {
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF library not loaded');

  const img = await loadTemplateImage();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  // Background as high-quality JPEG: jsPDF re-encodes a lossless PNG of the
  // photographic template into ~10 MB files, so JPEG keeps PDFs usable while
  // the QR (entry-critical) and name text stay razor sharp & artifact-free.
  canvas.getContext('2d').drawImage(img, 0, 0);
  const bg = canvas.toDataURL('image/jpeg', 0.92);

  const { jsPDF } = window.jspdf;
  const T = TICKET_TEMPLATE;
  const s = T.outW / T.wPx; // mm per template pixel
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [T.outW, T.outH] });

  // Full-bleed template background
  pdf.addImage(bg, 'PNG', 0, 0, T.outW, T.outH);

  // QR code → large & centred inside the template's white placeholder box
  if (qrDataUrl) {
    const b = T.qrBox;
    const q = Math.min(b.w, b.h) * T.qrFill;
    const qx = (b.x + (b.w - q) / 2) * s;
    const qy = (b.y + (b.h - q) / 2) * s;
    pdf.addImage(qrDataUrl, 'PNG', qx, qy, q * s, q * s);
  }

  // Only the guest's full name in premium gold below the QR code
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 215, 0); // #FFD700
  pdf.text(String(data.name || '—'), T.name.cx * s, T.name.y * s, { align: 'center' });

  // Optional status stamp (admin re-downloads)
  if (withStatus && typeof scanned === 'boolean') {
    pdf.setFontSize(4);
    pdf.setTextColor(scanned ? 231 : 46, scanned ? 76 : 204, scanned ? 60 : 113);
    pdf.text(scanned ? 'ALREADY SCANNED' : 'STATUS: ACTIVE', T.status.cx * s, T.status.y * s, { align: 'center' });
  }

  return pdf;
}
