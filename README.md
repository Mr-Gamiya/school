# LUMIRA '26 — Ticket & Scanner App

A premium black & gold web app for **Lumbini College 2026 A/L Batch**'s **LUMIRA '26** event. Built with plain HTML/CSS/JS + **Firebase Firestore**, deployable to **GitHub Pages**.

## Features

- 🎟 **Registration form** — inputs Name, Class, Phone, Additional Notes & optional Email; auto-generates a unique numeric Ticket ID.
- 🔳 **QR generation** — each submission gets a personalized QR code (rendered in-browser as a clean image in the modal).
- 🗄 **Firestore storage** — every entry is saved live to your Firebase project.
- 🪟 **Ticket popup** — a ticket modal appears instantly on submit with QR + details.
- 📄 **PDF download & e-mail** — generates the official LUMIRA ticket on the **`01` background template** in high resolution: the guest's QR fills the template's white QR box (92%) and the full name is stamped below it in premium gold; lossless PNG background + vector text = zero compression artifacts, downloadable as PDF and e-mailable.
- 📧 **Auto e-mail** — if an email is entered, the ticket is sent automatically via the **Brevo HTTP API** (no third-party relay). A size-aware attachment picks the full-quality PDF when it fits (~4.5 MB budget); otherwise it falls back to a **high-resolution (2× Retina) lossless PNG** of the same ticket, so the QR is always large and sharp.
- 🔐 **Admin dashboard** — lists all registrations with live status, counts, search, scan timestamps, **Download** & **Delete** actions.
- 📷 **QR scanner** — scanning a QR **automatically** marks the ticket as scanned (Done popup, auto-dismisses ~1s) or warns **Already Scanned** on repeat scans.

## Project structure

```
├── index.html        # Registration form + ticket popup modal
├── admin.html        # Dashboard + scanner
├── 01.png            # Official ticket background template (1774x887, used for PDFs)
├── css/style.css     # Black & gold premium theme
└── js/
    ├── config.js     # Firebase config
    ├── common.js     # Shared helpers (toasts, particles, numeric uid, QR + template PDF builder)
    ├── email.js      # Brevo e-mail delivery config
    ├── register.js   # Registration + QR + PDF + email logic
    └── admin.js      # Dashboard table, download/delete + auto scanner logic
```

> 🎫 **How the ticket PDF is built** — `buildTicketPdf` (in `common.js`) loads `01.png` as the full-bleed background on a 210×105 mm page, places the guest's QR inside the white placeholder box (template coords `1338,238` → size `305×298` px; QR fills 92% as large as the quiet zone allows), then stamps just the guest's **full name in premium gold (`#FFD700`)** in the flat band below the box. The background is embedded as **lossless PNG** (no compression artifacts) and the text is vector, so the QR stays sharp and scannable on phones. The e-mailed PNG fallback is rendered at **2× (Retina) resolution**, stepping down only if the payload needs to shrink. The registration **modal stays lightweight** (no template image) — only the downloaded/e-mailed ticket uses the template.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages → Source** and select `Deploy from a branch`, branch `main`, folder `/ (root)`.
3. Your app will be live at `https://<username>.github.io/<repo>/`.

## Firebase setup (Firestore)

1. Create a Firebase project (or reuse one). In **Firestore Database → Rules**, set rules (see below).
2. Your `firebaseConfig` in `js/config.js` is already set. If yours changes, update it there.

### Firestore rules (paste into the Rules tab)

For a simple public setup (no auth), allow read and write:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registrations/{document} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ For a production event, tighten these rules and add authentication (e.g., only admins may read/scan).

## Automated e-mail (Brevo HTTP API)

The app sends emails straight from the browser to **api.brevo.com/v3/smtp/email** using a Brevo **Transactional API key** (`xkeysib-…`). No third-party SMTP relay is needed — Brevo allows CORS for GitHub Pages origins.

1. Create a free account at **https://brevo.com**.
2. Verify your **sender identity** (Settings → Senders & IPs) and put that address into `js/email.js` → `EMAIL_CONFIG.SENDER.email`.
3. Create an **API key** (Settings → SMTP & API → API keys → "Create a key") and paste it into `js/email.js` → `EMAIL_CONFIG.API_KEY`.
4. Done — when a visitor enters an email, the ticket is attached and sent automatically (PDF preferred; auto-PNG fallback if the payload would be too heavy).

> ⚠️ Credentials in client-side JS are visible to anyone who inspects the page — inherent to a serverless GitHub Pages app. Don't reuse a key you can't rotate; tighten as needed for a production event.
> If the API key is missing, the app still works — it just skips the e-mail and shows a notice.

## Usage

- **Guests** visit `index.html`, submit the form, and download/hold their ticket PDF (optionally gets it e-mailed).
- **Admins** visit `admin.html`, use **Scan QR Code** (camera) or paste a Ticket ID. Scans are **automatic**:
  - First scan → ticket marked scanned + timestamp recorded, quick **Done** popup (~1s).
  - Re-scan → **Already Scanned** warning popup.
  - Admins can **Download** any ticket PDF again or **Delete** an entry.
