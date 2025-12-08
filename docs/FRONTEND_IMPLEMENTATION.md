# Production Runner - Frontend Implementation Guide

## Inhaltsverzeichnis
1. [Projektstruktur](#1-projektstruktur)
2. [Angular Grundlagen](#2-angular-grundlagen)
3. [Komponenten im Detail](#3-komponenten-im-detail)
4. [Game Engine Implementierung](#4-game-engine-implementierung)
5. [Routing & Navigation](#5-routing--navigation)
6. [Styling & CSS](#6-styling--css)
7. [State Management](#7-state-management)
8. [Best Practices](#8-best-practices)

---

## 1. Projektstruktur

```
src/
├── app/
│   ├── app.component.ts          # Root-Komponente
│   ├── app.config.ts             # App-Konfiguration
│   ├── app.routes.ts             # Routing-Definition
│   │
│   ├── start-page/               # Start-Seite Komponente
│   │   ├── start-page.component.ts
│   │   ├── start-page.component.html
│   │   ├── start-page.component.css
│   │   └── start-page.component.spec.ts
│   │
│   ├── game-canvas/              # Spiel-Komponente
│   │   ├── game-canvas.component.ts
│   │   ├── game-canvas.component.html
│   │   ├── game-canvas.component.css
│   │   └── game-canvas.component.spec.ts
│   │
│   ├── models/                   # Datenmodelle
│   │   ├── Block.ts              # Spielobjekt-Klasse
│   │   └── game-manager.ts       # Spiellogik-Manager
│   │
│   └── services/                 # Angular Services
│       ├── audio.service.ts      # Audio-Verwaltung
│       └── input.service.ts      # Tastatureingaben
│
├── assets/                       # Statische Ressourcen
│   ├── img/                      # Bilder
│   └── mp3/                      # Audio-Dateien
│
├── index.html                    # Haupt-HTML
├── main.ts                       # Bootstrap-Entry
└── styles.css                    # Globale Styles
```

---

## 2. Angular Grundlagen

### 2.1 Standalone Components (Angular 17+)

Wir verwenden **Standalone Components** - die moderne Art Angular-Komponenten zu schreiben:

```typescript
// start-page.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-page',
  standalone: true,                    // ← Standalone!
  imports: [RouterLink, CommonModule], // ← Imports direkt in Komponente
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent {
  // Komponenten-Logik
}
```

**Vorteile von Standalone Components:**
- Kein NgModule mehr nötig
- Bessere Tree-Shaking (kleinere Bundle-Größe)
- Einfachere Imports
- Bessere Lesbarkeit

### 2.2 Decorators erklärt

```typescript
@Component({
  selector: 'app-game-canvas',  // HTML-Tag: <app-game-canvas></app-game-canvas>
  standalone: true,              // Keine Module-Abhängigkeit
  imports: [],                   // Benötigte Module/Komponenten
  templateUrl: './game-canvas.component.html',  // Template-Datei
  styleUrls: ['./game-canvas.component.css']    // CSS-Datei(en)
})
```

### 2.3 Lifecycle Hooks

Angular bietet verschiedene "Lebenszyklus-Hooks":

```typescript
export class GameCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // 1. ngOnInit - Nach Initialisierung der Inputs
  ngOnInit(): void {
    console.log('Komponente initialisiert');
    this.loadMap();
    this.initPatrolRoute();
  }
  
  // 2. ngAfterViewInit - Nach Rendering des Views
  ngAfterViewInit(): void {
    // Canvas ist jetzt verfügbar
    const canvas = this.gameCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.startGameLoop();
  }
  
  // 3. ngOnDestroy - Vor Zerstörung der Komponente
  ngOnDestroy(): void {
    // Aufräumen! Memory Leaks verhindern
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('keydown', this.onKeyDownBound);
  }
}
```

---

## 3. Komponenten im Detail

### 3.1 Start Page Component

Die Startseite mit Spielmodus-Auswahl:

**Template (HTML):**
```html
<!-- start-page.component.html -->
<div class="start-container">
  
  <!-- Hero Section -->
  <header class="hero">
    <h1 class="game-title">🏭 PRODUCTION RUNNER</h1>
    <p class="subtitle">ifm statmath Edition</p>
  </header>

  <!-- Spielmodi Section -->
  <section class="modes-section">
    <h2>🎮 Spielmodi</h2>
    <div class="modes-grid">
      
      <!-- Classic Mode Card -->
      <div class="mode-card" 
           [class.selected]="selectedMode === 'classic'" 
           (click)="selectMode('classic')">
        <div class="mode-icon">▶️</div>
        <h3>Classic Mode</h3>
        <p>Das klassische Spielerlebnis...</p>
        <ul class="mode-features">
          <li>✓ 3 Leben</li>
          <li>✓ Steigende Schwierigkeit</li>
        </ul>
      </div>

      <!-- Practice Mode Card -->
      <div class="mode-card"
           [class.selected]="selectedMode === 'practice'"
           (click)="selectMode('practice')">
        <!-- ... -->
      </div>
      
    </div>
  </section>

  <!-- Start Button mit RouterLink -->
  <a class="start-button" 
     [routerLink]="['/game']" 
     [queryParams]="{mode: selectedMode}">
    🚀 SPIEL STARTEN
  </a>
  
</div>
```

**Erklärung der Angular-Syntax:**

| Syntax | Bedeutung | Beispiel |
|--------|-----------|----------|
| `[class.selected]` | Bedingte CSS-Klasse | Fügt `selected` hinzu wenn Bedingung true |
| `(click)` | Event Binding | Ruft Methode bei Klick auf |
| `[routerLink]` | Property Binding | Setzt Router-Link dynamisch |
| `[queryParams]` | Query Parameter | Fügt `?mode=classic` zur URL hinzu |

**Component Logic (TypeScript):**
```typescript
// start-page.component.ts
export type GameMode = 'classic' | 'practice';

@Component({...})
export class StartPageComponent {
  selectedMode: GameMode = 'classic';  // Default-Wert
  
  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }
}
```

### 3.2 Game Canvas Component

Die Hauptspiel-Komponente mit Canvas-Rendering:

**Template:**
```html
<!-- game-canvas.component.html -->
<div class="game-container">
  <canvas #gameCanvas></canvas>  <!-- #gameCanvas = Template Reference -->
</div>
```

**ViewChild - Zugriff auf DOM-Elemente:**
```typescript
export class GameCanvasComponent {
  // @ViewChild greift auf das Canvas-Element zu
  @ViewChild('gameCanvas', { static: false }) 
  gameCanvas!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  
  ngAfterViewInit(): void {
    const canvasEl = this.gameCanvas.nativeElement;
    canvasEl.width = this.CANVAS_WIDTH;   // 560
    canvasEl.height = this.CANVAS_HEIGHT; // 620
    
    const context = canvasEl.getContext('2d');
    if (!context) {
      console.error('Could not get 2D context');
      return;
    }
    this.ctx = context;
  }
}
```

---

## 4. Game Engine Implementierung

### 4.1 Game Loop Architektur

Das Spiel verwendet eine klassische Game Loop mit `requestAnimationFrame`:

```typescript
private startGameLoop() {
  const loop = (timestamp: number) => {
    // Delta-Zeit berechnen (Zeit seit letztem Frame)
    const delta = timestamp - this.lastFrameTime;
    
    // FPS-Limiter: Nur bei 30 FPS updaten
    if (delta > 1000 / this.FPS) {
      this.lastFrameTime = timestamp;
      
      this.update();  // 1. Spiellogik aktualisieren
      this.render();  // 2. Auf Canvas zeichnen
    }
    
    // Nächsten Frame anfordern
    this.animationFrameId = requestAnimationFrame(loop);
  };
  
  this.animationFrameId = requestAnimationFrame(loop);
}
```

**Warum requestAnimationFrame?**
- Synchronisiert mit Display-Refresh-Rate
- Pausiert automatisch wenn Tab nicht sichtbar
- Bessere Performance als setInterval

### 4.2 Update-Methode (Spiellogik)

```typescript
private update() {
  const deltaTime = 1000 / this.FPS;

  // 1. State Machine für Spielzustände
  switch (this.gameState) {
    case 'ready':
      this.stateTimer += deltaTime;
      if (this.stateTimer >= this.READY_DURATION) {
        this.gameState = 'playing';
      }
      return; // Keine Bewegung während Ready
      
    case 'dying':
      // Todesanimation...
      return;
      
    case 'gameover':
      return; // Warte auf Tastendruck
      
    case 'playing':
      break; // Weiter mit Update
  }

  // 2. Animationen aktualisieren
  this.updatePacmanAnimation();
  this.updatePowerPelletBlink();

  // 3. Ghost Mode Timer (Scatter/Chase)
  this.updateGhostMode(deltaTime);

  // 4. Bewegung & Kollisionen
  this.move();

  // 5. Scared Timer für Power Pellets
  this.updateScaredTimer(deltaTime);
}
```

### 4.3 Render-Methode (Zeichnen)

```typescript
private render() {
  if (!this.ctx) return;
  
  // 1. Canvas löschen (schwarzer Hintergrund)
  this.ctx.fillStyle = '#000000';
  this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
  
  // 2. Spielelemente zeichnen (Reihenfolge wichtig!)
  this.draw(this.ctx);
}

private draw(ctx: CanvasRenderingContext2D) {
  // Zeichenreihenfolge (hinten → vorne):
  
  // 1. Wände
  this.walls.forEach(wall => {
    if (wall.type === 'ghost-door') {
      ctx.fillStyle = '#FFB8FF';
      ctx.fillRect(wall.x, wall.y + wall.height/2 - 2, wall.width, 4);
    } else if (wall.image?.complete) {
      ctx.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
    }
  });

  // 2. Pellets (weiße Punkte)
  ctx.fillStyle = 'white';
  this.foods.forEach(food => {
    ctx.beginPath();
    ctx.arc(food.x + 2, food.y + 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Power Pellets (blinkend)
  if (this.powerPelletVisible) {
    ctx.fillStyle = '#FFD700';
    this.powerPellets.forEach(pellet => {
      ctx.beginPath();
      ctx.arc(pellet.x + 4, pellet.y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 4. Cherry
  if (this.cherry?.image?.complete) {
    ctx.drawImage(this.cherry.image, ...);
  }

  // 5. Pac-Man
  this.drawPacman(ctx);

  // 6. Geister
  this.ghosts.forEach(ghost => this.drawGhost(ctx, ghost));

  // 7. UI Overlay (Score, Lives)
  this.drawUI(ctx);
}
```

### 4.4 Pac-Man Zeichnen mit Animation

```typescript
private drawPacman(ctx: CanvasRenderingContext2D) {
  if (!this.pacman) return;

  const centerX = this.pacman.x + this.pacman.width / 2;
  const centerY = this.pacman.y + this.pacman.height / 2;
  const radius = this.pacman.width / 2 - 1;

  // Rotation basierend auf Bewegungsrichtung
  let rotation = 0;
  switch (this.pacman.direction) {
    case 'R': rotation = 0; break;
    case 'D': rotation = Math.PI / 2; break;
    case 'L': rotation = Math.PI; break;
    case 'U': rotation = -Math.PI / 2; break;
  }

  ctx.save();  // Canvas-Zustand speichern
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  // Pac-Man Körper (gelber Kreis mit Mund)
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  
  // Mund-Animation: pacmanMouthAngle variiert zwischen 0.05 und 0.5
  ctx.arc(0, 0, radius, 
          this.pacmanMouthAngle * Math.PI,      // Mund-Start
          (2 - this.pacmanMouthAngle) * Math.PI // Mund-Ende
  );
  ctx.lineTo(0, 0);
  ctx.fill();

  // Auge
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-2, -radius / 2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();  // Canvas-Zustand wiederherstellen
}
```

### 4.5 Ghost AI System

Die Geister haben verschiedene Verhaltensweisen:

```typescript
// Ghost-Typen (Industrial Theme)
type GhostType = 'aggressive' | 'ambush' | 'patrol' | 'random';

private updateGhostAI(ghost: Block) {
  if (!this.pacman) return;

  let targetX = this.pacman.x;
  let targetY = this.pacman.y;

  // Frightened Mode: Zufällige Bewegung
  if (ghost.scared || this.ghostMode === 'frightened') {
    const directions = ['U', 'D', 'L', 'R'];
    const randomDir = directions[Math.floor(Math.random() * 4)];
    ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
    return;
  }

  // Scatter Mode: Jeder Ghost geht zu seiner Ecke
  if (this.ghostMode === 'scatter') {
    const scatterTarget = this.getScatterTarget(ghost.type);
    targetX = scatterTarget.x;
    targetY = scatterTarget.y;
  } else {
    // Chase Mode: Individuelle Strategien
    switch (ghost.type) {
      case 'aggressive':
        // ROT: Verfolgt direkt
        targetX = this.pacman.x;
        targetY = this.pacman.y;
        break;

      case 'ambush':
        // ROSA: Zielt 4 Tiles vor Pac-Man
        switch (this.pacman.direction) {
          case 'U':
            targetY = this.pacman.y - 4 * this.CELL_SIZE;
            break;
          case 'D':
            targetY = this.pacman.y + 4 * this.CELL_SIZE;
            break;
          case 'L':
            targetX = this.pacman.x - 4 * this.CELL_SIZE;
            break;
          case 'R':
            targetX = this.pacman.x + 4 * this.CELL_SIZE;
            break;
        }
        break;

      case 'patrol':
        // CYAN: Feste Route entlang Waypoints
        const waypoint = this.patrolWaypoints[this.patrolIndex];
        targetX = waypoint.x;
        targetY = waypoint.y;
        // Nächster Waypoint wenn nah genug
        if (this.getDistance(ghost.x, ghost.y, waypoint.x, waypoint.y) < 8) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolWaypoints.length;
        }
        break;

      case 'random':
        // ORANGE: Zufällige Bewegung
        if (Math.random() < 0.02) {
          const dirs = ['U', 'D', 'L', 'R'];
          ghost.direction = dirs[Math.floor(Math.random() * 4)];
        }
        return;
    }
  }

  // Berechne beste Richtung zum Ziel
  ghost.direction = this.getDirectionToTarget(ghost, targetX, targetY);
  ghost.updateVelocity(this.CELL_SIZE);
}
```

### 4.6 Kollisionserkennung

```typescript
private collision(a: Block, b: Block): boolean {
  // AABB (Axis-Aligned Bounding Box) Kollision
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Verwendung in move():
for (const ghost of this.ghosts) {
  if (this.collision(ghost, this.pacman)) {
    if (ghost.scared) {
      // Ghost fressen
      this.score += 200;
      ghost.reset();
    } else {
      // Leben verlieren
      this.lives -= 1;
      this.gameState = 'dying';
    }
  }
}
```

### 4.7 Tile Map System

Das Labyrinth wird als String-Array definiert:

```typescript
private readonly tileMap: string[] = [
  "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // 0
  "X            XX            X",  // 1
  "X XXXX XXXXX XX XXXXX XXXX X",  // 2
  "XO XX  XXXXX XX XXXXX  XX OX",  // 3  (O = Power Pellet)
  "X XXXX XXXXX XX XXXXX XXXX X",  // 4
  "X                          X",  // 5
  // ... weitere Zeilen
  "     X XX XXX--XXX XX X     ",  // 12 (- = Ghost Door)
  "XXXXXX XX XGrGGGGX XX XXXXXX",  // 13 (r = Red Ghost)
  "T         XGbGpGoX         T",  // 14 (T = Tunnel, b/p/o = Ghosts)
  // ...
  "X            P             X",  // 23 (P = Pac-Man Start)
  // ...
];

// Zeichen-Bedeutung:
// X = Wand
// ' ' (Leerzeichen) = Pellet
// O = Power Pellet
// P = Pac-Man Startposition
// r/p/b/o = Ghost Startpositionen (red/pink/blue/orange)
// G = Ghost House Interior
// - = Ghost Door
// T = Tunnel (Wraparound)
```

**Map Laden:**
```typescript
private loadMap() {
  for (let row = 0; row < this.tileMap.length; row++) {
    for (let col = 0; col < this.tileMap[row].length; col++) {
      const char = this.tileMap[row][col];
      const x = col * this.CELL_SIZE;
      const y = row * this.CELL_SIZE;

      switch (char) {
        case 'X':
          this.walls.add(new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.wallImage));
          break;
          
        case ' ':
          // Kleines Pellet in der Mitte
          this.foods.add(new Block(
            x + this.CELL_SIZE/2 - 2, 
            y + this.CELL_SIZE/2 - 2, 
            4, 4, null
          ));
          break;
          
        case 'O':
          // Power Pellet
          this.powerPellets.add(new Block(
            x + this.CELL_SIZE/2 - 4,
            y + this.CELL_SIZE/2 - 4,
            8, 8, null
          ));
          break;
          
        case 'P':
          this.pacman = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.pacmanRightImage);
          break;
          
        case 'r':
          const redGhost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.redGhostImage);
          redGhost.type = 'aggressive';
          this.ghosts.add(redGhost);
          break;
          
        // ... weitere Cases
      }
    }
  }
  
  // Speichere Gesamtanzahl für Cherry-Spawn
  this.totalPellets = this.foods.size + this.powerPellets.size;
}
```

---

## 5. Routing & Navigation

### 5.1 Route Configuration

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { StartPageComponent } from './start-page/start-page.component';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';

export const routes: Routes = [
  { path: '', component: StartPageComponent },           // Startseite
  { path: 'game', component: GameCanvasComponent },      // Spielseite
  { path: '**', redirectTo: '' }                         // Fallback
];
```

### 5.2 Navigation mit Query Parameters

**Senden (Start Page):**
```html
<a [routerLink]="['/game']" [queryParams]="{mode: selectedMode}">
  Start Game
</a>
```

**Empfangen (Game Canvas):**
```typescript
import { ActivatedRoute } from '@angular/router';

export class GameCanvasComponent {
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit(): void {
    // Query Parameter lesen
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'] as GameMode;
      if (mode && ['classic', 'practice'].includes(mode)) {
        this.gameMode = mode;
        this.applyGameMode();
      }
    });
  }
  
  private applyGameMode(): void {
    switch (this.gameMode) {
      case 'classic':
        this.showGhostTargets = false;
        this.isInvincible = false;
        break;
        
      case 'practice':
        this.showGhostTargets = true;  // Debug-Feature
        this.isInvincible = false;
        break;
    }
  }
}
```

---

## 6. Styling & CSS

### 6.1 CSS Custom Properties (Variables)

```css
/* Definiere wiederverwendbare Werte */
:root {
  --primary-color: #FFD700;      /* Gold */
  --secondary-color: #FF6B6B;    /* Rot */
  --background-dark: #0a0a0a;
  --background-gradient: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  --card-bg: rgba(255, 255, 255, 0.05);
  --border-color: rgba(255, 255, 255, 0.1);
}

/* Verwendung */
.start-container {
  background: var(--background-gradient);
}

.mode-card {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
}
```

### 6.2 Flexbox Layout

```css
.start-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;  /* Vertikal stapeln */
  align-items: center;     /* Horizontal zentrieren */
  gap: 40px;               /* Abstand zwischen Elementen */
  padding: 40px 20px;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
```

### 6.3 Hover & Transition Effects

```css
.mode-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.mode-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 215, 0, 0.5);
  transform: translateY(-4px);  /* Schwebt nach oben */
}

.mode-card.selected {
  border-color: #FFD700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}
```

### 6.4 Animations

```css
/* Keyframe Animation */
@keyframes glow {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); 
  }
  50% { 
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); 
  }
}

.start-button {
  animation: glow 2s ease-in-out infinite;
}

/* Titel-Animation */
@keyframes titlePulse {
  0%, 100% { 
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
  50% { 
    text-shadow: 0 0 40px rgba(255, 215, 0, 1);
  }
}

.game-title {
  animation: titlePulse 3s ease-in-out infinite;
}
```

---

## 7. State Management

### 7.1 Component State

Für unser Spiel reicht einfaches Component State:

```typescript
export class GameCanvasComponent {
  // Spielzustand
  lives = 3;
  score = 0;
  currentLevel = 1;
  gameOver = false;
  
  // State Machine
  gameState: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete' = 'ready';
  stateTimer = 0;
  
  // Ghost Mode
  ghostMode: 'scatter' | 'chase' | 'frightened' = 'scatter';
  modeTimer = 0;
  modePhase = 0;
  
  // Scared Timer (Power Pellet Effekt)
  scaredTimer = 0;
  scaredDuration = 6000; // 6 Sekunden
}
```

### 7.2 State Machine Pattern

```typescript
private update() {
  const deltaTime = 1000 / this.FPS;

  // State Machine
  switch (this.gameState) {
    case 'ready':
      this.stateTimer += deltaTime;
      if (this.stateTimer >= 2000) {  // 2 Sekunden
        this.gameState = 'playing';
        this.stateTimer = 0;
      }
      return;  // Keine Bewegung

    case 'dying':
      this.stateTimer += deltaTime;
      if (this.stateTimer >= 1500) {  // 1.5 Sekunden
        if (this.lives <= 0) {
          this.gameState = 'gameover';
        } else {
          this.resetPositions();
          this.gameState = 'ready';
        }
        this.stateTimer = 0;
      }
      return;

    case 'levelcomplete':
      this.stateTimer += deltaTime;
      if (this.stateTimer >= 2000) {
        this.loadNextLevel();
      }
      return;

    case 'gameover':
      // Warte auf Tastendruck zum Neustarten
      return;

    case 'playing':
      // Normales Gameplay
      break;
  }

  // ... Rest des Updates
}
```

---

## 8. Best Practices

### 8.1 Memory Management

```typescript
ngOnDestroy(): void {
  // WICHTIG: Event Listener entfernen
  window.removeEventListener('keydown', this.onKeyDownBound);
  window.removeEventListener('keyup', this.onKeyUpBound);
  
  // Animation Frame canceln
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
  }
  
  // Audio stoppen
  this.audioService.stopBackgroundMusic();
}
```

### 8.2 TypeScript Types

```typescript
// Definiere eigene Types für bessere Lesbarkeit
export type GameMode = 'classic' | 'practice';
export type GameState = 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete';
export type GhostMode = 'scatter' | 'chase' | 'frightened';
export type Direction = 'U' | 'D' | 'L' | 'R';
export type GhostType = 'aggressive' | 'ambush' | 'patrol' | 'random';

// Verwendung
private gameMode: GameMode = 'classic';
private gameState: GameState = 'ready';
```

### 8.3 Constants

```typescript
// Konstanten in GROSSBUCHSTABEN
private readonly CELL_SIZE = 16;
private readonly GRID_WIDTH = 28;
private readonly GRID_HEIGHT = 31;
private readonly CANVAS_WIDTH = this.CELL_SIZE * this.GRID_WIDTH;   // 448
private readonly CANVAS_HEIGHT = this.CELL_SIZE * (this.GRID_HEIGHT + 4);  // 560
private readonly FPS = 30;
private readonly READY_DURATION = 2000;
private readonly DEATH_DURATION = 1500;
```

### 8.4 Separation of Concerns

```
Komponente          | Verantwortlichkeit
--------------------|------------------------------------
app.component       | Root, Router Outlet
start-page          | UI für Spielmodus-Auswahl
game-canvas         | Spiel-Rendering und Logik
Block (Model)       | Spielobjekt-Daten und Bewegung
AudioService        | Sound-Effekte und Musik
```

### 8.5 Event Binding Pattern

```typescript
// Bound Methode für Event Listener
private onKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);

ngAfterViewInit(): void {
  // Registrieren
  window.addEventListener('keydown', this.onKeyDownBound);
}

ngOnDestroy(): void {
  // Deregistrieren (verhindert Memory Leaks)
  window.removeEventListener('keydown', this.onKeyDownBound);
}
```

---

## Zusammenfassung

Diese Dokumentation erklärt die wichtigsten Konzepte:

1. **Angular Standalone Components** - Moderne Komponenten ohne NgModule
2. **Canvas Game Loop** - requestAnimationFrame für flüssige Animation
3. **State Machine** - Saubere Verwaltung von Spielzuständen
4. **Ghost AI** - Verschiedene Verhaltensweisen für Gegner
5. **Tile Map System** - Effiziente Labyrinth-Definition
6. **Routing** - Navigation mit Query Parameters
7. **CSS Animations** - Professionelle UI-Effekte
8. **Best Practices** - Memory Management, Types, Constants

Bei Fragen oder für weitere Details, schau dir den Quellcode an oder erweitere diese Dokumentation!
