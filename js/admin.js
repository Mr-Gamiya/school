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
    return [d.name, d.uid, d.cls, d.email, d.phone, d.id]
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
    return `<tr>
      <td><code>${escapeHtml(d.uid || d.id)}</code></td>
      <td>${escapeHtml(d.name || '—')}</td>
      <td>${escapeHtml(d.cls || '—')}</td>
      <td style="font-size:.8rem">${escapeHtml(d.email || '—')}<br/>${escapeHtml(d.phone || '')}</td>
      <td><span class="status-chip ${statusClass(d.scanned)}">${statusText(d.scanned)}</span></td>
      <td style="font-size:.8rem; color:var(--text-dim)">${when}</td>
      <td>
        <button class="btn small outline" onclick="resetStatus('${d.id}')">Reset</button>
      </td>
    </tr>`;
  }).join('');
}

function escapeHtml(str) {
  return str == null ? '' : String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Reset a ticket back to Active
window.resetStatus = async function (id) {
  try {
    await db.collection(COLLECTION).doc(id).update({ scanned: false, scannedAt: null });
    toast('Status reset to Active.', 'good');
  } catch (e) {
    console.error(e);
    toast('Failed to reset.', 'bad');
  }
};

// ---------- Search ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim();
  render();
});

// ---------- Export CSV ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  if (allDocs.length === 0) { toast('Nothing to export', 'bad'); return; }
  const header = 'Ticket ID,Name,Class,Email,Phone,Status,Scanned At,Created At';
  const rows = allDocs.map((d) => [
    d.uid || d.id, d.name, d.cls, d.email, d.phone,
    d.scanned ? 'Scanned' : 'Active',
    d.scannedAt ? new Date(d.scannedAt).toLocaleString() : '',
    d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
  ].map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
  const csv = header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lumira26-registrations.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported.', 'good');
});

// ---------- Scanner ----------
let html5Qr = null;
let scanning = false;

const modal = document.getElementById('scannerModal');
document.getElementById('scanBtn').addEventListener('click', openScanner);
document.getElementById('closeModal').addEventListener('click', closeScanner);
modal.addEventListener('click', (e) => { if (e.target === modal) closeScanner(); });

function openScanner() {
  modal.classList.add('open');
  document.getElementById('scanResult').innerHTML = '<p class="dim" style="text-align:center; margin-top:14px">Scanning…</p>';
  startScanner();
}

function closeScanner() {
  modal.classList.remove('open');
  if (html5Qr) {
    try { html5Qr.stop().catch(() => {}); } catch (e) {}
    html5Qr = null;
  }
  scanning = false;
}

function startScanner() {
  scanning = true;
  if (typeof Html5Qrcode === 'undefined') {
    document.getElementById('scanResult').innerHTML = '<p class="dim">Scanner library failed to load.</p>';
    return;
  }
  html5Qr = new Html5Qrcode('scannerBox');
  html5Qr.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decoded) => {
      handleScan(decoded.trim());
    },
    () => {}
  ).catch((err) => {
    console.error(err);
    document.getElementById('scanResult').innerHTML =
      '<p class="dim">Could not start camera. Use the manual entry below.<br>' + escapeHtml(String(err)) + '</p>';
  });
}

document.getElementById('manualScanBtn').addEventListener('click', () => {
  const id = document.getElementById('manualId').value.trim();
  if (!id) { toast('Enter a ticket ID', 'bad'); return; }
  handleScan(id);
  document.getElementById('manualId').value = '';
});

async function handleScan(value) {
  if (!scanning) { await validateTicket(value); return; }
  scanning = false;
  // Pause scanner while validating to avoid loop
  if (html5Qr) {
    try { await html5Qr.pause(); } catch (e) {}
  }
  await validateTicket(value);
}

async function validateTicket(value) {
  const res = document.getElementById('scanResult');
  try {
    const doc = await db.collection(COLLECTION).doc(value).get();
    if (!doc.exists) {
      res.innerHTML = `<div class="card" style="padding:16px; text-align:center; border-color:rgba(231,76,60,.5); background:rgba(231,76,60,.08)">
        <h3 style="color:var(--red)">NOT FOUND</h3>
        <p class="dim" style="margin-top:6px"><code>${escapeHtml(value)}</code> is not registered.</p>
      </div>`;
      toast('Ticket not found!', 'bad');
      return;
    }
    const data = doc.data();
    res.innerHTML = `<div class="card" style="padding:18px; text-align:center; border-color:${data.scanned ? 'rgba(231,76,60,.5)' : 'rgba(46,204,113,.5)'}; background:rgba(24,24,24,.6)">
      <h3 style="margin-bottom:4px; color:#fff">${escapeHtml(data.name || '—')}</h3>
      <p class="dim" style="font-size:.85rem">${escapeHtml(data.cls || '')}</p>
      <p style="margin:10px 0"><code style="color:var(--gold)">${escapeHtml(data.uid || value)}</code></p>
      <span class="status-chip ${statusClass(data.scanned)}">${statusText(data.scanned)}</span>
      <div style="margin-top:14px">
        <button class="btn small" id="markScannedBtn" ${data.scanned ? 'disabled' : ''}>Mark as Scanned</button>
        <button class="btn small outline" onclick="closeScanner()">Done</button>
      </div>
    </div>`;

    const markBtn = document.getElementById('markScannedBtn');
    if (markBtn) {
      markBtn.addEventListener('click', async () => {
        try {
          if (data.scanned) return;
          await db.collection(COLLECTION).doc(value).update({
            scanned: true,
            scannedAt: new Date().toISOString()
          });
          toast('Entry validated & marked scanned!', 'good');
          data.scanned = true;
          res.querySelector('.status-chip').className = 'status-chip ' + statusClass(true);
          res.querySelector('.status-chip').textContent = statusText(true);
          markBtn.disabled = true;
        } catch (e) {
          console.error(e);
          toast('Failed to update status.', 'bad');
        }
      });
    }
  } catch (e) {
    console.error(e);
    res.innerHTML = '<p class="dim" style="text-align:center">Could not validate. Check Firestore rules.</p>';
  }
}

// Resume camera after validation result shown
document.getElementById('scanResult').addEventListener('click', (e) => {
  if (e.target.id === 'markScannedBtn') return;
});
