🏭 Production Runner - Industrial Pac-Man Game
Ein ifm statmath Gamification-Projekt

License: MIT Docker Angular .NET

📋 Projektübersicht
Production Runner ist ein industrielles Pac-Man-Spiel, das während Ladezeiten in ifm statmath Produkten (s.FOX, moneo IAIA) gespielt werden kann. Der Spieler steuert einen AGV durch eine Fabrikhalle, sammelt Produktionsaufträge und vermeidet fehlerhafte Sensoren.

🎯 Projektziel
Gamification für Wartezeiten bei Modell-Training und Produktionsplanung
Nahtlose Integration in ifm statmath Produkte
Lauffähig auf Arcade-Automaten für Messestände
🚀 Features
✅ Gamepad-Steuerung (USB-Controller + Keyboard-Fallback)
✅ Echtzeit-Leaderboard (SignalR)
✅ Persistente Highscores (PostgreSQL)
✅ Docker-Compose Setup (debian/x86_64)
✅ 4 Gegner-KI-Typen mit unterschiedlichem Verhalten
✅ Production Streak Bonus für optimales Gameplay
✅ Lizenz-konform (MIT, Apache-2.0, GEMA-freie Sounds)
🛠️ Tech Stack
Layer	Technologie
Frontend	Angular 17+, TypeScript, Canvas API
Backend	ASP.NET Core 8.0, C#, SignalR
Datenbank	PostgreSQL 16
Deployment	Docker, Docker-Compose
Gamepad	Gamepad API (Web Standard)
📦 Installation & Setup
Voraussetzungen
Docker & Docker-Compose installiert
Git
Schritt 1: Repository klonen
git clone <dein-private-repo-url>
cd production-runner
Schritt 2: Projekt starten (Docker-Compose)
docker-compose up --build
Schritt 3: Spiel öffnen
Browser: http://localhost:4200
Arcade-Automat: USB-Kabel anschließen und rechten Gamepad nutzen
🎮 Steuerung
Gamepad (bevorzugt):
Linker Stick / D-Pad: Bewegung (↑ ↓ ← →)
A-Button: Pause
START-Button: Neues Spiel
Tastatur (Entwicklung):
Pfeiltasten / WASD: Bewegung
SPACE: Pause
ENTER: Neues Spiel
📂 Projektstruktur
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
📅 Projektphasen
Phase	Deadline	Ziel
Phase 1	24.11.2025	✅ Konzept + Skizzen + GitHub Setup
Phase 2	12.12.2025	🔄 Spielbarer Prototyp (Zwischenpräsentation)
Phase 3	TBD	⏳ Finales Spiel (Abschlusspräsentation)
🎨 Lizenz-Compliance
Code & Libraries:
Angular: MIT License ✅
ASP.NET Core: MIT License ✅
Npgsql: PostgreSQL License ✅
Assets:
Grafiken: Eigene Pixel-Art (selbst erstellt) ✅
Sounds: Freesound.org (CC0 / CC-BY) - GEMA-frei ✅
Fonts: Google Fonts (Open Font License) ✅
👥 Team
[Dein Name] - Lead Developer
[Team-Mitglied 2] - Frontend/Game Logic
[Team-Mitglied 3] - Backend/Database
📧 Kontakt
E-Mail: [deine-email@example.com]
ifm statmath Kontakt: it.statmath@ifm.com
GitHub Issues: [Link zu Issues]
🏆 Highscore Leaderboard
Die Top 10 Highscores werden in Echtzeit auf dem Arcade-Automaten angezeigt!

🏆 PRODUCTION RUNNER - LEADERBOARD
════════════════════════════════════
 1. MAX_M       8450 pts
 2. ANNA_K      7280 pts
 3. TOM_S       6910 pts
 4. LISA_P      6540 pts
 5. KARL_W      6200 pts
════════════════════════════════════
🔧 Development
Lokale Entwicklung (ohne Docker):
Frontend:
cd frontend
npm install
ng serve
Backend:
cd backend
dotnet restore
dotnet run
Datenbank:
docker run --name postgres-dev -e POSTGRES_PASSWORD=dev123 -p 5432:5432 -d postgres:16
🐛 Debugging Arcade-Automat
Linker Gamepad (über Laptop):
USB-Kabel unterhalb der linken Steuerung anschließen
Browser öffnen: chrome://device-log (Gamepad-Events prüfen)
Spiel starten und Gamepad testen
Rechter Gamepad (direkt am Automaten):
USB-Anschlüsse unterhalb des rechten Gamepads nutzen
Direkt mit eingebautem PC verbinden
Spiel lokal testen
📖 Weitere Dokumentation
Spielkonzept (Phase 1)
Spielfeld-Skizzen
API Dokumentation (Coming Soon)
Deployment Guide (Coming Soon)
Entwickelt für ifm statmath GmbH | Datenbanksysteme 1 Projekt | 2025
