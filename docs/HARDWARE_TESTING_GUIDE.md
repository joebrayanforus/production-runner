# 🎮 Hardware Testing & Deployment Guide
**Production Runner auf Arcade-Cabinet**

## Voraussetzungen

### Hardware:
- ✅ Arcade-Cabinet (Iconic Arcade Revolution oder ähnlich)
- ✅ Raspberry Pi 4 (4GB+ RAM empfohlen) oder x86 PC
- ✅ USB Gamepad (HID-kompatibel)
- ✅ Monitor/Display (über HDMI)
- ✅ Tastatur + Maus (für Setup)
- ✅ Netzwerkkabel oder WLAN

### Software auf Development-PC:
- ✅ Git installiert
- ✅ Docker Desktop (für lokalen Test)
- ✅ SSH Client (PuTTY oder Terminal)

---

## Schritt 1: Lokaler Test auf Development-PC

### 1.1 Code auf neuesten Stand bringen
```powershell
cd C:\Users\user1\production-runner

# Status prüfen
git status

# Falls nötig: Neueste Änderungen pullen
git pull origin Eingabe-Name

# Prüfen ob Docker läuft
docker --version
docker ps
```

### 1.2 Backend lokal testen
```powershell
# Backend starten
cd ProductionRunnerAPI
dotnet run

# In neuem Terminal: Test ob API antwortet
curl http://localhost:5187/api/scores/leaderboard
# Sollte JSON mit Scores zurückgeben
```

### 1.3 Frontend lokal testen
```powershell
# In neuem Terminal
cd C:\Users\user1\production-runner

# Angular Dev-Server starten
ng serve

# Browser öffnen: http://localhost:4200
# Gamepad anschließen und testen:
# - F12 → Console → navigator.getGamepads() eingeben
# - Sollte Gamepad-Array anzeigen
```

### 1.4 Gamepad-Test im Browser
1. **Chrome/Edge DevTools öffnen** (F12)
2. **Console-Tab** wählen
3. **Gamepad testen:**
   ```javascript
   // Gamepad-Status anzeigen
   setInterval(() => {
     const gp = navigator.getGamepads()[0];
     if (gp) {
       console.log('Axes:', gp.axes, 'Buttons:', gp.buttons.map(b => b.pressed));
     }
   }, 1000);
   ```
4. **Steuerung testen:** Alle Richtungen + A/B Buttons drücken

**✅ Checkpoint:** Wenn Gamepad im Browser erkannt wird → weiter zu Schritt 2

---

## Schritt 2: Raspberry Pi vorbereiten

### 2.1 Raspberry Pi OS installieren

**Option A: Neues Image (empfohlen):**
1. **Raspberry Pi Imager** herunterladen: https://www.raspberrypi.com/software/
2. **OS wählen:** Raspberry Pi OS (64-bit) mit Desktop
3. **Auf SD-Karte flashen** (min. 16GB)
4. **SSH aktivieren:** 
   - Vor dem ersten Boot: Leere Datei `ssh` (ohne Endung) auf Boot-Partition erstellen
5. **WLAN konfigurieren (optional):**
   - Datei `wpa_supplicant.conf` auf Boot-Partition:
   ```
   country=DE
   ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
   update_config=1

   network={
       ssid="DeinWLAN"
       psk="DeinPasswort"
   }
   ```

**Option B: Bestehendes System nutzen:**
```bash
# System updaten
sudo apt update && sudo apt upgrade -y
```

### 2.2 SSH-Verbindung aufbauen

**IP-Adresse herausfinden:**
```powershell
# Auf Windows: IP-Scanner nutzen (Advanced IP Scanner)
# Oder Router-Interface checken (meist 192.168.x.x)
```

**SSH-Verbindung:**
```powershell
# PowerShell oder PuTTY
ssh pi@192.168.1.100
# Standard-Passwort: raspberry (sollte geändert werden!)

# Passwort ändern:
passwd
```

---

## Schritt 3: Raspberry Pi konfigurieren

### 3.1 Docker installieren
```bash
# Docker Installation Script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# User zu Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER

# Neustart erforderlich
sudo reboot

# Nach Reboot: Docker testen
docker --version
docker ps
```

### 3.2 Docker Compose installieren
```bash
# Docker Compose installieren
sudo apt install -y docker-compose

# Version prüfen
docker-compose --version
```

