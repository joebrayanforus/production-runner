

# 🏭 Production Runner - Industrial Pac-Man Game

**Ein ifm statmath Gamification-Projekt**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![.NET](https://img.shields.io/badge/.NET-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Arcade](https://img.shields.io/badge/🕹️_ICONIC_ARCADE-Ready-FF6B00)](docs/ARCADE_QUICK_START.md)

---

**Um das Spiel auf der Gamestation zu starten müsst ihr den Projektordner auf einen USB stick ziehen. Im File-Explorer auf der Gamestation könnt ihr dann mit Rechtsklick auf den Ordner "Im Terminal öffnen" auswählen. Im Terminal müsst ihr dann nur noch "docker compose up --build -d" ausführen um die Container zu starten (Falls das beim ersten mal nicht klappt ggf. nochmal probieren).**
## 📋 Projektübersicht:
## hier roboter-video hinzufügen

**Production Runner** ist ein industrielles Pac-Man-Spiel, das während Ladezeiten in ifm statmath Produkten (s.FOX, moneo IAIA) gespielt werden kann. Der Spieler steuert einen AGV durch eine Fabrikhalle, sammelt Produktionsaufträge und vermeidet fehlerhafte Sensoren.

### 🎯 Projektziel:
- **Gamification** für Wartezeiten bei Modell-Training und Produktionsplanung
- **Nahtlose Integration** in ifm statmath Produkte
- **Lauffähig** auf Arcade-Automaten für Messestände
- **🕹️ ICONIC ARCADE Support** - Komplett optimiert für Raspberry Pi 4 Arcade-Systeme

---
## Kernmechanik:
Sammle alle Aufträge ohne von Sensoren erfasst zu werden
Power-Up "KI-Optimierung" ermöglicht Sensor-Reparatur (200 Punkte) Scoring: Aufträge (10P), Streak-Bonus (bis x3), Level-Bonus (1000P)

---
### Gegner-KI (Sensoren)

| Typ        | Farbe   | Verhalten                          |
|------------|---------|------------------------------------|
| Aggressive | 🔴 Rot  | Verfolgt AGV direkt (Blinky)       |
| Ambush     | 🌸 Rosa | Lauert voraus (Pinky)              |
| Patrol     | 🔵 Cyan | Feste Routen (Inky)                |
| Random     | 🟠 Orange | Unberechenbar (Clyde)           |

### Power-Up Mechanik:
- **KI-Optimierung** verwandelt Sensoren temporär  
- AGV kann sie „reparieren“ (+200 Punkte)  
- Dauer: 10 Sekunden  
- Geschwindigkeit der Gegner reduziert auf 80%  

---

## 📊 Scoring-System:

| Aktion                  | Punkte |
|--------------------------|--------|
| Produktionsauftrag       | +10    |
| KI-Optimierung (Power-Up)| +50    |
| Reparierter Sensor       | +200   |
| Level Complete Bonus     | +1000  |

**Production Streak Bonus:**
- 10 Aufträge → x1.5  
- 20 Aufträge → x2.0  
- 30 Aufträge → x3.0  

*Beispiel:* 25 Aufträge × 10 × 2.0 = **500 Punkte**

---

## 🚀 Features

- ✅ **Gamepad-Steuerung** (USB-Controller + Keyboard-Fallback)
- ✅ **🕹️ 2-Spieler Modus** - Kooperatives Gameplay mit 2 Joysticks
- ✅ **ICONIC ARCADE Ready** - Optimiert für Raspberry Pi 4 Arcade-Systeme
- ✅ **16 Arcade-Buttons Support** - Vormontierte Mikroschalter-Steuerung
- ✅ **Turbo-System** - Energie-basiertes Boost-System für beide Spieler
- ✅ **Echtzeit-Leaderboard** (SignalR)
- ✅ **Persistente Highscores** (PostgreSQL)
- ✅ **Docker-Compose Setup** (debian/x86_64)
- ✅ **4 Gegner-KI-Typen** mit unterschiedlichem Verhalten
- ✅ **Production Streak Bonus** für optimales Gameplay
- ✅ **Lizenz-konform** (MIT, Apache-2.0, GEMA-freie Sounds)

---

## 🛠️ Tech Stack

| **Layer**       | **Technologie**                              |
|-----------------|----------------------------------------------|
| **Frontend**    | Angular 17+, TypeScript, Canvas API         |
| **Backend**     | ASP.NET Core 8.0, C#, SignalR               |
| **Datenbank**   | PostgreSQL 16                                |
| **Deployment**  | Docker, Docker-Compose                       |
| **Gamepad**     | Gamepad API (Web Standard)                   |

---



## 📦 Installation & Setup

### Voraussetzungen
- Docker & Docker-Compose installiert
- Git

### Schritt 1: Repository klonen
```bash
git clone https://github.com/joebrayanforus/production-runner.git
cd production-runner
```

### Schritt 2: Installation auswählen

#### 🕹️ ICONIC ARCADE (Raspberry Pi 4)
```bash
# Automatische Installation für Arcade-Systeme
chmod +x install-arcade.sh
./install-arcade.sh

# Oder manuell siehe:
# docs/ARCADE_QUICK_START.md
```

#### 💻 Standard-Installation (Docker)
```bash
docker-compose up -d
# Siehe DOCKER_SETUP.md für Details
```

---

## 🎮 Steuerung

### 🕹️ ICONIC ARCADE (2 Spieler)

#### Spieler 1 (Orange) - Linke Seite:
- **Joystick 1:** Bewegung (8-Wege)
- **Buttons 1-4:** Turbo aktivieren
- **Button 6:** Hilfe (H)
- **Pfeiltasten:** Alternative Steuerung
- **STRG:** Turbo (Tastatur)

#### Spieler 2 (Blau) - Rechte Seite:
- **Joystick 2:** Bewegung (8-Wege)
- **Buttons 9-12:** Turbo aktivieren
- **Button 14:** Hilfe (H)
- **WASD:** Alternative Steuerung
- **SHIFT:** Turbo (Tastatur)

### 🎮 Gamepad (Standard):
- **Linker Stick / D-Pad:** Bewegung (↑ ↓ ← →)
- **A / X Button:** Turbo
- **Y / △ Button:** Hilfe
- **START:** Pause

### ⌨️ Tastatur:
- **Pfeiltasten:** Spieler 1 Bewegung
- **WASD:** Spieler 2 Bewegung (2-Spieler Modus)
- **STRG / Control:** Spieler 1 Turbo
- **SHIFT:** Spieler 2 Turbo
- **H:** Hilfe ein/aus
- **ESC:** Pause

---

## 📂 Projektstruktur

```
production-runner/
├── frontend/               # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── game/      # Game Engine (Canvas, Rendering)
│   │   │   ├── services/  # API & SignalR Services
│   │   │   └── models/    # TypeScript Interfaces
│   │   └── assets/        # Sprites, Sounds, Fonts
│   └── Dockerfile
├── backend/               # ASP.NET Core API
│   ├── Controllers/       # ScoreController, GameController
│   ├── Hubs/              # SignalRHub (Leaderboard)
│   ├── Models/            # Score, Player, GameSession
│   ├── Data/              # EF Core DbContext
│   └── Dockerfile
├── database/              # PostgreSQL Init Scripts
│   └── init.sql
├── docker-compose.yml     # Orchestrierung aller Services
├── Spielkonzept_Phase1.md # Konzept-Dokument
├── Skizzen_Phase1.md      # Spielfeld-Skizzen
├── install-arcade.sh      # 🕹️ ICONIC ARCADE Installer
└── docs/                  # Dokumentation
    ├── ARCADE_QUICK_START.md
    ├── ARCADE_DEPLOYMENT.md
    └── HARDWARE_TESTING_GUIDE.md
```

---

## 📖 Dokumentation

### Spieler-Guides:
- **[🕹️ ARCADE QUICK START](docs/ARCADE_QUICK_START.md)** - Schnellstart für ICONIC ARCADE
- **[📋 ICONIC ARCADE ANLEITUNG](ICONIC_ARCADE_ANLEITUNG.md)** - Vollständige Arcade-Dokumentation
- **[🎮 Spielanleitung](Spielkonzept_Phase1.md)** - Gameplay & Mechaniken
- **[🎨 Level-Design](Skizzen_Phase1.md)** - Map-Layout & Gegner-Verhalten

### Entwickler-Dokumentation:
- **[🐳 Docker Setup](DOCKER_SETUP.md)** - Container-Deployment
- **[🎯 Frontend Implementation](docs/FRONTEND_IMPLEMENTATION.md)** - Angular Architektur
- **[🏗️ Arcade Deployment](docs/ARCADE_DEPLOYMENT.md)** - Arcade-System Setup
- **[🔧 Hardware Testing](docs/HARDWARE_TESTING_GUIDE.md)** - Joystick & Button Kalibrierung

### Medien & Assets:
- **[🎵 Background Music](IFM_BACKGROUND_MUSIC.md)** - Sound Design
- **[🔊 Industrial Sounds](INDUSTRIAL_SOUNDS.md)** - Audio-Effekte
- **[🎬 Video Integration](VIDEO_INTEGRATION_GUIDE.md)** - Video-Backgrounds

---

## 🕹️ ICONIC ARCADE Spezifikationen

### Hardware:
- **Prozessor:** Raspberry Pi 4B (4GB RAM empfohlen)
- **Display:** 21" Full-HD (1920x1080)
- **Steuerung:** 2 Mikroschalter-Joysticks + 16 Arcade-Buttons
- **Audio:** 2x 4" Stereo-Lautsprecher + Class-D Verstärker
- **Anschlüsse:** WiFi, Bluetooth, Gigabit-Ethernet, HDMI, USB
- **Stromversorgung:** DC-IN 90W 12V/7.5A
- **Maße:** 56 x 50 x 158 cm

### Unterstützte Betriebssysteme:
- ✅ Batocera
- ✅ Recalbox
- ✅ RetroPie
- ✅ Lakka

### Features:
- ✅ Plug & Play - Vormontiert
- ✅ 2-Spieler vollständig unterstützt
- ✅ Optimiert für Raspberry Pi 4
- ✅ Automatische Installation verfügbar
- ✅ Kiosk-Modus für Messestände

---

## 📅 Projektphasen

| **Phase** | **Deadline**  | **Ziel**                                      |
|-----------|---------------|-----------------------------------------------|
| Phase 1   | 24.11.2025    | ✅ Konzept + Skizzen + GitHub Setup          |
| Phase 2   | 12.12.2025    | 🔄 Spielbarer Prototyp (Zwischenpräsentation)|
| Phase 3   | TBD           | ⏳ Finales Spiel (Abschlusspräsentation)     |

---

## 🎨 Lizenz-Compliance

### Code & Libraries:
- **Angular:** MIT License ✅
- **ASP.NET Core:** MIT License ✅
- **Npgsql:** PostgreSQL License ✅

### Assets:
- **Grafiken:** Eigene Pixel-Art (selbst erstellt) 
- **Sounds:** 🎵 Sounds: GEMA-freie Chiptune-Samples werden in Phase 3 integriert.  
- **Fonts: Pixel-Art Schriftarten werden noch ausgewählt.

- **Fonts:**...

---

---

## 🏆 Highscore Leaderboard

**Die Top 10 Highscores werden in Echtzeit auf dem Arcade-Automaten angezeigt!**

```
🏆 PRODUCTION RUNNER - LEADERBOARD
════════════════════════════════════
 1. MAX_M       8450 pts
 2. ANNA_K      7280 pts
 3. TOM_S       6910 pts
 4. LISA_P      6540 pts
 5. KARL_W      6200 pts
════════════════════════════════════
```

---

## 🔧 Development

### Lokale Entwicklung (ohne Docker):

#### Frontend:
```bash
cd frontend
npm install
ng serve
```

#### Backend:
```bash
cd backend
dotnet restore
dotnet run
```

#### Datenbank:
⏳ PostgreSQL-Setup mit Init-Skripten wird in Phase 2 ergänzt.


---

## 🐛 Debugging Arcade-Automat

### Linker Gamepad (über Laptop):
📝 Anleitung zur Gamepad-Konfiguration folgt in Phase 2.

### Rechter Gamepad (direkt am Automaten):
⏳ Dokumentation zur Hardware-Anbindung wird in Phase 2 ergänzt.  
📝 Geplant: Testen direkt am Automaten über die eingebauten USB-Anschlüsse.  
🎮 Ziel: Steuerung und Debugging mit dem rechten Gamepad am Arcade-Automaten.

---


## 📖 Weitere Dokumentation

- [Spielkonzept (Phase 1)](./Spielkonzept_Phase1.md)
- [Spielfeld-Skizzen](./Skizzen_Phase1.md)


---     

**Entwickelt für ifm statmath GmbH** | Datenbanksysteme 1 Projekt | 2025
>>>>>>> 6cde4d57041a96158bd1e8b99d1c3d76cd930549
