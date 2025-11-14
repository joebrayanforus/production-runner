# 🏭 Production Runner - Industrial Pac-Man Game

**Ein ifm statmath Gamification-Projekt**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![.NET](https://img.shields.io/badge/.NET-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)

---

## 📋 Projektübersicht
![pacman_gif.gif](pacman_gif.gif)

**Production Runner** ist ein industrielles Pac-Man-Spiel, das während Ladezeiten in ifm statmath Produkten (s.FOX, moneo IAIA) gespielt werden kann. Der Spieler steuert einen AGV durch eine Fabrikhalle, sammelt Produktionsaufträge und vermeidet fehlerhafte Sensoren.

### 🎯 Projektziel
- **Gamification** für Wartezeiten bei Modell-Training und Produktionsplanung
- **Nahtlose Integration** in ifm statmath Produkte
- **Lauffähig** auf Arcade-Automaten für Messestände

---

## 🚀 Features

- ✅ **Gamepad-Steuerung** (USB-Controller + Keyboard-Fallback)
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

### Schritt 2: Projekt starten (Docker-Compose)
```bash
docker-compose up --build
```

### Schritt 3: Spiel öffnen
- **Browser:** ...
- **Arcade-Automat:** USB-Kabel anschließen und rechten Gamepad nutzen

---

## 🎮 Steuerung

### Gamepad (bevorzugt):
- **Linker Stick / D-Pad:** Bewegung (↑ ↓ ← →)
- **A-Button:** Pause
- **START-Button:** Neues Spiel

### Tastatur (Entwicklung):
- **Pfeiltasten / WASD:** Bewegung
- **SPACE:** Pause
- **ENTER:** Neues Spiel

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
└── Skizzen_Phase1.md      # Spielfeld-Skizzen
```

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
- **Grafiken:** Eigene Pixel-Art (selbst erstellt) ✅
- **Sounds:** ...
- **Fonts:**...

---

---

## 🏆 Highscore Leaderboard

Die Top 10 Highscores werden in Echtzeit auf dem Arcade-Automaten angezeigt!

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
...

---

## 🐛 Debugging Arcade-Automat

### Linker Gamepad (über Laptop):
...
### Rechter Gamepad (direkt am Automaten):
...
---

## 📖 Weitere Dokumentation

- [Spielkonzept (Phase 1)](./Spielkonzept_Phase1.md)
- [Spielfeld-Skizzen](./Skizzen_Phase1.md)


---

**Entwickelt für ifm statmath GmbH** | Datenbanksysteme 1 Projekt | 2025
