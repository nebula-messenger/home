import './app.js';
    import { db } from './firebase.js';
    import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

    const me = window.app.current;
    const requested = new URLSearchParams(location.search).get('uid');
    const isOwn = !requested || requested === me.uid;
    const targetId = isOwn ? me.uid : requested;
    const $ = s => document.querySelector(s);

    async function init() {
      const snap = await getDoc(doc(db, 'users', targetId));
      if (!snap.exists()) { window.app.toast('Profil nicht gefunden.', 'error'); setTimeout(() => location.replace('search.html'), 500); return; }
      const u = { uid: targetId, ...snap.data() };
      $('#profile-avatar').textContent = window.app.initials(u.username);
      $('#profile-name').textContent = u.username || 'User';
      $('#profile-created').textContent = u.createdAt ? (isOwn ? 'Mitglied seit ' : 'Mitglied seit ') + window.app.formatDate(u.createdAt) : '';
      $('#profile-eyebrow').textContent = isOwn ? 'MEIN PROFIL' : 'PROFIL';
      if (isOwn) {
        $('#username').value = u.username || '';
        $('#bio').value = u.bio || '';
        $('#profile-form').onsubmit = async e => { e.preventDefault(); const bio = $('#bio').value.trim(); try { await updateDoc(doc(db, 'users', me.uid), { bio }); window.app.me.bio = bio; window.app.toast('Profil gespeichert.', 'success') } catch (err) { window.app.toast('Profil konnte nicht gespeichert werden.', 'error') } };
        $('#logout2').onclick = () => window.app.doLogout();
      } else {
        $('#profile-form').classList.add('hidden');
        $('#account-card').classList.add('hidden');
        $('#view-card').classList.remove('hidden');
        $('#view-bio').textContent = u.bio || 'Noch keine Bio.';
        $('#view-chat').href = 'chat.html?uid=' + encodeURIComponent(targetId);
      }
    }
    init().catch(() => window.app.toast('Profil konnte nicht geladen werden.', 'error'));
