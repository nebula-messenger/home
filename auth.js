import { auth, db, technicalEmail, normalizeUsername, toast } from './firebase.js';
    import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
    import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

    const $ = s => document.querySelector(s);
    const error = $('#auth-error');
    const norm = normalizeUsername;
    let submitting = false;
    let authReady = false;

    function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function setError(msg) { error.textContent = msg; error.classList.remove('hidden'); }
    function clearError() { error.classList.add('hidden'); error.textContent = ''; }
    function validUsername(u) { return /^[a-zA-Z0-9._-]{3,24}$/.test(u); }
    function nextPage() {
      const next = new URLSearchParams(location.search).get('next') || 'index.html';
      const allowed = new Set(['index.html', 'index.html', 'friends.html', 'search.html', 'profile.html', 'settings.html', 'chat.html']);
      return allowed.has(next.split('?')[0]) ? next : 'index.html';
    }

    // Nur nach dem initialen Auth-State umleiten. Während einer Anmeldung/Registrierung
    // verhindert submitting, dass Zwischenzustände eine doppelte Navigation auslösen.
    onAuthStateChanged(auth, user => {
      authReady = true;
      // Die Auth-Seite darf nur einen bereits abgeschlossenen Login weiterleiten.
      // Während einer Anmeldung/Registrierung bleibt die Seite vollständig unter
      // Kontrolle des jeweiligen Submit-Handlers.
      if (user && !submitting) location.replace(nextPage());
    });

    document.querySelectorAll('.auth-tab').forEach(btn => btn.onclick = () => {
      document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const register = btn.dataset.tab === 'register';
      $('#login-form').classList.toggle('hidden', register);
      $('#register-form').classList.toggle('hidden', !register);
      clearError();
    });

    $('#login-form').onsubmit = async e => {
      e.preventDefault();
      if (submitting) return;
      clearError();
      submitting = true;
      const username = $('#login-username').value.trim();
      const password = $('#login-password').value;
      if (!validUsername(username)) { submitting = false; return setError('Ungültiger Benutzername.'); }
      try {
        // WICHTIG: Nach dem Logout ist kein Firebase-Nutzer angemeldet. Deshalb
        // darf die Anmeldung NICHT erst ein Firestore-Username-Dokument lesen.
        // Die technische Firebase-Adresse wird deterministisch aus dem Username
        // erzeugt und kann direkt für signInWithEmailAndPassword verwendet werden.
        await signOut(auth).catch(() => { });
        await signInWithEmailAndPassword(auth, technicalEmail(norm(username)), password);
        location.replace(nextPage());
      } catch (err) {
        const code = err?.code || '';
        const msg = code === 'auth/too-many-requests'
          ? 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.'
          : code === 'auth/network-request-failed'
            ? 'Netzwerkfehler. Prüfe deine Internetverbindung.'
            : 'Benutzername oder Passwort ist falsch.';
        setError(msg);
      } finally {
        submitting = false;
      }
    };

    $('#register-form').onsubmit = async e => {
      e.preventDefault();
      if (submitting) return;
      clearError();
      submitting = true;
      const username = $('#register-username').value.trim();
      const lower = norm(username);
      const password = $('#register-password').value;
      if (!validUsername(username)) { submitting = false; return setError('Benutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Bindestrich oder Unterstrich.'); }
      if (password !== $('#register-password2').value) { submitting = false; return setError('Die Passwörter stimmen nicht überein.'); }
      if (password.length < 6) { submitting = false; return setError('Das Passwort muss mindestens 6 Zeichen haben.'); }

      let cred = null;
      try {
        cred = await createUserWithEmailAndPassword(auth, technicalEmail(lower), password);
        await runTransaction(db, async tx => {
          const usernameRef = doc(db, 'usernames', lower);
          const userRef = doc(db, 'users', cred.user.uid);
          const snap = await tx.get(usernameRef);
          if (snap.exists()) throw new Error('USERNAME_TAKEN');
          tx.set(usernameRef, { uid: cred.user.uid, username, createdAt: serverTimestamp() });
          tx.set(userRef, {
            username,
            usernameLower: lower,
            bio: '',
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            online: true
          });
        });
        toast('Konto erstellt.', 'success');
        location.replace(nextPage());
      } catch (err) {
        if (cred?.user && err?.message === 'USERNAME_TAKEN') {
          try { await cred.user.delete(); } catch { }
          setError('Dieser Benutzername ist bereits vergeben.');
        } else {
          const code = err?.code || '';
          const map = {
            'auth/email-already-in-use': 'Dieser Benutzername ist bereits vergeben.',
            'auth/invalid-email': 'Interner Anmeldefehler. Bitte benutze einen anderen Benutzernamen.',
            'auth/weak-password': 'Passwort zu schwach.',
            'auth/operation-not-allowed': 'Firebase: Email/Passwort-Anmeldung ist noch nicht aktiviert.',
            'permission-denied': 'Firestore verweigert den Zugriff. Bitte firestore.rules veröffentlichen.'
          };
          setError(map[code] || `Konto konnte nicht erstellt werden (${code || 'unbekannter Fehler'}).`);
        }
      } finally {
        submitting = false;
      }
    };
