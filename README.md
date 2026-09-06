# LUMIRA '26 — VIP Ticket & Scanner App

A premium black & gold web app for **Lumbini College 2026 A/L Batch**'s **LUMIRA '26** event. Built with plain HTML/CSS/JS + **Firebase Firestore**, deployable to **GitHub Pages**.

## Features

- 🎟 **Registration form** — inputs Name, Class, Phone, Additional Notes & optional Email; auto-generates a unique numeric Ticket ID.
- 🔳 **QR generation** — each submission gets a personalized QR code (rendered in-browser as a clean image in the modal).
- 🗄 **Firestore storage** — every entry is saved live to your Firebase project.
- 🪟 **Ticket popup** — a VIP ticket modal appears instantly on submit with QR + details.
- 📄 **PDF download** — the ticket/QR is downloadable strictly as a branded PDF.
- 📧 **Auto e-mail** — if an email is entered, the ticket PDF is sent automatically via **Brevo (Sendinblue) SMTP API**.
- 🔐 **Admin dashboard** — lists all registrations with live status, counts, search, scan timestamps, **Download** & **Delete** actions.
- 📷 **QR scanner** — scanning a QR **automatically** marks the ticket as scanned (Done popup, auto-dismisses ~1s) or warns **Already Scanned** on repeat scans.

## Project structure

```
├── index.html        # Registration form + ticket popup modal
├── admin.html        # Dashboard + scanner
├── css/style.css     # Black & gold premium theme
└── js/
    ├── config.js     # Firebase config
    ├── common.js     # Shared helpers (toasts, particles, numeric uid, QR + PDF builders)
    ├── email.js      # Brevo e-mail delivery config
    ├── register.js   # Registration + QR + PDF + email logic
    └── admin.js      # Dashboard table, download/delete + auto scanner logic
```

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

## Automated e-mail (Brevo / Sendinblue)

1. Create a free account at **https://brevo.com**.
2. Verify your **sender identity** (Settings → Senders & IPs).
3. Copy your **API key** (Settings → API Keys) into `js/email.js` → `EMAIL_CONFIG.API_KEY` and set your verified sender email in `EMAIL_CONFIG.SENDER`.
4. That's it — when a visitor enters an email, the ticket PDF is sent automatically via Brevo's SMTP API.

> If no API key is set, the app still works — it just skips the e-mail and shows a notice.

## Usage

- **Guests** visit `index.html`, submit the form, and download/hold their VIP ticket PDF (optionally gets it e-mailed).
- **Admins** visit `admin.html`, use **Scan QR Code** (camera) or paste a Ticket ID. Scans are **automatic**:
  - First scan → ticket marked scanned + timestamp recorded, quick **Done** popup (~1s).
  - Re-scan → **Already Scanned** warning popup.
  - Admins can **Download** any ticket PDF again or **Delete** an entry.
