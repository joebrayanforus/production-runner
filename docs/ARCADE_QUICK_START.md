# 🕹️ ICONIC ARCADE - QUICK START GUIDE

## ⚡ SCHNELLSTART (5 Minuten)

### 1. Hardware überprüfen ✅
- ✅ 21" Display angeschlossen
- ✅ 2 Joysticks funktionieren
- ✅ 16 Buttons reagieren
- ✅ Lautsprecher eingeschaltet
- ✅ Raspberry Pi 4 eingeschaltet
- ✅ Stromversorgung 12V/7.5A angeschlossen

### 2. Spiel starten 🚀

**Browser öffnen:**
```
http://localhost:4200
```

**Oder auf Desktop-Icon klicken:**
```
Production Runner.desktop
```

### 3. Spielmodus wählen 🎮

**1️⃣ SPIELER MODUS:**
- Joystick 1 (Links) zur Steuerung
- Buttons 1-4 für Turbo

**2️⃣ SPIELER MODUS:**
- Joystick 1 (Links) = Spieler 1 (Orange)
- Joystick 2 (Rechts) = Spieler 2 (Blau)
- Jeder Spieler nutzt seine 8 Buttons

---

## 🎯 STEUERUNG - ICONIC ARCADE

### Layout (Draufsicht)

```
╔════════════════════════════════════════════════════════╗
║                  ICONIC ARCADE                         ║
║                                                        ║
║   SPIELER 1 (ORANGE)         SPIELER 2 (BLAU)         ║
║   ═══════════════════         ═══════════════════     ║
║                                                        ║
║      🕹️ JOYSTICK 1              🕹️ JOYSTICK 2         ║
║         (Links)                    (Rechts)           ║
║                                                        ║
║     🔘 1    🔘 2               🔘 9    🔘 10           ║
║     🔘 3    🔘 4               🔘 11   🔘 12           ║
║                                                        ║
║     🔘 5    🔘 6               🔘 13   🔘 14           ║
║     🔘 7    🔘 8               🔘 15   🔘 16           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### Button-Funktionen

#### 🟧 SPIELER 1 (Links)
| Button | Funktion |
|--------|----------|
| 🕹️ Joystick | Bewegung (8-Wege) |
| 🔘 1-4 | Turbo aktivieren |
| 🔘 5 | Pause/Menü |
| 🔘 6 | Hilfe (H) |
| 🔘 7 | (Reserve) |
| 🔘 8 | Zurück/Abbrechen |

#### 🟦 SPIELER 2 (Rechts)
| Button | Funktion |
|--------|----------|
| 🕹️ Joystick | Bewegung (8-Wege) |
| 🔘 9-12 | Turbo aktivieren |
| 🔘 13 | (Reserve) |
| 🔘 14 | Hilfe (H) |
| 🔘 15 | (Reserve) |
| 🔘 16 | Zurück/Abbrechen |

---

## 🎮 GAMEPLAY BASICS

### Ziel
Sammle alle **Sensordaten** (kleine Punkte) während du **Störungen** (Ghosts) ausweichst!

### Power-Ups (rotieren alle 8 Sekunden)
- 🛡️ **SCHUTZSCHILD** - 10 Sek unverwundbar
- 🔧 **WARTUNG** - Störungen werden langsam
- 📡 **IOT BOOST** - +1000 Punkte sofort

### Turbo-System
- 🟧 **P1 Energie:** Unten rechts (Orange Balken)
- 🟦 **P2 Energie:** Unten links (Blauer Balken)
- ⚡ **Funktion:** 2x Geschwindigkeit solange gedrückt
- ⏱️ **Regeneration:** 8/Sek (automatisch wenn nicht aktiv)
- ⚡ **Verbrauch:** 40/Sek (während aktiv)

### Leben-System
- ❤️ **Start:** 3 Leben pro Spieler
- ❌ **Verlust:** Berührung mit normaler Störung
- 🎮 **2-Spieler:** Game Over wenn ERSTER Spieler stirbt!

---

## 🔧 TROUBLESHOOTING

### Joystick reagiert nicht
```bash
# Test mit jstest
jstest /dev/input/js0  # Joystick 1
jstest /dev/input/js1  # Joystick 2
```

### Buttons funktionieren nicht
```bash
# Überprüfe Event-Devices
evtest
# Wähle dein Gamepad Device
```

### Spiel läuft langsam
**Lösung 1:** Raspberry Pi übertakten
```bash
sudo nano /boot/config.txt
# Füge hinzu:
arm_freq=2000
gpu_freq=750
over_voltage=6
```

**Lösung 2:** GPU Memory erhöhen
```bash
sudo raspi-config
# Advanced Options → Memory Split → 256MB
```

### Kein Ton
```bash
# Audio-Ausgang prüfen
alsamixer
# Lautstärke auf 100% setzen

# HDMI-Audio aktivieren
sudo raspi-config
# System Options → Audio → HDMI
```

---

## 📋 HILFE IM SPIEL

Drücke **Button 6 (P1)** oder **Button 14 (P2)** oder **H-Taste** während des Spiels um die vollständige Spielanleitung zu öffnen!

Die Anleitung enthält:
- ✅ Detaillierte Steuerung
- ✅ Störungstypen erklärt
- ✅ Power-up Strategien
- ✅ Fabrik-Layout Hilfe
- ✅ Tipps für Highscores

---

## 🏆 HIGHSCORE-TIPPS

1. **Combo-System nutzen**
   - Sammle Punkte schnell nacheinander
   - Multiplikator steigt bis 5x!

2. **Turbo sparsam einsetzen**
   - Kurze Bursts statt dauernd drücken
   - In sicheren Bereichen regenerieren

3. **Power-ups timen**
   - Warte auf Schutzschild vor riskanten Moves
   - IoT Boost am Ende für Maximum

4. **2-Spieler Teamwork**
   - Teilt die Map auf
   - Einer lockt, anderer sammelt
   - Kommuniziert!

---

## 📞 SUPPORT

**Dokumentation:**
- 📄 Vollständige Anleitung: `ICONIC_ARCADE_ANLEITUNG.md`
- 🎮 Hardware Setup: `docs/HARDWARE_TESTING_GUIDE.md`
- 🏗️ Arcade Deployment: `docs/ARCADE_DEPLOYMENT.md`

**GitHub:**
- 🔗 Repository: github.com/joebrayanforus/production-runner
- 🐛 Issues: Probleme melden auf GitHub Issues

**IFM:**
- 🌐 Website: ifm.com
- 📧 Support: Kontakt über IFM Website

---

## 🎉 VIEL SPASS!

**Optimiert für ICONIC ARCADE:**
- ✅ Raspberry Pi 4 (4GB RAM empfohlen)
- ✅ 2 Spieler vollständig unterstützt
- ✅ Mikroschalter-Joysticks
- ✅ 16 Arcade-Buttons vormontiert
- ✅ 21" Full-HD Display
- ✅ Stereo-Sound System

**Made with ❤️ by IFM**
*Production Runner v1.0 - Industrial Automation Excellence*
