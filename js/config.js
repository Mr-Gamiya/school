// ============================================================
// LUMIRA '26 — Firebase configuration
// Replace with your own config if needed.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBKPQJdFCNkjfdT_s29iZedbD20FpNSm8E",
  authDomain: "badge-party.firebaseapp.com",
  projectId: "badge-party",
  storageBucket: "badge-party.firebasestorage.app",
  messagingSenderId: "58982857990",
  appId: "1:58982857990:web:6691ba8fa124ff6ef6f287",
  measurementId: "G-GF28PG5RG5"
};

// Initialize Firebase (modular SDK v9+/v10 via CDN)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const COLLECTION = 'registrations';
