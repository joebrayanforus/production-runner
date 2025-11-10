# Skizzen: Industrial Pac-Man – "Production Runner"

---

## Skizze 1: Spielfeld Layout (Fabrikhalle)

```
╔═══════════════════════════════════════════════════════════════╗
║                   PRODUCTION RUNNER                          ║
║                   SCORE: 1240    LEVEL: 1    LIVES: ❤❤❤      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║    ╔═══╗ · · · ╔════╗ · · · ╔═══╗      🏭 FABRIKHALLE      ║
║    ║ K ║ · · · ║    ║ · · · ║ K ║                           ║
║    ╚═══╝ · · · ║    ║ · · · ╚═══╝      K = KI-Optimierung  ║
║    · · · · · · ║    ║ · · · · · ·      (Power-Up)           ║
║    · ══════════╝    ╚═════════ · ·                           ║
║    · ║                      ║ · ·      🤖 = AGV (Spieler)   ║
║    · ║  · · · · · · · · ·  ║ · ·                             ║
║    · ║  ·  ╔═══════════╗  ║ · ·      👻 = Fehlerhafter      ║
║    · ║  ·  ║  🤖  👻 👻║  ║ · ·           Sensor (Gegner)   ║
║    · ║  ·  ║    ─┬─    ║  ║ · ·                             ║
║    · ║  ·  ║  SPAWN     ║  ║ · ·      · = Produktionsauftrag║
║    · ║  ·  ╚═══════════╝  ║ · ·          (Punkt)            ║
║    · ║  · · · · 👻 · · ·  ║ · ·                             ║
║    · ║                      ║ · ·                             ║
║    · ╚═════════╗    ╔═══════╝ · ·                           ║
║    · · · · · · ║    ║ · · · · · ·                           ║
║    ╔═══╗ · · · ║    ║ · · · ╔═══╗                           ║
║    ║ K ║ · · · ╚════╝ · · · ║ K ║                           ║
║    ╚═══╝ · · · · · · · · · ╚═══╝                           ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  🏆 HIGHSCORE LEADERBOARD     |    ⚙️ CONTROLS               ║
║  1. Joe       8450           |    ← → ↑ ↓  : Bewegung      ║
║  2. Freeman     7280           |    [A]       : Pause         ║
║  3. TOM_S      6910           |    [START]   : Neues Spiel   ║
╚═══════════════════════════════════════════════════════════════╝
```

### Beschreibung Skizze 1:
**Spielfeld-Design:**
- Klassisches Labyrinth-Layout im Fabrikhallen-Stil
- Wände als Produktionsbänder/Maschinen dargestellt
- 4 Ecken mit KI-Optimierung Power-Ups (große Punkte)
- Zentrale Spawn-Zone für Gegner (wie bei Original Pac-Man)
- 280+ Produktionsaufträge (kleine Punkte) zu sammeln

**UI-Elemente:**
- Oben: Score, Level, Verbleibende Leben
- Unten: Live-Leaderboard (via SignalR) + Controller-Anleitung
- Thematische Icons: 🏭 (Fabrik), 🤖 (AGV), 👻 (Sensor-Fehler), ⚙️ (Settings)

---

## Skizze 2: Spielzustände & Gegner-Verhalten

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAME STATES FLOW                             │
└─────────────────────────────────────────────────────────────────┘

    START SCREEN              GAMEPLAY                GAME OVER
   ┌───────────┐            ┌───────────┐           ┌───────────┐
   │ 🏭        │            │ 🤖 → · ·  │           │  FINAL    │
   │ PRODUCTION│   [START]  │           │  [DEATH]  │  SCORE:   │
   │  RUNNER   │  ───────>  │ · · 👻 ·  │  ───────> │   7280    │
   │           │            │           │           │           │
   │ PRESS     │            │ K ·  · ·  │           │ HIGHSCORE │
   │  START    │            └───────────┘           │   #2      │
   └───────────┘                 │                  └───────────┘
                                 │ [WIN]                  │
                                 ▼                        │
                          ┌───────────┐                  │
                          │  LEVEL    │   [CONTINUE]     │
                          │ COMPLETE  │  ──────────┘     │
                          │  +BONUS   │                  │
                          └───────────┘                  │
                                                          │
                                                    [PLAY AGAIN]
                                                          │
                                                          └──┐
                                                             ▼
                                                      START SCREEN


