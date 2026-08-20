# Nebula Messenger

Moderner 1:1-Messenger mit HTML/CSS/Vanilla JS und Firebase.

## Enthalten
- Benutzername + Passwort statt sichtbarer E-Mail-Anmeldung
- Firebase Authentication
- Firestore-Profile
- Nutzer-Suche
- Freundschaftsanfragen: senden, annehmen, ablehnen, zurückziehen
- Freunde entfernen und blockieren/entsperren
- Echtzeit-Chat mit `onSnapshot()`
- Nachrichten senden, bearbeiten und Lesestatus-Grundlage
- Online-/Zuletzt-online-Anzeige
- Profil mit Bio
- Einstellungen
- Responsive Desktop/Mobile UI
- Keine Profilbilder, kein Hell/Dunkel-Umschalter

## Firebase einrichten
1. Firebase Console → neues Projekt.
2. Web-App registrieren und Config aus der Console in `firebase.js` einsetzen.
3. Authentication → Sign-in method → **Email/Password aktivieren**. Die Website zeigt dem Nutzer trotzdem keine E-Mail an; intern wird aus dem Benutzernamen eine technische E-Mail-Adresse gebildet.
4. Firestore Database erstellen.
5. `firestore.rules` veröffentlichen.
6. Alle Dateien auf Firebase Hosting, GitHub Pages, Netlify oder einen anderen Server legen. Für lokale Tests am besten einen kleinen HTTP-Server verwenden.

## Hinweis zur Architektur
Firebase Email/Password Authentication erwartet eine E-Mail-Adresse. Deshalb nutzt dieses Projekt intern eine synthetische, nicht kommunizierte Adresse (`<username>@login.localhost`) und stellt nach außen ausschließlich Benutzername + Passwort dar. Für eine sehr große produktive Anwendung wäre eine serverseitig abgesicherte Username-Authentifizierung mit Admin SDK/Cloud Functions die robustere Architektur.

## Wichtige Sicherheit
Die Firestore-Regeln sind restriktiv aufgebaut und begrenzen Schreibzugriffe auf Besitzer bzw. Chat-Mitglieder. Firebase weist ausdrücklich darauf hin, dass Security Rules die eigentliche Zugriffskontrolle übernehmen sollen und reine `request.auth != null`-Regeln für Produktionsdaten zu weit gefasst sein können.
