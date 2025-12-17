import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  imports: [HttpClientModule, CommonModule],
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
  // Assets - Industrial Equipment
  private malfunctionBlueImage = new Image();
  private malfunctionOrangeImage = new Image();
  private malfunctionPinkImage = new Image();
  private malfunctionRedImage = new Image();
  private robotUpImage = new Image();
  private robotDownImage = new Image();
  private robotLeftImage = new Image();
  private robotRightImage = new Image();
  private wallImage = new Image();
  private maintenanceStationImage = new Image();
  private repairModeImage = new Image();
  private cherryImage = new Image();

  // Industrial Equipment Collections
  walls: Set<Block> = new Set<Block>();
  sensorData: Set<Block> = new Set<Block>();
  maintenanceStations: Set<Block> = new Set<Block>();
  malfunctions: Set<Block> = new Set<Block>();
  robot: Block | null = null;
  cherry: Block | null = null;

  // Legacy aliases for compatibility during migration
  get pacman() { return this.robot; }
  set pacman(value: Block | null) { this.robot = value; }
  get foods() { return this.sensorData; }
  get powerPellets() { return this.maintenanceStations; }
  get ghosts() { return this.malfunctions; }
  get lives() { return this.systemHealth; }
  set lives(value: number) { this.systemHealth = value; }
  get score() { return this.efficiency; }
  set score(value: number) { this.efficiency = value; }
  get currentLevel() { return this.productionLevel; }
  set currentLevel(value: number) { this.productionLevel = value; }
  get scaredTimer() { return this.maintenanceTimer; }
  set scaredTimer(value: number) { this.maintenanceTimer = value; }
  get scaredDuration() { return this.maintenanceDuration; }
  set scaredDuration(value: number) { this.maintenanceDuration = value; }

  // Missing image properties for compatibility
  private blueGhostImage = new Image();
  private orangeGhostImage = new Image();
  private pinkGhostImage = new Image();
  private redGhostImage = new Image();
  private powerFoodImage = new Image();
  private scaredGhostImage = new Image();

  // Missing variables
  private totalPellets = 0;
  private ghostMode: 'scatter' | 'chase' | 'frightened' = 'scatter';
  private showMalfunctionTargets = false;
  get showGhostTargets() { return this.showMalfunctionTargets; }
  set showGhostTargets(value: boolean) { this.showMalfunctionTargets = value; }
  private debugMode = false;

  // Missing streak system
  private pelletStreak = 0;
  private streakMultiplier = 1.0;
  private cherrySpawnCooldown = 0;
  private ghostReleaseTimer = 0;
  private ghostsReleased = 0;
  private readonly GHOST_RELEASE_INTERVAL = 4000;

  // Legacy image getters for compatibility
  get pacmanUpImage() { return this.robotUpImage; }
  get pacmanDownImage() { return this.robotDownImage; }
  get pacmanLeftImage() { return this.robotLeftImage; }
  get pacmanRightImage() { return this.robotRightImage; }

  // Buffered input for smoother corner turning
  private bufferedDirection: string | null = null;

  // Basic system state
  systemHealth = 3;
  efficiency = 0;
  gameOver = false;
  playerName = ''; // Player name for leaderboard
  gameMode: GameMode = 'classic'; // Make gameMode accessible in template
  maintenanceTimer = 0;
  maintenanceDuration = 10000; // 10 seconds in ms
  dataStreak = 0;
  efficiencyMultiplier = 1.0;
  productionLevel = 1;

  // Bonus System
  private bonusSpawnCooldown = 0;
  private totalSensorData = 0; // Wird beim Laden der Map gesetzt

  // Malfunction Spawning Timer
  private malfunctionSpawnTimer = 0;
  private readonly MALFUNCTION_SPAWN_INTERVAL = 800; // Spawn a malfunction roughly every 0.8s
  private malfunctionsActive = 0;

  // Scatter/Chase Mode (authentisches Pac-Man Verhalten)
  private malfunctionMode: 'random' | 'aggressive' | 'maintenance' = 'random';
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
  gameState: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete' | 'paused' = 'ready';
  private stateTimer = 0;
  private readonly READY_DURATION = 2000; // 2 Sekunden "READY!"
  private readonly DEATH_DURATION = 1500; // 1.5 Sekunden Todesanimation
  private readonly LEVELCOMPLETE_DURATION = 2000; // 2 Sekunden Level-Übergang

  // Level-Progression: Geschwindigkeit und Frighten-Dauer pro Level
  private getGhostSpeed(): number {
    const baseSpeed = this.CELL_SIZE / 4;
    // Höhere Grundgeschwindigkeit: +15% pro Level (statt 5%)
    const speedMultiplier = 1.1 + (this.productionLevel - 1) * 0.15;
    return Math.min(baseSpeed * speedMultiplier, baseSpeed * 2.0); // Max 200%
  }

  private getMaintenanceDuration(): number {
    // Kürzere Maintenance-Zeit: Start mit 6s (statt 10s), -1.5s pro Level
    const baseDuration = 6000;
    const reduction = (this.productionLevel - 1) * 1500;
    return Math.max(baseDuration - reduction, 1000); // Minimum 1 Sekunde
  }

  // Legacy function for compatibility
  private getFrightenedDuration(): number {
    return this.getMaintenanceDuration();
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
    // Wände zeichnen (Gantt-Chart Balken in verschiedenen Farben)
    this.walls.forEach(wall => {
      if (wall.type === 'ghost-door') {
        // Ghost Door als pinke Linie
        ctx.fillStyle = '#FFB8FF';
        ctx.fillRect(wall.x, wall.y + wall.height / 2 - 2, wall.width, 4);
      } else if (wall.color) {
        // Gantt-Chart Balken mit spezifischer Farbe (Orange, Lila, Rot)
        ctx.fillStyle = wall.color;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        // Leichter Schatten für Tiefe
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(wall.x, wall.y + wall.height - 2, wall.width, 2);
      } else if (wall.image && wall.image.complete) {
        // Walls drawing mit Bild
        ctx.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
      } else {
        // Fallback: Graue Wände für Rahmen
        ctx.fillStyle = '#666666';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }
    });

    // Sensordaten zeichnen (Pellets wie im Original - gelb)
    ctx.fillStyle = '#FFFF00'; // Gelb wie im Original Pac-Man
    this.sensorData.forEach(food => {
      // Draw pellet as small circle (wie im Original)
      // food.x und food.y sind bereits die korrekten Positionen (mit -2 Offset für Zentrierung)
      const centerX = food.x + 2; // +2 weil width/2 = 2
      const centerY = food.y + 2; // +2 weil height/2 = 2
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Wartungsstationen zeichnen (Power Pellets - blinkend weiß wie im Original)
    if (this.powerPelletVisible) {
      ctx.fillStyle = '#FFFFFF'; // Weiß wie im Original
      this.maintenanceStations.forEach(pellet => {
        // Draw power pellet as larger circle (wie im Original)
        ctx.beginPath();
        ctx.arc(pellet.x + pellet.width / 2, pellet.y + pellet.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Cherry zeichnen
    if (this.cherry && this.cherry.image && this.cherry.image.complete) {
      ctx.drawImage(this.cherry.image, this.cherry.x, this.cherry.y, this.cherry.width, this.cherry.height);
    }

    // Robot mit Animation zeichnen
    if (this.robot && this.gameState !== 'dying') {
      this.drawRobot(ctx);
    } else if (this.robot && this.gameState === 'dying') {
      this.drawDyingRobot(ctx);
    }

    // Störungen zeichnen
    this.malfunctions.forEach(malfunction => {
      this.drawMalfunction(ctx, malfunction);
    });

    // Ghost-Ziele (Learn/Practice Mode)
    this.drawGhostTargets(ctx);

    // UI Overlay
    this.drawUI(ctx);
  }

  private drawRobot(ctx: CanvasRenderingContext2D) {
    if (!this.robot) return;

    const centerX = this.robot.x + this.robot.width / 2;
    const centerY = this.robot.y + this.robot.height / 2;
    const size = this.robot.width - 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Rotate based on direction (Fuchs schaut in Bewegungsrichtung)
    let rotation = 0;
    let scaleX = 1; // Für horizontale Spiegelung bei Linksbewegung
    
    if (this.robot.direction === 'U') {
      rotation = -Math.PI / 2;  // Nach oben
    } else if (this.robot.direction === 'D') {
      rotation = Math.PI / 2;  // Nach unten
    } else if (this.robot.direction === 'L') {
      scaleX = -1;  // Horizontal spiegeln für Linksbewegung
    } else if (this.robot.direction === 'R') {
      // Standard: nach rechts (keine Rotation/Spiegelung)
    }
    
    ctx.scale(scaleX, 1);
    ctx.rotate(rotation);

    // Robot Platform Base (darker blue/teal bottom section)
    const platformWidth = size * 0.9;
    const platformHeight = size * 0.4;
    const baseHeight = size * 0.15;
    
    // Main platform body (light grey/off-white)
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(-platformWidth/2, -platformHeight/2 + baseHeight, platformWidth, platformHeight - baseHeight);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-platformWidth/2, -platformHeight/2 + baseHeight, platformWidth, platformHeight - baseHeight);

    // Base section (darker blue/teal)
    ctx.fillStyle = '#2E7D8F';
    ctx.fillRect(-platformWidth/2, platformHeight/2 - baseHeight, platformWidth, baseHeight);
    ctx.strokeRect(-platformWidth/2, platformHeight/2 - baseHeight, platformWidth, baseHeight);

    // Glowing blue lights on front corners
    const lightSize = 3;
    const lightGlow = Math.sin(Date.now() * 0.005) * 0.3 + 0.7; // Pulsing effect
    ctx.fillStyle = `rgba(0, 150, 255, ${lightGlow})`;
    ctx.beginPath();
    ctx.arc(-platformWidth/2 + 3, platformHeight/2 - baseHeight/2, lightSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(platformWidth/2 - 3, platformHeight/2 - baseHeight/2, lightSize, 0, Math.PI * 2);
    ctx.fill();

    // Small blue square on top (label/QR code area)
    ctx.fillStyle = '#2E7D8F';
    ctx.fillRect(-platformWidth/4, -platformHeight/2 + baseHeight + 2, platformWidth/4, platformWidth/4);
    ctx.strokeRect(-platformWidth/4, -platformHeight/2 + baseHeight + 2, platformWidth/4, platformWidth/4);

    // Fox sitting on the platform
    const foxSize = size * 0.55;
    const foxY = -platformHeight/2 - foxSize * 0.25; // Position fox on top of platform

    // Fox body (orange-red)
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.ellipse(0, foxY, foxSize * 0.35, foxSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // White chest
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, foxY + foxSize * 0.1, foxSize * 0.2, foxSize * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fox head
    const headSize = foxSize * 0.45;
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.arc(0, foxY - foxSize * 0.25, headSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White muzzle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, foxY - foxSize * 0.15, headSize * 0.15, headSize * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black nose
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, foxY - foxSize * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Large expressive eyes with white highlights
    const eyeSize = 4;
    const eyeY = foxY - foxSize * 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-headSize * 0.15, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headSize * 0.15, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // White eye highlights (prominent)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-headSize * 0.15 - 1.5, eyeY - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headSize * 0.15 - 1.5, eyeY - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earSize = headSize * 0.3;
    // Left ear
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo(-headSize * 0.2, foxY - foxSize * 0.4);
    ctx.lineTo(-headSize * 0.35, foxY - foxSize * 0.55);
    ctx.lineTo(-headSize * 0.1, foxY - foxSize * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // White inner ear
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-headSize * 0.2, foxY - foxSize * 0.42);
    ctx.lineTo(-headSize * 0.28, foxY - foxSize * 0.52);
    ctx.lineTo(-headSize * 0.12, foxY - foxSize * 0.44);
    ctx.closePath();
    ctx.fill();
    // Black ear tip
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-headSize * 0.35, foxY - foxSize * 0.55, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right ear
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo(headSize * 0.2, foxY - foxSize * 0.4);
    ctx.lineTo(headSize * 0.35, foxY - foxSize * 0.55);
    ctx.lineTo(headSize * 0.1, foxY - foxSize * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // White inner ear
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(headSize * 0.2, foxY - foxSize * 0.42);
    ctx.lineTo(headSize * 0.28, foxY - foxSize * 0.52);
    ctx.lineTo(headSize * 0.12, foxY - foxSize * 0.44);
    ctx.closePath();
    ctx.fill();
    // Black ear tip
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(headSize * 0.35, foxY - foxSize * 0.55, 2, 0, Math.PI * 2);
    ctx.fill();

    // Front paws (black)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-foxSize * 0.15, foxY + foxSize * 0.2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(foxSize * 0.15, foxY + foxSize * 0.2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bushy tail with white tip (curled to the right)
    const tailStartX = foxSize * 0.2;
    const tailStartY = foxY;
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.ellipse(tailStartX + foxSize * 0.2, tailStartY - foxSize * 0.1, foxSize * 0.25, foxSize * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // White tail tip
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(tailStartX + foxSize * 0.35, tailStartY - foxSize * 0.15, foxSize * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawDyingRobot(ctx: CanvasRenderingContext2D) {
    if (!this.robot) return;

    const centerX = this.robot.x + this.robot.width / 2;
    const centerY = this.robot.y + this.robot.height / 2;
    const size = this.robot.width - 2;

    // Robot "malfunction" animation: flickering and shrinking
    const progress = this.stateTimer / this.DEATH_DURATION;
    const flickerAlpha = Math.sin(progress * 20) * 0.3 + 0.7; // Flickering effect
    const shrinkFactor = 1 - (progress * 0.8); // Shrink to 20% of original size

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(shrinkFactor, shrinkFactor);
    ctx.globalAlpha = flickerAlpha;

    // Robot Platform Base (darker blue/teal bottom section)
    const platformWidth = size * 0.9;
    const platformHeight = size * 0.4;
    const baseHeight = size * 0.15;
    
    // Main platform body (light grey/off-white)
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(-platformWidth/2, -platformHeight/2 + baseHeight, platformWidth, platformHeight - baseHeight);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-platformWidth/2, -platformHeight/2 + baseHeight, platformWidth, platformHeight - baseHeight);

    // Base section (darker blue/teal)
    ctx.fillStyle = '#2E7D8F';
    ctx.fillRect(-platformWidth/2, platformHeight/2 - baseHeight, platformWidth, baseHeight);
    ctx.strokeRect(-platformWidth/2, platformHeight/2 - baseHeight, platformWidth, baseHeight);

    // Fox sitting on the platform (simplified for death animation)
    const foxSize = size * 0.5;
    const foxY = -platformHeight/2 - foxSize * 0.3;

    // Fox body (orange-red)
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.ellipse(0, foxY, foxSize * 0.35, foxSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Fox head
    const headSize = foxSize * 0.4;
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.arc(0, foxY - foxSize * 0.25, headSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes (simplified)
    const eyeY = foxY - foxSize * 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-headSize * 0.15, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headSize * 0.15, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();

    // "Error" indicators (red flashing lights on platform)
    if (Math.sin(progress * 30) > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(-platformWidth/2 + 2, platformHeight/2 - baseHeight/2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(platformWidth/2 - 2, platformHeight/2 - baseHeight/2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawMalfunction(ctx: CanvasRenderingContext2D, ghost: Block) {
    const x = ghost.x;
    const y = ghost.y;
    const size = ghost.width;

    // Maschinenstörung-Farben und Symbole
    let color = '#FF0000';
    let symbol = '⚠️';
    let errorText = '';

    if (ghost.scared) {
      // Reparatur im Gange (blinkend)
      if (this.scaredTimer < 2000 && Math.floor(this.scaredTimer / 200) % 2 === 0) {
        color = '#00FF00';
        symbol = '🔧';
      } else {
        color = '#FFFF00';
        symbol = '⚡';
      }
    } else {
      switch (ghost.type) {
        case 'aggressive':
          color = '#FF0000';
          symbol = '🌡️';
          errorText = 'TEMP';
          break; // Überhitzung
        case 'ambush':
          color = '#FF69B4';
          symbol = '💨';
          errorText = 'DRUCK';
          break; // Druckabfall
        case 'patrol':
          color = '#00FFFF';
          symbol = '⚡';
          errorText = 'VIBR';
          break; // Vibration
        case 'random':
          color = '#FFA500';
          symbol = '🔧';
          errorText = 'VERSCH';
          break; // Verschleiß
      }
    }

    // Maschinenstörung als Warn-Symbol darstellen
    ctx.save();

    // Hauptkörper (Warnschild)
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

    // Error-Symbol
    ctx.font = `${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(symbol, x + size / 2, y + size / 2 + 2);

    // Error-Text (klein)
    if (errorText) {
      ctx.font = `${size * 0.2}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.fillText(errorText, x + size / 2, y + size - 3);
    }

    // Blinking error indicator
    if (!ghost.scared && Math.sin(Date.now() * 0.01) > 0.5) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + size - 6, y + 2, 4, 4);
    }

    ctx.restore();
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Score oben - Start bei y=50 um unter der game-info-bar zu bleiben
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`EFFIZIENZ: ${this.efficiency}`, 10, 50);
    ctx.fillText(`PROD-LVL: ${this.productionLevel}`, this.CANVAS_WIDTH / 2 - 50, 50);

    // High Score anzeigen
    ctx.textAlign = 'right';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`HI: ${this.getHighScore()}`, this.CANVAS_WIDTH - 10, 50);

    // Practice Mode Status-Anzeige
    if (this.gameMode === 'practice') {
      ctx.font = '10px monospace';
      let statusY = 67;
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

    // System Health unten links
    for (let i = 0; i < this.systemHealth; i++) {
      this.drawRobotIcon(ctx, 20 + i * 25, this.CANVAS_HEIGHT - 15);
    }

    // Malfunction Status Indicator (Debug oder Learn Mode)
    if (this.debugMode || this.showMalfunctionTargets) {
      ctx.font = '12px monospace';
      ctx.fillStyle = this.malfunctionMode === 'random' ? '#00FF00' : '#FF0000';
      ctx.fillText(`STATUS: ${this.malfunctionMode.toUpperCase()}`, 10, 70);
    }

    // Ready Screen
    if (this.gameState === 'ready') {
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#ED6B00';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM BEREIT!', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);

      // Zeige Modus-Info
      ctx.font = '12px monospace';
      const modeColor = this.gameMode === 'classic' ? '#FFFFFF' : '#00FF88';
      const modeText = this.gameMode.toUpperCase();
      ctx.fillStyle = modeColor;
      ctx.fillText(`[${modeText}]`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 25);
    }

    // Game Over Screen wird jetzt im HTML-Overlay angezeigt, nicht mehr im Canvas

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
    if (!this.showGhostTargets || !this.robot) return;

    this.malfunctions.forEach(malfunction => {
      let targetX = 0, targetY = 0;
      let color = '#FF0000';

      // Berechne Ziel basierend auf Ghost-Typ
      switch (malfunction.type) {
        case 'aggressive':
          targetX = this.robot!.x;
          targetY = this.robot!.y;
          color = 'rgba(255, 0, 0, 0.5)';
          break;
        case 'ambush':
          if (this.robot!.direction === 'U') {
            targetX = this.robot!.x;
            targetY = this.robot!.y - 4 * this.CELL_SIZE;
          } else if (this.robot!.direction === 'D') {
            targetX = this.robot!.x;
            targetY = this.robot!.y + 4 * this.CELL_SIZE;
          } else if (this.robot!.direction === 'L') {
            targetX = this.robot!.x - 4 * this.CELL_SIZE;
            targetY = this.robot!.y;
          } else {
            targetX = this.robot!.x + 4 * this.CELL_SIZE;
            targetY = this.robot!.y;
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
          targetX = malfunction.x;
          targetY = malfunction.y;
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
      ctx.moveTo(malfunction.x + malfunction.width / 2, malfunction.y + malfunction.height / 2);
      ctx.lineTo(targetX + this.CELL_SIZE / 2, targetY + this.CELL_SIZE / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  private drawRobotIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Draw small ifm robot icon for lives indicator
    ctx.fillStyle = '#ED6B00';
    ctx.fillRect(x - 6, y - 6, 12, 8);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 6, y - 6, 12, 8);

    // Small head
    ctx.fillRect(x - 3, y - 8, 6, 4);
    ctx.strokeRect(x - 3, y - 8, 6, 4);

    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 2, y - 7, 1, 1);
    ctx.fillRect(x + 1, y - 7, 1, 1);
  }  //Grid-System für Gantt-Chart Layout (breiter für horizontale Balken)
  readonly GRID_WIDTH = 40;  // Breiter für Gantt-Chart
  readonly GRID_HEIGHT = 26;  // Angepasst an Tile-Map (26 Zeilen)
  readonly CELL_SIZE = 30; // Pixel pro Feld
  // Canvas-Dimensionen
  readonly CANVAS_WIDTH = this.GRID_WIDTH * this.CELL_SIZE;  // 1200px
  readonly CANVAS_HEIGHT = this.GRID_HEIGHT * this.CELL_SIZE; // 780px
  // Game Manager
  private game: GameManager | null = null;

  // Modi-spezifische Einstellungen
  isInvincible = false;      // Practice Mode: Unverwundbarkeit
  slowMotion = 1.0;          // Practice Mode: Zeitlupe (1.0 = normal)
  turboSpeed = false;        // Turbo Mode: 2x Geschwindigkeit

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

  // Exit confirmation modal
  showExitConfirm = false;
  private pausedForExitConfirm = false;
  showPauseOverlay = false;

  // Get high score from leaderboard
  private getHighScore(): number {
    if (this.leaderboard.length === 0) return 0;
    return Math.max(...this.leaderboard.map(entry => entry.points));
  }

  constructor(
    private audioService: AudioService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private inputService: InputService,
    private router: Router
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
    // Use robot images instead of pacman
    this.robotUpImage.src = 'assets/robot-up.svg';
    this.robotDownImage.src = 'assets/robot-down.svg';
    this.robotLeftImage.src = 'assets/robot-left.svg';
    this.robotRightImage.src = 'assets/robot-right.svg';
    this.wallImage.src = 'assets/wall.png';
    this.powerFoodImage.src = 'assets/powerFood.png';
    this.scaredGhostImage.src = 'assets/scaredGhost.png';
    this.cherryImage.src = 'assets/cherry.png';
  }
  // Gantt-Chart Tile-Map als String-Array
  // Zeichen-Bedeutung:
  // X = Wand (Rahmen)
  // O = Orange Balken (Task)
  // P = Lila Balken (Task)
  // R = Roter Balken (Task)
  // ' ' = Freier Bereich (Pellet wird automatisch platziert)
  // . = Pellet (explizit)
  // * = Power Pellet
  // G = Ghost House
  // - = Ghost Door
  // r/p/b/o = Geister (red/pink/blue/orange)
  // M = Pacman Start
  // | = Vertikale Verbindung (frei für Bewegung)
  private readonly ganttTileMap: string[] = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // 0 - Obere Wand
    "X M                                    X",  // 1 - Erste Reihe (E01) - Pacman Start
    "X  OOOOOOOO      PPPPPP      OOOO      X",  // 2 - Orange/Lila Balken
    "X  OOOOOOOO      PPPPPP      OOOO      X",  // 3
    "X                                      X",  // 4
    "X  OO  PP  OO  PP  OO  PP  OO  PP  OO  X",  // 5 - Zweite Reihe (STEW)
    "X  OO  PP  OO  PP  OO  PP  OO  PP  OO  X",  // 6
    "X                                      X",  // 7
    "X  OOOOO  PPPPP  OOOOO  PPP            X",  // 8 - Dritte Reihe (LF1)
    "X                                      X",  // 9
    "X                                      X",  // 10 - Vierte Reihe (RH) - leer
    "X                                      X",  // 11
    "X                                      X",  // 12
    "X  OOOOOOOOOO    PPPPPPPPPP            X",  // 13 - Fünfte Reihe (FT1)
    "X                                      X",  // 14
    "X                                      X",  // 15
    "X  P  P  P  P  P  P                    X",  // 16 - Sechste Reihe (LF2)
    "X                                      X",  // 17
    "X                                      X",  // 18
    "X  OO  OO  OO  OO  OO  OO              X",  // 19 - Siebte Reihe (ASM)
    "X                                      X",  // 20
    "X                                      X",  // 21
    "X  OOOOOOO  RRRRRRR  OOOOOO            X",  // 22 - Achte Reihe (VOD1)
    "X                                      X",  // 23
    "X                                      X",  // 24
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // 25 - Untere Wand
  ];

  // Gantt-Chart-ähnliches Layout: Horizontale Balken als Wände
  // Jede Reihe repräsentiert eine Produktionseinheit mit horizontalen Task-Balken
  private loadMap() {
    // Parse Tile-Map String-Array
    // Zuerst: Erkenne horizontale Balken (O, P, R) und erstelle sie als zusammenhängende Blöcke
    const processedTiles = new Set<string>(); // Speichert bereits verarbeitete Positionen
    
    for (let row = 0; row < this.ganttTileMap.length; row++) {
      const mapRow = this.ganttTileMap[row];
      let col = 0;
      
      while (col < mapRow.length) {
        const tileChar = mapRow[col];
        const tileKey = `${row},${col}`;
        
        // Überspringe bereits verarbeitete Tiles
        if (processedTiles.has(tileKey)) {
          col++;
          continue;
        }
        
        const x = col * this.CELL_SIZE;
        const y = row * this.CELL_SIZE;

        // Erkenne horizontale Balken (O, P, R) und erstelle sie als zusammenhängende Blöcke
        if (tileChar === 'O' || tileChar === 'P' || tileChar === 'R') {
          // Finde die Länge des Balkens
          let barLength = 0;
          let currentCol = col;
          while (currentCol < mapRow.length && mapRow[currentCol] === tileChar) {
            processedTiles.add(`${row},${currentCol}`);
            barLength++;
            currentCol++;
          }
          
          // Bestimme Farbe basierend auf Zeichen
          let color = '#FF8C00'; // Orange (Standard)
          if (tileChar === 'P') color = '#9370DB'; // Lila
          if (tileChar === 'R') color = '#FF4444'; // Rot
          
          // Erstelle horizontalen Balken (nur 40% der Zellenhöhe, zentriert)
          const barHeight = this.CELL_SIZE * 0.4;
          const barY = y + (this.CELL_SIZE - barHeight) / 2;
          const bar = new Block(x, barY, barLength * this.CELL_SIZE, barHeight, null, color);
          this.walls.add(bar);
          
          col = currentCol;
          continue;
        }

        // Normale Tile-Verarbeitung
        switch (tileChar) {
          case 'X':
            // Wand (Rahmen)
            this.walls.add(new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.wallImage));
            processedTiles.add(tileKey);
            break;

          case ' ':
            // Freier Bereich - Pellet wird automatisch platziert
            this.sensorData.add(new Block(
              x + this.CELL_SIZE / 2 - 2,
              y + this.CELL_SIZE / 2 - 2,
              4, 4, null
            ));
            processedTiles.add(tileKey);
            break;

          case '.':
            // Explizites Pellet
            this.sensorData.add(new Block(
              x + this.CELL_SIZE / 2 - 2,
              y + this.CELL_SIZE / 2 - 2,
              4, 4, null
            ));
            processedTiles.add(tileKey);
            break;

          case '*':
            // Power Pellet
            const powerPellet = new Block(
              x + this.CELL_SIZE / 2 - 4,
              y + this.CELL_SIZE / 2 - 4,
              8, 8, null
            );
            this.maintenanceStations.add(powerPellet);
            processedTiles.add(tileKey);
            break;

          case 'G':
            // Ghost House Interior (kein Pellet, aber passierbar für Geister)
            // Wird später als Ghost House Wände gezeichnet
            processedTiles.add(tileKey);
            break;

          case '-':
            // Ghost Door
            const door = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.wallImage);
            door.type = 'ghost-door';
            this.walls.add(door);
            processedTiles.add(tileKey);
            break;

          case 'M':
            // Pacman Startposition
            this.robot = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.robotRightImage);
            this.robot.direction = 'R';
            this.robot.startX = x;
            this.robot.startY = y;
            this.robot.updateVelocity(this.CELL_SIZE);
            processedTiles.add(tileKey);
            break;

          case 'r':
            // Roter Geist (aggressive)
            const redGhost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.redGhostImage);
            redGhost.type = 'aggressive';
            this.ghosts.add(redGhost);
            processedTiles.add(tileKey);
            break;

          case 'p':
            // Pinker Geist (ambush)
            const pinkGhost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.pinkGhostImage);
            pinkGhost.type = 'ambush';
            this.ghosts.add(pinkGhost);
            processedTiles.add(tileKey);
            break;

          case 'b':
            // Blauer Geist (patrol)
            const blueGhost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.blueGhostImage);
            blueGhost.type = 'patrol';
            this.ghosts.add(blueGhost);
            processedTiles.add(tileKey);
            break;

          case 'o':
            // Oranger Geist (random)
            const orangeGhost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.orangeGhostImage);
            orangeGhost.type = 'random';
            this.ghosts.add(orangeGhost);
            processedTiles.add(tileKey);
            break;

          case '|':
            // Vertikale Verbindung (frei für Bewegung, Pellet wird platziert)
            this.sensorData.add(new Block(
              x + this.CELL_SIZE / 2 - 2,
              y + this.CELL_SIZE / 2 - 2,
              4, 4, null
            ));
            processedTiles.add(tileKey);
            break;
        }
        
        col++;
      }
    }

    // Stelle sicher, dass Pacman initialisiert wurde
    if (!this.robot) {
      // Fallback: Spawne Pacman an Position (1, 1)
      this.robot = new Block(1 * this.CELL_SIZE, 1 * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE, this.robotRightImage);
      this.robot.direction = 'R';
      this.robot.startX = 1 * this.CELL_SIZE;
      this.robot.startY = 1 * this.CELL_SIZE;
      this.robot.updateVelocity(this.CELL_SIZE);
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
    if (this.animationFrameId) {
      return;
    }
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

    // Gamepad Restart / Exit in Game Over
    if (this.gameState === 'gameover') {
      if (this.inputService.isActionButtonPressed()) {
        this.restartGame();
      }
      if (this.inputService.isPauseButtonPressed()) {
        this.exitGame();
      }
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
      case 'paused':
        return; // pausiert

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

    // Ghost Release Timer - force each ghost out of the house quickly
    this.ghostReleaseTimer += deltaTime;
    while (this.ghostReleaseTimer >= this.GHOST_RELEASE_INTERVAL && this.ghostsReleased < this.malfunctions.size) {
      this.ghostReleaseTimer -= this.GHOST_RELEASE_INTERVAL;
      this.ghostsReleased++;
      let index = 0;
      for (const ghost of this.ghosts) {
        if (index === this.ghostsReleased - 1) {
          // If the ghost is still inside the house, teleport it to the door and push upward
          // Ghost House Koordinaten basierend auf Gantt-Chart Layout
          const rowHeight = 3 * this.CELL_SIZE;
          const rowSpacing = 1 * this.CELL_SIZE;
          const startY = 2 * this.CELL_SIZE;
          const ghostHouseX = 12 * this.CELL_SIZE;
          const ghostHouseY = startY + 5 * (rowHeight + rowSpacing);
          const ghostHouseWidth = 4 * this.CELL_SIZE;
          const ghostHouseHeight = 2 * this.CELL_SIZE;
          
          const inHouse = ghost.y >= ghostHouseY && ghost.y < ghostHouseY + ghostHouseHeight && 
                         ghost.x >= ghostHouseX && ghost.x < ghostHouseX + ghostHouseWidth;
          if (inHouse) {
            ghost.x = ghostHouseX + 1.5 * this.CELL_SIZE;
            ghost.y = ghostHouseY - this.CELL_SIZE;
            ghost.startX = ghost.x;
            ghost.startY = ghost.y;
            ghost.updateDirection('U', this.CELL_SIZE, this.walls);
          } else {
            ghost.updateDirection('U', this.CELL_SIZE, this.walls);
          }
          break;
        }
        index++;
      }
    }
  }

  private reverseGhostDirections() {
    const opposites: { [key: string]: string } = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L' };
    this.malfunctions.forEach(malfunction => {
      const opposite = opposites[malfunction.direction];
      if (opposite) {
        malfunction.updateDirection(opposite, this.CELL_SIZE, this.walls);
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
    // Fill with dark gray background (wie im Gantt-Chart)
    this.ctx.fillStyle = '#1a1a1a';
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
    // Ghost House Koordinaten basierend auf Gantt-Chart Layout
    const rowHeight = 3 * this.CELL_SIZE;
    const rowSpacing = 1 * this.CELL_SIZE;
    const startY = 2 * this.CELL_SIZE;
    const ghostHouseX = 12 * this.CELL_SIZE;
    const ghostHouseY = startY + 5 * (rowHeight + rowSpacing);
    const ghostHouseWidth = 4 * this.CELL_SIZE;
    const ghostHouseHeight = 2 * this.CELL_SIZE;
    
    // Aggressive (rot) soll nie in der Box bleiben → ignoriere Ghost-House-Regel
    const isAggressive = ghost.type === 'aggressive';
    const inGhostHouse = !isAggressive && 
                        ghost.y >= ghostHouseY && ghost.y < ghostHouseY + ghostHouseHeight &&
                        ghost.x >= ghostHouseX && ghost.x < ghostHouseX + ghostHouseWidth;

    let targetX = this.pacman.x;
    let targetY = this.pacman.y;

    if (inGhostHouse) {
      // Force target to be outside the door to exit the box
      targetX = ghostHouseX + 1.5 * this.CELL_SIZE;
      targetY = ghostHouseY - this.CELL_SIZE;
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
          // Reparatur: Störung "reparieren" (+200 Effizienz)
          this.audioService.play('eatghost'); // TODO: Replace with repair sound
          this.efficiency += 200;
          // Respawn ghost at starting position
          ghost.reset();
          ghost.scared = false;
          ghost.updateVelocity(this.CELL_SIZE); // Reset to normal speed
          continue;
        } else {
          // Systemfehler: Health verlieren
          this.audioService.play('die'); // TODO: Replace with system error sound
          this.systemHealth -= 1;
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
      this.audioService.play('eatghost'); // TODO: Replace with bonus collection sound
      this.efficiency += 500; // 500 Effizienz-Einheiten

      // Bonus-Effekt: System-Boost
      // System Health nur bis max. 3 (Anforderung)
      if (this.systemHealth < 3) {
        this.systemHealth += 1; // Extra Health!
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

  // Quit to start page
  exitGame(): void {
    this.stopGameLoop();
    this.router.navigate(['/']);
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

  restartGame() {
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
    if (e.key === 'Escape') {
      if (this.gameState === 'paused') {
        this.resumeFromPause();
      } else if (this.gameState === 'playing') {
        this.openPause();
      } else if (this.gameState === 'gameover') {
        // allow exit confirm from gameover via pause overlay
        this.openPause();
      }
      return;
    }

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

  private openPause() {
    this.showPauseOverlay = true;
    this.gameState = 'paused';
    this.stopGameLoop();
  }

  resumeFromPause() {
    this.showPauseOverlay = false;
    this.showExitConfirm = false;
    if (!this.gameOver) {
      this.gameState = 'playing';
      this.startGameLoop();
    }
  }

  requestExitToMenu() {
    this.showExitConfirm = true;
  }

  confirmExitToMenu() {
    this.showExitConfirm = false;
    this.stopGameLoop();
    this.router.navigate(['/']);
  }

  cancelExitToMenu() {
    this.showExitConfirm = false;
  }
}