┌─────────────────────────────────────────────────────────────────┐
│              GEGNER-VERHALTEN (4 Sensor-Typen)                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  SENSOR ROT      │  SENSOR ROSA     │  SENSOR CYAN     │  SENSOR ORANGE   │
│  "AGGRESSIVE"    │  "AMBUSH"        │  "PATROL"        │  "RANDOM"        │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │                  │
│   👻 ──→ 🤖     │      🤖          │   👻 ⟳          │   👻 ~~~~~      │
│   │              │        ↓         │   │              │       ╱ ╲       │
│   └─ Verfolgt   │   ┌────👻        │   └─ Feste       │      Zufällige   │
│      direkt      │   │              │      Route       │      Bewegung    │
│      den AGV     │   └─ Lauert      │      entlang     │      (schwer     │
│                  │      voraus      │      Korridoren  │      vorher-     │
│                  │                  │                  │      sagbar)     │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

             NORMAL MODE              │           KI-OPTIMIERUNG MODE
                                      │
    👻 👻 👻 👻                       │       🔵 🔵 🔵 🔵
    Verfolgen AGV                     │       Flüchten vor AGV
    AGV stirbt bei Kontakt            │       AGV kann sie "reparieren"
    Geschwindigkeit: 100%             │       Geschwindigkeit: 80%
                                      │       +200 Punkte pro Reparatur
                                      │       Dauer: 10 Sekunden


┌─────────────────────────────────────────────────────────────────┐
│                    SCORING SYSTEM                               │
└─────────────────────────────────────────────────────────────────┘

    Produktionsauftrag (Punkt)           +10 Punkte
    KI-Optimierung (Power-Up)            +50 Punkte
    Reparierter Sensor                  +200 Punkte
    Level Complete Bonus            +1000 Punkte
    
    PRODUCTION STREAK BONUS:
    ┌─────────────────────────────────────────┐
    │ Aufträge ohne Pause:                    │
    │ 10 → x1.5    20 → x2.0    30 → x3.0     │
    │                                         │
    │ Beispiel:                               │
    │ 25 Aufträge × 10 × 2.0 = 500 Punkte    │
    └─────────────────────────────────────────┘
```

### Beschreibung Skizze 2:

**Spielzustände:**
- Klarer Flow von Start → Gameplay → Game Over/Level Complete
- Highscore-Integration nach jedem Spiel
- Endlos-Modus mit steigender Schwierigkeit

**Gegner-KI (4 Typen):**
1. **ROT (Aggressive):** Verfolgt Spieler direkt (wie Blinky in Pac-Man)
2. **ROSA (Ambush):** Positioniert sich vor dem Spieler (wie Pinky)
3. **CYAN (Patrol):** Folgt festen Patrouillen-Routen (wie Inky)
4. **ORANGE (Random):** Unberechenbare Bewegungen (wie Clyde)

**Power-Up Mechanik:**
- KI-Optimierung verwandelt Sensoren temporär → AGV kann sie "reparieren"
- Hohe Punktzahl fördert strategisches Spiel (Power-Up optimal nutzen)

**Scoring-System:**
- Basis-Punkte + Streak-Multiplikator = Hoher Wiederspielwert
- Angelehnt an s.FOX Optimierungsmetriken (Effizienz-Bonus)

---

## Technische Anmerkungen für Implementierung:

### Phase 2 (Prototyp):
- Grid-basierte Bewegung (32×32 Pixel Tiles)
- Einfache A*-Pathfinding für ROT-Sensor
- Statisches Labyrinth-Layout (JSON-Datei)
- Placeholder-Grafiken (Farbige Rechtecke)

### Phase 3 (Final):
- Pixel-Art Sprites (AGV, Sensoren, Fabrikelemente)
- Animierte Bewegungen (Drehung, "Essen"-Animation)
- Sound-Effekte: Auftrags-Collection, Power-Up, Reparatur, Tod
- Hintergrundmusik: 8-Bit Industrial Chiptune (GEMA-frei)
- Partikel-Effekte bei Power-Up-Aktivierung
