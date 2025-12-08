import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { GameManager } from '../models/game-manager';
import { Block } from '../models/Block';
import { AudioService } from '../services/audio.service';
import { InputService } from '../services/input.service';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [HttpClientModule],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.css']
})
export class GameCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: false }) gameCanvas!: ElementRef<HTMLCanvasElement>;
  // Felder in der Klasse
  private gameLoopIntervalId?: number;
  private TICK_MS = 50; // 50ms -> 20 updates/sec

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private readonly FPS = 30;
  private onKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);
  // Assets
  private blueGhostImage = new Image();
  private orangeGhostImage = new Image();
  private pinkGhostImage = new Image();
  private redGhostImage = new Image();
  private pacmanUpImage = new Image();
  private pacmanDownImage = new Image();
  private pacmanLeftImage = new Image();
  private pacmanRightImage = new Image();
  private wallImage = new Image();
  private powerFoodImage = new Image();
  private scaredGhostImage = new Image();
  private cherryImage = new Image();

  // Game objects collections
  walls: Set<Block> = new Set<Block>();
  foods: Set<Block> = new Set<Block>();
  powerPellets: Set<Block> = new Set<Block>();
  ghosts: Set<Block> = new Set<Block>();
  pacman: Block | null = null;
  cherry: Block | null = null;

  // Buffered input for smoother corner turning
  private bufferedDirection: string | null = null;

  // Basic game state
  lives = 3;
  score = 0;
  gameOver = false;
  playerName = ''; // Player name for leaderboard
  gameMode: GameMode = 'classic'; // Make gameMode accessible in template
  scaredTimer = 0;
  scaredDuration = 10000; // 10 seconds in ms
  pelletStreak = 0;
  streakMultiplier = 1.0;
  currentLevel = 1;

  // Cherry System
  private cherrySpawnCooldown = 0;
  private totalPellets = 0; // Wird beim Laden der Map gesetzt

  // Ghost House Release Timer
  private ghostReleaseTimer = 0;
  private readonly GHOST_RELEASE_INTERVAL = 2000; // Release a ghost every 2 seconds
  private ghostsReleased = 0;

  // Scatter/Chase Mode (authentisches Pac-Man Verhalten)
  private ghostMode: 'scatter' | 'chase' | 'frightened' = 'scatter';
  private modeTimer = 0;
  private modePhase = 0; // Aktuelle Phase im Scatter/Chase Zyklus
  // Schwierigere Timings: Kürzere Scatter, längere Chase-Phasen
  private readonly modeDurations = [
    5000, 25000,  // Phase 0-1: 5s Scatter, 25s Chase
    4000, 25000,  // Phase 2-3: 4s Scatter, 25s Chase
    3000, 30000,  // Phase 4-5: 3s Scatter, 30s Chase
    2000, Infinity // Phase 6-7: 2s Scatter, dann permanent Chase
  ];

  // Pac-Man Animation
  private pacmanMouthAngle = 0.2; // Mund-Öffnung (0 = geschlossen, 0.5 = weit offen)
  private pacmanMouthDirection = 1; // 1 = öffnen, -1 = schließen
  private readonly MOUTH_SPEED = 0.08;

  // Power Pellet Blinken
  private powerPelletVisible = true;
  private powerPelletBlinkTimer = 0;

  // Ready/Game Over Screen
  private gameState: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete' = 'ready';
  private stateTimer = 0;
  private readonly READY_DURATION = 2000; // 2 Sekunden "READY!"
  private readonly DEATH_DURATION = 1500; // 1.5 Sekunden Todesanimation
  private readonly LEVELCOMPLETE_DURATION = 2000; // 2 Sekunden Level-Übergang

  // Level-Progression: Geschwindigkeit und Frighten-Dauer pro Level
  private getGhostSpeed(): number {
    const baseSpeed = this.CELL_SIZE / 4;
    // Höhere Grundgeschwindigkeit: +15% pro Level (statt 5%)
    const speedMultiplier = 1.1 + (this.currentLevel - 1) * 0.15;
    return Math.min(baseSpeed * speedMultiplier, baseSpeed * 2.0); // Max 200%
  }

  private getFrightenedDuration(): number {
    // Kürzere Frighten-Zeit: Start mit 6s (statt 10s), -1.5s pro Level
    const baseDuration = 6000;
    const reduction = (this.currentLevel - 1) * 1500;
    return Math.max(baseDuration - reduction, 1000); // Minimum 1 Sekunde
  }

  // CYAN (Inky) Patrol-Route: Feste Waypoints entlang der Korridore
  private patrolWaypoints: { x: number; y: number }[] = [];
  private patrolIndex = 0;

  private initPatrolRoute() {
    // Definiere Patrol-Route als Rechteck um das Spielfeld
    // Inky patrouilliert entlang der äußeren Korridore
    this.patrolWaypoints = [
      { x: 1 * this.CELL_SIZE, y: 5 * this.CELL_SIZE },      // Links oben
      { x: 1 * this.CELL_SIZE, y: 23 * this.CELL_SIZE },     // Links unten
      { x: 26 * this.CELL_SIZE, y: 23 * this.CELL_SIZE },    // Rechts unten
      { x: 26 * this.CELL_SIZE, y: 5 * this.CELL_SIZE },     // Rechts oben
      { x: 13 * this.CELL_SIZE, y: 5 * this.CELL_SIZE },     // Mitte oben
      { x: 13 * this.CELL_SIZE, y: 20 * this.CELL_SIZE },    // Mitte unten
    ];
  }
  private draw(ctx: CanvasRenderingContext2D) {
    // Wände zeichnen (optimiert sans shadow)
    this.walls.forEach(wall => {
      if (wall.type === 'ghost-door') {
        // Ghost Door als pinke Linie
        ctx.fillStyle = '#FFB8FF';
        ctx.fillRect(wall.x, wall.y + wall.height / 2 - 2, wall.width, 4);
      } else if (wall.image && wall.image.complete) {
        // Walls drawing
        ctx.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
      } else {
        // Fallback: Blaue Wände mit 3D-Effekt
        ctx.fillStyle = '#2121DE';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        // Inner highlight für 3D-Effekt
        ctx.fillStyle = '#4A4AFF';
        ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);
      }
    });

    // Foods zeichnen (weiße Punkte - Produktionsaufträge)
    ctx.fillStyle = 'white';
    this.foods.forEach(food => {
      ctx.beginPath();
      ctx.arc(food.x + 2, food.y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Power Pellets zeichnen (blinkend)
    if (this.powerPelletVisible) {
      ctx.fillStyle = '#FFD700';
      this.powerPellets.forEach(pellet => {
        ctx.beginPath();
        ctx.arc(pellet.x + pellet.width / 2, pellet.y + pellet.height / 2, pellet.width / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Cherry zeichnen
    if (this.cherry && this.cherry.image && this.cherry.image.complete) {
      ctx.drawImage(this.cherry.image, this.cherry.x, this.cherry.y, this.cherry.width, this.cherry.height);
    }

    // Pac-Man mit Mundanimation zeichnen
    if (this.pacman && this.gameState !== 'dying') {
      this.drawPacman(ctx);
    } else if (this.pacman && this.gameState === 'dying') {
      this.drawDyingPacman(ctx);
    }

    // Geister zeichnen
    this.ghosts.forEach(ghost => {
      this.drawGhost(ctx, ghost);
    });

    // Ghost-Ziele (Learn/Practice Mode)
    this.drawGhostTargets(ctx);

    // UI Overlay
    this.drawUI(ctx);
  }

  private drawPacman(ctx: CanvasRenderingContext2D) {
    if (!this.pacman) return;

    const centerX = this.pacman.x + this.pacman.width / 2;
    const centerY = this.pacman.y + this.pacman.height / 2;
    const radius = this.pacman.width / 2 - 1;

    // Berechne Rotation basierend auf Richtung
    let rotation = 0;
    if (this.pacman.direction === 'R') rotation = 0;
    else if (this.pacman.direction === 'D') rotation = Math.PI / 2;
    else if (this.pacman.direction === 'L') rotation = Math.PI;
    else if (this.pacman.direction === 'U') rotation = -Math.PI / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Pac-Man Körper (gelb)
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(0, 0, radius, this.pacmanMouthAngle, Math.PI * 2 - this.pacmanMouthAngle);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawDyingPacman(ctx: CanvasRenderingContext2D) {
    if (!this.pacman) return;

    const centerX = this.pacman.x + this.pacman.width / 2;
    const centerY = this.pacman.y + this.pacman.height / 2;
    const radius = this.pacman.width / 2 - 1;

    // Todesanimation: Pac-Man "schrumpft" von oben
    const progress = this.stateTimer / this.DEATH_DURATION;
    const startAngle = -Math.PI / 2 + progress * Math.PI;
    const endAngle = -Math.PI / 2 - progress * Math.PI + Math.PI * 2;

    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    if (progress < 1) {
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGhost(ctx: CanvasRenderingContext2D, ghost: Block) {
    const x = ghost.x;
    const y = ghost.y;
    const size = ghost.width;

    // Farbe basierend auf Status
    let color = '#FF0000';
    if (ghost.scared) {
      // Blinken wenn Frightened fast vorbei
      if (this.scaredTimer < 2000 && Math.floor(this.scaredTimer / 200) % 2 === 0) {
        color = '#FFFFFF';
      } else {
        color = '#2121FF';
      }
    } else {
      switch (ghost.type) {
        case 'aggressive': color = '#FF0000'; break; // Rot - AGGRESSIVE
        case 'ambush': color = '#FFB8FF'; break;     // Pink - AMBUSH
        case 'patrol': color = '#00FFFF'; break;     // Cyan - PATROL
        case 'random': color = '#FFB852'; break;     // Orange - RANDOM
      }
    }

    // Ghost Körper
    ctx.fillStyle = color;
    ctx.beginPath();
    // Oberer Halbkreis
    ctx.arc(x + size / 2, y + size / 2, size / 2, Math.PI, 0);
    // Unterer Teil mit Wellen
    ctx.lineTo(x + size, y + size);
    const waveCount = 3;
    const waveWidth = size / waveCount;
    for (let i = waveCount; i > 0; i--) {
      ctx.quadraticCurveTo(
        x + (i - 0.5) * waveWidth, y + size - 4,
        x + (i - 1) * waveWidth, y + size
      );
    }
    ctx.closePath();
    ctx.fill();

    // Augen (wenn nicht scared)
    if (!ghost.scared) {
      // Weiße Augäpfel
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.3, y + size * 0.4, size * 0.15, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.7, y + size * 0.4, size * 0.15, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupillen (zeigen in Bewegungsrichtung)
      ctx.fillStyle = '#2121DE';
      let pupilOffsetX = 0, pupilOffsetY = 0;
      if (ghost.direction === 'L') pupilOffsetX = -2;
      else if (ghost.direction === 'R') pupilOffsetX = 2;
      else if (ghost.direction === 'U') pupilOffsetY = -2;
      else if (ghost.direction === 'D') pupilOffsetY = 2;

      ctx.beginPath();
      ctx.arc(x + size * 0.3 + pupilOffsetX, y + size * 0.4 + pupilOffsetY, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.7 + pupilOffsetX, y + size * 0.4 + pupilOffsetY, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Scared Face
      ctx.fillStyle = 'white';
      // Augen
      ctx.beginPath();
      ctx.arc(x + size * 0.35, y + size * 0.4, 3, 0, Math.PI * 2);
      ctx.arc(x + size * 0.65, y + size * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
      // Zickzack Mund
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, y + size * 0.7);
      for (let i = 1; i <= 4; i++) {
        ctx.lineTo(x + size * (0.2 + i * 0.15), y + size * (i % 2 === 0 ? 0.7 : 0.6));
      }
      ctx.stroke();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Score oben (avec padding pour éviter overlap)
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 10, 35);
    ctx.fillText(`LEVEL: ${this.currentLevel}`, this.CANVAS_WIDTH / 2 - 50, 35);

    // High Score anzeigen
    ctx.textAlign = 'right';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`HI: ${this.getHighScore()}`, this.CANVAS_WIDTH - 10, 35);

    // Practice Mode Status-Anzeige
    if (this.gameMode === 'practice') {
      ctx.font = '10px monospace';
      let statusY = 52;
      if (this.isInvincible) {
        ctx.fillStyle = '#00FF00';
        ctx.fillText('🛡️ INVINCIBLE', this.CANVAS_WIDTH - 10, statusY);
        statusY += 12;
      }
      if (this.turboSpeed) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('⚡ TURBO', this.CANVAS_WIDTH - 10, statusY);
        statusY += 12;
      }
      if (this.slowMotion < 1.0) {
        ctx.fillStyle = '#FF69B4';
        ctx.fillText(`🐌 ${this.slowMotion}x`, this.CANVAS_WIDTH - 10, statusY);
      }
    }
    ctx.textAlign = 'left';

    // Lives unten links
    for (let i = 0; i < this.lives; i++) {
      this.drawPacmanIcon(ctx, 20 + i * 25, this.CANVAS_HEIGHT - 15);
    }

    // Ghost Mode Indicator (Debug oder Learn Mode)
    if (this.debugMode || this.showGhostTargets) {
      ctx.font = '12px monospace';
      ctx.fillStyle = this.ghostMode === 'scatter' ? '#00FF00' : '#FF0000';
      ctx.fillText(`Mode: ${this.ghostMode}`, 10, 35);
    }

    // Ready Screen
    if (this.gameState === 'ready') {
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#FFFF00';
      ctx.textAlign = 'center';
      ctx.fillText('READY!', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);

      // Zeige Modus-Info
      ctx.font = '12px monospace';
      const modeColor = this.gameMode === 'classic' ? '#FFFFFF' : '#00FF88';
      const modeText = this.gameMode.toUpperCase();
      ctx.fillStyle = modeColor;
      ctx.fillText(`[${modeText}]`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 25);
    }

    // Game Over Screen
    if (this.gameState === 'gameover') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(50, 50, this.CANVAS_WIDTH - 100, this.CANVAS_HEIGHT - 100);
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, this.CANVAS_WIDTH - 100, this.CANVAS_HEIGHT - 100);

      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#FF0000';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.CANVAS_WIDTH / 2, 100);

      ctx.font = '14px monospace';
      ctx.fillStyle = 'white';
      ctx.fillText(`Final Score: ${this.score}`, this.CANVAS_WIDTH / 2, 130);

      // Leaderboard zeichnen
      if (this.leaderboard && this.leaderboard.length > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText('TOP SCORES', this.CANVAS_WIDTH / 2, 170);

        ctx.textAlign = 'left';
        ctx.font = '12px monospace';
        let yPos = 200;
        this.leaderboard.slice(0, 5).forEach((entry, index) => {
          const rank = index + 1;
          const name = (entry.username || 'Anonymous').substring(0, 10).padEnd(10, ' ');
          const points = (entry.points || 0).toString().padStart(6, '0');

          ctx.fillStyle = entry.username === this.playerName ? '#00FF00' : '#FFFFFF';
          ctx.fillText(`${rank}. ${name}  ${points}`, this.CANVAS_WIDTH / 2 - 100, yPos);
          yPos += 25;
        });
        ctx.textAlign = 'center';
      } else {
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '12px monospace';
        ctx.fillText('No highscores yet...', this.CANVAS_WIDTH / 2, 200);
        ctx.font = '10px monospace';
        ctx.fillText('(Backend may not be running)', this.CANVAS_WIDTH / 2, 220);
      }

      ctx.fillStyle = '#FFFF00';
      ctx.fillText('Press any key to restart', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT - 80);
    }

    // Level Complete Screen
    if (this.gameState === 'levelcomplete') {
      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.fillStyle = '#00FF00';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${this.currentLevel - 1} COMPLETE!`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
    }
  }

  // Zeichnet Ghost-Ziele (Learn/Practice Mode)
  private drawGhostTargets(ctx: CanvasRenderingContext2D) {
    if (!this.showGhostTargets || !this.pacman) return;

    this.ghosts.forEach(ghost => {
      let targetX = 0, targetY = 0;
      let color = '#FF0000';

      // Berechne Ziel basierend auf Ghost-Typ
      switch (ghost.type) {
        case 'aggressive':
          targetX = this.pacman!.x;
          targetY = this.pacman!.y;
          color = 'rgba(255, 0, 0, 0.5)';
          break;
        case 'ambush':
          if (this.pacman!.direction === 'U') {
            targetX = this.pacman!.x;
            targetY = this.pacman!.y - 4 * this.CELL_SIZE;
          } else if (this.pacman!.direction === 'D') {
            targetX = this.pacman!.x;
            targetY = this.pacman!.y + 4 * this.CELL_SIZE;
          } else if (this.pacman!.direction === 'L') {
            targetX = this.pacman!.x - 4 * this.CELL_SIZE;
            targetY = this.pacman!.y;
          } else {
            targetX = this.pacman!.x + 4 * this.CELL_SIZE;
            targetY = this.pacman!.y;
          }
          color = 'rgba(255,184,255,0.5)';
          break;
        case 'patrol':
          if (this.patrolWaypoints.length > 0) {
            const wp = this.patrolWaypoints[this.patrolIndex];
            targetX = wp.x;
            targetY = wp.y;
          }
          color = 'rgba(0, 255, 255, 0.5)';
          break;
        case 'random':
          color = 'rgba(255, 184, 82, 0.3)';
          targetX = ghost.x;
          targetY = ghost.y;
          break;
      }

      // Zeichne Ziel-Quadrat
      ctx.fillStyle = color;
      ctx.fillRect(targetX, targetY, this.CELL_SIZE, this.CELL_SIZE);

      // Zeichne Linie vom Ghost zum Ziel
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2);
      ctx.lineTo(targetX + this.CELL_SIZE / 2, targetY + this.CELL_SIZE / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  private drawPacmanIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0.2, Math.PI * 2 - 0.2);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }  //Grid-System(wie klassiches Pac-Man: 28x31 Felder)
  readonly GRID_WIDTH = 28;
  readonly GRID_HEIGHT = 31;
  readonly CELL_SIZE = 20; // Pixel pro Feld
  // Canvas-Dimensionen
  readonly CANVAS_WIDTH = this.GRID_WIDTH * this.CELL_SIZE;  // 560px
  readonly CANVAS_HEIGHT = this.GRID_HEIGHT * this.CELL_SIZE; // 620px
  // Game Manager
  private game: GameManager | null = null;

  // Modi-spezifische Einstellungen
  showGhostTargets = false;  // Learn Mode: Zeige Sensor-Ziele
  isInvincible = false;      // Practice Mode: Unverwundbarkeit
  slowMotion = 1.0;          // Practice Mode: Zeitlupe (1.0 = normal)
  turboSpeed = false;        // Turbo Mode: 2x Geschwindigkeit

  // Debug-Modus
  debugMode = false;

  // Practice Mode: Zeit-Rückspulung
  private gameHistory: Array<{
    pacmanX: number;
    pacmanY: number;
    ghostPositions: Array<{x: number; y: number}>;
    score: number;
  }> = [];
  private isRewinding = false;
  private readonly MAX_HISTORY = 300; // ~10 Sekunden bei 30 FPS

  // Leaderboard
  leaderboard: any[] = [];

  // Get high score from leaderboard
  private getHighScore(): number {
    if (this.leaderboard.length === 0) return 0;
    return Math.max(...this.leaderboard.map(entry => entry.points));
  }

  constructor(
    private audioService: AudioService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private inputService: InputService
  ) {
    this.initAssets();
  }

  // Wendet Spielmodus-spezifische Einstellungen an
  private applyGameMode(): void {
    console.log(`🎮 Spielmodus: ${this.gameMode}`);

    switch (this.gameMode) {
      case 'classic':
        // Standard-Einstellungen
        this.showGhostTargets = false;
        this.isInvincible = false;
        this.turboSpeed = false;
        break;

      case 'practice':
        // Trainings-Modus: Sensor-Ziele standardmäßig sichtbar
        this.showGhostTargets = true;  // Standardmäßig AN im Training
        this.isInvincible = false;     // Kann mit 'I' umgeschaltet werden
        this.turboSpeed = false;       // Kann mit 'O' umgeschaltet werden
        break;
    }
  }  private initAssets() {
    this.blueGhostImage.src = 'assets/blueGhost.png';
    this.orangeGhostImage.src = 'assets/orangeGhost.png';
    this.pinkGhostImage.src = 'assets/pinkGhost.png';
    this.redGhostImage.src = 'assets/redGhost.png';
    this.pacmanUpImage.src = 'assets/pacmanUp.png';
    this.pacmanDownImage.src = 'assets/pacmanDown.png';
    this.pacmanLeftImage.src = 'assets/pacmanLeft.png';
    this.pacmanRightImage.src = 'assets/pacmanRight.png';
    this.wallImage.src = 'assets/wall.png';
    this.powerFoodImage.src = 'assets/powerFood.png';
    this.scaredGhostImage.src = 'assets/scaredGhost.png';
    this.cherryImage.src = 'assets/cherry.png';
  }
  // Klassisches Pac-Man 28x31 Labyrinth (authentisches Arcade-Layout)
  // X = Wall, ' ' = Pellet, O = Power Pellet, - = Ghost House Door
  // P = Pac-Man Start, r/p/b/o = Ghosts (red/pink/blue/orange)
  // T = Tunnel (Wraparound), G = Ghost House Interior (no pellet)
  private readonly tileMap: string[] = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // 0
    "X            XX            X",  // 1
    "X XXXX XXXXX XX XXXXX XXXX X",  // 2
    "XO     XXXXX XX XXXXX  XX OX",  // 3
    "X XXXX XXXXX XX XXXXX XXXX X",  // 4
    "X                          X",  // 5
    "X XXXX XX XXXXXXXX XX XXXX X",  // 6
    "X XXXX XX XXXXXXXX XX XXXX X",  // 7
    "X      XX    XX    XX      X",  // 8
    "XXXXXX XXXXX XX XXXXX XXXXXX",  // 9
    "X    X XXXXX XX XXXXX X    X",  // 10
    "X    X XX          XX X    X",  // 11
    "X    X XX XXX--XXX XX X    X",  // 12
    "XXXXXX XX XGrGGGGX XX XXXXXX",  // 13 - Ghost house with red ghost
    "T         XGbGpGoX         T",  // 14 - Tunnel + ghosts
    "XXXXXX XX XGGGGGGX XX XXXXXX",  // 15
    "X    X XX XXXXXXXX XX X    X",  // 16
    "X    X XX          XX X    X",  // 17
    "X    X XX XXXXXXXX XX X    X",  // 18
    "XXXXXX XX XXXXXXXX XX XXXXXX",  // 19
    "X            XX            X",  // 20
    "X XXXX XXXXX XX XXXXX XXXX X",  // 21
    "X XXXX XXXXX XX XXXXX XXXX X",  // 22
    "XO  XX       P        XX  OX",  // 23 - Pac-Man start
    "XXX XX XX XXXXXXXX XX XX XXX",  // 24
    "XXX XX XX XXXXXXXX XX XX XXX",  // 25
    "X      XX    XX    XX      X",  // 26
    "X XXXXXXXXXX XX XXXXXXXXXX X",  // 27
    "X XXXXXXXXXX XX XXXXXXXXXX X",  // 28
    "X                          X",  // 29
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // 30
  ];
  private loadMap() {
    for (let r = 0; r < this.tileMap.length; r++) {
      const row = this.tileMap[r];
      for (let c = 0; c < row.length; c++) {
        const tileMapChar = row[c];
        const x = c * this.CELL_SIZE;
        const y = r * this.CELL_SIZE;

        if (tileMapChar === 'X') {
          this.walls.add(new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.wallImage));
        } else if (tileMapChar === '-') {
          // Ghost House Door - wird wie Wand behandelt, aber Geister können durch
          const door = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.wallImage);
          door.type = 'ghost-door';
          this.walls.add(door);
        } else if (tileMapChar === 'b') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.blueGhostImage);
          ghost.type = 'patrol'; // Cyan/Blue - PATROL: Feste Route entlang Korridoren
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'o') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.orangeGhostImage);
          ghost.type = 'random'; // Orange - RANDOM: Zufällige Bewegung
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'p') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.pinkGhostImage);
          ghost.type = 'ambush'; // Pink - AMBUSH: Lauert voraus
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'r') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.redGhostImage);
          ghost.type = 'aggressive'; // Red - AGGRESSIVE: Verfolgt direkt
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'P') {
          this.pacman = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.pacmanRightImage);
        } else if (tileMapChar === ' ') {
          // kleines Pellet in der Mitte der Zelle - Produktionsauftrag
          this.foods.add(new Block(x + this.CELL_SIZE / 2 - 2, y + this.CELL_SIZE / 2 - 2, 4, 4, null));
        } else if (tileMapChar === 'O') {
          // Power Pellet - KI-Optimierung
          const powerPellet = new Block(x + this.CELL_SIZE / 2 - 4, y + this.CELL_SIZE / 2 - 4, 8, 8, null);
          this.powerPellets.add(powerPellet);
        } else if (tileMapChar === 'T') {
          // Tunnel - kein Pellet, aber passierbar (Wraparound)
          // Nichts hinzufügen - bleibt leer
        } else if (tileMapChar === 'G') {
          // Ghost House Interior - kein Pellet
          // Nichts hinzufügen - bleibt leer
        }
      }
    }
    // Speichere Gesamtanzahl der Pellets für Cherry-Spawn
    this.totalPellets = this.foods.size + this.powerPellets.size;
  }
  ngOnInit(): void{
    console.log('🎮 GameCanvasComponent initialized');

    // Lese Spielmodus und Spielername aus Query-Parametern
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'] as GameMode;
      if (mode && ['classic', 'practice'].includes(mode)) {
        this.gameMode = mode;
        this.applyGameMode();
      }

      // Lese Spielername
      const playerName = params['playerName'] as string;
      if (playerName) {
        this.playerName = playerName;
        console.log(`👤 Player: ${this.playerName}`);
      }
    });

    this.game = new GameManager(this.GRID_WIDTH, this.GRID_HEIGHT);
    if (this.game.maze) {
      console.log('🏭 Game created:', this.game.maze.countRemainingDots(), 'dots');
    }

    // Initialisiere Patrol-Route für CYAN Sensor
    this.initPatrolRoute();

    this.loadMap();

    // Initialize ghost directions
    const directions = ['U', 'D', 'L', 'R'];
    for (const ghost of this.ghosts) {
      const randomDir = directions[Math.floor(Math.random() * 4)];
      ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
    }

    // Start mit Ready-Screen
    this.gameState = 'ready';
    this.stateTimer = 0;
    this.scaredDuration = this.getFrightenedDuration();
  }

  private onKeyUpBound = (e: KeyboardEvent) => this.onKeyUp(e);

  ngAfterViewInit(): void {
    const canvasEl = this.gameCanvas.nativeElement;
    canvasEl.width = this.CANVAS_WIDTH;
    canvasEl.height = this.CANVAS_HEIGHT;
    const context = canvasEl.getContext('2d');
    if (!context) {
      console.error('❌ Could not get 2D context');
      return;
    }
    this.ctx = context;

    // Register keyboard input
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);

    this.startGameLoop();
  }
  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
  }

  private startGameLoop() {
    this.audioService.playBackgroundMusic();
    const loop = (timestamp: number) => {
      const delta = timestamp - this.lastFrameTime;
      if (delta > 1000 / this.FPS) { // target FPS
        this.lastFrameTime = timestamp;
        this.update();
        this.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private update() {
    const deltaTime = 1000 / this.FPS;

    // Gamepad Input
    const gpDir = this.inputService.getDirection();
    if (gpDir && this.pacman && this.gameState === 'playing') {
      this.bufferedDirection = gpDir; // Buffer the direction
    }

    // Try to apply buffered direction first for smoother cornering
    if (this.bufferedDirection && this.pacman && this.gameState === 'playing') {
      const canTurn = this.canChangeTo(this.bufferedDirection);
      if (canTurn) {
        this.pacman.updateDirection(this.bufferedDirection, this.CELL_SIZE, this.walls);
        // Update image
        if (this.bufferedDirection === 'U') this.pacman.image = this.pacmanUpImage;
        else if (this.bufferedDirection === 'D') this.pacman.image = this.pacmanDownImage;
        else if (this.bufferedDirection === 'L') this.pacman.image = this.pacmanLeftImage;
        else if (this.bufferedDirection === 'R') this.pacman.image = this.pacmanRightImage;
        this.bufferedDirection = null; // Clear buffer after successful turn
      }
    }

    // Gamepad Restart
    if (this.gameState === 'gameover' && this.inputService.isActionButtonPressed()) {
       this.restartGame();
    }

    // State Machine
    switch (this.gameState) {
      case 'ready':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.READY_DURATION) {
          this.gameState = 'playing';
          this.stateTimer = 0;
        }
        return; // Keine Bewegung während Ready

      case 'dying':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.DEATH_DURATION) {
          if (this.lives <= 0) {
            this.gameState = 'gameover';
            this.gameOver = true;
            // Load leaderboard immediately
            this.loadLeaderboard();
            // Submit final score to backend
            this.submitScore();
            this.stopGameLoop();
          } else {
            this.resetPositions();
            this.gameState = 'ready';
            this.stateTimer = 0;
          }
        }
        return;

      case 'levelcomplete':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.LEVELCOMPLETE_DURATION) {
          this.loadNextLevel();
        }
        return;

      case 'gameover':
        return; // Warte auf Tastendruck

      case 'playing':
        break; // Weiter mit normalem Update
    }

    // Pac-Man Mundanimation
    this.pacmanMouthAngle += this.MOUTH_SPEED * this.pacmanMouthDirection;
    if (this.pacmanMouthAngle >= 0.5) {
      this.pacmanMouthDirection = -1;
    } else if (this.pacmanMouthAngle <= 0.05) {
      this.pacmanMouthDirection = 1;
    }

    // Power Pellet Blinken
    this.powerPelletBlinkTimer += deltaTime;
    if (this.powerPelletBlinkTimer >= 200) {
      this.powerPelletVisible = !this.powerPelletVisible;
      this.powerPelletBlinkTimer = 0;
    }

    // Scatter/Chase Mode Timer (nur wenn nicht frightened)
    if (this.scaredTimer <= 0) {
      this.modeTimer += deltaTime;
      const currentModeDuration = this.modeDurations[this.modePhase];
      if (this.modeTimer >= currentModeDuration && currentModeDuration !== Infinity) {
        this.modeTimer = 0;
        this.modePhase = Math.min(this.modePhase + 1, this.modeDurations.length - 1);
        this.ghostMode = this.modePhase % 2 === 0 ? 'scatter' : 'chase';
        // Geister drehen um 180° bei Moduswechsel
        this.reverseGhostDirections();
      }
    }

    this.move();

    // Update scared timer
    if (this.scaredTimer > 0) {
      this.scaredTimer -= deltaTime;
      this.ghostMode = 'frightened';
      if (this.scaredTimer <= 0) {
        this.ghostMode = this.modePhase % 2 === 0 ? 'scatter' : 'chase';
        this.ghosts.forEach(g => {
          g.scared = false;
          g.updateVelocity(this.CELL_SIZE);
        });
      }
    }

    // Ghost Release Timer - Force ghosts out of box faster
    this.ghostReleaseTimer += deltaTime;
    if (this.ghostReleaseTimer >= this.GHOST_RELEASE_INTERVAL && this.ghostsReleased < this.ghosts.size) {
      this.ghostReleaseTimer = 0;
      this.ghostsReleased++;
      let count = 0;
      for (const ghost of this.ghosts) {
        count++;
        if (count === this.ghostsReleased) {
          // Force ghost out if still in house (center area around y=350-380)
          if (ghost.y > 340 && ghost.y < 400 && ghost.x > 200 && ghost.x < 360) {
            ghost.updateDirection('U', this.CELL_SIZE, this.walls);
          }
          break;
        }
      }
    }
  }

  private reverseGhostDirections() {
    const opposites: { [key: string]: string } = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L' };
    this.ghosts.forEach(ghost => {
      const opposite = opposites[ghost.direction];
      if (opposite) {
        ghost.updateDirection(opposite, this.CELL_SIZE, this.walls);
      }
    });
  }

  // Check if Pac-Man can turn to a new direction (for buffered input)
  private canChangeTo(newDirection: string): boolean {
    if (!this.pacman) return false;

    const testX = this.pacman.x;
    const testY = this.pacman.y;
    const speed = this.CELL_SIZE / 4;

    let nextX = testX;
    let nextY = testY;

    if (newDirection === 'U') nextY -= speed;
    else if (newDirection === 'D') nextY += speed;
    else if (newDirection === 'L') nextX -= speed;
    else if (newDirection === 'R') nextX += speed;

    // Check if next position would collide with wall
    for (const wall of this.walls) {
      if (wall.type === 'ghost-door') continue;
      if (nextX < wall.x + wall.width &&
          nextX + this.pacman.width > wall.x &&
          nextY < wall.y + wall.height &&
          nextY + this.pacman.height > wall.y) {
        return false;
      }
    }
    return true;
  }

  private loadNextLevel() {
    this.walls.clear();
    this.foods.clear();
    this.powerPellets.clear();
    this.ghosts.clear();
    this.cherry = null;
    this.loadMap();
    this.resetPositions();
    this.modePhase = 0;
    this.modeTimer = 0;
    this.ghostMode = 'scatter';
    this.scaredDuration = this.getFrightenedDuration();
    this.gameState = 'ready';
    this.stateTimer = 0;
  }  private render() {
    if (!this.ctx) return;
    // Fill with black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    this.draw(this.ctx);
  }

  private stopGameLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
      this.lastFrameTime = 0;
    }
    this.audioService.stopBackgroundMusic();
  }

  private collision(a: Block, b: Block): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  // Tunnel-Wraparound: Teleportiert Entity zur anderen Seite
  private handleTunnelWraparound(entity: Block) {
    // Linke Seite -> Rechte Seite
    if (entity.x < -this.CELL_SIZE) {
      entity.x = this.CANVAS_WIDTH;
    }
    // Rechte Seite -> Linke Seite
    if (entity.x > this.CANVAS_WIDTH) {
      entity.x = -this.CELL_SIZE;
    }
  }

  // Berechnet Distanz zwischen zwei Punkten
  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // Ghost-AI: Berechnet die beste Richtung zum Ziel
  private getDirectionToTarget(ghost: Block, targetX: number, targetY: number): string {
    const directions = ['U', 'D', 'L', 'R'];
    const velocities: { [key: string]: { vx: number; vy: number } } = {
      'U': { vx: 0, vy: -this.CELL_SIZE / 4 },
      'D': { vx: 0, vy: this.CELL_SIZE / 4 },
      'L': { vx: -this.CELL_SIZE / 4, vy: 0 },
      'R': { vx: this.CELL_SIZE / 4, vy: 0 }
    };

    // Finde mögliche Richtungen (keine 180°-Wendung, keine Wand-Kollision)
    const opposites: { [key: string]: string } = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L' };
    const possibleDirs = directions.filter(dir => {
      // Keine 180°-Wendung
      if (dir === opposites[ghost.direction]) return false;

      // Prüfe Wand-Kollision
      const testX = ghost.x + velocities[dir].vx * 4;
      const testY = ghost.y + velocities[dir].vy * 4;
      for (const wall of this.walls) {
        if (wall.type === 'ghost-door') continue; // Geister können durch die Tür
        if (testX < wall.x + wall.width && testX + ghost.width > wall.x &&
            testY < wall.y + wall.height && testY + ghost.height > wall.y) {
          return false;
        }
      }
      return true;
    });

    if (possibleDirs.length === 0) return ghost.direction;
    if (possibleDirs.length === 1) return possibleDirs[0];

    // Wähle Richtung die am nächsten zum Ziel führt
    let bestDir = possibleDirs[0];
    let bestDist = Infinity;
    for (const dir of possibleDirs) {
      const newX = ghost.x + velocities[dir].vx * 4;
      const newY = ghost.y + velocities[dir].vy * 4;
      const dist = this.getDistance(newX, newY, targetX, targetY);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
    return bestDir;
  }  // Scatter-Ecken für jeden Sensor-Typ
  private getScatterTarget(ghostType: string): { x: number; y: number } {
    switch (ghostType) {
      case 'aggressive': return { x: this.CANVAS_WIDTH - this.CELL_SIZE, y: 0 }; // Oben rechts
      case 'ambush': return { x: this.CELL_SIZE, y: 0 }; // Oben links
      case 'patrol': return { x: this.CANVAS_WIDTH - this.CELL_SIZE, y: this.CANVAS_HEIGHT }; // Unten rechts
      case 'random': return { x: this.CELL_SIZE, y: this.CANVAS_HEIGHT }; // Unten links
      default: return { x: 0, y: 0 };
    }
  }

  // Sensor-KI basierend auf Industrial-Thema
  // ROT = AGGRESSIVE (verfolgt direkt)
  // ROSA = AMBUSH (lauert voraus)
  // CYAN = PATROL (feste Route entlang Korridoren)
  // ORANGE = RANDOM (zufällige Bewegung)
  private updateGhostAI(ghost: Block) {
    if (!this.pacman) return;

    // Check if ghost is inside the ghost house (Box)
    // House area approx: X [10..17]*CELL_SIZE, Y [12..16]*CELL_SIZE
    const gridX = Math.floor(ghost.x / this.CELL_SIZE);
    const gridY = Math.floor(ghost.y / this.CELL_SIZE);

    // Ghost House Interior is roughly rows 13-15, cols 11-16
    // Include row 12 (Door) to prevent oscillation when exiting
    const inGhostHouse = (gridY >= 12 && gridY <= 15 && gridX >= 11 && gridX <= 16);

    let targetX = this.pacman.x;
    let targetY = this.pacman.y;

    if (inGhostHouse) {
      // Force target to be outside the door (Row 11, Col 13.5) to exit the box
      targetX = 13.5 * this.CELL_SIZE;
      targetY = 11 * this.CELL_SIZE;
    } else {
      // Frightened Mode: Zufällige Richtung bei Kreuzungen
      if (ghost.scared || this.ghostMode === 'frightened') {
        const directions = ['U', 'D', 'L', 'R'];
        const randomDir = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
        return;
      }

      // Scatter Mode: Jeder Sensor geht zu seiner Ecke
      if (this.ghostMode === 'scatter') {
        const scatterTarget = this.getScatterTarget(ghost.type);
        targetX = scatterTarget.x;
        targetY = scatterTarget.y;
      } else {
        // Chase Mode: Individuelle Jagdstrategien gemäß Skizze
        switch (ghost.type) {
          case 'aggressive': // ROT - Verfolgt direkt den AGV
            targetX = this.pacman.x;
            targetY = this.pacman.y;
            break;

          case 'ambush': // ROSA - Lauert voraus (4 Tiles vor Pac-Man)
            if (this.pacman.direction === 'U') {
              targetX = this.pacman.x;
              targetY = this.pacman.y - 4 * this.CELL_SIZE;
            } else if (this.pacman.direction === 'D') {
              targetX = this.pacman.x;
              targetY = this.pacman.y + 4 * this.CELL_SIZE;
            } else if (this.pacman.direction === 'L') {
              targetX = this.pacman.x - 4 * this.CELL_SIZE;
              targetY = this.pacman.y;
            } else {
              targetX = this.pacman.x + 4 * this.CELL_SIZE;
              targetY = this.pacman.y;
            }
            break;

          case 'patrol': // CYAN - Feste Route entlang Korridoren
            // Folgt Waypoints in einer festen Patrol-Route
            if (this.patrolWaypoints.length > 0) {
              const waypoint = this.patrolWaypoints[this.patrolIndex];
              targetX = waypoint.x;
              targetY = waypoint.y;

              // Wenn Waypoint erreicht, zum nächsten wechseln
              const distToWaypoint = this.getDistance(ghost.x, ghost.y, waypoint.x, waypoint.y);
              if (distToWaypoint < this.CELL_SIZE) {
                this.patrolIndex = (this.patrolIndex + 1) % this.patrolWaypoints.length;
              }
            }
            break;

          case 'random': // ORANGE - Zufällige Bewegung (schwer vorhersagbar)
            // Wählt bei jeder Kreuzung eine zufällige Richtung
            // Aber bevorzugt Richtungswechsel für mehr Unberechenbarkeit
            const directions = ['U', 'D', 'L', 'R'];
            const randomDir = directions[Math.floor(Math.random() * 4)];
            ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
            return; // Sofort zurück, da bereits Richtung gesetzt
        }
    }

    const newDir = this.getDirectionToTarget(ghost, targetX, targetY);
    ghost.updateDirection(newDir, this.CELL_SIZE, this.walls);
  }

    const newDir = this.getDirectionToTarget(ghost, targetX, targetY);
    ghost.updateDirection(newDir, this.CELL_SIZE, this.walls);
  }

  private move() {
    if (!this.pacman) return;

    // Move pacman
    this.pacman.x += this.pacman.velocityX;
    this.pacman.y += this.pacman.velocityY;

    // Tunnel-Wraparound für Pac-Man
    this.handleTunnelWraparound(this.pacman);

    // Check wall collisions (außer Ghost Door)
    for (const wall of this.walls) {
      if (wall.type === 'ghost-door') continue; // Pac-Man kann NICHT durch die Tür
      if (this.collision(this.pacman, wall)) {
        this.pacman.x -= this.pacman.velocityX;
        this.pacman.y -= this.pacman.velocityY;
        break;
      }
    }

    // Check ghost collisions
    for (const ghost of this.ghosts) {
      if (this.collision(ghost, this.pacman)) {
        if (ghost.scared) {
          // Reparatur: Ghost "reparieren" (+200 Punkte)
          this.audioService.play('eatghost');
          this.score += 200;
          // Respawn ghost at starting position
          ghost.reset();
          ghost.scared = false;
          ghost.updateVelocity(this.CELL_SIZE); // Reset to normal speed
          continue;
        } else {
          // Normaler Ghost-Kontakt: Leben verlieren
          this.audioService.play('die');
          this.lives -= 1;
          this.gameState = 'dying';
          this.stateTimer = 0;
          return; // Stoppe weitere Bewegung
        }
      }

      // Authentische Ghost-AI bei Richtungswechsel-Punkten
      // Update AI alle paar Frames für bessere Performance
      if (Math.floor(ghost.x) % this.CELL_SIZE < 4 && Math.floor(ghost.y) % this.CELL_SIZE < 4) {
        this.updateGhostAI(ghost);
      }

      ghost.x += ghost.velocityX;
      ghost.y += ghost.velocityY;

      // Tunnel-Wraparound für Geister
      this.handleTunnelWraparound(ghost);

      // Ghost wall collision
      for (const wall of this.walls) {
        // Geister können durch Ghost Door
        if (wall.type === 'ghost-door') continue;

        if (this.collision(ghost, wall)) {
          ghost.x -= ghost.velocityX;
          ghost.y -= ghost.velocityY;
          // Bei Kollision neue Richtung berechnen
          this.updateGhostAI(ghost);
        }
      }
    }

    // Check food collision (Produktionsauftrag)
    let foodEaten: Block | null = null;
    for (const food of this.foods) {
      if (this.collision(this.pacman, food)) {
        this.audioService.play('waka');
        foodEaten = food;
        this.pelletStreak++;
        // Update streak multiplier
        if (this.pelletStreak >= 30) {
          this.streakMultiplier = 3.0;
        } else if (this.pelletStreak >= 20) {
          this.streakMultiplier = 2.0;
        } else if (this.pelletStreak >= 10) {
          this.streakMultiplier = 1.5;
        }
        this.score += Math.floor(10 * this.streakMultiplier);
      }
    }
    if (foodEaten) {
      this.foods.delete(foodEaten);
    }

    // Check power pellet collision (KI-Optimierung)
    let powerEaten: Block | null = null;
    for (const pellet of this.powerPellets) {
      if (this.collision(this.pacman, pellet)) {
        this.audioService.play('powerpill');
        powerEaten = pellet;
        this.score += 50;
        // Activate scared mode for 10 seconds
        this.scaredTimer = this.scaredDuration;
        this.ghosts.forEach(g => {
          g.scared = true;
          g.updateVelocity(this.CELL_SIZE); // update speed to 80%
        });
      }
    }
    if (powerEaten) {
      this.powerPellets.delete(powerEaten);
    }

    // Check cherry collision (Bonus-Frucht)
    if (this.cherry && this.collision(this.pacman, this.cherry)) {
      this.audioService.play('eatghost'); // Bonus-Sound
      this.score += 500; // 500 Punkte (statt 50)

      // Bonus-Effekt: Kurze Unverwundbarkeit (3 Sekunden)
      // Oder Extraleben bei bestimmten Bedingungen
      if (this.lives < 5) {
        this.lives += 1; // Extra Leben!
      }

      this.cherry = null;
      this.cherrySpawnCooldown = 300; // 10 Sekunden Cooldown (bei 30 FPS)
    }

    // Cherry Spawn System: Erscheint nach bestimmter Anzahl gegessener Pellets
    if (this.cherrySpawnCooldown > 0) {
      this.cherrySpawnCooldown--;
    }

    // Spawn Cherry: Nach 70 und 170 Pellets gegessen (wie im Original)
    const pelletsEaten = this.totalPellets - this.foods.size - this.powerPellets.size;
    const shouldSpawnCherry = (pelletsEaten === 70 || pelletsEaten === 170) && !this.cherry && this.cherrySpawnCooldown === 0;

    if (shouldSpawnCherry || (!this.cherry && this.cherrySpawnCooldown === 0 && Math.random() < 0.003)) {
      // Spawn an fester Position unter der Ghost Box (wie im Original)
      const x = 13 * this.CELL_SIZE;
      const y = 17 * this.CELL_SIZE;
      this.cherry = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.cherryImage);
      this.cherrySpawnCooldown = 300; // 10 Sekunden bis nächste Cherry
    }

    // Level complete
    if (this.foods.size === 0 && this.powerPellets.size === 0) {
      this.score += 1000; // Level Complete Bonus
      this.currentLevel++;
      this.pelletStreak = 0;
      this.streakMultiplier = 1.0;
      this.gameState = 'levelcomplete';
      this.stateTimer = 0;
    }
  }

  private resetPositions() {
    if (this.pacman) {
      this.pacman.reset();
      this.pacman.velocityX = 0;
      this.pacman.velocityY = 0;
    }
    for (const ghost of this.ghosts) {
      ghost.reset();
      const directions = ['U', 'D', 'L', 'R'];
      const newDirection = directions[Math.floor(Math.random() * 4)];
      ghost.updateDirection(newDirection, this.CELL_SIZE, this.walls);
    }
    // Reset ghost release timer
    this.ghostReleaseTimer = 0;
    this.ghostsReleased = 0;
  }

  // Send final score to backend API
  private submitScore(): void {
    try {
      const collected = Math.max(0, this.totalPellets - (this.foods.size + this.powerPellets.size));
      const dto = {
        Username: this.playerName?.trim() || 'Anonymous',
        Points: this.score,
        Level: this.currentLevel,
        LivesRemaining: this.lives,
        ProductionOrdersCollected: collected,
        SensorsRepaired: 0,
        PlaytimeSeconds: 0
      };

      this.http.post('/api/scores', dto).subscribe({
        next: (res) => {
          console.log('✅ Score submitted', res);
          this.loadLeaderboard();
        },
        error: (err) => console.error('❌ Error submitting score', err)
      });
    } catch (e) {
      console.error('Exception while submitting score', e);
    }
  }

  private loadLeaderboard() {
    console.log('🏆 Loading leaderboard...');
    this.http.get<any[]>('/api/scores/leaderboard?top=5').subscribe({
      next: (data) => {
        this.leaderboard = data;
        console.log(`✅ Leaderboard loaded: ${data.length} entries`, data);
      },
      error: (err) => {
        console.error('❌ Error loading leaderboard', err);
        // Set empty leaderboard on error so UI shows something
        this.leaderboard = [];
      }
    });
  }

  private restartGame() {
    this.walls.clear();
    this.foods.clear();
    this.powerPellets.clear();
    this.ghosts.clear();
    this.cherry = null;
    this.loadMap();
    this.resetPositions();
    this.lives = 3;
    this.score = 0;
    this.pelletStreak = 0;
    this.streakMultiplier = 1.0;
    this.currentLevel = 1;
    this.scaredTimer = 0;
    this.scaredDuration = 10000;
    this.gameOver = false;
    this.modePhase = 0;
    this.modeTimer = 0;
    this.ghostMode = 'scatter';
    this.gameState = 'ready';
    this.stateTimer = 0;
    this.gameHistory = [];
    this.startGameLoop();
  }

  private onKeyDown(e: KeyboardEvent) {
    // Restart bei Game Over
    if (this.gameState === 'gameover') {
      this.restartGame();
      return;
    }

    // === PRACTICE MODE STEUERUNG ===
    if (this.gameMode === 'practice') {
      // Shift = Zeit zurückspulen
      if (e.key === 'Shift') {
        this.isRewinding = true;
        return;
      }
      // 1 = 0.5x Geschwindigkeit
      if (e.key === '1') {
        this.slowMotion = 0.5;
        return;
      }
      // 2 = 0.25x Geschwindigkeit
      if (e.key === '2') {
        this.slowMotion = 0.25;
        return;
      }
      // I = Unverwundbarkeit umschalten
      if (e.key === 'i' || e.key === 'I') {
        this.isInvincible = !this.isInvincible;
        console.log(`🛡️ Unverwundbarkeit: ${this.isInvincible ? 'AN' : 'AUS'}`);
        return;
      }
      // O = Turbo umschalten
      if (e.key === 'o' || e.key === 'O') {
        this.turboSpeed = !this.turboSpeed;
        console.log(`⚡ Turbo: ${this.turboSpeed ? 'AN' : 'AUS'}`);
        return;
      }
      // Q,W,E,R,T = Sensor-Ziele umschalten
      if (['q', 'w', 'e', 'r', 't'].includes(e.key.toLowerCase())) {
        this.showGhostTargets = !this.showGhostTargets;
        return;
      }
    }

    // Keine Steuerung während Ready, Dying oder Level Complete
    if (this.gameState !== 'playing') return;

    if (!this.pacman) return;

    // Turbo Mode: Geschwindigkeits-Multiplikator
    const speedMultiplier = this.turboSpeed ? 2 : 1;

    // Buffer the direction for smoother cornering
    if (e.key === 'ArrowUp') {
      this.bufferedDirection = 'U';
    } else if (e.key === 'ArrowDown') {
      this.bufferedDirection = 'D';
    } else if (e.key === 'ArrowLeft') {
      this.bufferedDirection = 'L';
    } else if (e.key === 'ArrowRight') {
      this.bufferedDirection = 'R';
    }

    // Try to apply immediately if possible
    if (this.bufferedDirection) {
      const canTurn = this.canChangeTo(this.bufferedDirection);
      if (canTurn) {
        this.pacman.updateDirection(this.bufferedDirection, this.CELL_SIZE, this.walls);
        // Update pacman image
        if (this.bufferedDirection === 'U') {
          this.pacman.image = this.pacmanUpImage;
        } else if (this.bufferedDirection === 'D') {
          this.pacman.image = this.pacmanDownImage;
        } else if (this.bufferedDirection === 'L') {
          this.pacman.image = this.pacmanLeftImage;
        } else if (this.bufferedDirection === 'R') {
          this.pacman.image = this.pacmanRightImage;
        }
        this.bufferedDirection = null; // Clear buffer on successful turn
      }
      // Otherwise keep buffered for next frame
    }
  }

  // KeyUp Handler für Practice Mode
  private onKeyUp(e: KeyboardEvent) {
    if (this.gameMode === 'practice') {
      if (e.key === 'Shift') {
        this.isRewinding = false;
      }
      if (e.key === '1' || e.key === '2') {
        this.slowMotion = 1.0;
      }
    }
  }
}
