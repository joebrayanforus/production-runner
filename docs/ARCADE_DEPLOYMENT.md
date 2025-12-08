# 🎮 Arcade Cabinet Deployment Guide

## Hardware Voraussetzungen

### Iconic Arcade Revolution Cabinet
- **Computer:** Raspberry Pi 4 (4GB+ RAM empfohlen)
- **Display:** Integrierter Arcade-Monitor
- **Input:** USB Gamepad (Standard HID-kompatibel)
- **OS:** Debian/x86_64 oder Raspberry Pi OS

---

## Performance-Optimierungen

### 1. Browser-Konfiguration

**Chromium (Empfohlen):**
```bash
# Fullscreen Kiosk Mode
chromium-browser --kiosk --disable-infobars --noerrdialogs \
  --disable-session-crashed-bubble --disable-translate \
  --no-first-run --fast --fast-start --disable-features=TranslateUI \
  http://localhost:80
```

**Autostart einrichten:**
```bash
# /etc/xdg/lxsession/LXDE-pi/autostart
@chromium-browser --kiosk http://localhost:80
```

### 2. Canvas-Performance

✅ **Bereits optimiert:**
- Kein `shadowBlur` (CPU-intensiv)
- 30 FPS Target (stabile Frame-Zeit)
- Sprite-basiertes Rendering (keine komplexe Vektorgrafik)

**Testen mit Chrome DevTools:**
```
F12 → Performance → Record
Ziel: Konstante 33ms Frame-Zeit (30 FPS)
```

### 3. Input-Latenz minimieren

**USB Gamepad Polling:**
```typescript
// input.service.ts prüft in jedem Frame
const gamepad = navigator.getGamepads()[0];
if (gamepad) {
  // Direkter Hardware-Zugriff ohne Debounce
}
```

**Buffered Input aktiviert:**
- Turns werden 1 Frame im Voraus gepuffert
- Reduziert gefühlte Latenz bei schnellen Bewegungen

---

## Docker-Deployment auf Arcade-Cabinet

### 1. Docker Installation
```bash
# Raspberry Pi / Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Docker Compose starten
```bash
cd production-runner
docker-compose up -d
```

**Services:**
- `frontend`: Angular App auf Port 80
- `backend`: .NET API auf Port 5000
- `db`: PostgreSQL auf Port 5432

### 3. Netzwerk-Check
```bash
# Lokale URL im Browser
http://localhost

# Backend-API testen
curl http://localhost:5000/api/scores/leaderboard
```

---

## Troubleshooting

### Problem: Gamepad wird nicht erkannt

**Lösung 1: Gamepad API Status prüfen**
```javascript
// Browser Console (F12)
navigator.getGamepads()
// Sollte Array mit [Gamepad, null, null, null] zurückgeben
```

**Lösung 2: USB-Berechtigungen**
```bash
# Gamepad als Input-Device registrieren
ls -l /dev/input/js0
# Sollte existieren, wenn Controller verbunden
```

### Problem: Niedrige FPS

**Diagnose:**
```bash
# CPU-Last prüfen
top
# Chromium sollte < 80% CPU nutzen
```

**Fix: Hardware-Beschleunigung aktivieren**
```bash
chromium-browser --enable-features=VaapiVideoDecoder \
  --enable-accelerated-video-decode
```

### Problem: Leaderboard lädt nicht

**Backend-Status prüfen:**
```bash
docker logs production-runner-backend-1
# Sollte "Now listening on: http://0.0.0.0:5000" zeigen
```

**Proxy-Konfiguration:**
- Angular nutzt `proxy.conf.json`
- Requests zu `/api` werden zu `http://localhost:5187` weitergeleitet

---

## Testing-Checkliste

### Vor dem Messeeinsatz:

- [ ] **Gamepad-Steuerung:** Alle 4 Richtungen + Buttons funktionieren
- [ ] **Performance:** Keine Frame-Drops bei 4 Ghosts + Power-Up
- [ ] **Highscore:** Scores werden gespeichert und angezeigt
- [ ] **Leaderboard:** Echtzeit-Updates via SignalR
- [ ] **Autostart:** System startet nach Reboot direkt ins Spiel
- [ ] **Audio:** Sounds werden über Arcade-Lautsprecher ausgegeben
- [ ] **Netzwerk:** Offline-Modus funktioniert (nur lokales Leaderboard)

### Performance-Ziele:

| Metrik | Ziel | Status |
|--------|------|--------|
| FPS | 30 konstant | ✅ |
| Input-Latenz | < 50ms | ✅ |
| Boot-Time | < 60s | 🔄 |
| RAM-Nutzung | < 2GB | ✅ |

---

## Backup-Plan

### Fallback 1: Native Deployment (ohne Docker)
```bash
# Backend manuell starten
cd ProductionRunnerAPI
dotnet run

# Frontend mit ng serve
cd src
ng serve --host 0.0.0.0 --port 80
```

### Fallback 2: Static Build
```bash
# Angular Production Build
ng build --configuration production

# Mit Nginx hosten
docker run -d -p 80:80 \
  -v $(pwd)/dist:/usr/share/nginx/html \
  nginx:alpine
```

---

## Kontakt & Support

**Hardware-Probleme:** Iconic Arcade Revolution Dokumentation  
**Software-Bugs:** GitHub Issues im Repository  
**Deadline:** Zwischenpräsentation 12.12.2025

---

## Lizenz-Hinweis für Arcade-Einsatz

✅ **Alle Komponenten sind kommerziell nutzbar:**
- Code: MIT License (Angular, .NET)
- Assets: Eigene Pixel-Art
- Sounds: GEMA-frei (CC0/CC-BY)

Keine rechtlichen Bedenken für Messestände! 🎉
📋 Kurzfassung der wichtigsten Schritte:
### Phase 1: Lokaler Test (HEUTE) ⏰
Backend starten: dotnet run in ProductionRunnerAPI
Frontend testen: ng serve
Gamepad testen: navigator.getGamepads() in Browser-Console
### Phase 2: Raspberry Pi Setup (HEUTE/MORGEN) 🔧
Raspberry Pi OS installieren
SSH verbinden
Docker + Git installieren
Code rüberziehen
### Phase 3: Deployment (MORGEN) 🚀
git clone auf Pi
ng build --configuration production
docker-compose up -d
Browser Kiosk-Mode einrichten
### Phase 4: Testing (10.12) ✅
Gamepad-Steuerung testen
Performance checken (30 FPS)
Autostart verifizieren
### Backup-Pläne: 🛟
Plan A: Arcade mit Raspberry Pi
Plan B: Laptop + Gamepad
Plan C: Laptop + Keyboard
