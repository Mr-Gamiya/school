// ============================================================
// LUMIRA '26 — Registration / QR ticket generator
// ============================================================

initParticles('particles');

let currentTicket = null;
let currentQr = null;

const form = document.getElementById('regForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fName').value.trim();
  const cls = document.getElementById('fClass').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const email = document.getElementById('fEmail').value.trim();
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
    email,
    notes,
    scanned: false,
    scannedAt: null,
    createdAt
  };

  // 1) Save to Firestore
  try {
    await db.collection(COLLECTION).doc(id).set(data);
  } catch (err) {
    console.error('Firestore save failed:', err);
    toast(err && err.code === 'permission-denied'
      ? 'Firebase rules are blocking saves. Update Firestore rules to allow write on "registrations".'
      : 'Could not save to Firestore. Check your internet connection and try again.', 'bad');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate My Ticket ✦';
    return;
  }
  currentTicket = data;

  // 2) Render QR (as an <img> — reliable across browsers, no canvas corruption)
  try {
    if (typeof QRCode === 'undefined') throw new Error('QRCode library not loaded');
    currentQr = await makeQrDataUrl(id, 260);
    const qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = '';
    const img = document.createElement('img');
    img.src = currentQr;
    img.alt = 'LUMIRA QR — ' + id;
    qrBox.appendChild(img);
  } catch (err) {
    console.error('QR render failed:', err);
    toast('QR code library failed to load — please refresh the page.', 'bad');
  }

  // 3) Fill ticket details
  document.getElementById('tName').textContent = name || '—';
  document.getElementById('tClass').textContent = cls || '—';
  document.getElementById('tPhone').textContent = phone || '—';
  document.getElementById('tId').textContent = id;
  document.getElementById('tDate').textContent = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  // 4) Pop up the ticket modal
  document.getElementById('ticketModal').classList.add('open');
  form.reset();
  toast('Ticket generated & saved successfully!', 'good');

  // 5) If an email was provided, send the ticket automatically.
  //    Build a lightweight PDF and a PNG fallback; the sender picks whichever
  //    fits within the relay's payload limits.
  if (email) {
    try {
      const pdf = await buildTicketPdf(data, currentQr, false, false, { bgScale: 0.75, jpegQuality: 0.78 });
      const png = await buildTicketPng(data, currentQr, false, false);
      const result = await sendTicketEmail(email, name, id, { pdf, png });
      if (result.ok) {
        toast('Ticket emailed to ' + email, 'good');
      } else {
        toast(result.error || 'Email could not be sent — you can download the ticket here.', 'bad');
      }
    } catch (err) {
      console.error('Email send failed:', err);
      toast('Ticket saved, but email failed to send — you can download it here.', 'bad');
    }
  }

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
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  if (!currentTicket) return;
  try {
    const pdf = await buildTicketPdf(currentTicket, currentQr, false);
    pdf.save(currentTicket.uid + '.pdf');
  } catch (err) {
    console.error('PDF build failed:', err);
    toast('Could not build the PDF. Please refresh the page.', 'bad');
  }
});