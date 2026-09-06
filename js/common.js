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
