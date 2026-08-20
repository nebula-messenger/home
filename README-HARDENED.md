# Nebula Messenger – gehärtete Hosting-Version

## Vor dem Deploy

1. `firebase.js` enthält deine Firebase Web-Konfiguration. Diese Werte sind für eine Web-App öffentlich sichtbar und keine Admin-Secrets.
2. Firebase Authentication: **Email/Password** aktivieren.
3. Authentication → Settings → Authorized domains: nur echte Produktions-/Testdomains eintragen (`localhost` und `127.0.0.1` nur für lokale Tests).
4. Firestore Rules aus `firestore.rules` veröffentlichen oder per CLI deployen.
5. Für Produktion Firebase App Check für die Web-App aktivieren. Für den Start kann reCAPTCHA Enterprise verwendet werden; App Check ergänzt die Security Rules und ersetzt sie nicht.
6. Keine Firebase Admin SDK JSON-Datei oder sonstige privaten Secrets in diesen Ordner legen.

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,hosting
```

Die `.firebaserc` ist bereits auf das bisher verwendete Projekt `nebula-messenger-224ea` gesetzt. Falls du ein anderes Firebase-Projekt verwendest, ändere sie vor dem Deploy oder führe `firebase use <projekt-id>` aus.

## Was die gehärteten Rules zusätzlich verhindern

- öffentliche Auflistung des Username-Index
- gefälschte Freundschaften ohne echte eingehende Anfrage
- Nachrichten mit einem fremden/falschen Empfänger
- Chat-Erstellung ohne beidseitig bestätigte Freundschaft
- Änderung der Chat-Mitgliederliste
- Änderung fremder Profile
- Überschreiten der Bio-/Nachrichtenlängen
- unerlaubte Felder in wichtigen Dokumenten
- beliebige Änderungen an bereits gesendeten Nachrichten

## Hosting-Schutz

`firebase.json` setzt HTTPS-typische Sicherheitsheader, eine restriktive Content-Security-Policy, `nosniff`, `frame-ancestors`, Referrer-Policy und Permissions-Policy sowie sinnvolle Cache-Regeln.