### 3.3 Git installieren
```bash
sudo apt install -y git

# Git-Konfiguration
git config --global user.name "YourName"
git config --global user.email "your@email.com"
```

### 3.4 Node.js installieren (für Build-Prozess)
```bash
# Node.js 18.x installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Version prüfen
node --version
npm --version
```

---

## Schritt 4: Code auf Raspberry Pi übertragen

### Option A: Via Git (empfohlen)
```bash
# SSH-Session auf Raspberry Pi
cd ~

# Repository klonen
git clone https://github.com/joebrayanforus/production-runner.git
cd production-runner

# Auf richtigen Branch wechseln
git checkout Eingabe-Name
git pull origin Eingabe-Name
```

### Option B: Via SCP (von Development-PC)
```powershell
# Auf Windows PowerShell
cd C:\Users\user1\production-runner

# Mit SCP auf Pi kopieren
scp -r . pi@192.168.1.100:~/production-runner

# Dann auf Pi:
ssh pi@192.168.1.100
cd ~/production-runner
```

---

## Schritt 5: Angular Build erstellen

### 5.1 Dependencies installieren
```bash
cd ~/production-runner

# Node Modules installieren
npm install

# Dauer: ca. 5-10 Minuten auf Raspberry Pi
```

### 5.2 Production Build
```bash
# Angular Production Build
ng build --configuration production

# Output-Verzeichnis: dist/production-runner
```

**⚠️ Troubleshooting:**
```bash
# Falls "ng: command not found":
npm install -g @angular/cli

# Falls Memory-Fehler auf Pi:
# Build auf Development-PC erstellen, dann dist/ kopieren:
# Auf Windows:
ng build --configuration production
scp -r dist pi@192.168.1.100:~/production-runner/
```

---

## Schritt 6: Docker-Setup auf Raspberry Pi

### 6.1 Backend .NET Runtime-Image anpassen

**Dockerfile für ARM64 anpassen:**
```bash
cd ~/production-runner/ProductionRunnerAPI

# Dockerfile öffnen
nano Dockerfile
```

**Stelle sicher, dass ARM-kompatible Images verwendet werden:**
```dockerfile
# Multi-Platform Build (unterstützt ARM64)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["ProductionRunnerAPI.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ProductionRunnerAPI.dll"]
```

### 6.2 Frontend Nginx-Image anpassen

```bash
cd ~/production-runner/src
nano Dockerfile
```

**Frontend Dockerfile:**
```dockerfile
FROM nginx:alpine

# Angular Build kopieren
COPY dist/production-runner /usr/share/nginx/html

# Nginx-Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**nginx.conf erstellen:**
```bash
nano nginx.conf
```

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Angular SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.3 Docker Compose anpassen

```bash
cd ~/production-runner
nano docker-compose.yml
```

**Für SQLite (einfacher für Arcade):**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: ProductionRunnerAPI/Dockerfile
    ports:
      - "5000:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:8080
      - ConnectionStrings__DefaultConnection=Data Source=/app/data/productionrunner.db
    volumes:
      - ./data:/app/data
    restart: always

  frontend:
    build:
      context: .
      dockerfile: src/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

### 6.4 Docker-Services starten
```bash
cd ~/production-runner

# Erstmaliger Build (dauert 10-20 Minuten auf Pi)
docker-compose build

# Services starten
docker-compose up -d

# Logs anschauen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

**✅ Checkpoint:** Alle Services sollten "Up" sein

---

## Schritt 7: Erste Tests auf Raspberry Pi

### 7.1 Backend-API testen
```bash
# Auf Raspberry Pi
curl http://localhost:5000/api/scores/leaderboard

# Sollte JSON zurückgeben
```

### 7.2 Frontend im Browser testen
```bash
# IP-Adresse des Raspberry Pi herausfinden
hostname -I

# Beispiel: 192.168.1.100
```

**Auf Development-PC:**
- Browser öffnen: `http://192.168.1.100`
- Sollte Angular-App zeigen
- Gamepad anschließen und testen

### 7.3 Gamepad auf Raspberry Pi testen
```bash
# Gamepad-Device prüfen
ls -l /dev/input/js*
# Sollte /dev/input/js0 zeigen

# Gamepad-Events anzeigen
sudo apt install -y joystick
jstest /dev/input/js0
# Buttons und Achsen testen
```

