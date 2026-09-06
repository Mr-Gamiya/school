// ============================================================
// LUMIRA '26 — Registration / QR ticket generator
// ============================================================

initParticles('particles');

let qrCanvas = null;
let currentTicket = null;

const form = document.getElementById('regForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fName').value.trim();
  const cls = document.getElementById('fClass').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const notes = document.getElementById('fNotes').value.trim();

  if (!name) { toast('Please enter your full name', 'bad'); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating…';

  const id = uid();
  const createdAt = new Date().toISOString();
  const data = {
    uid: id,
    name,
    cls,
    phone,
    notes,
    scanned: false,
    scannedAt: null,
    createdAt
  };

  try {
    await db.collection(COLLECTION).doc(id).set(data);
  } catch (err) {
    console.error('Firestore save failed:', err);
    const msg = err && err.code === 'permission-denied'
      ? 'Firebase rules are blocking saves. Update Firestore rules to allow write on "registrations".'
      : 'Could not save to Firestore. Check your internet connection and try again.';
    toast(msg, 'bad');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate My Ticket ✦';
    return;
  }
  currentTicket = data;

  // Render QR code
  try {
    if (typeof QRCode === 'undefined') throw new Error('QRCode library not loaded');
    const qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = '';
    qrCanvas = await QRCode.toCanvas(document.createElement('canvas'), id, {
      width: 240,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
    qrBox.appendChild(qrCanvas);
  } catch (err) {
    console.error('QR render failed:', err);
    toast('QR code library failed to load — please refresh the page.', 'bad');
  }

    // Fill ticket details
  document.getElementById('tName').textContent = name || '—';
  document.getElementById('tClass').textContent = cls || '—';
  document.getElementById('tPhone').textContent = phone || '—';
  document.getElementById('tId').textContent = id;
  document.getElementById('tDate').textContent = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // Pop up the ticket modal
  document.getElementById('ticketModal').classList.add('open');
  form.reset();
  toast('Ticket generated & saved successfully!', 'good');

  submitBtn.disabled = false;
  submitBtn.textContent = 'Generate My Ticket ✦';
});

// ---- Ticket modal close ----
function closeTicketModal() {
  document.getElementById('ticketModal').classList.remove('open');
}
document.getElementById('closeTicketModal').addEventListener('click', closeTicketModal);
document.getElementById('ticketModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTicketModal();
});

// ---- Download ticket as PDF ----
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  if (!currentTicket) return;
  htmlToPdf(document.getElementById('ticketCard'), currentTicket);
});

// ---- Download QR code as PNG ----
document.getElementById('downloadQrBtn').addEventListener('click', () => {
  if (!qrCanvas) return;
  const a = document.createElement('a');
  a.href = qrCanvas.toDataURL('image/png');
  a.download = (currentTicket ? currentTicket.uid : 'ticket') + '.png';
  a.click();
});

function htmlToPdf(ticketEl, data) {
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
  pdf.setFontStyle('normal');
  pdf.setTextColor(168, 159, 138);
  pdf.text('Lumbini College · 2026 A/L Batch', 105, 56, { align: 'center' });

  // Person details
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontStyle('bold');
  pdf.text('Name', 22, 80);
  pdf.setFontStyle('normal');
  pdf.setFontSize(15);
  pdf.text(data.name || '—', 22, 87);

  pdf.setFontStyle('bold');
  pdf.setFontSize(10);
  pdf.setTextColor(212, 175, 55);
  pdf.text('Ticket ID:  ' + data.uid, 22, 100);

  pdf.setFontStyle('normal');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Class / Stream:  ' + (data.cls || '—'), 22, 110);
  pdf.text('Phone:  ' + (data.phone || '—'), 22, 117);

  // QR code as graphic
  const qrCanvas = ticketEl.querySelector('canvas');
  if (qrCanvas) {
    const qrData = qrCanvas.toDataURL('image/png');
    const qrSize = 55;
    pdf.addImage(qrData, 'PNG', 105 - qrSize / 2, 138, qrSize, qrSize);
  }

  // Status
  pdf.setFontSize(10);
  pdf.setFontStyle('bold');
  pdf.setTextColor(46, 204, 113);
  pdf.text('● STATUS: ACTIVE', 105, 205, { align: 'center' });

  // Footer
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.3);
  pdf.line(margin + 3, 245, 210 - margin - 3, 245);
  pdf.setFontStyle('normal');
  pdf.setFontSize(8);
  pdf.setTextColor(168, 159, 138);
  pdf.text('Present this ticket at the entrance to be scanned for entry.', 105, 252, { align: 'center' });
  pdf.text('LUMIRA \'26 · Lumbini College · 2026', 105, 258, { align: 'center' });

  pdf.save(data.uid + '.pdf');
}