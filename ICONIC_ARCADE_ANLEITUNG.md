# 🕹️ ICONIC ARCADE - PRODUCTION RUNNER SPIELANLEITUNG

## 📦 Über das ICONIC ARCADE System

### Technische Spezifikationen
- **Prozessor:** Raspberry Pi 4B
- **Display:** 21" Full-HD (1920x1080)
- **Audio:** 2x 4" Stereo-Lautsprecher + Class-D Verstärker
- **Steuerung:** 2 Mikroschalter-Joysticks + 16 Arcade-Buttons (vormontiert)
- **Konnektivität:** WiFi, Bluetooth, Gigabit-Ethernet
- **Anschlüsse:** 2x USB, HDMI, Stereo-Audio-Buchse, Micro-SD
- **Stromversorgung:** DC-IN 90W 12V/7.5A
- **Abmessungen:** 56 x 50 x 158 cm (22" x 20" x 62")

### Kompatible Betriebssysteme
- ✅ Batocera
- ✅ Recalbox
- ✅ RetroPie
- ✅ Lakka

---

## 🎮 SPIELSTEUERUNG

### 🧑 EINZELSPIELER-MODUS (Classic/Practice)

#### Joystick 1 (Links)
- **Bewegung:** 8-Wege Joystick für präzise Steuerung
- **Turbo:** Beliebiger Button 1-4 gedrückt halten
- **Menü:** Button 5 für Pause/Menü

#### Alternative Tastatur-Steuerung
- **Bewegung:** Pfeiltasten ▲▼◄►
- **Turbo:** STRG/Control gedrückt halten
- **Hilfe:** H-Taste
- **Pause:** ESC-Taste

---

### 👥 2-SPIELER-MODUS

#### 🟧 SPIELER 1 (ORANGE) - Linke Seite
**Arcade-Steuerung:**
- **Joystick:** Joystick 1 (Links)
- **Turbo:** Buttons 1-4 (beliebig)
- **Gamepad:** Gamepad Index 0

**Tastatur-Alternative:**
- **Bewegung:** Pfeiltasten ▲▼◄►
- **Turbo:** STRG (Control)

#### 🟦 SPIELER 2 (BLAU) - Rechte Seite
**Arcade-Steuerung:**
- **Joystick:** Joystick 2 (Rechts)
- **Turbo:** Buttons 9-12 (beliebig)
- **Gamepad:** Gamepad Index 1

**Tastatur-Alternative:**
- **Bewegung:** WASD
- **Turbo:** SHIFT

#### Gemeinsame Steuerung
- **Hilfe öffnen:** Button 6 oder 14 (Y/△)
- **Pause:** Button 10 (Start)
- **Zurück zum Menü:** Button 2 oder 8 (B/○)

---

## 🎯 SPIELZIEL

Sammle alle **Sensordaten** (kleine Punkte) in der Fabrik, während du den **Störungen** (Ghosts) ausweichst. Nutze **Power-ups** und **Turbo** strategisch, um hohe Punktzahlen zu erreichen!

---

## ⚡ SPIELMECHANIKEN

### 💫 Sensordaten (Punkte)
- **Kleine Punkte:** +10 Punkte
- **Große Power-Pellets:** +50 Punkte + Störungen werden langsam
- **Combo-System:** Mehrere Punkte nacheinander = Multiplikator steigt!

### 🛡️ POWER-UPS (Rotieren alle 8 Sekunden)

1. **🛡️ SCHUTZSCHILD (Shield)**
   - Dauer: 10 Sekunden
   - Effekt: Unverwundbar gegen Störungen
   - Perfekt für riskante Manöver!

2. **🔧 WARTUNG (Diagnostic)**
   - Dauer: 10 Sekunden  
   - Effekt: Störungen werden langsamer
   - Ideal zum Sammeln schwieriger Bereiche

3. **📡 IOT BOOST (Sensor)**
   - Bonus: +1000 Punkte sofort
   - Perfekt für Highscore-Jagd!

### ⚡ TURBO-SYSTEM

**Energie-Balken:**
- 🟧 **Spieler 1:** Unten rechts (Orange)
- 🟦 **Spieler 2:** Unten links (Blau)

**Funktion:**
- Drücke Turbo-Button = 2x Geschwindigkeit
- Energie sinkt mit 40/Sek wenn aktiv
- Regeneriert mit 8/Sek wenn inaktiv
- Maximum: 100 Energie
- **Tipp:** Nutze Turbo kurz und strategisch!

### ❤️ LEBEN-SYSTEM

**Einzelspieler:**
- Start: 3 Leben (❤️❤️❤️)
- Verlust: Berührung mit normaler Störung
- Game Over: Alle Leben verloren

**2-Spieler:**
- Jeder Spieler: 3 Leben (Farbige Quadrate)
- 🟧 Orange = Spieler 1 | 🟦 Blau = Spieler 2
- Game Over: Wenn ERSTER Spieler alle Leben verliert
- **Strategie:** Arbeitet zusammen, um beide am Leben zu halten!

### ⚠️ STÖRUNGEN (Ghosts)

**4 Störungstypen:**
1. **🌡️ TEMPERATUR (Rot)** - Verfolgt aktiv
2. **💨 DRUCK (Cyan)** - Patroulliert
3. **📳 VIBRATION (Pink)** - Unberechenbar
4. **⚙️ VERSCHLEISS (Orange)** - Blockiert Wege

**Zustände:**
- Normal: ❌ Tödlich bei Berührung
- Verlangsamt (Power-Pellet): ✅ Essbar für +200 Punkte!

---

## 🎮 ARCADE BUTTON-MAPPING

### Standard-Layout (16 Buttons)

```
┌─────────────────────────────────────────────┐
│           ICONIC ARCADE CABINET             │
├─────────────────────────────────────────────┤
│                                             │
│  🕹️ JOYSTICK 1          🕹️ JOYSTICK 2      │
│                                             │
│  🔘 1  🔘 2             🔘 9  🔘 10         │
│  🔘 3  🔘 4             🔘 11 🔘 12         │
│                                             │
│  🔘 5  🔘 6             🔘 13 🔘 14         │
│  🔘 7  🔘 8             🔘 15 🔘 16         │
│                                             │
└─────────────────────────────────────────────┘

SPIELER 1 (Links):          SPIELER 2 (Rechts):
- Buttons 1-4: Turbo        - Buttons 9-12: Turbo
- Button 5: Menü/Pause      - Button 13: (Reserve)
- Button 6: Hilfe           - Button 14: Hilfe
- Button 7: (Reserve)       - Button 15: (Reserve)
- Button 8: Zurück          - Button 16: Zurück
```

### Empfohlene Gamepad-Konfiguration

**Raspberry Pi RetroPie/Batocera:**
```
Gamepad 0 (Spieler 1):
- D-Pad/Analog Stick: Bewegung
- Button A (0): Turbo
- Button B (1): Zurück/Abbrechen
- Button Y (3): Hilfe
- Button Start (9): Pause

Gamepad 1 (Spieler 2):
- D-Pad/Analog Stick: Bewegung
- Button A (0): Turbo
- Button B (1): Zurück/Abbrechen
- Button Y (3): Hilfe
```

---

## 🚀 INSTALLATION & SETUP

### Schritt 1: Hardware-Montage
1. ✅ Tischplatte und Konsole zusammenbauen
2. ✅ 21" Display einsetzen und verkabeln
3. ✅ Lautsprecher anschließen
4. ✅ Joysticks und Buttons sind vormontiert
5. ✅ Raspberry Pi 4 einbauen

### Schritt 2: Software-Installation

#### Option A: RetroPie (Empfohlen)
```bash
# 1. RetroPie Image auf Micro-SD schreiben
# 2. Raspberry Pi booten
# 3. EmulationStation wird automatisch gestartet
# 4. Production Runner in /home/pi/RetroPie/roms/ports/ kopieren
```

#### Option B: Batocera
```bash
# 1. Batocera Image auf Micro-SD schreiben
# 2. Raspberry Pi booten
# 3. ROMS in /userdata/roms/ports/ kopieren
```

### Schritt 3: Spiel-Installation

1. **Production Runner Dateien kopieren:**
   ```bash
   cd /home/pi/production-runner
   npm install
   npm run build
   ```

2. **Webserver starten (Autostart):**
   ```bash
   # In /etc/rc.local oder systemd service:
   cd /home/pi/production-runner
   npm start &
   ```

3. **Browser öffnen:**
   - Chromium im Kiosk-Modus
   - URL: `http://localhost:4200`
   - Vollbild: F11

### Schritt 4: Controller-Kalibrierung

**RetroPie:**
```bash
# EmulationStation Controller Setup
Start → Input Configuration
# Jeden Button nacheinander zuweisen
```

**Batocera:**
```
Main Menu → Controller Settings
# Gamepad 1 und 2 einzeln konfigurieren
```

---

## 🎯 GAMEPLAY-TIPPS

### 🏆 Highscore-Strategien

1. **Combo-Multiplikator maximieren**
   - Sammle Punkte in schneller Folge
   - Kette unterbrechen = Multiplikator zurücksetzen
   - Ziel: 5x+ Multiplikator

2. **Turbo effizient nutzen**
   - Kurze Bursts statt dauernd drücken
   - Nutze Turbo für Flucht-Manöver
   - Regeneriere in sicheren Ecken

3. **Power-ups timing**
   - Warte auf Schutzschild vor schwierigen Bereichen
   - Nutze Wartung um alle Punkte zu sammeln
   - IoT Boost am Ende der Runde für Maximum

### 👥 2-Spieler-Taktiken

1. **Teamwork**
   - Teilt die Map in Bereiche auf
   - Einer lockt Störungen weg, anderer sammelt
   - Kommunikation ist key!

2. **Leben-Management**
   - Vorsichtiger Spieler sollte mehr riskieren
   - Spieler mit wenig Leben bleibt in Safe Zone
   - Game Over wenn ERSTER stirbt!

3. **Turbo-Koordination**
   - Nicht beide gleichzeitig Turbo nutzen
   - Einer flieht, einer sammelt
   - Energie-Management ist wichtiger mit 2 Spielern

---

## 🔧 WARTUNG & PROBLEMLÖSUNG

### Häufige Probleme

**Problem: Joystick reagiert nicht**
- ✅ Überprüfe Verkabelung zum Raspberry Pi
- ✅ Teste mit `jstest /dev/input/js0`
- ✅ Controller neu kalibrieren in EmulationStation

**Problem: Buttons ohne Funktion**
- ✅ Überprüfe GPIO-Verbindungen
- ✅ Teste mit `evtest`
- ✅ Button-Mapping in RetroArch überprüfen

**Problem: Spiel läuft langsam**
- ✅ Raspberry Pi 4 mit 4GB+ RAM verwenden
- ✅ Übertaktung aktivieren in `/boot/config.txt`
- ✅ Hintergrund-Prozesse beenden

**Problem: Kein Ton**
- ✅ HDMI/Audio-Ausgang in `raspi-config` einstellen
- ✅ Lautstärke mit `alsamixer` prüfen
- ✅ Verstärker-Stromversorgung überprüfen

### Performance-Optimierung

**config.txt Einstellungen:**
```ini
# /boot/config.txt
# GPU Memory
gpu_mem=256

# Übertaktung (nur Pi 4!)
over_voltage=6
arm_freq=2000
gpu_freq=750

# Audio
dtparam=audio=on
```

**Browser-Optimierung:**
```bash
# Chromium im Kiosk-Modus ohne Overhead
chromium-browser --kiosk --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-suggestions-service \
  --noerrdialogs \
  http://localhost:4200
```

---

## 📊 LEADERBOARD & HIGHSCORES

### Lokales Leaderboard
- Automatische Speicherung nach jedem Spiel
- Top 10 werden angezeigt
- Namen werden beim Start eingegeben

### Online-Leaderboard (Optional)
```bash
# Backend-API starten
cd ProductionRunnerAPI
dotnet run

# Frontend mit API verbinden
# In src/environments/environment.ts:
apiUrl: 'http://localhost:5000/api'
```

---

## 🎨 ANPASSUNG & MODS

### Custom Skins
1. Sprites in `src/assets/img/` ersetzen
2. Farben in `game-canvas.component.ts` ändern
3. Neu kompilieren: `npm run build`

### Eigene Maps
```typescript
// src/app/game-canvas/game-canvas.component.ts
// loadMap() Funktion anpassen
// 0 = Leer, 1 = Wand, 2 = Punkt, etc.
```

### Sound-Effekte
- MP3-Dateien in `src/assets/mp3/` ersetzen
- Gleiche Dateinamen beibehalten
- Unterstützte Formate: MP3, WAV, OGG

---

## 📞 SUPPORT & COMMUNITY

### Ressourcen
- **GitHub:** github.com/joebrayanforus/production-runner
- **IFM Website:** ifm.com
- **Iconic Arcade:** Produktseite mit Updates

### Lizenz
Siehe `LICENSES.md` für Details zu:
- Spielcode (MIT License)
- Assets & Grafiken
- Musik & Sound-Effekte

---

## 🎉 VIEL SPASS BEIM SPIELEN!

**Optimiert für ICONIC ARCADE**
- ✅ 2 Spieler vollständig unterstützt
- ✅ Arcade-Buttons vormontiert
- ✅ Plug & Play ready
- ✅ Raspberry Pi 4 optimiert

**Game Features:**
- 🎮 Classic Arcade-Feeling
- 🏭 Industrie 4.0 Theme
- ⚡ Turbo-System
- 🛡️ Power-ups
- 👥 Kooperativer 2-Spieler-Modus
- 🏆 Leaderboard-System

---

*Powered by IFM - Industrial Automation Excellence*
*Production Runner v1.0 - Januar 2026*