---

## Schritt 8: Browser Kiosk-Mode einrichten

### 8.1 Chromium installieren
```bash
sudo apt install -y chromium-browser unclutter
```

### 8.2 Autostart-Script erstellen
```bash
# Script erstellen
nano ~/start_game.sh
```

**start_game.sh Inhalt:**
```bash
#!/bin/bash

# Bildschirmschoner deaktivieren
xset s off
xset -dpms
xset s noblank

# Mauszeiger verstecken
unclutter -idle 0.1 &

# Chromium im Kiosk-Mode starten
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  http://localhost
```

**Executable machen:**
```bash
chmod +x ~/start_game.sh
```

### 8.3 Autostart konfigurieren
```bash
# LXDE Autostart bearbeiten
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

**autostart Inhalt:**
```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Docker-Services starten
@bash -c "cd /home/pi/production-runner && docker-compose up -d"

# Warten bis Services bereit sind
@bash -c "sleep 30"

# Spiel im Kiosk-Mode starten
@bash -c "/home/pi/start_game.sh"
```

### 8.4 Reboot testen
```bash
sudo reboot

# Nach Reboot sollte automatisch das Spiel im Vollbild starten
```

---

## Schritt 9: Performance-Optimierung

### 9.1 GPU-Beschleunigung aktivieren
```bash
sudo raspi-config

# Navigate to: Advanced Options → GL Driver → GL (Full KMS)
# Reboot
```

### 9.2 Chromium Flags optimieren

**~/.config/chromium/Default/Preferences bearbeiten:**
```bash
chromium-browser --enable-features=VaapiVideoDecoder \
  --enable-accelerated-video-decode \
  --enable-gpu-rasterization \
  --ignore-gpu-blacklist
```

### 9.3 Performance-Monitoring
```bash
# Echtzeit CPU-Auslastung
htop

# GPU-Temperatur (sollte < 80°C bleiben)
vcgencmd measure_temp

# Frame-Rate im Browser checken:
# F12 → Performance → Record
```

---

## Schritt 10: Arcade-Hardware Integration

### 10.1 USB Gamepad permanent konfigurieren
```bash
# Gamepad-Mapping anzeigen
cat /proc/bus/input/devices | grep -A 5 "gamepad"

# Falls Mapping-Probleme: jstest-gtk nutzen
sudo apt install -y jstest-gtk
jstest-gtk
```

### 10.2 Button-Layout testen

**Im Spiel testen:**
1. ⬆️⬇️⬅️➡️ - Bewegung
2. 🅰️ Button - Action/Start
3. 🅱️ Button - Back/Cancel

**Bei Problemen:**
- `input.service.ts` anpassen
- Button-Indices können je nach Gamepad variieren

### 10.3 Audio-Output konfigurieren
```bash
# Audio-Geräte anzeigen
aplay -l

# HDMI-Audio aktivieren
sudo raspi-config
# System Options → Audio → HDMI

# Lautstärke einstellen
alsamixer
```

---

## Schritt 11: Finales Testing

### ✅ Checkliste vor Präsentation:

**Hardware:**
- [ ] Raspberry Pi startet automatisch
- [ ] Display zeigt Spiel im Vollbild
- [ ] Keine Fehlermeldungen sichtbar
- [ ] Mauszeiger ist versteckt

**Gameplay:**
- [ ] Gamepad alle 4 Richtungen funktionieren
- [ ] A-Button startet Spiel
- [ ] Pac-Man bewegt sich flüssig (keine Ruckler)
- [ ] Ghosts bewegen sich korrekt
- [ ] Power-Ups funktionieren
- [ ] Kollisionserkennung korrekt
- [ ] Game Over Screen erscheint
- [ ] Score wird angezeigt

**Backend:**
- [ ] Scores werden gespeichert
- [ ] Leaderboard lädt
- [ ] Keine Backend-Fehler in Logs

**Performance:**
- [ ] 30 FPS stabil (Chrome DevTools Performance)
- [ ] Keine Frame-Drops bei 4 Ghosts
- [ ] Input-Latenz < 100ms
- [ ] CPU < 80%
- [ ] Temperatur < 80°C

---

## Troubleshooting

### Problem: Docker-Services starten nicht
```bash
# Logs prüfen
docker-compose logs backend
docker-compose logs frontend

