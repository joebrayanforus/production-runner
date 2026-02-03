import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Slide {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  visual: string;
  images?: { src: string; label: string }[];
  malfunctions?: { name: string; svg: string; ifmText: string }[];
  features: string[];
}

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './presentation.component.html',
  styleUrl: './presentation.component.css'
})
export class PresentationComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  /** Action button focus: 0 = BACK, 1 = JETZT SPIELEN */
  actionButtonIndex = 0;
  private gamepadPollInterval: ReturnType<typeof setInterval> | null = null;
  private lastDirection = '';
  private directionHoldTime = 0;
  private lastSelectTime = 0;
  slides: Slide[] = [
    {
      title: 'STEUERUNG',
      subtitle: 'Wie wird gespielt?',
      description: 'Lerne die Arcade-Steuerung kennen',
      icon: '🎮',
      visual: 'game',
      images: [
        { src: 'assets/svg/robot-right.svg', label: '► RECHTS' },
        { src: 'assets/svg/robot-left.svg', label: '◄ LINKS' },
        { src: 'assets/svg/robot-up.svg', label: '▲ OBEN' },
        { src: 'assets/svg/robot-down.svg', label: '▼ UNTEN' },
        { src: 'assets/svg/sensor-data.svg', label: 'SAMMLE DATEN' },
        { src: 'assets/svg/quality-checkpoint.svg', label: 'QUALITÄT++' }
      ],
      features: ['▲▼◄► PFEILTASTEN = ROBOTER BEWEGEN', '🎮 STRG / CTRL = TURBO AKTIVIEREN', '🎯 ZIEL: ALLE SENSORDATEN SAMMELN']
    },
    {
      title: 'ACHTUNG! STÖRUNGEN',
      subtitle: 'Vermeide die 4 IFM-Fehlertypen',
      description: 'IFM Sensoren erkennen Probleme - Lerne sie zu vermeiden!',
      icon: '⚠️',
      visual: 'malfunctions',
      malfunctions: [
        { name: '🌡️ TEMPERATUR', svg: 'assets/svg/malfunction-temperature.svg', ifmText: 'Überhitzung = GAME OVER' },
        { name: '💨 DRUCK', svg: 'assets/svg/malfunction-pressure.svg', ifmText: 'Druckausfall = TOD' },
        { name: '📳 VIBRATION', svg: 'assets/svg/malfunction-vibration.svg', ifmText: 'Vibrationen = GEFAHR' },
        { name: '⚙️ VERSCHLEISS', svg: 'assets/svg/malfunction-wear.svg', ifmText: 'Verschleiß = CRASH' }
      ],
      features: ['❌ BERÜHRE SIE NICHT!', '👻 Sie patrouillieren die Fabrik', '💀 KONTAKT = 1 LEBEN VERLOREN']
    },
    {
      title: 'POWER-UPS HOLEN!',
      subtitle: 'IFM Technologie gibt dir Superkräfte',
      description: 'Sammle die großen Bonus-Symbole für temporäre Vorteile',
      icon: '⚡',
      visual: 'powerups',
      images: [
        { src: 'assets/svg/bonus-shield.svg', label: '🛡️ SCHUTZSCHILD' },
        { src: 'assets/svg/bonus-diagnostic.svg', label: '🔧 WARTUNG' },
        { src: 'assets/svg/bonus-iot-sensor.svg', label: '📡 IOT BOOST' },
        { src: 'assets/svg/bonus-speed.svg', label: '⚡ TURBO' }
      ],
      features: ['🛡️ SCHUTZ = Unverwundbar für 10 Sekunden', '👻 WARTUNG = Störungen werden langsam', '⭐ COMBO = Mehrere Daten nacheinander']
    },
    {
      title: 'DIE FABRIK',
      subtitle: 'Lerne die Spielumgebung kennen',
      description: 'Navigiere durch die industrielle IFM-Produktionsstätte',
      icon: '🏗️',
      visual: 'elements',
      images: [
        { src: 'assets/svg/control-panel.svg', label: '⚙️ STEUERUNG' },
        { src: 'assets/svg/conveyor-belt.svg', label: '➡️ FÖRDERBAND' },
        { src: 'assets/svg/maintenance-station.svg', label: '🔧 SERVICE' },
        { src: 'assets/svg/pipe-junction.svg', label: '🔀 KREUZUNG' },
        { src: 'assets/svg/hazard-tile.svg', label: '⚠️ VORSICHT' },
        { src: 'assets/svg/ghost-door.svg', label: '🚪 SPAWN' },
        { src: 'assets/svg/wall.svg', label: '🧱 WAND' },
        { src: 'assets/svg/wall-corner.svg', label: '📐 ECKE' }
      ],
      features: ['🧱 WÄNDE = Nicht durchquerbar', '🚪 GEISTERTÜR = Feinde spawnen hier', '✨ KLEINE PUNKTE = Sensordaten (+10)']
    },
    {
      title: 'BEREIT ZU SPIELEN?',
      subtitle: 'Teste deine Reaktion & Strategie!',
      description: '3 Leben • Höchster Score • Arcade-Action',
      icon: '🚀',
      visual: 'start',
      images: [
        { src: 'assets/svg/life-icon.svg', label: '❤️ 3 LEBEN' }
      ],
      features: ['🎯 SAMMLE ALLE SENSORDATEN', '🏆 ERREICHE DEN HIGHSCORE', '⚡ STRG = TURBO-MODUS']
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Auto-advance slides every 5 seconds
    setInterval(() => {
      this.nextSlide();
    }, 5000);
    this.startGamepadPolling();
  }

  ngOnDestroy() {
    if (this.gamepadPollInterval) {
      clearInterval(this.gamepadPollInterval);
      this.gamepadPollInterval = null;
    }
  }

  /** Arcade/gamepad: navigate buttons (U/D) and slides (L/R), A to confirm */
  private startGamepadPolling(): void {
    const threshold = 0.5;
    this.gamepadPollInterval = setInterval(() => {
      const gamepad = navigator.getGamepads()[0];
      if (!gamepad) return;

      let currentDirection = '';
      if (gamepad.axes[1] < -threshold || gamepad.buttons[12]?.pressed) currentDirection = 'U';
      else if (gamepad.axes[1] > threshold || gamepad.buttons[13]?.pressed) currentDirection = 'D';
      else if (gamepad.axes[0] < -threshold || gamepad.buttons[14]?.pressed) currentDirection = 'L';
      else if (gamepad.axes[0] > threshold || gamepad.buttons[15]?.pressed) currentDirection = 'R';

      if (currentDirection && currentDirection === this.lastDirection) {
        this.directionHoldTime += 100;
        if (this.directionHoldTime > 300) {
          this.handleGamepadDirection(currentDirection);
        }
      } else if (currentDirection && currentDirection !== this.lastDirection) {
        this.lastDirection = currentDirection;
        this.directionHoldTime = 0;
        this.handleGamepadDirection(currentDirection);
      } else {
        this.lastDirection = '';
        this.directionHoldTime = 0;
      }

      if (gamepad.buttons[0]?.pressed) {
        const now = Date.now();
        if (now - this.lastSelectTime > 300) {
          this.activateSelectedAction();
          this.lastSelectTime = now;
        }
      }
    }, 100);
  }

  private handleGamepadDirection(direction: string): void {
    if (direction === 'U') {
      this.actionButtonIndex = 0; // BACK
    } else if (direction === 'D') {
      this.actionButtonIndex = 1; // JETZT SPIELEN
    } else if (direction === 'L') {
      this.prevSlide();
    } else if (direction === 'R') {
      this.nextSlide();
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Arrow Up/Down: select NW (0) or JETZT SPIELEN (1)
    if (event.key === 'ArrowUp') {
      this.actionButtonIndex = 0;
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown') {
      this.actionButtonIndex = 1;
      event.preventDefault();
      return;
    }
    // Arrow Left/Right: previous/next slide
    if (event.key === 'ArrowRight') {
      this.nextSlide();
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.prevSlide();
      event.preventDefault();
      return;
    }
    // Enter or Escape: activate selected button (both go to start page for now)
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.activateSelectedAction();
      event.preventDefault();
    }
  }

  private activateSelectedAction() {
    if (this.actionButtonIndex === 0) {
      this.startGame(); // BACK
    } else {
      this.startGame(); // JETZT SPIELEN
    }
  }

  startGame() {
    this.router.navigate(['/']);
  }
}
