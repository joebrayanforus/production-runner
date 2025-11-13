# 🏭 Production Runner – Industrial Pac-Man Game  
**Ein Gamification-Projekt der ifm statmath GmbH**

**Lizenz:** MIT | Docker | Angular | .NET

---

## 📋 Projektübersicht  
**Production Runner** ist ein industrielles Pac-Man-Spiel, das während Ladezeiten in ifm statmath Produkten wie **s.FOX** und **moneo IAIA** gespielt werden kann.  
Der Spieler steuert einen AGV durch eine Fabrikhalle, sammelt Produktionsaufträge und vermeidet fehlerhafte Sensoren.

---

## 🎯 Projektziele  
- Gamification für Wartezeiten bei Modelltraining und Produktionsplanung  
- Nahtlose Integration in ifm statmath Produkte  
- Spielbar auf Arcade-Automaten für Messestände  

---

## 🚀 Features  
- ✅ Gamepad-Steuerung (USB-Controller + Keyboard-Fallback)  
- ✅ Echtzeit-Leaderboard via SignalR  
- ✅ Persistente Highscores (PostgreSQL)  
- ✅ Docker-Compose Setup (debian/x86_64)  
- ✅ 4 Gegner-KI-Typen mit individuellem Verhalten  
- ✅ Production Streak Bonus für optimales Gameplay  
- ✅ Lizenzkonform: MIT, Apache-2.0, GEMA-freie Sounds  

---

## 🛠️ Tech Stack  

| Ebene       | Technologie                          |
|-------------|--------------------------------------|
| Frontend    | Angular 17+, TypeScript, Canvas API  |
| Backend     | ASP.NET Core 8.0, C#, SignalR        |
| Datenbank   | PostgreSQL 16                        |
| Deployment  | Docker, Docker-Compose               |
| Gamepad     | Gamepad API (Web Standard)           |

---

## 📦 Installation & Setup  

### Voraussetzungen  
- Docker & Docker-Compose  
- Git  

### Schritte  
```bash
# 1. Repository klonen
git clone https://github.com/joebrayanforus/production-runner
cd production-runner

# 2. Projekt starten
docker-compose up --build

# 3. Spiel öffnen
# Browser:
http://localhost:4200

