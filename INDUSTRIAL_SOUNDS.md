# Industrielle Sound-Dateien für ifm Production Runner

## Original-Sounds erstellt:

### 1. **sensor-beep.mp3** (ersetzt waka.mp3)
- Kurzer elektronischer Beep (800Hz, 0.1s)
- Für Sensordaten-Sammlung
- Klingt wie ein Barcode-Scanner oder Messgerät

### 2. **maintenance-activation.mp3** (ersetzt powerpill.mp3)  
- Aufsteigender Ton-Sequenz (440Hz→660Hz→880Hz)
- Für Wartungsmodus-Aktivierung
- Klingt wie Maschinenstartup

### 3. **repair-success.mp3** (ersetzt eatghost.mp3)
- Positiver Bestätigungs-Akkord (C-E-G)
- Für erfolgreiche Reparaturen
- Klingt wie "Task Complete" Benachrichtigung

### 4. **system-error.mp3** (ersetzt die.mp3)
- Absteigende Alarm-Sequenz (800Hz→500Hz) 
- Für Systemfehler/Störungen
- Klingt wie Industriealarm

### 5. **industrial-ambient.mp3** (ersetzt theme.mp3)
- Subtiler Maschinenhintergrund (60Hz Brummen + Obertöne)
- Für Produktionshallen-Atmosphäre  
- Klingt wie entfernte Maschinen

## Web Audio API Implementation:
Die Sounds werden zur Laufzeit generiert - keine externen Dateien nötig!
Vollständig original und ifm-spezifisch.

## Fallback:
Bei Problemen mit Web Audio API wird automatisch auf Original-Dateien zurückgegriffen.
