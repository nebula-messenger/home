import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbMOYvjzP_-3Nz2qNEPdGZwp7a46e8qsk",
  authDomain: "nebula-messenger-224ea.firebaseapp.com",
  projectId: "nebula-messenger-224ea",
  storageBucket: "nebula-messenger-224ea.firebasestorage.app",
  messagingSenderId: "901813815768",
  appId: "1:901813815768:web:c768a6b116001465d28aad"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged };

// Firebase Authentication hat keine native Username/Passwort-Methode.
// Wir verwenden deshalb eine interne, aus dem Username abgeleitete Adresse.
export function normalizeUsername(username = "") {
  return username.trim().toLowerCase();
}

export function technicalEmail(usernameLower = "") {
  return `${normalizeUsername(usernameLower).replace(/[^a-z0-9._-]/g, "-")}@login.localhost`;
}

export function chatIdFor(a, b) {
  return [a, b].sort().join("__");
}

export function initials(name = "?") {
  return name.trim().slice(0, 2).toUpperCase();
}

export function formatTime(ts) {
  if (!ts?.toDate) return "";
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(ts.toDate());
}

export function formatDate(ts) {
  if (!ts?.toDate) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(ts.toDate());
}

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

export function toast(message, type = "info") {
  const root = document.getElementById("toast-root") || (() => {
    const el = document.createElement("div");
    el.id = "toast-root";
    document.body.appendChild(el);
    return el;
  })();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function authStateOnce() {
  return new Promise(resolve => {
    let done = false;
    const finish = user => {
      if (done) return;
      done = true;
      unsub();
      resolve(user);
    };
    const unsub = onAuthStateChanged(auth, finish);
  });
}

export function redirectToAuth(next = "index.html") {
  const target = String(next || "index.html").split("?")[0].split("#")[0];
  if (target === "auth.html") return;
  location.replace(`auth.html?next=${encodeURIComponent(target)}`);
}

export async function requireAuth({ redirect = "index.html" } = {}) {
  // Wichtig: erst auf den initialen Firebase-Auth-State warten.
  const user = await authStateOnce();
  if (user) return user;
  redirectToAuth(redirect);
  return null;
}

export async function ensureUserProfile(user) {
  if (!user) return null;
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return { uid: user.uid, ...existing.data() };

  // Repariert ältere/teilweise angelegte Konten, damit ein fehlendes Profil
  // niemals mehr einen Auth-Redirect-Loop erzeugt.
  let username = "";
  try {
    const q = query(collection(db, "usernames"), where("uid", "==", user.uid));
    const idx = await getDocs(q);
    if (!idx.empty) username = idx.docs[0].data().username || idx.docs[0].id;
  } catch { }

  if (!username && user.email?.endsWith("@login.localhost")) {
    username = user.email.replace(/@login\.localhost$/i, "");
  }
  if (!username) username = "User";

  const data = {
    username,
    usernameLower: normalizeUsername(username),
    bio: "",
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    online: true
  };
  await setDoc(ref, data, { merge: true });
  return { uid: user.uid, ...data };
}

export function setUserStatus(uid, online) {
  if (!uid) return Promise.resolve();
  return updateDoc(doc(db, "users", uid), {
    online: !!online,
    lastSeen: serverTimestamp()
  }).catch(() => { });
}
