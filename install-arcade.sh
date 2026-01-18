#!/bin/bash
# ICONIC ARCADE - Production Runner Installation Script
# Automatische Installation für Raspberry Pi 4

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🕹️  ICONIC ARCADE - PRODUCTION RUNNER INSTALLER  🕹️    ║"
echo "║                   Raspberry Pi 4 Setup                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fehlerbehandlung
set -e
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
trap 'echo -e "${RED}✗ Fehler bei: \"${last_command}\"${NC}"' ERR

# Funktion für farbige Ausgabe
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# System-Check
print_step "System-Check..."
if [[ ! -f /proc/device-tree/model ]] || [[ ! $(cat /proc/device-tree/model) =~ "Raspberry Pi 4" ]]; then
    print_warning "Nicht auf Raspberry Pi 4 erkannt. Fortfahren? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
print_success "Raspberry Pi System erkannt"

# Update System
print_step "System aktualisieren..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
print_success "System aktualisiert"

# Node.js installieren
print_step "Node.js installieren..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js $(node -v) installiert"
else
    print_success "Node.js bereits installiert: $(node -v)"
fi

# Angular CLI installieren
print_step "Angular CLI installieren..."
if ! command -v ng &> /dev/null; then
    sudo npm install -g @angular/cli
    print_success "Angular CLI installiert"
else
    print_success "Angular CLI bereits installiert"
fi

# Dependencies installieren
print_step "System-Dependencies installieren..."
sudo apt-get install -y \
    git \
    chromium-browser \
    unclutter \
    joystick \
    jstest-gtk \
    evtest \
    alsa-utils \
    pulseaudio
print_success "Dependencies installiert"

# Projekt klonen oder aktualisieren
INSTALL_DIR="/home/pi/production-runner"
if [[ -d "$INSTALL_DIR" ]]; then
    print_step "Projekt aktualisieren..."
    cd "$INSTALL_DIR"
    git pull
else
    print_step "Projekt klonen..."
    git clone https://github.com/joebrayanforus/production-runner.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
print_success "Projekt-Dateien bereit"

# NPM Dependencies installieren
print_step "NPM Packages installieren..."
npm install --legacy-peer-deps
print_success "Packages installiert"

# Build Production Version
print_step "Production Build erstellen..."
npm run build --prod
print_success "Build erfolgreich"

# Joystick-Konfiguration
print_step "Joystick-Konfiguration..."
sudo modprobe joydev
echo "joydev" | sudo tee -a /etc/modules > /dev/null
print_success "Joystick-Module geladen"

# Test Joysticks
print_step "Joystick-Test..."
if [[ -e /dev/input/js0 ]]; then
    print_success "Joystick 1 erkannt: /dev/input/js0"
else
    print_warning "Joystick 1 nicht gefunden"
fi

if [[ -e /dev/input/js1 ]]; then
    print_success "Joystick 2 erkannt: /dev/input/js1"
else
    print_warning "Joystick 2 nicht gefunden (nur für 2-Spieler erforderlich)"
fi

# Autostart konfigurieren
print_step "Autostart konfigurieren..."

# Desktop-Icon erstellen
cat > /home/pi/Desktop/ProductionRunner.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Production Runner
Comment=IFM Production Runner Game
Icon=/home/pi/production-runner/src/assets/img/ifm-logo.png
Exec=/home/pi/production-runner/start-game.sh
Terminal=false
Categories=Game;
EOF
chmod +x /home/pi/Desktop/ProductionRunner.desktop
print_success "Desktop-Icon erstellt"

# Start-Script erstellen
cat > /home/pi/production-runner/start-game.sh << 'EOF'
#!/bin/bash
# Production Runner Starter Script

# Cursor verstecken
unclutter -idle 0.1 &

# Warte bis Server läuft
cd /home/pi/production-runner
npm start &
SERVER_PID=$!

# Warte auf Server
echo "Warte auf Server..."
for i in {1..30}; do
    if curl -s http://localhost:4200 > /dev/null; then
        echo "Server läuft!"
        break
    fi
    sleep 1
done

# Chromium im Kiosk-Modus starten
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-suggestions-service \
    --disable-translate \
    --disable-save-password-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-features=PreloadMediaEngagementData,AutoplayIgnoreWebAudio \
    --autoplay-policy=no-user-gesture-required \
    http://localhost:4200

# Cleanup wenn Browser geschlossen wird
kill $SERVER_PID
EOF
chmod +x /home/pi/production-runner/start-game.sh
print_success "Start-Script erstellt"

# Systemd Service für Autostart
print_step "Systemd Service erstellen..."
sudo cat > /etc/systemd/system/production-runner.service << 'EOF'
[Unit]
Description=Production Runner Game
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/production-runner
ExecStart=/home/pi/production-runner/start-game.sh
Restart=on-failure
RestartSec=10
Environment="DISPLAY=:0"
Environment="XAUTHORITY=/home/pi/.Xauthority"

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
print_success "Systemd Service erstellt"

# Performance-Optimierung
print_step "Performance-Optimierung..."

# GPU Memory erhöhen
if ! grep -q "gpu_mem=256" /boot/config.txt; then
    echo "gpu_mem=256" | sudo tee -a /boot/config.txt > /dev/null
    print_success "GPU Memory auf 256MB gesetzt"
fi

# Optionale Übertaktung (nur mit Kühlung!)
print_warning "Übertaktung konfigurieren? (Nur mit aktiver Kühlung!) (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    if ! grep -q "arm_freq=2000" /boot/config.txt; then
        cat << EOF | sudo tee -a /boot/config.txt > /dev/null

# Übertaktung für Production Runner
over_voltage=6
arm_freq=2000
gpu_freq=750
EOF
        print_success "Übertaktung konfiguriert"
    fi
fi

# Audio-Konfiguration
print_step "Audio konfigurieren..."
sudo amixer set 'PCM' 100%
sudo amixer set 'Master' 100%
print_success "Audio auf 100% gesetzt"

# Berechtigungen setzen
print_step "Berechtigungen setzen..."
sudo chown -R pi:pi /home/pi/production-runner
sudo chmod +x /home/pi/production-runner/start-game.sh
print_success "Berechtigungen gesetzt"

# Installation abgeschlossen
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✓ INSTALLATION ERFOLGREICH ✓                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
print_success "Production Runner ist bereit!"
echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo ""
echo "1. 🎮 Joysticks testen:"
echo "   jstest /dev/input/js0"
echo "   jstest /dev/input/js1"
echo ""
echo "2. 🚀 Spiel manuell starten:"
echo "   /home/pi/production-runner/start-game.sh"
echo ""
echo "3. 🔄 Autostart aktivieren:"
echo "   sudo systemctl enable production-runner"
echo "   sudo systemctl start production-runner"
echo ""
echo "4. 📱 Oder Desktop-Icon verwenden:"
echo "   Doppelklick auf 'Production Runner' auf Desktop"
echo ""
echo "5. 🔧 Konfiguration testen:"
echo "   - Beide Joysticks bewegen"
echo "   - Alle 16 Buttons testen"
echo "   - Audio-Ausgabe prüfen"
echo ""
print_warning "Neustart empfohlen für Übertaktung und Autostart!"
echo ""
echo "Jetzt neustarten? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    sudo reboot
fi

echo ""
echo "🎉 Viel Spaß mit Production Runner auf ICONIC ARCADE!"
echo "📖 Dokumentation: $INSTALL_DIR/docs/ARCADE_QUICK_START.md"
echo ""
