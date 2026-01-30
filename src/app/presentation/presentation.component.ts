import { Component, OnInit, HostListener } from '@angular/core';
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
export class PresentationComponent implements OnInit {
  currentSlide = 0;
  /** 0 = BACK, 1 = JETZT SPIELEN - used for arrow-key focus on last slide */
  actionButtonIndex = 1;
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
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    if (this.currentSlide === this.slides.length - 1) {
      this.actionButtonIndex = 1; // focus JETZT SPIELEN when reaching last slide
    }
  }

  prevSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    if (this.currentSlide === this.slides.length - 1) {
      this.actionButtonIndex = 1;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const onLastSlide = this.currentSlide === this.slides.length - 1;

    if (onLastSlide) {
      // On last slide: arrow keys move focus between BACK and JETZT SPIELEN
      if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
        this.actionButtonIndex = 0;
        event.preventDefault();
        return;
      }
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
        this.actionButtonIndex = 1;
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (this.actionButtonIndex === 0) {
          this.goBack();
        } else {
          this.startGame();
        }
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        this.goBack();
        event.preventDefault();
        return;
      }
    }

    // On other slides: arrows change slide, Enter/Escape go to start
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
      this.nextSlide();
      event.preventDefault();
    } else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
      this.prevSlide();
      event.preventDefault();
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      this.startGame();
      event.preventDefault();
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  startGame() {
    this.router.navigate(['/']);
  }
}
