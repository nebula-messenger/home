import {
  auth, db, requireAuth, ensureUserProfile, initials, escapeHtml,
  formatTime, formatDate, toast, setUserStatus
} from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  collection, doc, getDoc, onSnapshot, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const path = location.pathname.split("/").pop() || "index.html";
const current = await requireAuth({ redirect: path });
if (!current) throw new Error("AUTH_REQUIRED");

let me;
try {
  me = await ensureUserProfile(current);
} catch (error) {
  console.error("Profil konnte nicht geladen/erstellt werden:", error);
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:#f7f9fc;color:#18202f">
      <section style="max-width:520px;background:#fff;border:1px solid #e6eaf0;border-radius:20px;padding:32px;box-shadow:0 18px 60px rgba(20,30,50,.08)">
        <div style="font-size:13px;font-weight:800;letter-spacing:.12em;color:#5267ff">NEBULA</div>
        <h1 style="margin:8px 0 10px">Profil konnte nicht geladen werden</h1>
        <p style="color:#687386;line-height:1.6">Firebase ist angemeldet, aber Firestore verweigert den Profilzugriff. Veröffentliche bitte die mitgelieferte <strong>firestore.rules</strong>.</p>
        <button onclick="location.reload()" style="border:0;border-radius:12px;padding:12px 18px;background:#5267ff;color:#fff;font-weight:800;cursor:pointer">Erneut versuchen</button>
      </section>
    </main>`;
  throw error;
}

window.appUser = me;

const nav = document.querySelector(".nav-links");
document.querySelectorAll("[data-me-name]").forEach(el => el.textContent = me.username || "User");
document.querySelectorAll("[data-me-initials]").forEach(el => el.textContent = initials(me.username));
document.querySelectorAll("[data-me-bio]").forEach(el => el.textContent = me.bio || "Noch keine Bio");
document.querySelectorAll("[data-nav]").forEach(a => {
  if (a.dataset.nav === path) a.classList.add("active");
});

function buildMobileDrawer() {
  if (document.getElementById("mobile-drawer")) return;
  const active = path;
  const drawer = document.createElement("div");
  drawer.id = "mobile-drawer";
  drawer.className = "mobile-drawer";
  drawer.innerHTML = `
    <div class="mobile-drawer-backdrop" data-close-menu></div>
    <aside class="mobile-drawer-panel" aria-label="Navigation">
      <div class="mobile-drawer-head">
        <a class="logo" href="index.html"><span class="logo-mark">N</span>Nebula</a>
        <button class="icon-btn" type="button" data-close-menu aria-label="Menü schließen">×</button>
      </div>
      <nav class="mobile-drawer-links">
        <a class="${active === "index.html" ? "active" : ""}" href="index.html">💬 <span>Chats</span></a>
        <a class="${active === "friends.html" ? "active" : ""}" href="friends.html">👥 <span>Freunde</span></a>
        <a class="${active === "search.html" ? "active" : ""}" href="search.html">⌕ <span>Entdecken</span></a>
        <a class="${active === "settings.html" ? "active" : ""}" href="settings.html">⚙ <span>Einstellungen</span></a>
      </nav>
      <div class="mobile-drawer-footer">
        <a class="mobile-drawer-profile" href="profile.html">
          <span class="avatar small">${escapeHtml(initials(me.username))}</span>
          <span class="grow"><strong>${escapeHtml(me.username || "User")}</strong><span>Mein Profil</span></span>
        </a>
        <button id="mobile-logout" class="ghost wide" type="button">Abmelden</button>
      </div>
    </aside>`;
  document.body.appendChild(drawer);
  const toggle = document.getElementById("mobile-menu-toggle");
  const open = () => {
    drawer.classList.add("is-open");
    document.body.classList.add("menu-open");
    toggle?.classList.add("open");
    toggle?.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    drawer.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    toggle?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  };
  toggle?.addEventListener("click", () => drawer.classList.contains("is-open") ? close() : open());
  drawer.querySelectorAll("[data-close-menu]").forEach(el => el.addEventListener("click", close));
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
}

buildMobileDrawer();

let loggingOut = false;
async function doLogout() {
  if (loggingOut) return;
  loggingOut = true;
  try { await setUserStatus(current.uid, false); } catch {}
  try { await signOut(auth); }
  finally { location.replace("auth.html"); }
}
document.getElementById("logout")?.addEventListener("click", doLogout);
document.getElementById("logout2")?.addEventListener("click", doLogout);
document.getElementById("mobile-logout")?.addEventListener("click", doLogout);
await setUserStatus(current.uid, true);

function notificationRoot() {
  let root = document.getElementById("notification-stack");
  if (!root) {
    root = document.createElement("div");
    root.id = "notification-stack";
    root.className = "notification-stack";
    document.body.appendChild(root);
  }
  return root;
}
function showNotification({ type = "message", title, text, href, icon = "•" }) {
  const root = notificationRoot();
  const el = document.createElement("div");
  el.className = `notification-popup ${type === "request" ? "request" : ""}`;
  el.innerHTML = `<div class="notification-icon">${icon}</div><div class="notification-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div><button class="notification-close" aria-label="Schließen">×</button>`;
  const close = () => { el.classList.add("leaving"); setTimeout(() => el.remove(), 220); };
  el.querySelector(".notification-close").addEventListener("click", close);
  el.addEventListener("click", e => {
    if (e.target.closest("button")) return;
    if (href) location.href = href;
  });
  if (href) el.style.cursor = "pointer";
  root.prepend(el);
  setTimeout(() => { if (el.isConnected) close(); }, 5600);
}

