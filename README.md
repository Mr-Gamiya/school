# LUMIRA '26 — VIP Ticket & Scanner App

A premium black & gold web app for **Lumbini College 2026 A/L Batch**'s **LUMIRA '26** event. Built with plain HTML/CSS/JS + **Firebase Firestore**, deployable to **GitHub Pages**.

## Features

- 🎟 **Registration form** — inputs Name, Class, Phone & Notes; auto-generates a unique numeric Ticket ID.
- 🔳 **QR generation** — each submission gets a personalized QR code (rendered in-browser, no server needed).
- 🗄 **Firestore storage** — every entry is saved live to your Firebase project.
- 🪟 **Ticket popup** — a VIP ticket modal appears instantly on submit with QR + details.
- 📄 **Download** — export the full ticket as a branded PDF (or just the QR as PNG).
- 🔐 **Admin dashboard** — lists all registrations with live status, counts, search, scan timestamps & delete.
- 📷 **QR scanner** — real-time camera scanning that validates & marks tickets as *Active* / *Already Scanned*.

## Project structure

```
├── index.html        # Registration form + ticket popup modal
├── admin.html        # Dashboard + scanner
├── css/style.css     # Black & gold premium theme
└── js/
    ├── config.js     # Firebase config
    ├── common.js     # Shared helpers (toasts, particles, numeric uid)
    ├── register.js   # Registration + QR + PDF logic
    └── admin.js      # Dashboard table, delete + scanner logic
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

## Usage

- **Guests** visit `index.html`, submit the form, and download/hold their VIP ticket PDF.
- **Admins** visit `admin.html`, use **Scan QR Code** (camera) or paste a Ticket ID, mark entry as scanned, or delete entries.
