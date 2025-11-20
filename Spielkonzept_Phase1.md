# Spielkonzept: Production Runner (Industrial Pac-Man)
**Projektphase 1** | ifm statmath GmbH | November 2025

## 1. Spielidee

**Production Runner** ist eine industrielle Pac-Man-Adaption für Ladezeiten in ifm statmath Produkten. Ein **AGV** sammelt **Produktionsaufträge** in einer Fabrikhalle, während er **fehlerhafte Sensoren** (Geister) vermeidet.

**Kernmechanik:**
- Sammle alle Aufträge ohne von Sensoren erfasst zu werden
- Power-Up "KI-Optimierung" ermöglicht Sensor-Reparatur (200 Punkte)
- Scoring: Aufträge (10P), Streak-Bonus (bis x3), Level-Bonus (1000P)

**Thematischer Bezug zu ifm statmath:**
- **s.FOX:** Labyrinth = Produktionsplan, Punkte = optimierte Aufträge
- **IAIA Smart Limit Watcher:** Sensoren = Anomalien/Alarme

## 2. Technische Umsetzung

**Frontend:** Angular 17+, Canvas API, Gamepad API (USB-Controller)  
**Backend:** ASP.NET Core 8.0 (C#), SignalR (Echtzeit-Leaderboard)  
**Datenbank:** PostgreSQL 16 (Highscores, Sessions)  
**Deployment:** Docker-Compose (debian/x86_64)  
**Lizenz:** MIT (Angular, ASP.NET Core), GEMA-freie Sounds (CC0/CC-BY)

## 3. Gegner-KI (4 Typen)

| Typ | Farbe | Verhalten |
|-----|-------|-----------|
| Aggressive | Rot | Verfolgt AGV direkt |
| Ambush | Rosa | Lauert voraus |
| Patrol | Cyan | Feste Routen |
| Random | Orange | Unberechenbar |

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

## 4. Projektphasen

**Phase 2 (Prototyp - 12.12.2025):** Basis-Spielfeld, AGV-Steuerung, einfache Gegner-KI, Kollisionserkennung  
**Phase 3 (Final):** Grafiken, Sounds, Highscore-System, SignalR-Leaderboard, Docker-Setup

## 5. Skizzen

**Skizze 1:** Spielfeld-Layout (Fabrikhalle als Labyrinth mit 4 Power-Ups in den Ecken)  
**Skizze 2:** Gegner-Verhalten und Spielzustände (siehe separate Datei `Skizzen_Phase1.md`)

---

**GitHub Repository:** https://github.com/joebrayanforus/production-runner
