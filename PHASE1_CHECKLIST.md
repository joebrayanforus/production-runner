# ✅ Phase 1 Abgabe-Checkliste

**Deadline: 24.11.2025**  
**Empfänger: it.statmath@ifm.com**

---

## 📋 Zu erledigende Aufgaben

### 1. Konzept-Dokument (✅ ERLEDIGT)
- [x] **Datei:** `Spielkonzept_Phase1.md`
- [x] Spielidee beschrieben (Industrial Pac-Man)
- [x] Thematischer Bezug zu ifm statmath (s.FOX, IAIA)
- [x] Technische Umsetzung (Angular, C#, PostgreSQL, Docker)
- [x] Features für Phase 2 & Phase 3 definiert
- [x] Scoring-System erklärt
- [x] Risiken & Mitigation aufgeführt
- [x] Zeitplan erstellt
- [x] **Länge:** ~2 Seiten ✅

### 2. Skizzen (✅ ERLEDIGT)
- [x] **Datei:** `Skizzen_Phase1.md`
- [x] **Skizze 1:** Spielfeld-Layout (Fabrikhalle mit Labyrinth)
- [x] **Skizze 2:** Spielzustände & Gegner-Verhalten
- [x] UI-Elemente visualisiert (Score, Leaderboard, Controls)
- [x] 4 Gegner-Typen mit unterschiedlichen Verhaltensweisen
- [x] Power-Up Mechanik (KI-Optimierung)
- [x] Scoring-System detailliert

---

## 🔧 GitHub Repository Setup

### 3. Repository erstellen (⏳ TODO)
- [ ] Privates GitHub Repository anlegen
  - Name: z.B. `production-runner` oder `industrial-pacman`
  - Beschreibung: "Industrial Pac-Man Game für ifm statmath - Datenbanksysteme 1 Projekt"
  
### 4. Leserechte vergeben (⏳ TODO)
- [ ] User `it.statmath@ifm.com` als **Read-Only Collaborator** hinzufügen
  - **Anleitung:**
    1. GitHub Repo öffnen
    2. `Settings` → `Collaborators and teams`
    3. `Add people` → E-Mail eingeben: `it.statmath@ifm.com`
    4. Role: **Read** auswählen
    5. Einladung senden

### 5. Initialen Commit pushen (⏳ TODO)
```bash
# Repository initialisieren
git init
git add .
git commit -m "Phase 1: Spielkonzept + Skizzen"

# Remote Repository hinzufügen (URL anpassen!)
git remote add origin https://github.com/[dein-username]/production-runner.git

# Push
git branch -M main
git push -u origin main
```

### 6. Dateien ins Repository (⏳ TODO)
- [ ] `Spielkonzept_Phase1.md` committen
- [ ] `Skizzen_Phase1.md` committen
- [ ] `README_ProductionRunner.md` committen (als `README.md`)
- [ ] `.gitignore` erstellen (für Angular/C#)
- [ ] `LICENSE` Datei hinzufügen (MIT License)

---

## 📧 E-Mail an ifm statmath

### 7. E-Mail vorbereiten (⏳ TODO)

**An:** it.statmath@ifm.com  
**Betreff:** Phase 1 Abgabe - Production Runner - [Dein Team-Name]

**Inhalt:**
```
Sehr geehrtes ifm statmath Team,

im Anhang finden Sie unser Spielkonzept für Phase 1 des Gamification-Projekts.

Spielidee: Industrial Pac-Man ("Production Runner")
- AGV sammelt Produktionsaufträge in einer Fabrikhalle
- 4 fehlerhafte Sensoren mit unterschiedlichen KI-Verhaltensweisen
- Power-Up: KI-Optimierung (analog zu Pac-Man Power Pellets)
- Thematischer Bezug: s.FOX Produktionsplanung & IAIA Smart Limit Watcher

Technologien:
- Frontend: Angular 17+ mit Canvas API
- Backend: ASP.NET Core 8.0 (C#) mit SignalR
- Datenbank: PostgreSQL 16
- Deployment: Docker-Compose (debian/x86_64)
- Gamepad-Steuerung via Gamepad API

GitHub Repository:
URL: [DEIN-REPO-LINK]
User it.statmath@ifm.com wurde als Read-Only Collaborator hinzugefügt.

Anhang:
- Spielkonzept_Phase1.pdf (oder .md)
- Skizzen_Phase1.pdf (oder .md)

Bei Rückfragen stehen wir gerne zur Verfügung.

Mit freundlichen Grüßen,
[Dein Name]
[Matrikelnummer]
[Team-Mitglieder]
```

---

## 📄 Dokumente exportieren (Optional)

### 8. PDF-Export (⏳ TODO - falls gewünscht)
Falls ihr die Dokumente als PDF statt Markdown senden wollt:

**Option 1: VS Code Extension**
- Extension: "Markdown PDF" installieren
- Rechtsklick auf `.md` Datei → "Markdown PDF: Export (pdf)"

**Option 2: Pandoc (Command Line)**
```bash
pandoc Spielkonzept_Phase1.md -o Spielkonzept_Phase1.pdf
pandoc Skizzen_Phase1.md -o Skizzen_Phase1.pdf
```

**Option 3: Online-Tool**
- https://www.markdowntopdf.com/

---

## ✅ Finale Checkliste vor Abgabe

- [ ] Konzept ist **maximal 2 Seiten** lang
- [ ] **Zwei Skizzen** sind enthalten (Spielfeld + Gegner-Verhalten)
- [ ] Thematischer Bezug zu **s.FOX & IAIA** ist klar erkennbar
- [ ] Technologie-Stack entspricht Anforderungen:
  - [ ] C# (Backend) ✅
  - [ ] Angular (Frontend) ✅
  - [ ] PostgreSQL (Datenbank) ✅
  - [ ] Docker-Compose ✅
  - [ ] Gamepad-Steuerung ✅
- [ ] Alle verwendeten Bibliotheken sind **lizenzkonform**:
  - [ ] Angular: MIT ✅
  - [ ] ASP.NET Core: MIT ✅
  - [ ] Npgsql: PostgreSQL License ✅
- [ ] **GitHub Repository** ist erstellt und privat
- [ ] **it.statmath@ifm.com** hat Leserechte
- [ ] E-Mail mit Repository-Link ist vorbereitet
- [ ] **Deadline 24.11.2025** wird eingehalten

---

## 📅 Nächste Schritte nach Feedback

**Nach Erhalt des Feedbacks (innerhalb 1 Woche):**
1. Feedback durchlesen und notieren
2. Anpassungen am Konzept vornehmen (falls nötig)
3. Mit Prototyp-Entwicklung starten (Phase 2)
4. Fokus auf:
   - Grundlegendes Spielfeld-Rendering
   - Gamepad-Integration
   - Einfache Kollisionserkennung
   - Statischer Highscore-Output

**Ziel Phase 2 (12.12.2025):**
- Minimal spielbarer Prototyp mit Basis-Features
- Zwischenpräsentation vorbereiten
- Demo auf Arcade-Automat testen

---

## 🆘 Support & Fragen

Falls Fragen auftauchen:
- **E-Mail:** it.statmath@ifm.com
- **GitHub Issues:** Im Repository Issues für technische Fragen anlegen
- **Team-Meeting:** Regelmäßig interne Reviews durchführen

---

**Viel Erfolg bei der Abgabe! 🚀**
