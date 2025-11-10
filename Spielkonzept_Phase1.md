# Spielkonzept: Industrial Pac-Man – "Production Runner"
**Team:** [Dein Team-Name]  
**Projektphase 1** | ifm statmath GmbH | November 2025

---

## 1. Spielidee & Thematische Einbindung

**Production Runner** ist eine industrielle Adaption des Klassikers Pac-Man, die sich nahtlos in die Produktwelt der ifm statmath integriert. Der Spieler steuert einen **AGV (Automated Guided Vehicle)** durch eine Fabrikhalle und sammelt **Produktionsaufträge** (Punkte), während er von **Fehlerhaften Sensoren** (Geister) verfolgt wird.

### Kernmechanik:
- **Ziel:** Sammle alle Produktionsaufträge in der Fabrik, ohne von fehlerhaften Sensoren erfasst zu werden
- **Power-Ups:** "KI-Optimierung" verwandelt fehlerhafte Sensoren temporär in reparierbare Einheiten (analog zu Pac-Man Power Pellets)
- **Scoring:** Basierend auf gesammelten Aufträgen, reparierten Sensoren und Geschwindigkeit
- **Levels:** Verschiedene Fabrik-Layouts mit steigender Komplexität

### Thematischer Bezug zu ifm statmath:
- **s.FOX Integration:** Das Labyrinth repräsentiert einen Produktionsplan, die gesammelten Punkte sind optimierte Aufträge
- **IAIA Smart Limit Watcher:** Die "Geister" symbolisieren Anomalien/Alarme, die vermieden werden müssen
- **Gamification-Aspekt:** Hoher Wiederspielwert durch Highscore-Jagd während Ladezeiten

---

## 2. Technische Umsetzung

### Frontend (Angular + TypeScript):
- Canvas-basiertes Rendering für flüssige 60 FPS Gameplay
- Responsive Design für Arcade-Automat und Browser
- Gamepad API für USB-Controller-Steuerung (linker & rechter Stick)
- Tastatur-Fallback (Pfeiltasten/WASD) für Entwicklung

### Backend (C# / ASP.NET Core):
- RESTful API für Highscore-Management
- SignalR für Echtzeit-Leaderboard auf Messestand
- Persistente Speicherung in PostgreSQL
- Docker-Compose Setup für debian/x86_64

### Datenbank (PostgreSQL):
- Tabelle: `highscores` (id, player_name, score, level, timestamp)
- Tabelle: `game_sessions` (session_id, duration, collected_orders, repaired_sensors)

### Lizenzkonformität:
- Grafiken: Eigene Pixel-Art im Stil von Industriesymbolen (selbst erstellt)
- Sounds: Freesound.org mit CC0/CC-BY Lizenz (GEMA-frei)
- Libraries: Angular (MIT), ASP.NET Core (MIT), Npgsql (PostgreSQL License)

---

## 3. Gameplay-Features

### Projektphase 2 (Prototyp – 12.12.2025):
- ✅ Grundlegendes Labyrinth-Layout (Fabrikhalle)
- ✅ AGV-Steuerung per Gamepad/Tastatur
- ✅ Kollisionserkennung (Wände, Aufträge, Sensoren)
- ✅ Einfache Gegner-KI (4 fehlerhafte Sensoren mit unterschiedlichem Verhalten)
- ✅ Statischer Highscore-Output (Platzhalter für Berechnung)

### Projektphase 3 (Finalisierung):
- ✅ Vollständiges Scoring-System mit Multiplikatoren
- ✅ Power-Up Mechanik (KI-Optimierung)
- ✅ Mehrere Levels mit steigender Schwierigkeit
- ✅ Highscore-Persistierung in PostgreSQL
- ✅ Echtzeit-Leaderboard (SignalR)
- ✅ Sound-Effekte & Hintergrundmusik (GEMA-frei)
- ✅ Industrielles Pixel-Art Design (Fabrik, AGV, Sensoren)
- ✅ Animations-Übergänge (Start, Game Over, Level Complete)

### Besondere Mechanik:
**"Production Streak Bonus":** Sammelt der Spieler mehrere Aufträge hintereinander ohne Pause, erhält er einen Streak-Multiplikator (analog zur Optimierung in s.FOX)

---

## 4. Bewertungskriterien-Fokus

### Spielmechanik & Steuerung (⭐⭐⭐):
- Präzise Gamepad-Steuerung mit natürlichem Bewegungsgefühl
- Ausbalancierte Gegner-KI (4 verschiedene Verhaltensweisen)
- Faire Schwierigkeitskurve über mehrere Levels

### Technische Umsetzung & Stabilität (⭐⭐⭐):
- Docker-Compose Setup mit einem Befehl startbar
- Fehlerfreie Gamepad-Integration (USB-Testing)
- Performantes Rendering (60 FPS auch bei mehreren Gegnern)
- Robuste PostgreSQL-Integration

### Team-Präsentation (⭐⭐):
- Klare Verbindung zu ifm statmath Produkten (s.FOX, IAIA)
- Live-Demo auf Arcade-Automat
- Technische Architektur verständlich erklärt

---

## 5. Zeitplan & Meilensteine

| **Phase** | **Deadline** | **Deliverable** |
|-----------|--------------|-----------------|
| Phase 1   | 24.11.2025   | Konzept + Skizzen + GitHub Repo Setup |
| Phase 2   | 12.12.2025   | Spielbarer Prototyp (Zwischenpräsentation) |
| Phase 3   | [TBD]        | Finales Spiel (Abschlusspräsentation) |

---

## 6. Risiken & Mitigation

| **Risiko** | **Mitigation** |
|------------|----------------|
| Gamepad-Kompatibilität | Frühzeitiges Testen mit USB-Kabel am Automaten |
| Performance-Probleme | Canvas-Optimierung, Sprite-Batching |
| Docker-Setup auf debian/x86_64 | Regelmäßiges Testing auf Linux-System |
| Lizenz-Compliance | Review aller Dependencies vor Integration |

---

## 7. Erfolgskriterien

Ein erfolgreiches Spiel liegt vor, wenn:
- ✅ Mindestens 5 Minuten Spielspaß ohne Wiederholung
- ✅ Highscore motiviert zum erneuten Spielen
- ✅ Stabil auf Arcade-Automat lauffähig
- ✅ Thematische Verbindung zu ifm statmath erkennbar
- ✅ Docker-Compose startet ohne manuelle Eingriffe

---

**Kontakt:** [Deine E-Mail]  
**GitHub Repository:** [Dein Private Repo mit it.statmath@ifm.com als Leser]