function addNotificationBadge() {
  const links = document.querySelectorAll("a[href='friends.html']");
  links.forEach(link => {
    if (!link.querySelector(".notification-badge")) {
      const badge = document.createElement("span");
      badge.className = "notification-badge";
      badge.hidden = true;
      link.style.position = "relative";
      link.appendChild(badge);
    }
  });

  const top = document.querySelector(".top-actions");
  if (top && !document.getElementById("notify-btn")) {
    const btn = document.createElement("button");
    btn.id = "notify-btn";
    btn.className = "icon-btn notify-btn";
    btn.type = "button";
    btn.title = "Benachrichtigungen";
    btn.setAttribute("aria-label", "Benachrichtigungen");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.hidden = true;
    btn.appendChild(badge);
    top.insertBefore(btn, top.firstChild);
    btn.addEventListener("click", () => {
      const first = document.querySelector(".notification-popup");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
      else location.href = "friends.html";
    });
  }
}
addNotificationBadge();

let alertCount = 0;
function updateAlertCount(value) {
  alertCount = Math.max(0, Number(value) || 0);
  document.querySelectorAll(".notification-badge").forEach(b => {
    b.hidden = alertCount <= 0;
    b.textContent = alertCount > 99 ? "99+" : String(alertCount);
  });
  document.querySelectorAll(".notify-btn").forEach(btn => btn.classList.toggle("has-alert", alertCount > 0));
}

async function refreshAlertCount() {
  let total = 0;
  try {
    const reqSnap = await getDocs(collection(db, "requests", current.uid, "incoming"));
    total += reqSnap.size;
  } catch {}

  try {
    const chatsSnap = await getDocs(query(collection(db, "chats"), where("members", "array-contains", current.uid)));
    for (const chatDoc of chatsSnap.docs) {
      try {
        const unreadQ = query(
          collection(db, "chats", chatDoc.id, "messages"),
          where("receiverId", "==", current.uid)
        );
        const unreadSnap = await getDocs(unreadQ);
        unreadSnap.forEach(messageDoc => {
          if (messageDoc.data().read !== true) total += 1;
        });
      } catch {}
    }
  } catch {}

  updateAlertCount(total);
}

async function startNotifications() {
  const requestQ = query(collection(db, "requests", current.uid, "incoming"));
  let firstRequests = true;
  onSnapshot(requestQ, async snap => {
    if (!firstRequests) {
      for (const change of snap.docChanges()) {
        if (change.type !== "added") continue;
        const fromUid = change.doc.id;
        try {
          const u = (await getDoc(doc(db, "users", fromUid))).data();
          showNotification({ type: "request", icon: "+", title: "Neue Freundschaftsanfrage", text: `${u?.username || "Jemand"} möchte dein Freund werden.`, href: "friends.html" });
          refreshAlertCount();
        } catch {}
      }
    }
    firstRequests = false;
  }, e => console.debug("Request notifications unavailable:", e));

  const chatsQ = query(collection(db, "chats"), where("members", "array-contains", current.uid));
  const messageListeners = new Map();
  let firstChats = true;
  onSnapshot(chatsQ, snap => {
    const activeIds = new Set();
    snap.docs.forEach(chatDoc => {
      activeIds.add(chatDoc.id);
      if (messageListeners.has(chatDoc.id)) return;
      const otherId = (chatDoc.data().members || []).find(uid => uid !== current.uid);
      if (!otherId) return;
      const q = query(collection(db, "chats", chatDoc.id, "messages"), orderBy("createdAt", "desc"), limit(1));
      let firstMessage = true;
      const unsub = onSnapshot(q, async msgSnap => {
        if (firstMessage) { firstMessage = false; return; }
        const latest = msgSnap.docs[0];
        if (!latest) return;
        const m = latest.data();
        if (m.senderId !== current.uid) {
          const viewingUid = path === "chat.html" ? new URLSearchParams(location.search).get("uid") : null;
          if (viewingUid === otherId) return;
          try {
            const u = (await getDoc(doc(db, "users", otherId))).data();
            const body = String(m.text || "Neue Nachricht");
            showNotification({ type: "message", icon: "✦", title: u?.username || "Neue Nachricht", text: body.length > 100 ? body.slice(0, 100) + "…" : body, href: `chat.html?uid=${encodeURIComponent(otherId)}` });
            refreshAlertCount();
          } catch {}
        }
      }, e => console.debug("Message notifications unavailable:", e));
      messageListeners.set(chatDoc.id, unsub);
    });
    for (const [id, unsub] of messageListeners) if (!activeIds.has(id)) { unsub(); messageListeners.delete(id); }
    firstChats = false;
  }, e => console.debug("Chat notifications unavailable:", e));
  window.addEventListener("beforeunload", () => messageListeners.forEach(unsub => unsub()));
}
startNotifications();
refreshAlertCount();
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAlertCount(); });
window.addEventListener("pageshow", () => refreshAlertCount());

window.app = { current, me, db, toast, escapeHtml, initials, formatTime, formatDate, doLogout, refreshAlertCount };
