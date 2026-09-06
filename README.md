# LUMIRA '26 — Ticket & Scanner App

A premium black & gold web app for **Lumbini College 2026 A/L Batch**'s **LUMIRA '26** event. Built with plain HTML/CSS/JS + **Firebase Firestore**, deployable to **GitHub Pages**.

## Features

- 🎟 **Registration form** — inputs Name, Class, Phone, Additional Notes & optional Email; auto-generates a unique numeric Ticket ID.
- 🔳 **QR generation** — each submission gets a personalized QR code (rendered in-browser as a clean image in the modal).
- 🗄 **Firestore storage** — every entry is saved live to your Firebase project.
- 🪟 **Ticket popup** — a ticket modal appears instantly on submit with QR + details.
- 📄 **PDF download & e-mail** — generates the official LUMIRA ticket on the **`01` background template**, placing each guest's unique QR precisely inside the template's white QR placeholder box and stamping holder details; downloadable as PDF and e-mailable.
- 📧 **Auto e-mail** — if an email is entered, the ticket PDF is attached and sent automatically via the **Brevo SMTP relay** (SMTP.js).
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

> 🎫 **How the ticket PDF is built** — `buildTicketPdf` (in `common.js`) loads `01.png` as the full-bleed background on a 210×105 mm page, places the guest's QR inside the white placeholder box (template coords `1338,238` → size `305×298` px; QR fills 86%), and stamps name / class·phone / ticket ID in the flat band below the box. The registration **modal stays lightweight** (no template image) — only the downloaded/e-mailed PDF uses the template.

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

## Automated e-mail (Brevo SMTP relay)

The app sends emails through [SMTP.js](https://smtpjs.com), which relays to your **Brevo SMTP** server (`smtp-relay.brevo.com:587`). Your SMTP login + SMTP key are already filled in (`js/email.js` → `EMAIL_CONFIG`).

1. Create a free account at **https://brevo.com**.
2. Verify your **sender identity** (Settings → Senders & IPs).
3. Paste the verified sender email into `js/email.js` → `EMAIL_CONFIG.SENDER.email`.
4. Done — when a visitor enters an email, the ticket PDF is attached and sent automatically.

> ⚠️ Credentials in client-side JS are visible to anyone who inspects the page — inherent to a serverless GitHub Pages app. Don't reuse a key you can't rotate; tighten as needed for a production event.
> If the sender email is missing, the app still works — it just skips the e-mail and shows a notice.

## Usage

- **Guests** visit `index.html`, submit the form, and download/hold their ticket PDF (optionally gets it e-mailed).
- **Admins** visit `admin.html`, use **Scan QR Code** (camera) or paste a Ticket ID. Scans are **automatic**:
  - First scan → ticket marked scanned + timestamp recorded, quick **Done** popup (~1s).
  - Re-scan → **Already Scanned** warning popup.
  - Admins can **Download** any ticket PDF again or **Delete** an entry.
