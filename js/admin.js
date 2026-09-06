// ============================================================
// LUMIRA '26 — Admin dashboard, live tracker & QR scanner
// ============================================================

initParticles('particles');

let allDocs = [];
let searchTerm = '';

const tbody = document.getElementById('tableBody');
const loading = document.getElementById('loading');
const tableWrap = document.getElementById('tableWrap');
const emptyState = document.getElementById('emptyState');

// ---------- Live Firestore subscription ----------
db.collection(COLLECTION)
  .orderBy('createdAt', 'desc')
  .onSnapshot((snap) => {
    allDocs = [];
    snap.forEach((doc) => allDocs.push({ id: doc.id, ...doc.data() }));
    render();
  }, (err) => {
    console.error(err);
    loading.innerHTML = '<p class="dim" style="padding:30px">Failed to load data. Check Firestore rules / network.</p>';
  });

// ---------- Render table ----------
function render() {
  loading.style.display = 'none';
  const filtered = allDocs.filter((d) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return [d.name, d.uid, d.cls, d.phone, d.email, d.id]
      .some((v) => v && String(v).toLowerCase().includes(q));
  });

  // Update counts
  document.getElementById('countTotal').textContent = allDocs.length;
  document.getElementById('countActive').textContent = allDocs.filter((d) => !d.scanned).length;
  document.getElementById('countScanned').textContent = allDocs.filter((d) => d.scanned).length;

  if (filtered.length === 0) {
    tableWrap.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = allDocs.length === 0
      ? 'No registrations yet. Share the registration page to get started.'
      : 'No entries match your search.';
    return;
  }

  tableWrap.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = filtered.map((d) => {
    const when = d.scannedAt ? fmtTime(d.scannedAt) : '—';
    const tid = d.uid || d.id;
    return `<tr>
      <td><code>${escapeHtml(tid)}</code></td>
      <td>${escapeHtml(d.name || '—')}</td>
      <td>${escapeHtml(d.cls || '—')}</td>
      <td><span class="status-chip ${statusClass(d.scanned)}">${statusText(d.scanned)}</span></td>
      <td style="font-size:.8rem; color:var(--text-dim)">${when}</td>
      <td style="white-space:nowrap">
        <button class="btn small" onclick="downloadTicket('${escapeHtml(d.id)}')">⬇ Download</button>
        <button class="btn small danger" onclick="deleteTicket('${escapeHtml(d.id)}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ---- Re-download a ticket as PDF ----
window.downloadTicket = async function (id) {
  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) { toast('Ticket not found.', 'bad'); return; }
    const data = { id: doc.id, ...doc.data() };
    const qrDataUrl = await makeQrDataUrl(id, 260);
    const pdf = await buildTicketPdf(data, qrDataUrl, !!data.scanned, true);
    pdf.save((data.uid || id) + '.pdf');
    toast('Ticket PDF downloaded.', 'good');
  } catch (err) {
    console.error('Download failed:', err);
    toast('Could not download this ticket.', 'bad');
  }
};

// ---- Delete a ticket ----
window.deleteTicket = async function (id) {
  const ok = confirm('Delete ticket ' + id + '?\nThis cannot be undone.');
  if (!ok) return;
  try {
    await db.collection(COLLECTION).doc(id).delete();
    toast('Ticket deleted.', 'good');
  } catch (e) {
    console.error(e);
    toast('Failed to delete ticket.', 'bad');
  }
};

// ---------- Search ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim();
  render();
});

// ---------- Scanner ----------
let html5Qr = null;
let cameraReady = false;

const modal = document.getElementById('scannerModal');
document.getElementById('scanBtn').addEventListener('click', openScanner);
document.getElementById('closeModal').addEventListener('click', closeScanner);
modal.addEventListener('click', (e) => { if (e.target === modal) closeScanner(); });

function openScanner() {
  cameraReady = true;
  modal.classList.add('open');
  document.getElementById('scanResult').innerHTML = '<p class="dim" style="text-align:center">Scanning…</p>';
  startScanner();
}

function closeScanner() {
  modal.classList.remove('open');
  stopScanner();
}

function stopScanner() {
  cameraReady = false;
  if (html5Qr) {
    try {
      if (html5Qr.isScanning) html5Qr.stop().catch(() => {});
    } catch (e) {}
    html5Qr = null;
  }
}

function pauseScanner() {
  if (html5Qr) {
    try {
      if (html5Qr.isScanning) html5Qr.pause().catch(() => {});
    } catch (e) {}
  }
}

function resumeScanner() {
  if (html5Qr && cameraReady) {
    try {
      if (html5Qr.isPaused) html5Qr.resume().catch(() => {});
    } catch (e) {}
  }
}

function startScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    document.getElementById('scanResult').innerHTML = '<p class="dim">Scanner library failed to load.</p>';
    return;
  }
  html5Qr = new Html5Qrcode('scannerBox');
  html5Qr.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decoded) => { handleCode(decoded.trim()); },
    () => {}
  ).catch((err) => {
    console.error(err);
    document.getElementById('scanResult').innerHTML =
      '<p class="dim">Could not start camera. Use the manual entry below.<br>' + escapeHtml(String(err)) + '</p>';
  });
}

// Manual entry stays available even without a camera
document.getElementById('manualScanBtn').addEventListener('click', () => {
  const id = document.getElementById('manualId').value.trim();
  if (!id) { toast('Enter a ticket ID', 'bad'); return; }
  handleCode(id);
  document.getElementById('manualId').value = '';
});
document.getElementById('manualId').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('manualScanBtn').click();
});

// ---------- Automatic scan handling ----------
async function handleCode(value) {
  pauseScanner();
  const res = document.getElementById('scanResult');

  try {
    const ref = db.collection(COLLECTION).doc(value);
    const doc = await ref.get();

    if (!doc.exists) {
      res.innerHTML = scanCard('Not Found', value, 'This ticket ID is not registered.', 'rgba(231,76,60,.5)', 'rgba(231,76,60,.12)', 'var(--red)');
      autoDismiss(res, 1500);
      return;
    }

    const data = doc.data();

    if (data.scanned) {
      // Already scanned → warning popup, no update
      res.innerHTML = scanCard('Already Scanned', value, (data.name || '—') + ' has already entered.',
        'rgba(231,76,60,.5)', 'rgba(231,76,60,.12)', 'var(--red)');
      autoDismiss(res, 1500);
      return;
    }

    // First scan → auto mark as scanned + timestamp, then "Done" popup
    await ref.update({
      scanned: true,
      scannedAt: new Date().toISOString()
    });
    res.innerHTML = scanCard('Done', value, (data.name || '—') + ' — entry confirmed.',
      'rgba(46,204,113,.5)', 'rgba(46,204,113,.12)', 'var(--green)');
    autoDismiss(res, 1000);
  } catch (err) {
    console.error('Scan validation failed:', err);
    res.innerHTML = '<p class="dim" style="text-align:center">Could not validate. Check Firestore rules / network.</p>';
  }
}

function scanCard(title, ticketId, message, border, bg, color) {
  return `<div class="card" style="padding:18px; text-align:center; border-color:${border}; background:${bg}; animation:fadeUp .25s ease">
    <h3 style="color:${color}; margin-bottom:6px">${escapeHtml(title)}</h3>
    <p style="margin:4px 0"><code style="color:var(--gold)">${escapeHtml(ticketId)}</code></p>
    <p class="dim" style="font-size:.88rem; margin:0">${escapeHtml(message)}</p>
  </div>`;
}

// Auto-hide popup then keep scanning for the next ticket
function autoDismiss(res, ms) {
  clearTimeout(autoDismiss._t);
  autoDismiss._t = setTimeout(() => {
    res.innerHTML = '<p class="dim" style="text-align:center">Scanning…</p>';
    resumeScanner();
  }, ms);
}