# Ports prüfen
sudo netstat -tlnp | grep -E '80|5000'

# Services neu starten
docker-compose down
docker-compose up -d
```

### Problem: Gamepad wird nicht erkannt
```bash
# USB-Geräte prüfen
lsusb

# Input-Devices prüfen
ls -l /dev/input/

# Gamepad-Treiber laden
sudo modprobe joydev
```

### Problem: Schwarzer Bildschirm nach Autostart
```bash
# X-Server Logs prüfen
cat ~/.xsession-errors

# Autostart deaktivieren
mv ~/.config/lxsession/LXDE-pi/autostart ~/.config/lxsession/LXDE-pi/autostart.bak

# System neustarten und manuell testen
sudo reboot
```

### Problem: Niedrige FPS
```bash
# GPU-Memory erhöhen
sudo raspi-config
# Performance Options → GPU Memory → 256

# Chromium Hardware-Beschleunigung prüfen
# Im Browser: chrome://gpu
```

### Problem: Backend nicht erreichbar
```bash
# Docker-Netzwerk prüfen
docker network ls
docker network inspect production-runner_default

# Backend-Container prüfen
docker exec -it production-runner-backend-1 bash
curl http://localhost:8080/api/scores/leaderboard
```

---

## Backup & Recovery

### Backup erstellen (vor Präsentation!)
```bash
# SD-Karte Image erstellen (auf Development-PC mit SD-Card Reader)
# Windows: Win32 Disk Imager nutzen
# Linux/Mac:
sudo dd if=/dev/sdb of=~/production-runner-backup.img bs=4M status=progress
```

### Code-Backup
```bash
# Git-Status sichern
cd ~/production-runner
git status
git log --oneline -10

# Falls nötig: Änderungen committen
git add .
git commit -m "Arcade deployment final config"
git push origin Eingabe-Name
```

---

## Notfall-Plan für Präsentation

### Plan A: Arcade-Cabinet
- Raspberry Pi mit Docker-Setup
- Gamepad-Steuerung
- Vollbild-Kiosk-Mode

### Plan B: Laptop mit Gamepad
- `ng serve` auf Laptop
- Backend lokal laufen lassen
- Gamepad per USB
- Browser im Fullscreen (F11)

### Plan C: Laptop nur Keyboard
- Tastatur-Steuerung nutzen
- Pfeiltasten statt Gamepad
- Immer noch voll funktional

---

## Kontakt & Support

**Bei Problemen während Setup:**
1. Docker-Logs prüfen: `docker-compose logs`
2. GitHub Issues checken
3. Dokumentation neu lesen

**Hardware-Spezifische Probleme:**
- Raspberry Pi Forum: https://forums.raspberrypi.com
- Docker ARM Support: https://docs.docker.com/engine/install/

---

## Zeitplan für Testing

**4 Tage vor Präsentation (08.12.2025 - HEUTE):**
- [ ] Schritt 1-3: Raspberry Pi Setup (2-3 Stunden)
- [ ] Schritt 4-6: Code übertragen + Docker Build (2-3 Stunden)

**3 Tage vor Präsentation (09.12.2025):**
- [ ] Schritt 7-9: Testing + Performance-Optimierung (3-4 Stunden)
- [ ] Schritt 10: Arcade-Integration (1-2 Stunden)

**2 Tage vor Präsentation (10.12.2025):**
- [ ] Schritt 11: Finales Testing + Checkliste (2-3 Stunden)
- [ ] Backup erstellen
- [ ] Notfall-Pläne testen

**1 Tag vor Präsentation (11.12.2025):**
- [ ] Letzter Test auf echter Hardware
- [ ] Präsentation vorbereiten (Slides)
- [ ] Demo-Durchlauf mit Timer

**Präsentationstag (12.12.2025):**
- [ ] 30 Min vorher: Hardware-Check
- [ ] Backup-Laptop bereithalten
- [ ] Viel Erfolg! 🎉

---

**Erstellt:** 08.12.2025  
**Deadline Zwischenpräsentation:** 12.12.2025  
**Status:** Ready for deployment 🚀
