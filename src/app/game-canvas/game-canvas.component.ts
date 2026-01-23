import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { GameManager } from '../models/game-manager';
import { Block } from '../models/Block';
import { AudioService } from '../services/audio.service';
import { InputService } from '../services/input.service';

export type GameMode = 'classic' | 'practice' | '2player';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

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
  private readonly FPS = 60;
  private onKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);
  
  // ===== UI / DECOR =====
  private warningSignsPositions: Array<{ x: number; y: number; type: 'achtung' }> = [];
  private statusLEDPositions: Array<{ x: number; y: number; color: 'green' | 'orange' | 'red'; blinkSpeed: number }> = [];
  
  // ===== STATS & ACHIEVEMENTS =====
  stats: {
    sensorDataCollected: number;
    repairsSuccessful: number;
    errorsFixed: number;
    systemPerformance: number;
    achievementsUnlocked: {
      ifm_meister: boolean;
      wartungsexperte: boolean;
      stoerungsjaeger: boolean;
      effizienz_champion: boolean;
    };
  } = {
    sensorDataCollected: 0,
    repairsSuccessful: 0,
    errorsFixed: 0,
    systemPerformance: 0,
    achievementsUnlocked: {
      ifm_meister: false,
      wartungsexperte: false,
      stoerungsjaeger: false,
      effizienz_champion: false,
    }
  };
  
  achievementToast: string | null = null;




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
  private sensorDataImage = new Image();
  private ghostDoorImage = new Image();
  private lifeIconImage = new Image();

  // Additional industrial elements
  private wallCornerImage = new Image();
  private conveyorBeltImage = new Image();
  private pipeJunctionImage = new Image();
  private hazardTileImage = new Image();
  private controlPanelImage = new Image();
  private qualityCheckpointImage = new Image();
  private bonusIoTSensorImage = new Image();
  private bonusSpeedImage = new Image();
  private bonusShieldImage = new Image();

  // Industrial Equipment Collections
  walls: Set<Block> = new Set<Block>();
  sensorData: Set<Block> = new Set<Block>();
  maintenanceStations: Set<Block> = new Set<Block>();
  malfunctions: Set<Block> = new Set<Block>();
  robot: Block | null = null;
  robot2: Block | null = null; // Player 2 in 2-player mode
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
  private comboResetTimer = 0;
  private readonly COMBO_RESET_DELAY = 3000; // 3 secondes sans pellet = reset combo
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
  private bufferedDirection2: string | null = null; // Buffer for Player 2

  // Basic system state
  systemHealth = 3;
  systemHealth2 = 3; // Lives for Player 2
  efficiency = 0;
  efficiency2 = 0; // Score for Player 2
  gameOver = false;
  gameOver2 = false; // Game over state for Player 2
  playerName = ''; // Player name for leaderboard
  player2Name = ''; // Player 2 name
  gameMode: GameMode = 'classic'; // Make gameMode accessible in template
  maintenanceTimer = 0;
  maintenanceDuration = 10000; // 10 seconds in ms
  dataStreak = 0;
  efficiencyMultiplier = 1.0;
  productionLevel = 1;

  // Bonus System - Enhanced with multiple bonus types
  private bonusSpawnCooldown = 0;
  private currentBonusType: 'iot-sensor' | 'shield' | 'diagnostic' = 'diagnostic';
  private bonusEffectTimer = 0;
  private shieldActive = false;
  private qualityCheckpoints: Set<Block> = new Set<Block>();
  private controlPanels: Set<Block> = new Set<Block>();
  private readonly BONUS_ROTATION_INTERVAL = 8000; // Change bonus type every 8s
  private bonusRotationTimer = 0;
  private totalSensorData = 0; // Wird beim Laden der Map gesetzt

  // Checkpoint system
  private checkpointsCollected = 0;
  private pelletCountingEnabled = false;

  // Animation effects
  private robotRotation = 0;
  private bonusBounce = 0;
  private maintenancePulse = 0;
  private ledBlinkTimer = 0;

  // Visual feedback effects
  private damageFlash = 0;
  private successBurst = 0;
  private shieldRipples: Array<{radius: number, alpha: number}> = [];
  private comboDisplayTimer = 0;
  private maxHealthDisplayTimer = 0; // Timer for "MAX HEALTH" message
  private levelDisplayTimer = 0; // Timer for level announcement message

  // Death animation - maze destruction
  private mazeDestruction: Map<Block, {offsetY: number, rotation: number, speed: number}> = new Map();
  private gameOverParticles: Array<{x: number, y: number, vx: number, vy: number, size: number, color: string, alpha: number}> = [];
  private mazeRedIntensity = 0;

  // Particle System for visual effects
  private particles: Particle[] = [];


  // Malfunction Spawning Timer
  private malfunctionSpawnTimer = 0;

  // Track time spent in ghost house for each malfunction
  private ghostHouseTimer: Map<Block, number> = new Map();
  private readonly MAX_HOUSE_TIME = 20000; // 20 seconds max in house
  private readonly MALFUNCTION_SPAWN_INTERVAL = 800; // Spawn a malfunction roughly every 0.8s
  private malfunctionsActive = 0;

  // Scatter/Chase Mode (authentisches Pac-Man Verhalten)
  private malfunctionMode: 'random' | 'aggressive' | 'maintenance' = 'random';
  private modeTimer = 0;
  private modePhase = 0; // Aktuelle Phase im Scatter/Chase Zyklus
  // Einfachere Timings: Längere Scatter, kürzere Chase-Phasen
  private readonly modeDurations = [
    8000, 20000,  // Phase 0-1: 8s Scatter, 20s Chase
    7000, 20000,  // Phase 2-3: 7s Scatter, 20s Chase
    6000, 22000,  // Phase 4-5: 6s Scatter, 22s Chase
    5000, Infinity // Phase 6-7: 5s Scatter, dann permanent Chase
  ];

  // Pac-Man Animation
  private pacmanMouthAngle = 0.2; // Mund-Öffnung (0 = geschlossen, 0.5 = weit offen)
  private pacmanMouthDirection = 1; // 1 = öffnen, -1 = schließen
  private readonly MOUTH_SPEED = 0.08;

  // Power Pellet Blinken
  private powerPelletVisible = true;
  private powerPelletBlinkTimer = 0;

  // IFM Logo display control
  showIfmLogo = true;

  // Ready/Game Over Screen
  gameState: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete' | 'paused' | 'finalexplosion' = 'ready';
  private stateTimer = 0;
  private readonly READY_DURATION = 500; // 0.5 seconde "READY!"
  private readonly DEATH_DURATION = 300; // 0.3 seconde animation mort
  private readonly FINAL_EXPLOSION_DURATION = 1500; // 1.5 seconds final explosion
  private readonly LEVELCOMPLETE_DURATION = 1000; // 1 seconde Level-Übergang

  // Level-Progression: Geschwindigkeit und Frighten-Dauer pro Level
  private getGhostSpeed(): number {
  const baseSpeed = this.CELL_SIZE / 4;

  // Progressive speed increase: 15% per level after level 1 (faster difficulty increase)
  const speedMultiplier = 1.0 + (this.productionLevel - 1) * 0.15;

  // Level 1 easier: -65% speed
  const level1Multiplier = this.productionLevel === 1 ? 0.35 : 1.0;

  const speed = baseSpeed * speedMultiplier * level1Multiplier;
  return Math.min(speed, baseSpeed * 3.5); // Max 350% (higher cap)
}

private getMaxMalfunctionsForLevel(): number {
  // Level 1 = 2 ghosts, Level 2-3 = 3 ghosts, Level 4+ = 4 ghosts
  if (this.productionLevel === 1) return 2;
  if (this.productionLevel <= 3) return 3;
  return 4;
}

private getMalfunctionSpawnInterval(): number {
  // Level 1: slower spawn (1600ms), Level 2+: faster (800ms), Level 5+: very fast (600ms)
  if (this.productionLevel === 1) return 1600;
  if (this.productionLevel <= 4) return 800;
  return 600;
}



    private getMaintenanceDuration(): number {
    // Base frightened/maintenance time (ms)
    let baseDuration = 8000;

    // Level 1 easier: +5s
    if (this.productionLevel === 1) {
      baseDuration += 5000; // +5000ms
    }

    // Reduce maintenance duration by 300ms per level above level 1
    const reduction = (this.productionLevel - 1) * 300;
    return Math.max(baseDuration - reduction, 2000); // Minimum 2 seconds
  }

  private getMaintenanceDuration(): number {
    // Längere Maintenance-Zeit: Start mit 8s, -1s pro Level (einfacher für Anfänger)
    const baseDuration = 8000;
    const reduction = (this.productionLevel - 1) * 1000;
    return Math.max(baseDuration - reduction, 2000); // Minimum 2 Sekunden
  }

  // Legacy function for compatibility
  private getFrightenedDuration(): number {
    let base = 10000;

    // Level 1 bonus +5s
    if (this.productionLevel === 1) base += 5000;

    // Reduce frighten duration by 300ms per level above level 1
    const reduction = (this.productionLevel - 1) * 300;
    return Math.max(base - reduction, 3000); // Minimum 3 seconds
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
    // Fill with solid black to match classic labyrinth background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Coordinate annotations - transparent (hidden)
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(51, 51, 51, 0)';
    ctx.textAlign = 'center';
    for (let x = 100; x < this.CANVAS_WIDTH; x += 100) {
      ctx.fillText(`${x}`, x, 42);
    }
    ctx.textAlign = 'left';
    for (let y = 100; y < this.CANVAS_HEIGHT - 40; y += 100) {
      ctx.fillText(`${y}`, 5, y + 3);
    }

    // Draw decorative industrial elements
   // this.drawIndustrialDecorations(ctx);

    // Draw production line walls (pipes, conveyors, machinery)
    this.walls.forEach(wall => {
      ctx.save();

      // Apply death animation if in dying state
      if ((this.gameState === 'dying' || this.gameState === 'finalexplosion') && this.mazeDestruction.has(wall)) {
        const destruction = this.mazeDestruction.get(wall)!;
        ctx.translate(wall.x + wall.width / 2, wall.y + wall.height / 2 + destruction.offsetY);
        ctx.rotate(destruction.rotation);
        ctx.translate(-wall.width / 2, -wall.height / 2);
        ctx.globalAlpha = Math.max(0, 1 - destruction.offsetY / 200);
      } else {
        ctx.translate(wall.x, wall.y);
      }

      if (wall.type === 'ghost-door') {
        // Ghost Door with energy barrier effect
        if (this.ghostDoorImage.complete) {
          ctx.drawImage(this.ghostDoorImage, 0, 0, wall.width, wall.height);
        } else {
          // Industrial gate fallback
          ctx.fillStyle = '#505050';
          ctx.fillRect(0, 0, wall.width, wall.height);
          ctx.strokeStyle = '#ED6B00';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, wall.width, wall.height);
        }
      } else if (wall.image && wall.image.complete) {
        // Walls drawing with images
        if ((this.gameState === 'dying' || this.gameState === 'finalexplosion') && this.mazeRedIntensity > 0) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
          ctx.fillStyle = `rgba(255, 0, 0, ${this.mazeRedIntensity * 0.5})`;
          ctx.fillRect(0, 0, wall.width, wall.height);
        } else {
          ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
        }
      } else {
        // Fallback: Industrial pipe/conveyor style
        // Determine if horizontal or vertical
        const isHorizontal = wall.width > wall.height;

        // Main pipe/conveyor body - IFM orange
        const pipeGradient = isHorizontal
          ? ctx.createLinearGradient(0, 0, 0, wall.height)
          : ctx.createLinearGradient(0, 0, wall.width, 0);
        pipeGradient.addColorStop(0, '#FF9A33');
        pipeGradient.addColorStop(0.5, '#FF7A01');
        pipeGradient.addColorStop(1, '#E66A00');
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(0, 0, wall.width, wall.height);

        // Metallic edge highlight
        ctx.fillStyle = '#FF9A33';
        if (isHorizontal) {
          ctx.fillRect(0, 0, wall.width, 2);
        } else {
          ctx.fillRect(0, 0, 2, wall.height);
        }

        // Shadow edge
        ctx.fillStyle = '#CC6100';
        if (isHorizontal) {
          ctx.fillRect(0, wall.height - 2, wall.width, 2);
        } else {
          ctx.fillRect(wall.width - 2, 0, 2, wall.height);
        }

        // Subtle accent stripes with flow animation
        const flowOffset = (Date.now() / 100) % 20;
        ctx.strokeStyle = 'rgba(245, 245, 245, 0.2)';
        ctx.lineWidth = 1;
        if (isHorizontal) {
          for (let x = -flowOffset; x < wall.width; x += 20) {
            ctx.globalAlpha = 0.3 + Math.sin((x + flowOffset) / 10) * 0.2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, wall.height);
            ctx.stroke();
          }
        } else {
          for (let y = -flowOffset; y < wall.height; y += 20) {
            ctx.globalAlpha = 0.3 + Math.sin((y + flowOffset) / 10) * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(wall.width, y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Rivets/Bolts on pipes (every 40px)
        ctx.fillStyle = '#707070';
        if (isHorizontal && wall.width > 40) {
          for (let x = 20; x < wall.width; x += 40) {
            // Top rivet
            ctx.beginPath();
            ctx.arc(x, 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#404040';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Bottom rivet
            ctx.beginPath();
            ctx.arc(x, wall.height - 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (!isHorizontal && wall.height > 40) {
          for (let y = 20; y < wall.height; y += 40) {
            // Left rivet
            ctx.beginPath();
            ctx.arc(4, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#404040';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Right rivet
            ctx.beginPath();
            ctx.arc(wall.width - 4, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // Corner connectors/sensors at wall intersections
        if (wall.width === wall.height || (wall.width <= this.CELL_SIZE && wall.height <= this.CELL_SIZE)) {
          // Draw sensor/connector at corner with LED
          const sensorPulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
          ctx.fillStyle = '#ED6B00';
          ctx.fillRect(wall.width / 2 - 3, wall.height / 2 - 3, 6, 6);
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1;
          ctx.strokeRect(wall.width / 2 - 3, wall.height / 2 - 3, 6, 6);
          // LED indicator
          ctx.fillStyle = `rgba(0, 255, 136, ${sensorPulse})`;
          ctx.fillRect(wall.width / 2 - 1, wall.height / 2 - 1, 2, 2);
        }
      }

      ctx.restore();
    });

    // Sensordaten zeichnen (IoT sensor nodes - IFM style)
    this.sensorData.forEach(food => {
      ctx.save();
      // Draw sensor data pellet with glow effect
      if (this.sensorDataImage.complete) {
        ctx.drawImage(this.sensorDataImage, food.x, food.y, 8, 8);
      } else {
        // Fallback: Industrial IoT sensor node
        const sensorPulse = 0.6 + Math.sin(Date.now() / 200 + food.x + food.y) * 0.4;

        // Outer glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(0, 255, 136, ${sensorPulse * 0.5})`;
        ctx.fillStyle = '#00FF88';
        ctx.beginPath();
        ctx.arc(food.x + 4, food.y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(food.x + 4, food.y + 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Data transmission rings (animated)
        if (Math.random() < 0.05) {
          ctx.strokeStyle = `rgba(0, 255, 136, ${sensorPulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(food.x + 4, food.y + 4, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // Wartungsstationen zeichnen (Industrial Power Hubs)
    if (this.powerPelletVisible) {
      this.maintenanceStations.forEach(pellet => {
        ctx.save();
        if (this.maintenanceStationImage.complete) {
          // Pulse animation
          const scale = 1 + Math.sin(this.maintenancePulse) * 0.15;
          const offset = (pellet.width * (1 - scale)) / 2;

          // Orange glow with multiple layers
          ctx.shadowColor = '#ED6B00';
          ctx.shadowBlur = 20;
          ctx.drawImage(this.maintenanceStationImage,
            pellet.x + offset, pellet.y + offset,
            pellet.width * scale, pellet.height * scale);
          ctx.shadowBlur = 0;
        } else {
          // Fallback: Industrial maintenance hub with rotating elements
          const centerX = pellet.x + pellet.width / 2;
          const centerY = pellet.y + pellet.height / 2;
          const rotation = (Date.now() / 1000) % (Math.PI * 2);
          const pulse = 0.8 + Math.sin(this.maintenancePulse) * 0.2;

          // Outer glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ED6B00';

          // Main hub body
          ctx.fillStyle = '#ED6B00';
          ctx.fillRect(pellet.x + 4, pellet.y + 4, pellet.width - 8, pellet.height - 8);

          // Rotating segments
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation);
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${pulse})`;
            ctx.fillRect(-2, -pellet.width / 2 + 2, 4, 6);
          }
          ctx.rotate(-rotation);
          ctx.translate(-centerX, -centerY);

          ctx.shadowBlur = 0;

          // Center core
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Energy border
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 2;
          ctx.strokeRect(pellet.x + 2, pellet.y + 2, pellet.width - 4, pellet.height - 4);
        }
        ctx.restore();
      });
    }

    // Control Panels zeichnen (Industrial HMI panels)
    this.controlPanels.forEach(panel => {
      ctx.save();
      if (this.controlPanelImage.complete) {
        ctx.drawImage(this.controlPanelImage, panel.x, panel.y, this.CELL_SIZE, this.CELL_SIZE);
      } else {
        // Fallback: Industrial control panel
        // Panel body
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(panel.x, panel.y, this.CELL_SIZE, this.CELL_SIZE);

        // LCD screen area
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(panel.x + 3, panel.y + 3, this.CELL_SIZE - 6, 10);

        // LCD text
        ctx.font = '5px monospace';
        ctx.fillStyle = '#00FF88';
        ctx.fillText('OK', panel.x + 5, panel.y + 10);

        // Button array
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#404040';
          ctx.fillRect(panel.x + 4 + i * 6, panel.y + 16, 4, 4);
        }
      }

      // Multi-color LED indicators
      const leds = [
        { x: panel.x + this.CELL_SIZE - 5, y: panel.y + 5, color: '#00FF88', blink: 500 },
        { x: panel.x + this.CELL_SIZE - 5, y: panel.y + 10, color: '#ED6B00', blink: 700 },
        { x: panel.x + this.CELL_SIZE - 5, y: panel.y + 15, color: '#FFD700', blink: 900 }
      ];

      leds.forEach(led => {
        if (Math.floor(this.ledBlinkTimer / led.blink) % 2 === 0) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = led.color;
          ctx.fillStyle = led.color;
          ctx.beginPath();
          ctx.arc(led.x, led.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      ctx.restore();
    });    // Quality Checkpoints zeichnen (Quality inspection stations)
    this.qualityCheckpoints.forEach(checkpoint => {
      ctx.save();
      if (this.qualityCheckpointImage.complete) {
        ctx.drawImage(this.qualityCheckpointImage, checkpoint.x + 8, checkpoint.y + 8, 16, 16);
      }

      // Rotating scanner ring
      const rotation = (Date.now() / 500) % (Math.PI * 2);
      const centerX = checkpoint.x + 16;
      const centerY = checkpoint.y + 16;

      // Outer scanning ring
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI / 2);
      ctx.stroke();
      ctx.rotate(-rotation);
      ctx.translate(-centerX, -centerY);

      // Pulse rings (expanding)
      const pulsePhase = (Date.now() % 2000) / 2000;
      for (let i = 0; i < 3; i++) {
        const phase = (pulsePhase + i * 0.33) % 1;
        const radius = 8 + phase * 8;
        const alpha = 1 - phase;
        ctx.strokeStyle = `rgba(65, 105, 225, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center indicator
      ctx.fillStyle = '#4169E1';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#4169E1';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    // Cherry/Bonus zeichnen mit aktuellem Bonus-Typ (Industrial upgrades)
    if (this.cherry) {
      ctx.save();
      let bonusImage = this.cherryImage;
      switch (this.currentBonusType) {
        case 'iot-sensor':
          bonusImage = this.bonusIoTSensorImage;
          break;
        case 'shield':
          bonusImage = this.bonusShieldImage;
          break;
        case 'diagnostic':
          bonusImage = this.cherryImage;
          break;
      }

      // Bounce animation
      const bounceOffset = Math.sin(this.bonusBounce) * 4;
      const centerX = this.cherry.x + 16;
      const centerY = this.cherry.y + 16 + bounceOffset;

      // Rotating energy ring
      const rotation = (Date.now() / 1000) % (Math.PI * 2);
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      // Energy ring
      ctx.strokeStyle = '#ED6B00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Segments
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = '#00FF88';
        ctx.fillRect(-2, -18, 4, 4);
      }

      ctx.rotate(-rotation);
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = 1;

      // Bonus item with glow
      if (bonusImage.complete) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ED6B00';
        ctx.drawImage(bonusImage, this.cherry.x + 4, this.cherry.y + 4 + bounceOffset, 24, 24);
        ctx.shadowBlur = 0;
      } else {
        // Fallback: industrial upgrade icon
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ED6B00';
        ctx.fillStyle = '#ED6B00';
        ctx.fillRect(this.cherry.x + 8, this.cherry.y + 8 + bounceOffset, 16, 16);
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.cherry.x + 8, this.cherry.y + 8 + bounceOffset, 16, 16);
        ctx.shadowBlur = 0;

        // Type indicator
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        const icon = this.currentBonusType === 'shield' ? 'S' :
                     this.currentBonusType === 'iot-sensor' ? 'I' : 'D';
        ctx.fillText(icon, centerX, centerY + 3);
      }

      // Particle effects around bonus
      for (let i = 0; i < 4; i++) {
        const angle = (Date.now() / 500 + i * Math.PI / 2) % (Math.PI * 2);
        const dist = 20 + Math.sin(Date.now() / 300) * 5;
        const px = centerX + Math.cos(angle) * dist;
        const py = centerY + Math.sin(angle) * dist;

        ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + Math.sin(Date.now() / 200) * 0.5})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }    // Robot mit Animation zeichnen
    if (this.robot && this.gameState !== 'dying') {
      this.drawRobot(ctx);
    } else if (this.robot && this.gameState === 'dying') {
      this.drawDyingRobot(ctx);
    }

    // Draw Robot 2 (Player 2) in 2-player mode
    if (this.robot2 && this.gameMode === '2player' && this.gameState !== 'dying') {
      this.drawRobot2(ctx);
    }

    // Störungen zeichnen
    this.malfunctions.forEach(malfunction => {
      this.drawMalfunction(ctx, malfunction);
    });

    // Ghost-Ziele (Learn/Practice Mode)
    this.drawGhostTargets(ctx);

    // UI Overlay
    this.drawUI(ctx);

    // Industrial scanline effect (subtle)
    this.drawIndustrialScanlines(ctx);
  }

  private drawIndustrialScanlines(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Horizontal scanlines
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#000000';
    for (let y = 30; y < this.CANVAS_HEIGHT - 35; y += 4) {
      ctx.fillRect(0, y, this.CANVAS_WIDTH, 2);
    }

    // Moving scan beam
    const scanY = 30 + ((Date.now() / 20) % (this.CANVAS_HEIGHT - 65));
    const scanGradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    scanGradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
    scanGradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.05)');
    scanGradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = scanGradient;
    ctx.fillRect(0, scanY - 20, this.CANVAS_WIDTH, 40);

    ctx.restore();
  }

  // Animated background with gradient and particles
  private drawAnimatedBackground(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Animated gradient background
    const time = Date.now() / 5000;
    const gradient = ctx.createLinearGradient(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Dynamic colors based on time
    const hue1 = (time * 10) % 60; // Cycles through orange tones
    const hue2 = (time * 15 + 180) % 60; // Offset cyan tones

    gradient.addColorStop(0, `hsl(${hue1}, 15%, 98%)`);
    gradient.addColorStop(0.5, '#FFFFFF');
    gradient.addColorStop(1, `hsl(${hue2 + 180}, 20%, 97%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Floating particles
    const particleTime = Date.now();
    for (let i = 0; i < 15; i++) {
      const seed = i * 123.456;
      const x = ((particleTime / (30 + i * 2) + seed) % this.CANVAS_WIDTH);
      const y = ((particleTime / (40 + i * 3) + seed * 2) % this.CANVAS_HEIGHT);
      const size = 2 + (i % 3);
      const alpha = 0.1 + Math.sin(particleTime / 800 + i) * 0.05;

      const color = i % 3 === 0 ? '#ED6B00' : (i % 3 === 1 ? '#00FF88' : '#4D9FFF');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated diagonal waves
    ctx.globalAlpha = 0.03;
    const waveOffset = (particleTime / 30) % 150;
    for (let i = -this.CANVAS_HEIGHT; i < this.CANVAS_WIDTH + this.CANVAS_HEIGHT; i += 150) {
      ctx.strokeStyle = '#ED6B00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i + waveOffset, 0);
      ctx.lineTo(i + waveOffset + this.CANVAS_HEIGHT, this.CANVAS_HEIGHT);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawRobot(ctx: CanvasRenderingContext2D) {
    if (!this.robot) return;

    const centerX = this.robot.x + this.robot.width / 2;
    const centerY = this.robot.y + this.robot.height / 2;
    const size = this.robot.width - 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Smooth rotation based on direction
    const targetRotation = this.getTargetRotation(this.robot.direction);
    this.robotRotation += (targetRotation - this.robotRotation) * 0.2;
    ctx.rotate(this.robotRotation);

    // Boost trail effect
    if (this.turboSpeed && this.boostEnergy > 0) {
      const trailLength = 3;
      for (let i = 1; i <= trailLength; i++) {
        const alpha = 0.3 - (i * 0.1);
        const offset = -i * 4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ED6B00';
        ctx.fillRect(offset - size/2, -size/2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    // Draw ifm robot - Industrial AGV style
    // Main body with metallic gradient
    const bodyGradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    bodyGradient.addColorStop(0, '#FF8C00');
    bodyGradient.addColorStop(0.5, '#ED6B00');
    bodyGradient.addColorStop(1, '#D05500');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-size/2, -size/2, size, size);

    // Chassis border
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size/2, -size/2, size, size);

    // Corner rivets
    const rivetPositions = [
      [-size/2 + 2, -size/2 + 2],
      [size/2 - 2, -size/2 + 2],
      [-size/2 + 2, size/2 - 2],
      [size/2 - 2, size/2 - 2]
    ];
    ctx.fillStyle = '#404040';
    rivetPositions.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Direction indicator (front sensor array)
    const headSize = size * 0.4;
    let headX = 0, headY = 0;

    if (this.robot.direction === 'U') { headX = 0; headY = -size * 0.35; }
    else if (this.robot.direction === 'D') { headX = 0; headY = size * 0.35; }
    else if (this.robot.direction === 'L') { headX = -size * 0.35; headY = 0; }
    else if (this.robot.direction === 'R') { headX = size * 0.35; headY = 0; }

    // Front sensor housing
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(headX - headSize/2, headY - headSize/2, headSize, headSize);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 1;
    ctx.strokeRect(headX - headSize/2, headY - headSize/2, headSize, headSize);

    // Active sensor LEDs
    const ledPulse = 0.5 + Math.sin(Date.now() / 100) * 0.5;
    ctx.fillStyle = `rgba(0, 255, 136, ${ledPulse})`;
    if (this.robot.direction === 'U' || this.robot.direction === 'D') {
      ctx.fillRect(headX - 3, headY - 1, 2, 2);
      ctx.fillRect(headX + 1, headY - 1, 2, 2);
    } else {
      ctx.fillRect(headX - 1, headY - 3, 2, 2);
      ctx.fillRect(headX - 1, headY + 1, 2, 2);
    }

    // Central IFM logo/indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // IFM letters (simplified)
    ctx.fillStyle = '#ED6B00';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ifm', 0, 1);

    // Boost glow effect
    if (this.turboSpeed && this.boostEnergy > 0) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ED6B00';
      ctx.strokeStyle = '#ED6B00';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size/2 - 2, -size/2 - 2, size + 4, size + 4);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Speed lines when boosting
    if (this.turboSpeed && this.boostEnergy > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ED6B00';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const angle = this.robotRotation + Math.PI + (Math.random() - 0.5) * 0.5;
        const dist = 15 + Math.random() * 10;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawRobot2(ctx: CanvasRenderingContext2D) {
    if (!this.robot2) return;

    const centerX = this.robot2.x + this.robot2.width / 2;
    const centerY = this.robot2.y + this.robot2.height / 2;
    const size = this.robot2.width - 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Smooth rotation based on direction
    const targetRotation = this.getTargetRotation(this.robot2.direction);
    ctx.rotate(targetRotation);

    // Boost trail effect for Player 2
    if (this.turboSpeed2 && this.boostEnergy2 > 0) {
      const trailLength = 3;
      for (let i = 1; i <= trailLength; i++) {
        const alpha = 0.3 - (i * 0.1);
        const offset = -i * 4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#4D9FFF';
        ctx.fillRect(offset - size/2, -size/2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    // Main body with blue gradient for Player 2
    const bodyGradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    bodyGradient.addColorStop(0, '#4D9FFF');
    bodyGradient.addColorStop(0.5, '#0080FF');
    bodyGradient.addColorStop(1, '#0066CC');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-size/2, -size/2, size, size);

    // Chassis border
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size/2, -size/2, size, size);

    // Corner rivets
    const rivetPositions = [
      [-size/2 + 2, -size/2 + 2],
      [size/2 - 2, -size/2 + 2],
      [-size/2 + 2, size/2 - 2],
      [size/2 - 2, size/2 - 2]
    ];
    ctx.fillStyle = '#404040';
    rivetPositions.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player 2 indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P2', 0, 2);

    ctx.restore();
  }

  private getTargetRotation(direction: string): number {
    switch (direction) {
      case 'U': return -Math.PI / 2;
      case 'D': return Math.PI / 2;
      case 'L': return Math.PI;
      case 'R': return 0;
      default: return 0;
    }
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

    // Robot body (orange, flickering)
    ctx.fillStyle = '#ED6B00';
    ctx.fillRect(-size/2, -size/2, size, size);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size/2, -size/2, size, size);

    // "Error" indicators (red flashing)
    if (Math.sin(progress * 30) > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(-2, -2, 4, 4);
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
    // Draw industrial frame around game area
    this.drawIndustrialDecorations(ctx);


    // IFM Logo on the score bar - moved to very top, outside game field
    ctx.save();

    // Logo background plate - WHITE for maximum visibility (smaller, at absolute top)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(18, 2, 60, 18);

    // Border - thick orange border
    ctx.strokeStyle = '#ED6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 2, 60, 18);

    // IFM letters - smaller to fit in top bar without overlapping
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ED6B00';
    ctx.fillStyle = '#ED6B00';

    // Letter I
    ctx.fillRect(23, 6, 5, 12);

    // Letter F
    ctx.fillRect(33, 6, 5, 12);
    ctx.fillRect(33, 6, 11, 4);
    ctx.fillRect(33, 12, 9, 3);

    // Letter M
    ctx.fillRect(50, 6, 5, 12);
    ctx.fillRect(50, 6, 4, 4);
    ctx.fillRect(56, 8, 3, 3);
    ctx.fillRect(60, 6, 4, 4);
    ctx.fillRect(64, 6, 5, 12);

    ctx.shadowBlur = 0;
    ctx.restore();

    // Score as industrial KPIs - In top bar (y=10-25)
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'left';

    // In 2-player mode, show both scores and lives (moved outward)
    if (this.gameMode === '2player') {
      // Player 1 Score - Large display bottom left (scaled up 20%, moved outward, above border)
      ctx.fillStyle = '#ED6B00';
      ctx.font = 'bold 19px "Press Start 2P", monospace';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ED6B00';
      ctx.fillText(`${this.efficiency}`, 18, this.CANVAS_HEIGHT - 26);
      ctx.shadowBlur = 0;

      // Draw P1 lives as squares - below score (scaled up 20%, moved outward, above border)
      for (let i = 0; i < this.systemHealth; i++) {
        ctx.fillStyle = '#ED6B00';
        ctx.fillRect(18 + i * 14, this.CANVAS_HEIGHT - 50, 12, 12);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(18 + i * 14, this.CANVAS_HEIGHT - 50, 12, 12);
      }

      // Player 2 Score - Large display bottom right (scaled up 20%, moved outward, above border)
      ctx.fillStyle = '#4D9FFF';
      ctx.textAlign = 'right';
      ctx.font = 'bold 19px "Press Start 2P", monospace';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#4D9FFF';
      ctx.fillText(`${this.efficiency2}`, this.CANVAS_WIDTH - 18, this.CANVAS_HEIGHT - 26);
      ctx.shadowBlur = 0;

      // Draw P2 lives as squares - below score (scaled up 20%, moved outward, above border)
      for (let i = 0; i < this.systemHealth2; i++) {
        ctx.fillStyle = '#4D9FFF';
        ctx.fillRect(this.CANVAS_WIDTH - 30 - i * 14, this.CANVAS_HEIGHT - 50, 12, 12);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(this.CANVAS_WIDTH - 30 - i * 14, this.CANVAS_HEIGHT - 50, 12, 12);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1a1a1a';
    } else {
      // Single player mode - Large score display at bottom center (scaled up 20%, moved outward, above border)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ED6B00';
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ED6B00';
      ctx.fillText(`${this.efficiency}`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT - 28);
      ctx.shadowBlur = 0;

      // Draw lives as squares above score, centered (scaled up 20%, moved outward, above border)
      const livesStartX = (this.CANVAS_WIDTH / 2) - ((this.systemHealth * 14) / 2);
      for (let i = 0; i < this.systemHealth; i++) {
        ctx.fillStyle = '#ED6B00';
        ctx.fillRect(livesStartX + i * 14, this.CANVAS_HEIGHT - 60, 12, 12);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(livesStartX + i * 14, this.CANVAS_HEIGHT - 60, 12, 12);
      }

      ctx.textAlign = 'left';
    }

    // Production Level - Center in top bar (scaled up 20%, moved outward)
    const TOP_BAR_CENTER_Y = 15 + 15; // TOP_BAR_Y + center offset
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.fillStyle = '#1a1a1a';

    if (this.gameMode === '2player') {
      // Show player names on same line as level - larger and more visible
      ctx.fillStyle = '#1a1a1a';
      const levelText = `LVL ${this.productionLevel}`;
      ctx.fillText(levelText, this.CANVAS_WIDTH / 2, TOP_BAR_CENTER_Y);

      // Player 1 name (Orange) - Left of center, larger font (scaled up 20%, moved outward)
      ctx.fillStyle = '#ED6B00';
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.fillText(this.playerName || 'PLAYER1', this.CANVAS_WIDTH / 2 - 60, TOP_BAR_CENTER_Y);

      // Player 2 name (Blue) - Right of center, larger font (scaled up 20%, moved outward)
      ctx.fillStyle = '#4D9FFF';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.fillText(this.player2Name || 'PLAYER2', this.CANVAS_WIDTH / 2 + 60, TOP_BAR_CENTER_Y);
    } else {
      ctx.fillText(`LVL: ${this.productionLevel}`, this.CANVAS_WIDTH / 2, TOP_BAR_CENTER_Y);
    }

    ctx.textAlign = 'left';

    // High Score as "Best Performance" (scaled up 20%, moved outward)
    ctx.textAlign = 'right';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#ED6B00';
    const hiScorePercent = Math.min(100, Math.floor((this.getHighScore() / 1000) * 100));
    ctx.fillText(`BEST: ${hiScorePercent}%`, this.CANVAS_WIDTH - 18, 69);

    // Practice Mode Status-Anzeige (scaled up 20%, moved outward, below top bar)
    if (this.gameMode === 'practice') {
      ctx.font = '10px monospace';
      let statusY = 50; // Below top bar (15 + 30 + 5)
      if (this.isInvincible) {
        ctx.fillStyle = '#00FF88';
        ctx.fillText('SAFETY MODE', this.CANVAS_WIDTH - 18, statusY);
        statusY += 14;
      }
      if (this.turboSpeed && this.boostEnergy > 0) {
        ctx.fillStyle = '#ED6B00';
        ctx.fillText('BOOST ACTIVE', this.CANVAS_WIDTH - 18, statusY);
        statusY += 14;
      }
      if (this.slowMotion < 1.0) {
        ctx.fillStyle = '#4D9FFF';
        ctx.fillText(`SLOW ${this.slowMotion}x`, this.CANVAS_WIDTH - 18, statusY);
      }
    }
    ctx.textAlign = 'left';

    // Combo counter display - center of maze (scaled up 20%)
    if (this.pelletStreak >= 10 && this.comboDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 19px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const comboAlpha = this.comboDisplayTimer / 1000;
      ctx.fillStyle = `rgba(237, 107, 0, ${comboAlpha})`; // IFM Orange
      ctx.fillText(`${this.pelletStreak}x COMBO!`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
      ctx.restore();
    }

    // Max Health message display - center of maze (same style as combo)
    if (this.maxHealthDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const healthAlpha = this.maxHealthDisplayTimer / 1000;
      ctx.fillStyle = `rgba(255, 215, 0, ${healthAlpha})`; // Gold color
      ctx.fillText('MAX HEALTH!', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 40);
      ctx.restore();
    }

    // Level announcement display - same style as combo (simple text, no box)
    if (this.levelDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const levelAlpha = this.levelDisplayTimer / 2000; // Fade based on timer
      ctx.fillStyle = `rgba(255, 215, 0, ${levelAlpha})`; // Gold color like MAX HEALTH
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(255, 215, 0, ${levelAlpha})`;
      ctx.fillText(`LEVEL ${this.productionLevel}`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
      ctx.restore();
    }
      ctx.lineWidth = 4;
    // Level announcement display - same style as combo (simple text, no box)
    if (this.levelDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const levelAlpha = this.levelDisplayTimer / 2000; // Fade based on timer
      ctx.fillStyle = `rgba(255, 215, 0, ${levelAlpha})`; // Gold color like MAX HEALTH
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(255, 215, 0, ${levelAlpha})`;
      ctx.fillText(`LEVEL ${this.productionLevel}`, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
      ctx.restore();
    }

    // Draw particles
    this.drawParticles(ctx);

    // Draw Advanced Maze Features
    this.drawAdvancedMazeFeatures(ctx);

    // Apply dynamic lighting effect
    if (this.lightingEnabled && this.gameState === 'playing') {
      this.drawDynamicLighting(ctx);
    }

    // Draw Energy Gauge for Boost
    this.drawEnergyGauge(ctx);
    if (this.gameMode === '2player') {
      this.drawEnergyGauge2(ctx);
    }

    // Lives now shown as colored squares in top bar for all modes

    // Active bonus effects display with circular progress (scaled up 20%, moved outward)
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    let effectY = this.CANVAS_HEIGHT - 42;

    if (this.shieldActive) {
      // Shield text
      ctx.fillStyle = '#4169E1';
      ctx.fillText('🛡️ SHIELD', this.CANVAS_WIDTH - 66, effectY);

      // Circular progress bar
      const progress = this.bonusEffectTimer / 10000; // 10 seconds max
      const centerX = this.CANVAS_WIDTH - 30;
      const centerY = effectY - 6;
      const radius = 10;

      // Background circle
      ctx.strokeStyle = 'rgba(65, 105, 225, 0.3)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Progress arc
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
      ctx.stroke();

      effectY -= 30;
    }

    ctx.textAlign = 'left';

    // Draw particles on top of everything
    this.drawParticles(ctx);

    // Damage flash effect
    if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlash})`;
      ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    }

    // Success burst effect for checkpoints
    if (this.successBurst > 0) {
      ctx.save();
      ctx.globalAlpha = this.successBurst;
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const radius = 50 + (1 - this.successBurst) * 100 + i * 20;
        ctx.beginPath();
        ctx.arc(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Shield ripple effect
    this.shieldRipples.forEach(ripple => {
      if (this.robot) {
        ctx.save();
        ctx.globalAlpha = ripple.alpha;
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.robot.x + this.robot.width / 2, this.robot.y + this.robot.height / 2, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

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

    // Final explosion screen - ULTRA ENHANCED with massive effects
    if (this.gameState === 'finalexplosion') {
      ctx.save();
      const explosionProgress = this.stateTimer / this.FINAL_EXPLOSION_DURATION;
      const time = Date.now() / 1000;

      // Generate MASSIVE particle explosion
      if (this.stateTimer < 100 && this.gameOverParticles.length === 0) {
        for (let i = 0; i < 150; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 8;
          const colors = ['#FF0000', '#FF7A01', '#FFAA00', '#FF3300', '#FFFFFF'];
          this.gameOverParticles.push({
            x: this.CANVAS_WIDTH / 2,
            y: this.CANVAS_HEIGHT / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0
          });
        }
      }

      // Dramatic screen shake with decay
      const shakeIntensity = explosionProgress < 0.4 ? (0.4 - explosionProgress) / 0.4 : 0;
      const shake = (Math.random() - 0.5) * 20 * shakeIntensity;
      ctx.translate(shake, shake * 0.7);

      // Radial gradient explosion background
      const centerX = this.CANVAS_WIDTH / 2;
      const centerY = this.CANVAS_HEIGHT / 2;
      const radius = Math.max(this.CANVAS_WIDTH, this.CANVAS_HEIGHT) * explosionProgress * 1.5;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${0.6 * explosionProgress})`);
      gradient.addColorStop(0.5, `rgba(255, 122, 1, ${0.4 * explosionProgress})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

      // Pulsating wave rings
      for (let i = 0; i < 3; i++) {
        const waveProgress = (explosionProgress + i * 0.2) % 1;
        const waveRadius = waveProgress * 400;
        const waveAlpha = (1 - waveProgress) * 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 122, 1, ${waveAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Update and draw particles with trails
      for (let i = this.gameOverParticles.length - 1; i >= 0; i--) {
        const p = this.gameOverParticles[i];

        // Draw trail
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha * 0.3})`.replace('#', 'rgba(').replace(/([0-9A-F]{2})/gi, (m) => parseInt(m, 16) + ','));
        ctx.fillRect(p.x - p.vx, p.y - p.vy, p.size * 0.5, p.size * 0.5);

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.99; // air resistance
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          // Main particle with glow
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`.replace('#', 'rgba(').replace(/([0-9A-F]{2})/gi, (m) => parseInt(m, 16) + ','));
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          this.gameOverParticles.splice(i, 1);
        }
      }
      ctx.shadowBlur = 0;

      // Intense RGB split glitch effect
      if (Math.random() > 0.6) {
        const glitchY = Math.random() * this.CANVAS_HEIGHT;
        const glitchHeight = 30 + Math.random() * 60;
        const glitchOffset = (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
        ctx.fillRect(glitchOffset, glitchY, this.CANVAS_WIDTH, glitchHeight);
        ctx.fillStyle = `rgba(0, 255, 255, 0.3)`;
        ctx.fillRect(-glitchOffset, glitchY, this.CANVAS_WIDTH, glitchHeight);
      }

      // Lightning effect
      if (explosionProgress < 0.6 && Math.random() > 0.8) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (0.6 - explosionProgress)})`;
        ctx.lineWidth = 2 + Math.random() * 3;
        ctx.beginPath();
        const startX = Math.random() * this.CANVAS_WIDTH;
        ctx.moveTo(startX, 0);
        for (let y = 0; y < this.CANVAS_HEIGHT; y += 20) {
          ctx.lineTo(startX + (Math.random() - 0.5) * 40, y);
        }
        ctx.stroke();
      }

      // GAME OVER text with extreme effects
      ctx.font = 'bold 56px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Multiple chromatic aberration layers
      const aberrationLayers = [
        {color: 'rgba(255, 0, 0, 0.7)', x: -6, y: -6},
        {color: 'rgba(0, 255, 0, 0.5)', x: 0, y: 6},
        {color: 'rgba(0, 255, 255, 0.7)', x: 6, y: -3},
        {color: 'rgba(255, 0, 255, 0.5)', x: -3, y: 3}
      ];

      for (const layer of aberrationLayers) {
        ctx.fillStyle = layer.color;
        ctx.fillText('GAME OVER', centerX + layer.x + Math.sin(time * 10) * 2, centerY - 30 + layer.y);
      }

      // Main text with massive glow
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 60 + Math.sin(time * 8) * 20;
      ctx.fillStyle = `rgba(255, 255, 255, ${explosionProgress})`;
      ctx.fillText('GAME OVER', centerX, centerY - 30);

      // Super intense flickering
      if (Math.floor(time * 20) % 2 === 0) {
        ctx.shadowBlur = 80;
        ctx.shadowColor = '#FFFF00';
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText('GAME OVER', centerX, centerY - 30);
      }

      // Distortion effect on text
      if (explosionProgress < 0.5 && Math.random() > 0.7) {
        ctx.save();
        ctx.translate(centerX, centerY - 30);
        ctx.scale(1 + (Math.random() - 0.5) * 0.1, 1 + (Math.random() - 0.5) * 0.1);
        ctx.fillStyle = 'rgba(255, 122, 1, 0.5)';
        ctx.fillText('GAME OVER', 0, 0);
        ctx.restore();
      }

      // Animated subtitle with intense glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FF7A01';
      ctx.font = 'bold 20px "Press Start 2P", monospace';
      const subtitleAlpha = Math.max(0, explosionProgress - 0.15) / 0.85;
      ctx.fillStyle = `rgba(255, 122, 1, ${subtitleAlpha})`;
      const subtitleY = centerY + 25 + Math.sin(time * 4) * 3;
      ctx.fillText('>>> CRITICAL SYSTEM FAILURE <<<', centerX, subtitleY);

      // Error code for dramatic effect
      if (subtitleAlpha > 0.5) {
        ctx.shadowBlur = 5;
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillStyle = `rgba(255, 0, 0, ${subtitleAlpha * 0.7})`;
        ctx.fillText(`ERROR CODE: 0x${Math.floor(time * 100).toString(16).toUpperCase()}`, centerX, subtitleY + 25);
      }

      // Animated score with extreme pulsing
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFFFFF';
      ctx.font = 'bold 18px "Press Start 2P", monospace';
      const scoreScale = 1 + Math.sin(time * 6) * 0.15;
      ctx.save();
      ctx.translate(centerX, centerY + 75);
      ctx.scale(scoreScale, scoreScale);
      ctx.fillStyle = `rgba(255, 255, 255, ${subtitleAlpha})`;
      ctx.fillText(`FINAL SCORE: ${this.score}`, 0, 0);
      ctx.restore();

      // Warning bars with animation
      if (explosionProgress > 0.2) {
        const barAlpha = (explosionProgress - 0.2) / 0.8;
        const barHeight = 8;
        const barPulse = Math.sin(time * 10) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 122, 1, ${barAlpha * barPulse})`;
        ctx.fillRect(0, 0, this.CANVAS_WIDTH, barHeight);
        ctx.fillRect(0, this.CANVAS_HEIGHT - barHeight, this.CANVAS_WIDTH, barHeight);

        // Animated corner brackets
        ctx.strokeStyle = `rgba(255, 122, 1, ${barAlpha})`;
        ctx.lineWidth = 3;
        const cornerSize = 40;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(0, cornerSize);
        ctx.lineTo(0, 0);
        ctx.lineTo(cornerSize, 0);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(this.CANVAS_WIDTH - cornerSize, 0);
        ctx.lineTo(this.CANVAS_WIDTH, 0);
        ctx.lineTo(this.CANVAS_WIDTH, cornerSize);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(0, this.CANVAS_HEIGHT - cornerSize);
        ctx.lineTo(0, this.CANVAS_HEIGHT);
        ctx.lineTo(cornerSize, this.CANVAS_HEIGHT);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(this.CANVAS_WIDTH - cornerSize, this.CANVAS_HEIGHT);
        ctx.lineTo(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        ctx.lineTo(this.CANVAS_WIDTH, this.CANVAS_HEIGHT - cornerSize);
        ctx.stroke();
      }

      // CRT scanlines
      for (let y = 0; y < this.CANVAS_HEIGHT; y += 3) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * explosionProgress})`;
        ctx.fillRect(0, y, this.CANVAS_WIDTH, 1);
      }

      // Vignette effect
      const vignetteGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(this.CANVAS_WIDTH, this.CANVAS_HEIGHT) * 0.8);
      vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${0.5 * explosionProgress})`);
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

      ctx.restore();
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
    // Draw life icon using SVG
    if (this.lifeIconImage.complete) {
      const size = 20; // Size of the life icon
      ctx.drawImage(this.lifeIconImage, x - size / 2, y - size / 2, size, size);
    } else {
      // Fallback: Draw small ifm robot icon
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
    }
  }

  private createParticles(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: 2 + Math.random() * 2
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      p.life -= 0.02;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
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
  isInvincible = false;      // Practice Mode: Unverwundbarkeit
  slowMotion = 1.0;          // Practice Mode: Zeitlupe (1.0 = normal)
  turboSpeed = false;        // Turbo Mode: 2x Geschwindigkeit
  turboSpeed2 = false;       // Player 2 Turbo Mode

  // Energy Gauge System for Turbo
  private boostEnergy = 100;           // Current energy (0-100)
  private boostEnergy2 = 100;          // Player 2 energy (0-100)
  private readonly MAX_BOOST_ENERGY = 100;
  private readonly BOOST_DRAIN_RATE = 40;  // Energy consumed per second (was 25)
  private readonly BOOST_RECHARGE_RATE = 8; // Energy recharged per second when not boosting (was 15)
  private isBoostKeyPressed = false;
  private isBoostKeyPressed2 = false;  // Player 2 boost state

  // Dynamic Lighting System
  private lightingEnabled = false;
  private flashlightRadius = 120;
  private ambientDarkness = 0.85; // 0 = fully dark, 1 = fully lit

  // Voice Announcements
  private lastAnnouncement = '';
  private announcementCooldown = 0;

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

  showPauseOverlay = false;
  pauseMenuIndex = 0; // 0 = Resume, 1 = Restart, 2 = Exit
  gameOverMenuIndex = 0; // 0 = Restart, 1 = Menu
  showSpielanleitung = false;
  spielanleitungSlide = 0;
  private gamepadPollInterval: any;
  private lastGamepadSpielanleitungAction = 0;
  private lastGamepadMenuAction = 0;
  private readonly GAMEPAD_MENU_COOLDOWN = 200; // ms between menu actions

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
    // Malfunction images (ghost equivalents)
    this.blueGhostImage.src = 'assets/svg/malfunction-vibration.svg';  // Cyan = Vibration
    this.orangeGhostImage.src = 'assets/svg/malfunction-wear.svg';     // Orange = Wear
    this.pinkGhostImage.src = 'assets/svg/malfunction-pressure.svg';   // Pink = Pressure
    this.redGhostImage.src = 'assets/svg/malfunction-temperature.svg'; // Red = Temperature

    // Robot directional sprites
    this.robotUpImage.src = 'assets/svg/robot-up.svg';
    this.robotDownImage.src = 'assets/svg/robot-down.svg';
    this.robotLeftImage.src = 'assets/svg/robot-left.svg';
    this.robotRightImage.src = 'assets/svg/robot-right.svg';

    // Game elements
    this.wallImage.src = 'assets/svg/wall.svg';
    this.sensorDataImage.src = 'assets/svg/sensor-data.svg';
    this.maintenanceStationImage.src = 'assets/svg/maintenance-station.svg';
    this.ghostDoorImage.src = 'assets/svg/ghost-door.svg';
    this.lifeIconImage.src = 'assets/svg/life-icon.svg';
    this.powerFoodImage.src = 'assets/svg/maintenance-station.svg';
    this.scaredGhostImage.src = 'assets/svg/malfunction-temperature.svg';
    this.cherryImage.src = 'assets/svg/bonus-diagnostic.svg';

    // Additional industrial elements
    this.wallCornerImage.src = 'assets/svg/wall-corner.svg';
    this.conveyorBeltImage.src = 'assets/svg/conveyor-belt.svg';
    this.pipeJunctionImage.src = 'assets/svg/pipe-junction.svg';
    this.hazardTileImage.src = 'assets/svg/hazard-tile.svg';
    this.controlPanelImage.src = 'assets/svg/control-panel.svg';
    this.qualityCheckpointImage.src = 'assets/svg/quality-checkpoint.svg';
    this.bonusIoTSensorImage.src = 'assets/svg/bonus-iot-sensor.svg';
    this.bonusSpeedImage.src = 'assets/svg/bonus-speed.svg';
    this.bonusShieldImage.src = 'assets/svg/bonus-shield.svg';
  }
  // Classic Industrial Factory Labyrinth (Original Map)
  // X = Wall, ' ' = Pellet, O = Power Pellet, - = Ghost House Door
  // P = Pac-Man Start, r/p/b/o = Ghosts (red/pink/blue/orange)
  // T = Tunnel (Wraparound), G = Ghost House Interior (no pellet)
  // Q = Quality Checkpoint (special bonus)
  private readonly tileMap: string[] = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // 0
    "X     Q      XX      Q     X",  // 1 - Quality checkpoints
    "X XXXX XXX   XX   XXX XXXX X",  // 2
    "XO     XXX   XX   XXX     OX",  // 3
    "X XXXX XXX   XX   XXX XXXX X",  // 4
    "X                          X",  // 5
    "X XXXX XX XX  XXXX XX XXXX X",  // 6
    "X XXXX XX XX  XXXX XX XXXX X",  // 7
    "X   Q  XX    XX    XX  Q   X",  // 8 - Quality checkpoints
    "XXXXXX XXX   XX   XXX XXXXXX",  // 9
    "X..    XXXXX XX XXXXX    ..X",  // 10
    "X.     XX          XX     .X",  // 11
    "X..    XX XXX--XXX XX    ..X",  // 12
    "XXXXXX XX XGrGGGGX XX XXXXXX",  // 13
    "T         XGbGpGoX         T",  // 14
    "XXXXXX XX XGGGGGGX XX XXXXXX",  // 15
    "X      XX XXXXXXXX XX      X",  // 16
    "X      XX          XX      X",  // 17
    "X      XX XXXXXXXX XX      X",  // 18
    "XXXXXX XX XXXXXXXX XX XXXXXX",  // 19
    "X            XX            X",  // 20
    "X XXXX XXX   XX   XXX XXXX X",  // 21
    "X XXXX XXX   XX   XXX XXXX X",  // 22
    "XO  XX       P        XX  OX",  // 23
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
          this.robot = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.robotRightImage);
          // Create Player 2 robot in 2-player mode
          if (this.gameMode === '2player') {
            // Player 2 starts 3 cells to the right
            this.robot2 = new Block(x + 3 * this.CELL_SIZE, y, this.CELL_SIZE, this.CELL_SIZE, this.robotRightImage);
          }
        } else if (tileMapChar === 'Q') {
          // Quality Checkpoint - special bonus location
          const checkpoint = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.qualityCheckpointImage);
          checkpoint.type = 'quality-checkpoint';
          this.qualityCheckpoints.add(checkpoint);
        } else if (tileMapChar === '.') {
          // Control Panel - decorative element
          const controlPanel = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.controlPanelImage);
          controlPanel.type = 'control-panel';
          this.controlPanels.add(controlPanel);
        } else if (tileMapChar === ' ') {
          // kleines Pellet in der Mitte der Zelle - Produktionsauftrag
          this.sensorData.add(new Block(x + this.CELL_SIZE / 2 - 2, y + this.CELL_SIZE / 2 - 2, 4, 4, null));
        } else if (tileMapChar === 'O') {
          // Power Pellet - KI-Optimierung
          const powerPellet = new Block(x + this.CELL_SIZE / 2 - 4, y + this.CELL_SIZE / 2 - 4, 8, 8, null);
          this.maintenanceStations.add(powerPellet);
        } else if (tileMapChar === 'T') {
          // Tunnel - kein Pellet, aber passierbar (Wraparound)
          // Nichts hinzufügen - bleibt leer
        } else if (tileMapChar === 'G') {
          // Ghost House Interior - kein Pellet
          // Nichts hinzufügen - bleibt leer
        }
      }
    }
    // Aggressiver (roter) Sensor soll nie in der Ghost-Box starten
    const aggressiveGhost = [...this.ghosts].find(g => g.type === 'aggressive');
    if (aggressiveGhost) {
      const spawnX = 13.5 * this.CELL_SIZE; // direkt vor der Ghost-Tür (außerhalb)
      const spawnY = 11 * this.CELL_SIZE;
      aggressiveGhost.x = spawnX;
      aggressiveGhost.y = spawnY;
      aggressiveGhost.startX = spawnX;
      aggressiveGhost.startY = spawnY;
      aggressiveGhost.direction = 'L';
      aggressiveGhost.updateVelocity(this.CELL_SIZE);
    }

    // For levels >= 2, also release patrol ghost (cyan) outside immediately
    if (this.productionLevel >= 2) {
      const patrolGhost = [...this.ghosts].find(g => g.type === 'patrol');
      if (patrolGhost) {
        const spawnX = 11 * this.CELL_SIZE;
        const spawnY = 11 * this.CELL_SIZE;
        patrolGhost.x = spawnX;
        patrolGhost.y = spawnY;
        patrolGhost.startX = spawnX;
        patrolGhost.startY = spawnY;
        patrolGhost.direction = 'L';
        patrolGhost.updateVelocity(this.CELL_SIZE);
      }
    }

    // For levels >= 3, also release ambush ghost (pink) outside
    if (this.productionLevel >= 3) {
      const ambushGhost = [...this.ghosts].find(g => g.type === 'ambush');
      if (ambushGhost) {
        const spawnX = 16 * this.CELL_SIZE;
        const spawnY = 11 * this.CELL_SIZE;
        ambushGhost.x = spawnX;
        ambushGhost.y = spawnY;
        ambushGhost.startX = spawnX;
        ambushGhost.startY = spawnY;
        ambushGhost.direction = 'R';
        ambushGhost.updateVelocity(this.CELL_SIZE);
      }
    }

    // For levels >= 4, also release random ghost (orange) outside
    if (this.productionLevel >= 4) {
      const randomGhost = [...this.ghosts].find(g => g.type === 'random');
      if (randomGhost) {
        const spawnX = 14 * this.CELL_SIZE;
        const spawnY = 8 * this.CELL_SIZE;
        randomGhost.x = spawnX;
        randomGhost.y = spawnY;
        randomGhost.startX = spawnX;
        randomGhost.startY = spawnY;
        randomGhost.direction = 'U';
        randomGhost.updateVelocity(this.CELL_SIZE);
      }
    }

    // Speichere Gesamtanzahl der Pellets für Cherry-Spawn
    this.totalPellets = this.foods.size + this.powerPellets.size;

    // Initialize advanced maze features
    this.initializeAdvancedMazeFeatures();
  }
  ngOnInit(): void{
    console.log('🎮 GameCanvasComponent initialized');

    // Lese Spielmodus und Spielername aus Query-Parametern
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'] as GameMode;
      if (mode && ['classic', 'practice', '2player'].includes(mode)) {
        this.gameMode = mode;
        this.applyGameMode();
      }

      // Lese Spielername
      const playerName = params['playerName'] as string;
      if (playerName) {
        this.playerName = playerName;
        console.log(`👤 Player 1: ${this.playerName}`);
      }

      const player2Name = params['player2Name'] as string;
      if (player2Name) {
        this.player2Name = player2Name;
        console.log(`👤 Player 2: ${this.player2Name}`);
      }
    });

    this.game = new GameManager(this.GRID_WIDTH, this.GRID_HEIGHT);
    if (this.game.maze) {
      console.log('🏭 Game created:', this.game.maze.countRemainingDots(), 'dots');
    }

    // Initialisiere Patrol-Route für CYAN Sensor
    this.initPatrolRoute();

    // Initialize decorative industrial elements
    this.initializeIndustrialDecorations();

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

    // Display level announcement at game start
    this.levelDisplayTimer = 2500; // Display for 2.5 seconds

    // Announce game start
    setTimeout(() => {
      this.announce('PRODUCTION SEQUENCE INITIATED');
    }, 500);
  }

  private onKeyUpBound = (e: KeyboardEvent) => this.onKeyUp(e);

  // Voice Announcement System
  private announce(text: string) {
    if (this.lastAnnouncement === text && this.announcementCooldown > 0) {
      return; // Avoid repeating same announcement too quickly
    }

    this.lastAnnouncement = text;
    this.announcementCooldown = 2000; // 2 second cooldown

    // Use Web Speech API for robotic voice
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2; // Slightly faster
      utterance.pitch = 0.8; // Lower pitch for robotic effect
      utterance.volume = 0.7;
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    }

    console.log(`🤖 ANNOUNCEMENT: ${text}`);
  }

  // Update Energy Gauge
  private updateEnergyGauge(deltaTime: number) {
    const deltaSeconds = deltaTime / 1000;

    // Check if boost is active (keyboard or gamepad) for Player 1
    const isBoostActive = this.isBoostKeyPressed || this.inputService.isBoostButtonHeld();

    if (isBoostActive && this.boostEnergy > 0 && this.gameState === 'playing') {
      // Drain energy when boosting
      this.boostEnergy -= this.BOOST_DRAIN_RATE * deltaSeconds;

      // Warn when energy is low
      if (this.boostEnergy <= 20 && this.boostEnergy > 15) {
        this.announce('LOW ENERGY');
      }
      if (this.boostEnergy < 0) {
        this.boostEnergy = 0;
      }
    } else if (!isBoostActive && this.boostEnergy < this.MAX_BOOST_ENERGY) {
      // Recharge energy when not boosting
      this.boostEnergy += this.BOOST_RECHARGE_RATE * deltaSeconds;
      if (this.boostEnergy > this.MAX_BOOST_ENERGY) {
        this.boostEnergy = this.MAX_BOOST_ENERGY;
      }
    }

    // Player 2 boost energy in 2-player mode
    if (this.gameMode === '2player') {
      const isBoostActive2 = this.isBoostKeyPressed2;

      if (isBoostActive2 && this.boostEnergy2 > 0 && this.gameState === 'playing') {
        // Drain energy when boosting
        this.boostEnergy2 -= this.BOOST_DRAIN_RATE * deltaSeconds;
        if (this.boostEnergy2 < 0) {
          this.boostEnergy2 = 0;
        }
      } else if (!isBoostActive2 && this.boostEnergy2 < this.MAX_BOOST_ENERGY) {
        // Recharge energy when not boosting
        this.boostEnergy2 += this.BOOST_RECHARGE_RATE * deltaSeconds;
        if (this.boostEnergy2 > this.MAX_BOOST_ENERGY) {
          this.boostEnergy2 = this.MAX_BOOST_ENERGY;
        }
      }
    }
  }

  // Draw Dynamic Lighting (Flashlight Effect)
  private drawDynamicLighting(ctx: CanvasRenderingContext2D) {
    if (!this.pacman) return;

    const centerX = this.pacman.x + this.pacman.width / 2;
    const centerY = this.pacman.y + this.pacman.height / 2;

    // Create darkness overlay
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(0, 0, 0, ${this.ambientDarkness})`;
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    ctx.restore();

    // Create flashlight effect
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Main flashlight beam
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, this.flashlightRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Add flickering effect for realism
    if (Math.random() < 0.1) {
      const flicker = Math.random() * 10 - 5;
      const flickerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, this.flashlightRadius + flicker
      );
      flickerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
      flickerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flickerGradient;
      ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    }

    ctx.restore();
  }

  // Draw Industrial Frame around game area with s.FOX and moneo info
  private drawIndustrialFrame(ctx: CanvasRenderingContext2D) {
    ctx.save();

    const TOP_BAR_Y = 15; // Offset after canvas padding (60px) - back to original position
    const TOP_BAR_HEIGHT = 30;

    // Top bar - s.FOX optimization running
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, TOP_BAR_Y, this.CANVAS_WIDTH, TOP_BAR_HEIGHT);

    // Top bar gradient with metallic effect
    const topGradient = ctx.createLinearGradient(0, TOP_BAR_Y, 0, TOP_BAR_Y + 28);
    topGradient.addColorStop(0, '#333333');
    topGradient.addColorStop(0.5, '#1a1a1a');
    topGradient.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, TOP_BAR_Y, this.CANVAS_WIDTH, 28);

    // IFM orange accent line with glow
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ED6B00';
    ctx.fillStyle = '#ED6B00';
    ctx.fillRect(0, TOP_BAR_Y + 28, this.CANVAS_WIDTH, 2);
    ctx.shadowBlur = 0;

    // s.FOX system status (scaled up 20%, moved outward)
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#00FF88';
    ctx.textAlign = 'left';

    if (this.gameState === 'ready') {
      ctx.fillText('s.FOX INITIALIZING...', 18, TOP_BAR_Y + 24);
      // Loading bar
      const loadProgress = (this.stateTimer / this.READY_DURATION) * 100;
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.fillRect(18, TOP_BAR_Y + 26, 120, 4);
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(18, TOP_BAR_Y + 26, loadProgress * 1.2, 4);
    } else if (this.gameState === 'playing') {
      // Blinking cursor effect
      const blink = Math.floor(Date.now() / 500) % 2 === 0 ? '_' : '';
      ctx.fillText(`s.FOX RUNNING${blink}`, 18, TOP_BAR_Y + 24);
      // Activity indicator dots
      const dots = '.'.repeat((Math.floor(Date.now() / 300) % 3) + 1);
      ctx.fillStyle = '#ED6B00';
      ctx.fillText(dots, 138, TOP_BAR_Y + 24);
    } else if (this.gameState === 'gameover') {
      ctx.fillStyle = '#FF6B6B';
      ctx.fillText('SYSTEM HALTED', 18, TOP_BAR_Y + 24);
      // Error indicator
      ctx.fillRect(12, TOP_BAR_Y + 19, 4, 10);
    }

    // moneo AI Assistant indicator - top right (scaled up 20%, moved outward)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00FF88';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('moneo IAIA', this.CANVAS_WIDTH - 18, TOP_BAR_Y + 14);

    // AI status indicator with LED (scaled up 20%, moved outward)
    const aiStatus = this.gameState === 'playing' ? 'ANALYZING' : 'STANDBY';
    ctx.fillStyle = this.gameState === 'playing' ? '#ED6B00' : '#808080';
    ctx.fillText(aiStatus, this.CANVAS_WIDTH - 18, TOP_BAR_Y + 26);

    // Animated LED indicator (scaled up 20%, moved outward)
    const ledPulse = this.gameState === 'playing'
      ? 0.5 + Math.sin(Date.now() / 200) * 0.5
      : 0.3;
    const ledColor = this.gameState === 'playing' ? '#ED6B00' : '#808080';
    ctx.fillStyle = `rgba(237, 107, 0, ${ledPulse})`;
    ctx.beginPath();
    ctx.arc(this.CANVAS_WIDTH - 102, TOP_BAR_Y + 23, 4, 0, Math.PI * 2);
    ctx.fill();
    // LED glow
    if (this.gameState === 'playing') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = ledColor;
      ctx.beginPath();
      ctx.arc(this.CANVAS_WIDTH - 102, TOP_BAR_Y + 23, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // No bottom bar - clean game area

    ctx.restore();
  }

  // Draw Energy Gauge (moved outward)
  private drawEnergyGauge(ctx: CanvasRenderingContext2D) {
    const barWidth = this.gameMode === '2player' ? 120 : 150;
    const barHeight = 10;
    // Position at bottom, moved slightly up to avoid overlap with game field
    const barX = this.gameMode === '2player' ? this.CANVAS_WIDTH - barWidth - 18 : this.CANVAS_WIDTH - barWidth - 18;
    const barY = this.CANVAS_HEIGHT - 18; // Moved slightly up to avoid overlap

    // Background
    ctx.fillStyle = 'rgba(26, 26, 26, 0.8)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);

    // Border (Orange for Player 1)
    ctx.strokeStyle = '#ED6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);

    // Energy bar
    const energyWidth = (this.boostEnergy / this.MAX_BOOST_ENERGY) * barWidth;
    const gradient = ctx.createLinearGradient(barX, barY, barX + energyWidth, barY);

    if (this.boostEnergy > 60) {
      gradient.addColorStop(0, '#00FF88');
      gradient.addColorStop(1, '#00CC6A');
    } else if (this.boostEnergy > 30) {
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#FFA500');
    } else {
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(1, '#FF0000');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, energyWidth, barHeight);

    // Text
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const text = `P1 BOOST: ${Math.floor(this.boostEnergy)}%`;
    ctx.strokeText(text, barX + barWidth / 2, barY + 8);
    ctx.fillText(text, barX + barWidth / 2, barY + 11);
    ctx.textAlign = 'left';
  }

  // Draw Player 2 Energy Gauge (left side, blue, moved outward)
  private drawEnergyGauge2(ctx: CanvasRenderingContext2D) {
    const barWidth = 120;
    const barHeight = 10;
    const barX = 18; // Left side for Player 2, moved outward
    const barY = this.CANVAS_HEIGHT - 18; // Moved slightly up to avoid overlap

    // Background
    ctx.fillStyle = 'rgba(26, 26, 26, 0.8)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);

    // Border (Blue for Player 2)
    ctx.strokeStyle = '#4D9FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);

    // Energy bar
    const energyWidth = (this.boostEnergy2 / this.MAX_BOOST_ENERGY) * barWidth;
    const gradient = ctx.createLinearGradient(barX, barY, barX + energyWidth, barY);

    if (this.boostEnergy2 > 60) {
      gradient.addColorStop(0, '#00FF88');
      gradient.addColorStop(1, '#00CC6A');
    } else if (this.boostEnergy2 > 30) {
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#FFA500');
    } else {
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(1, '#FF0000');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, energyWidth, barHeight);

    // Text
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const text = `P2 BOOST: ${Math.floor(this.boostEnergy2)}%`;
    ctx.strokeText(text, barX + barWidth / 2, barY + 8);
    ctx.fillText(text, barX + barWidth / 2, barY + 11);
    ctx.textAlign = 'left';
  }

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

    // Hide IFM logo after 5 seconds
    setTimeout(() => {
      this.showIfmLogo = false;
    }, 5000);

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

    // Update Energy Gauge
    this.updateEnergyGauge(deltaTime);

    // Update announcement cooldown
    if (this.announcementCooldown > 0) {
      this.announcementCooldown -= deltaTime;
    }

    // Update Advanced Maze Features
    this.updateAdvancedMazeFeatures(deltaTime);

    // Update Boost Mode based on key state and energy (keyboard or gamepad)
    if (this.gameMode !== 'practice') {
      const isBoostActive = this.isBoostKeyPressed || this.inputService.isBoostButtonHeld();
      if (isBoostActive && this.boostEnergy > 0) {
        this.turboSpeed = true;
      } else {
        this.turboSpeed = false;
      }

      // Player 2 boost activation (keyboard + gamepad)
      if (this.gameMode === '2player') {
        // Check gamepad 1 for Player 2 boost (buttons 0-3 for arcade compatibility)
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gamepadBoostP2 = false;

        // Try gamepad index 1 first, fallback to gamepad 0 buttons 8-11 for arcade
        const gp2 = gamepads[1] || gamepads[0];
        if (gp2) {
          // Standard gamepad: buttons 0-3
          // Arcade setup: buttons 8-11 for Player 2
          gamepadBoostP2 = gp2.buttons[0]?.pressed || gp2.buttons[1]?.pressed ||
                          gp2.buttons[2]?.pressed || gp2.buttons[3]?.pressed ||
                          gp2.buttons[8]?.pressed || gp2.buttons[9]?.pressed ||
                          gp2.buttons[10]?.pressed || gp2.buttons[11]?.pressed;
        }

        const isBoostActive2 = this.isBoostKeyPressed2 || gamepadBoostP2;
        if (isBoostActive2 && this.boostEnergy2 > 0) {
          this.turboSpeed2 = true;
        } else {
          this.turboSpeed2 = false;
        }
      }
    }

    // Gamepad Input for SPIELANLEITUNG
    if (this.showSpielanleitung) {
      this.handleSpielanleitungGamepad();
    }

    // Gamepad Pause Button (Button 9)
    if (this.inputService.isPauseButtonPressed()) {
      if (this.gameState === 'paused') {
        this.resumeFromPause();
      } else if (this.gameState === 'playing') {
        this.openPause();
        this.pauseMenuIndex = 0; // Reset to Resume
      }
    }

    // Gamepad Input for Pause Menu
    if (this.showPauseOverlay) {
      const now = Date.now();
      if (now - this.lastGamepadMenuAction > this.GAMEPAD_MENU_COOLDOWN) {
        const menuDir = this.inputService.getDirectionChange();
        if (menuDir === 'L' || menuDir === 'R') {
          this.navigatePauseMenu(menuDir === 'L' ? 'left' : 'right');
          this.lastGamepadMenuAction = now;
        }
        if (this.inputService.isActionButtonPressed()) {
          this.selectPauseMenuItem();
          this.lastGamepadMenuAction = now;
        }
      }
      return; // Skip gameplay input when paused
    }

    // Gamepad Input for Game Over Menu
    if (this.gameState === 'gameover') {
      const now = Date.now();
      if (now - this.lastGamepadMenuAction > this.GAMEPAD_MENU_COOLDOWN) {
        const menuDir = this.inputService.getDirectionChange();
        if (menuDir === 'L' || menuDir === 'R') {
          this.navigateGameOverMenu(menuDir === 'L' ? 'left' : 'right');
          this.lastGamepadMenuAction = now;
        }
        if (this.inputService.isActionButtonPressed()) {
          this.selectGameOverMenuItem();
          this.lastGamepadMenuAction = now;
        }
      }
      return; // Skip gameplay input when game over
    }

    // Gamepad Input for Gameplay
    const gpDir = this.inputService.getDirection();
    if (gpDir && this.pacman && this.gameState === 'playing') {
      this.bufferedDirection = gpDir; // Buffer the direction
    }

    // Player 2 gamepad input (try second gamepad first, fallback to first if alone) in 2-player mode
    if (this.gameMode === '2player' && this.robot2 && this.gameState === 'playing') {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      // Try gamepad index 1 first (second controller)
      let gp2 = gamepads[1];
      // If no second gamepad, allow using first gamepad for Player 2
      if (!gp2 && gamepads[0]) {
        gp2 = gamepads[0];
      }

      if (gp2) {
        let gpDir2: string | null = null;
        const axisX = gp2.axes[0];
        const axisY = gp2.axes[1];

        // D-Pad support
        const dpadUp = gp2.buttons[12]?.pressed;
        const dpadDown = gp2.buttons[13]?.pressed;
        const dpadLeft = gp2.buttons[14]?.pressed;
        const dpadRight = gp2.buttons[15]?.pressed;

        if (dpadUp || (Math.abs(axisY) > 0.5 && axisY < 0)) gpDir2 = 'U';
        else if (dpadDown || (Math.abs(axisY) > 0.5 && axisY > 0)) gpDir2 = 'D';
        else if (dpadLeft || (Math.abs(axisX) > 0.5 && axisX < 0)) gpDir2 = 'L';
        else if (dpadRight || (Math.abs(axisX) > 0.5 && axisX > 0)) gpDir2 = 'R';

        if (gpDir2) {
          this.bufferedDirection2 = gpDir2;
        }

        // Player 2 boost button (Button 0 - A/Cross or Button 1 - B/Circle)
        const boostButton2 = gp2.buttons[0]?.pressed || gp2.buttons[1]?.pressed;
        this.isBoostKeyPressed2 = boostButton2;
      }
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

    // Apply buffered direction for Player 2
    if (this.bufferedDirection2 && this.robot2 && this.gameState === 'playing' && this.gameMode === '2player') {
      const canTurn2 = this.canChangeTo2(this.bufferedDirection2);
      if (canTurn2) {
        this.robot2.updateDirection(this.bufferedDirection2, this.CELL_SIZE, this.walls);
        // Update image for Player 2
        if (this.bufferedDirection2 === 'U') this.robot2.image = this.robotUpImage;
        else if (this.bufferedDirection2 === 'D') this.robot2.image = this.robotDownImage;
        else if (this.bufferedDirection2 === 'L') this.robot2.image = this.robotLeftImage;
        else if (this.bufferedDirection2 === 'R') this.robot2.image = this.robotRightImage;
        this.bufferedDirection2 = null;
      }
    }

    // Gamepad - Open SPIELANLEITUNG with Y button (button 3) during gameplay
    if (this.gameState === 'playing' && !this.showSpielanleitung) {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const now = Date.now();
      for (const gp of gamepads) {
        if (gp && gp.buttons[3]?.pressed && now - this.lastGamepadSpielanleitungAction > 300) {
          this.toggleSpielanleitung();
          this.lastGamepadSpielanleitungAction = now;
          break;
        }
      }
    }

    // State Machine
    switch (this.gameState) {
      case 'ready':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.READY_DURATION) {
          this.gameState = 'playing';
          this.stateTimer = 0;
          // Show level announcement at game start
          this.levelDisplayTimer = 2000; // Display for 2 seconds
        }
        return; // Keine Bewegung während Ready

      case 'dying':
        // Initialize maze destruction effect on first frame
        if (this.stateTimer === 0) {
          this.mazeDestruction.clear();
          this.walls.forEach(wall => {
            this.mazeDestruction.set(wall, {
              offsetY: 0,
              rotation: (Math.random() - 0.5) * 0.5,
              speed: 2 + Math.random() * 3
            });
          });
        }

        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.DEATH_DURATION) {
          // In 2-player mode, check if any player is out
          if (this.gameMode === '2player') {
            if (this.lives <= 0 || this.systemHealth2 <= 0) {
              // At least one player is out - trigger game over
              this.gameState = 'finalexplosion';
              this.stateTimer = 0;
              this.announce('CRITICAL SYSTEM FAILURE');
              this.mazeDestruction.clear();
              this.walls.forEach(wall => {
                this.mazeDestruction.set(wall, {
                  offsetY: 0,
                  rotation: (Math.random() - 0.5) * 1.0,
                  speed: 3 + Math.random() * 5
                });
              });
            } else {
              this.resetPositions();
              this.gameState = 'ready';
              this.stateTimer = 0;
              setTimeout(() => {
                this.announce('SYSTEM MALFUNCTION DETECTED');
              }, 500);
            }
          } else {
            // Single player mode
            if (this.lives <= 0) {
              // Trigger final explosion before game over
              this.gameState = 'finalexplosion';
              this.stateTimer = 0;

              // Announce critical failure
              this.announce('CRITICAL SYSTEM FAILURE');

              // Initialize more dramatic destruction
              this.mazeDestruction.clear();
              this.walls.forEach(wall => {
                this.mazeDestruction.set(wall, {
                  offsetY: 0,
                  rotation: (Math.random() - 0.5) * 1.0,
                  speed: 3 + Math.random() * 5
                });
              });
            } else {
              this.resetPositions();
              this.gameState = 'ready';
              this.stateTimer = 0;

              // Announce malfunction
              setTimeout(() => {
                this.announce('SYSTEM MALFUNCTION DETECTED');
              }, 500);
            }
          }
        }
        return;

      case 'finalexplosion':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.FINAL_EXPLOSION_DURATION) {
          this.gameState = 'gameover';
          this.gameOver = true;
          // Load leaderboard immediately
          this.loadLeaderboard();
          // Submit final score to backend
          this.submitScore();
          this.stopGameLoop();
        }
        return;

      case 'levelcomplete':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.LEVELCOMPLETE_DURATION) {
          this.loadNextLevel();
        }
        return;

      case 'paused':
        return; // pausiert

      case 'playing':
        break; // Weiter mit normalem Update
    }

    // Update particles
    this.updateParticles();

    // Update animation timers
    this.bonusBounce += 0.1;
    this.maintenancePulse += 0.08;
    this.ledBlinkTimer += deltaTime;

    // Update feedback effects
    if (this.damageFlash > 0) {
      this.damageFlash -= 0.05;
    }
    if (this.successBurst > 0) {
      this.successBurst -= 0.02;
    }
    if (this.comboDisplayTimer > 0) {
      this.comboDisplayTimer -= deltaTime;
    }

    // Décrémenter le timer de max health display
    if (this.maxHealthDisplayTimer > 0) {
      this.maxHealthDisplayTimer -= deltaTime;
    }

    // Décrémenter le timer de level display
    if (this.levelDisplayTimer > 0) {
      this.levelDisplayTimer -= deltaTime;
    }

    // Décrémenter le timer de combo reset
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= deltaTime;
      if (this.comboResetTimer <= 0) {
        // Reset combo si trop de temps sans pellet
        this.pelletStreak = 0;
        this.streakMultiplier = 1.0;
      }
    }

    // Update shield ripples
    for (let i = this.shieldRipples.length - 1; i >= 0; i--) {
      this.shieldRipples[i].radius += 2;
      this.shieldRipples[i].alpha -= 0.02;
      if (this.shieldRipples[i].alpha <= 0) {
        this.shieldRipples.splice(i, 1);
      }
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

    // Bonus rotation - change bonus type periodically
    this.bonusRotationTimer += deltaTime;
    if (this.bonusRotationTimer >= this.BONUS_ROTATION_INTERVAL) {
      this.bonusRotationTimer = 0;
      const bonusTypes: ('iot-sensor' | 'shield' | 'diagnostic')[] = ['iot-sensor', 'shield', 'diagnostic'];
      this.currentBonusType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    }

    // Bonus effect timers
    if (this.bonusEffectTimer > 0) {
      this.bonusEffectTimer -= deltaTime;
      if (this.bonusEffectTimer <= 0) {
        this.shieldActive = false;
      }
    }

    // Ghost Release Timer - force each ghost out of the house quickly based on level
    const maxGhostsForLevel = this.getMaxMalfunctionsForLevel();
    this.ghostReleaseTimer += deltaTime;
    while (this.ghostReleaseTimer >= this.GHOST_RELEASE_INTERVAL && this.ghostsReleased < maxGhostsForLevel) {

      this.ghostReleaseTimer -= this.GHOST_RELEASE_INTERVAL;
      this.ghostsReleased++;
      let index = 0;
      for (const ghost of this.ghosts) {
        if (index === this.ghostsReleased - 1 && index < maxGhostsForLevel) {
          // If the ghost is still inside the house, teleport it to the door and push upward
          const inHouse = ghost.y > 340 && ghost.y < 400 && ghost.x > 200 && ghost.x < 360;
          if (inHouse) {
            ghost.x = 13.5 * this.CELL_SIZE;
            ghost.y = 12 * this.CELL_SIZE;
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
    let speed = this.CELL_SIZE / 4;

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

  private canChangeTo2(newDirection: string): boolean {
    if (!this.robot2) return false;

    const testX = this.robot2.x;
    const testY = this.robot2.y;
    let speed = this.CELL_SIZE / 4;

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
          nextX + this.robot2.width > wall.x &&
          nextY < wall.y + wall.height &&
          nextY + this.robot2.height > wall.y) {
        return false;
      }
    }
    return true;
  }

  private loadNextLevel() {
    // Increment production level (continues indefinitely)
    this.productionLevel++;

    // Show level announcement when entering new level
    this.levelDisplayTimer = 2500; // Display for 2.5 seconds

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

    // Reinitialize advanced features for new level
    this.initializeAdvancedMazeFeatures();
  }

  // ========== ADVANCED MAZE FEATURES ==========

  private initializeAdvancedMazeFeatures() {
    // No advanced features currently
  }  private updateAdvancedMazeFeatures(deltaTime: number) {
    // No advanced features to update
  }

  private drawAdvancedMazeFeatures(ctx: CanvasRenderingContext2D) {
    // No advanced features to draw
  }

  private render() {
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
    // Aggressive (rot) soll nie in der Box bleiben → ignoriere Ghost-House-Regel
    const isAggressive = ghost.type === 'aggressive';
    const inGhostHouse = !isAggressive && (gridY >= 12 && gridY <= 15 && gridX >= 11 && gridX <= 16);

    // Track time in ghost house
    if (inGhostHouse) {
      const currentTime = this.ghostHouseTimer.get(ghost) || 0;
      this.ghostHouseTimer.set(ghost, currentTime + (1000 / this.FPS));
    } else {
      this.ghostHouseTimer.set(ghost, 0);
    }

    const timeInHouse = this.ghostHouseTimer.get(ghost) || 0;
    const forceExit = timeInHouse > this.MAX_HOUSE_TIME;

    let targetX = this.pacman.x;
    let targetY = this.pacman.y;

    if (inGhostHouse || forceExit) {
      // Force target to be outside the door (Row 11, Col 13.5) to exit the box
      // If stuck for >20s, use emergency exit route
      targetX = 13.5 * this.CELL_SIZE;
      targetY = 11 * this.CELL_SIZE;

      // Emergency exit: force upward movement if stuck too long
      if (forceExit && gridY > 12) {
        ghost.updateDirection('U', this.CELL_SIZE, this.walls);
        return;
      }
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

    // Apply boost multiplier only when turboSpeed is active
    const boostMultiplier = this.turboSpeed ? 2 : 1;

    // Move pacman with boost - apply in steps to prevent wall clipping
    const steps = boostMultiplier;
    for (let i = 0; i < steps; i++) {
      const oldX = this.pacman.x;
      const oldY = this.pacman.y;

      // Move one step
      this.pacman.x += this.pacman.velocityX;
      this.pacman.y += this.pacman.velocityY;

      // Tunnel-Wraparound für Pac-Man
      this.handleTunnelWraparound(this.pacman);

      // Check wall collisions (außer Ghost Door)
      let collided = false;
      for (const wall of this.walls) {
        if (wall.type === 'ghost-door') continue; // Pac-Man kann NICHT durch die Tür

        if (this.collision(this.pacman, wall)) {
          // Revert movement
          this.pacman.x = oldX;
          this.pacman.y = oldY;
          collided = true;
          break;
        }
      }

      // Stop moving if we hit a wall
      if (collided) break;
    }

    // Move Player 2 in 2-player mode
    if (this.gameMode === '2player' && this.robot2 && !this.gameOver2) {
      // Player 2 has its own boost multiplier
      const boostMultiplier2 = this.turboSpeed2 ? 2 : 1;
      const steps2 = boostMultiplier2;
      for (let i = 0; i < steps2; i++) {
        const oldX2 = this.robot2.x;
        const oldY2 = this.robot2.y;

        this.robot2.x += this.robot2.velocityX;
        this.robot2.y += this.robot2.velocityY;

        this.handleTunnelWraparound(this.robot2);

        let collided2 = false;
        for (const wall of this.walls) {
          if (wall.type === 'ghost-door') continue;
          if (this.collision(this.robot2, wall)) {
            this.robot2.x = oldX2;
            this.robot2.y = oldY2;
            collided2 = true;
            break;
          }
        }
        if (collided2) break;
      }
    }

    // Check ghost collisions
    for (const ghost of this.ghosts) {
      if (this.collision(ghost, this.pacman)) {
        // Shield protects from collision
        if (this.shieldActive && !ghost.scared) {
          // Ghost bounces back with shield
          ghost.velocityX = -ghost.velocityX;
          ghost.velocityY = -ghost.velocityY;
          this.efficiency += 50;
          this.audioService.play('eatghost');

          // Add ripple effect
          this.shieldRipples.push({radius: 20, alpha: 1.0});
          continue;
        }

        if (ghost.scared) {
          // Reparatur: Störung "reparieren" (+200 Effizienz)
          this.audioService.play('eatghost');
          this.efficiency += 200;
          // Respawn ghost at starting position
          ghost.reset();
          ghost.scared = false;
          ghost.updateVelocity(this.CELL_SIZE); // Reset to normal speed
          continue;
        } else {
          // Systemfehler: Health verlieren
          this.audioService.play('die');
          this.systemHealth -= 1;
          this.damageFlash = 0.5; // Trigger damage flash
          this.gameState = 'dying';
          this.stateTimer = 0;
          return; // Stoppe weitere Bewegung
        }
      }

      // Check collision with Player 2 in 2-player mode
      if (this.gameMode === '2player' && this.robot2 && !this.gameOver2) {
        if (this.collision(ghost, this.robot2)) {
          if (ghost.scared) {
            // Player 2 eats ghost
            this.audioService.play('eatghost');
            this.efficiency2 += 200;
            ghost.reset();
            ghost.scared = false;
            ghost.updateVelocity(this.CELL_SIZE);
            continue;
          } else {
            // Player 2 loses a life
            this.audioService.play('die');
            this.systemHealth2 -= 1;
            this.damageFlash = 0.5; // Trigger damage flash for P2 too

            if (this.systemHealth2 <= 0) {
              this.gameOver2 = true;
              // Game over when first player loses all lives
              this.gameState = 'finalexplosion';
              this.stateTimer = 0;
              this.announce('CRITICAL SYSTEM FAILURE');
              this.mazeDestruction.clear();
              this.walls.forEach(wall => {
                this.mazeDestruction.set(wall, {
                  offsetY: 0,
                  rotation: (Math.random() - 0.5) * 1.0,
                  speed: 3 + Math.random() * 5
                });
              });
              return;
            }

            // Trigger dying state for Player 2 with visual effects
            this.gameState = 'dying';
            this.stateTimer = 0;

            // Create explosion particles for Player 2 at death position
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 4;
              this.particles.push({
                x: this.robot2.x + this.robot2.width / 2,
                y: this.robot2.y + this.robot2.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                maxLife: 1.0,
                color: '#4D9FFF', // Blue particles for Player 2
                size: 3 + Math.random() * 3
              });
            }
            return; // Stop further movement
          }
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
        // Create green particles for sensor data
        this.createParticles(food.x + 2, food.y + 2, '#00FF88', 6);

        // Only count pellets after touching a checkpoint
        if (this.pelletCountingEnabled) {
          this.pelletStreak++;
          this.comboResetTimer = this.COMBO_RESET_DELAY; // Reset le timer à chaque pellet

          // Show combo display only at specific milestones (10, 20, 30, 40, etc.)
          if (this.pelletStreak % 10 === 0 && this.pelletStreak >= 10) {
            this.comboDisplayTimer = 1000;
          }

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
    }
    if (foodEaten) {
      this.foods.delete(foodEaten);
    }

    // Check food collision for Player 2 in 2-player mode
    if (this.gameMode === '2player' && this.robot2 && !this.gameOver2) {
      let foodEaten2: Block | null = null;
      for (const food of this.foods) {
        if (this.collision(this.robot2, food)) {
          this.audioService.play('waka');
          foodEaten2 = food;
          // Create blue particles for Player 2
          this.createParticles(food.x + 2, food.y + 2, '#4D9FFF', 6);
          this.efficiency2 += 10;
        }
      }
      if (foodEaten2) {
        this.foods.delete(foodEaten2);
      }
    }

    // Check power pellet collision (KI-Optimierung)
    let powerEaten: Block | null = null;
    for (const pellet of this.powerPellets) {
      if (this.collision(this.pacman, pellet)) {
        this.audioService.play('powerpill');
        powerEaten = pellet;
        // Create orange particles for power pellet
        this.createParticles(pellet.x + 4, pellet.y + 4, '#ED6B00', 12);
        this.score += 50;
        // Activate scared mode for 10 seconds
        this.scaredTimer = this.scaredDuration;
        this.ghosts.forEach(g => {
          g.scared = true;
          g.updateVelocity(this.CELL_SIZE); // update speed to 80%
        });

        // Announce power mode
        this.announce('POWER MODE ACTIVATED');
      }
    }
    if (powerEaten) {
      this.powerPellets.delete(powerEaten);
    }

    // Check power pellet collision for Player 2
    if (this.gameMode === '2player' && this.robot2 && !this.gameOver2) {
      let powerEaten2: Block | null = null;
      for (const pellet of this.powerPellets) {
        if (this.collision(this.robot2, pellet)) {
          this.audioService.play('powerpill');
          powerEaten2 = pellet;
          this.createParticles(pellet.x + 4, pellet.y + 4, '#4D9FFF', 12);
          this.efficiency2 += 50;
          this.scaredTimer = this.scaredDuration;
          this.ghosts.forEach(g => {
            g.scared = true;
            g.updateVelocity(this.CELL_SIZE);
          });
        }
      }
      if (powerEaten2) {
        this.powerPellets.delete(powerEaten2);
      }
    }

    // Quality Checkpoint collision for Player 1
    if (this.robot) {
      this.qualityCheckpoints.forEach(checkpoint => {
        if (this.collision(this.robot!, checkpoint)) {
          this.score += 500;
          this.efficiency += 500;
          // Create blue particles for checkpoint
          this.createParticles(checkpoint.x + 16, checkpoint.y + 16, '#4169E1', 16);
          this.qualityCheckpoints.delete(checkpoint);
          this.audioService.play('eatghost');

          // Enable pellet counting after first checkpoint
          this.pelletCountingEnabled = true;
          this.checkpointsCollected++;

          // Trigger success burst effect
          this.successBurst = 1.0;

          // Extra life every 2 checkpoints (max 3 lives)
          if (this.checkpointsCollected % 2 === 0 && this.systemHealth < 3) {
            this.systemHealth++;
          } else if (this.checkpointsCollected % 2 === 0 && this.systemHealth >= 3) {
            // Show max health message when at capacity
            this.maxHealthDisplayTimer = 1000; // Display for 1 second
          }
        }
      });
    }

    // Quality Checkpoint collision for Player 2
    if (this.gameMode === '2player' && this.robot2 && !this.gameOver2) {
      this.qualityCheckpoints.forEach(checkpoint => {
        if (this.collision(this.robot2!, checkpoint)) {
          this.efficiency2 += 500;
          this.createParticles(checkpoint.x + 16, checkpoint.y + 16, '#4D9FFF', 16);
          this.qualityCheckpoints.delete(checkpoint);
          this.audioService.play('eatghost');
          // Extra life every 2 checkpoints for Player 2
          if (this.checkpointsCollected % 2 === 0 && this.systemHealth2 < 3) {
            this.systemHealth2++;
          } else if (this.checkpointsCollected % 2 === 0 && this.systemHealth2 >= 3) {
            // Show max health message when at capacity for player 2
            this.maxHealthDisplayTimer = 1000; // Display for 1 second
          }
        }
      });
    }

    // Cherry/Bonus collision with effects (Player 1)
    if (this.cherry && this.collision(this.pacman, this.cherry)) {
      let bonusScore = 500;
      let particleColor = '#FFD700';

      // Apply bonus effect based on type
      switch (this.currentBonusType) {
        case 'iot-sensor':
          bonusScore = 700;
          particleColor = '#00FFFF';
          this.dataStreak += 10; // Massive boost to data streak
          this.audioService.play('eatghost');
          break;
        case 'shield':
          bonusScore = 500;
          particleColor = '#4169E1';
          this.shieldActive = true;
          this.bonusEffectTimer = 10000; // 10 seconds
          this.audioService.play('eatghost');

          // Announce shield activation
          this.announce('DEFENSE SHIELD ACTIVATED');
          break;
        case 'diagnostic':
          bonusScore = 500;
          particleColor = '#FF69B4';
          this.audioService.play('eatghost');
          break;
      }

      // Create colored particles based on bonus type
      this.createParticles(this.cherry.x + 16, this.cherry.y + 16, particleColor, 20);
      this.efficiency += bonusScore;

      // System Health bonus (capped at 3)
      if (this.systemHealth < 3) {
        this.systemHealth += 1;
      } else {
        // Show max health message when at capacity
        this.maxHealthDisplayTimer = 1000; // Display for 1 second
      }

      this.cherry = null;
      this.cherrySpawnCooldown = 300;
    }

    // Cherry/Bonus collision for Player 2
    if (this.gameMode === '2player' && this.robot2 && !this.gameOver2 && this.cherry && this.collision(this.robot2, this.cherry)) {
      this.audioService.play('eatghost');
      this.createParticles(this.cherry.x + 16, this.cherry.y + 16, '#4D9FFF', 20);
      this.efficiency2 += 500;
      if (this.systemHealth2 < 3) {
        this.systemHealth2 += 1;
      } else {
        // Show max health message when at capacity
        this.maxHealthDisplayTimer = 1000; // Display for 1 second
      }
      this.cherry = null;
      this.cherrySpawnCooldown = 300;
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

      // Announce level complete
      this.announce('LEVEL COMPLETE. INITIATING NEXT SEQUENCE');
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
    // Reset Player 2 in 2-player mode
    if (this.gameMode === '2player' && this.robot2) {
      this.robot2.reset();
      this.robot2.velocityX = 0;
      this.robot2.velocityY = 0;
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
    // Reset house timers
    this.ghostHouseTimer.clear();
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
    this.stats = {
    sensorDataCollected: 0,
    repairsSuccessful: 0,
    errorsFixed: 0,
    systemPerformance: 0,
    achievementsUnlocked: {
    ifm_meister: false,
    wartungsexperte: false,
    stoerungsjaeger: false,
    effizienz_champion: false,
  }
};

  this.achievementToast = null;

    this.loadMap();
    this.resetPositions();
    this.lives = 3;
    this.score = 0;
    this.pelletStreak = 0;
    this.streakMultiplier = 1.0;
    this.checkpointsCollected = 0;
    this.pelletCountingEnabled = false;
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
    this.boostEnergy = this.MAX_BOOST_ENERGY;
    this.isBoostKeyPressed = false;
    this.gameOverMenuIndex = 0; // Reset menu index
    this.pauseMenuIndex = 0; // Reset pause menu index
    this.showPauseOverlay = false; // Close pause overlay if open
    this.inputService.resetButtonStates();
    this.startGameLoop();
  }

  private onKeyDown(e: KeyboardEvent) {

    // Prevent key repeat events
    if (e.repeat) return;

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

    // Keyboard navigation for Pause Menu
    if (this.showPauseOverlay) {
      if (e.key === 'ArrowLeft') {
        this.navigatePauseMenu('left');
        e.preventDefault();
        return;
      } else if (e.key === 'ArrowRight') {
        this.navigatePauseMenu('right');
        e.preventDefault();
        return;
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.selectPauseMenuItem();
        e.preventDefault();
        return;
      }
    }

    // Keyboard navigation for Game Over Menu
    if (this.gameState === 'gameover') {
      if (e.key === 'ArrowLeft') {
        this.navigateGameOverMenu('left');
        e.preventDefault();
        return;
      } else if (e.key === 'ArrowRight') {
        this.navigateGameOverMenu('right');
        e.preventDefault();
        return;
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.selectGameOverMenuItem();
        e.preventDefault();
        return;
      }
      // Don't auto-restart on any key - only on menu selection
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

    // Control for boost in all modes
    // H pour SPIELANLEITUNG (Help/Hilfe)
    if (e.key === 'h' || e.key === 'H') {
      this.toggleSpielanleitung();
      return;
    }

    if (e.key === 'Control' && this.gameMode !== 'practice') {
      this.isBoostKeyPressed = true;
      console.log('🚀 Boost aktiviert (Control gedrückt)');
      return;
    }

    // Player 2 boost with Shift key in 2-player mode
    if (e.key === 'Shift' && this.gameMode === '2player') {
      this.isBoostKeyPressed2 = true;
      console.log('🚀 P2 Boost aktiviert (Shift gedrückt)');
      return;
    }

    // Keine Steuerung während Ready, Dying oder Level Complete
    if (this.gameState !== 'playing') return;

    if (!this.pacman) return;

    // Buffer the direction for Player 1 (Arrow keys)
    if (e.key === 'ArrowUp') {
      this.bufferedDirection = 'U';
    } else if (e.key === 'ArrowDown') {
      this.bufferedDirection = 'D';
    } else if (e.key === 'ArrowLeft') {
      this.bufferedDirection = 'L';
    } else if (e.key === 'ArrowRight') {
      this.bufferedDirection = 'R';
    }

    // Player 2 keyboard controls (WASD keys) in 2-player mode
    if (this.gameMode === '2player' && this.robot2) {
      if (e.key === 'w' || e.key === 'W') {
        this.bufferedDirection2 = 'U';
      } else if (e.key === 's' || e.key === 'S') {
        this.bufferedDirection2 = 'D';
      } else if (e.key === 'a' || e.key === 'A') {
        this.bufferedDirection2 = 'L';
      } else if (e.key === 'd' || e.key === 'D') {
        this.bufferedDirection2 = 'R';
      }

      // Try to apply Player 2 direction immediately
      if (this.bufferedDirection2) {
        const canTurn2 = this.canChangeTo2(this.bufferedDirection2);
        if (canTurn2) {
          this.robot2.updateDirection(this.bufferedDirection2, this.CELL_SIZE, this.walls);
          if (this.bufferedDirection2 === 'U') this.robot2.image = this.robotUpImage;
          else if (this.bufferedDirection2 === 'D') this.robot2.image = this.robotDownImage;
          else if (this.bufferedDirection2 === 'L') this.robot2.image = this.robotLeftImage;
          else if (this.bufferedDirection2 === 'R') this.robot2.image = this.robotRightImage;
          this.bufferedDirection2 = null;
        }
      }
    }

    // Try to apply Player 1 direction immediately if possible
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
    } else {
      // Release boost in normal modes
      if (e.key === 'Control') {
        this.isBoostKeyPressed = false;
        this.turboSpeed = false;
        console.log('🛑 Boost deaktiviert (Control losgelassen)');
      }
      // Release Player 2 boost
      if (e.key === 'Shift' && this.gameMode === '2player') {
        this.isBoostKeyPressed2 = false;
        console.log('🛑 P2 Boost deaktiviert (Shift losgelassen)');
      }

      this.bufferedDirection2 = null; // Clear buffer on successful turn
    }
    // Otherwise keep buffered for next frame
  }

  private openPause() {
    this.showPauseOverlay = true;
    this.gameState = 'paused';
    this.pauseMenuIndex = 0; // Reset to Resume
    this.stopGameLoop();
  }

  resumeFromPause() {
    this.showPauseOverlay = false;
    if (!this.gameOver) {
      this.gameState = 'playing';
      this.startGameLoop();
    }
    this.inputService.resetButtonStates();
  }

  navigatePauseMenu(direction: string) {
    if (direction === 'left') {
      this.pauseMenuIndex = (this.pauseMenuIndex - 1 + 3) % 3;
    } else if (direction === 'right') {
      this.pauseMenuIndex = (this.pauseMenuIndex + 1) % 3;
    }
  }

  selectPauseMenuItem() {
    if (this.pauseMenuIndex === 0) {
      // Resume
      this.resumeFromPause();
    } else if (this.pauseMenuIndex === 1) {
      // Restart
      this.showPauseOverlay = false;
      this.restartGame();
    } else if (this.pauseMenuIndex === 2) {
      // Exit to Menu
      this.requestExitToMenu();
    }
  }

  navigateGameOverMenu(direction: string) {
    if (direction === 'left') {
      this.gameOverMenuIndex = (this.gameOverMenuIndex - 1 + 2) % 2;
    } else if (direction === 'right') {
      this.gameOverMenuIndex = (this.gameOverMenuIndex + 1) % 2;
    }
  }

  selectGameOverMenuItem() {
    if (this.gameOverMenuIndex === 0) {
      // Restart
      this.restartGame();
    } else if (this.gameOverMenuIndex === 1) {
      // Return to Menu
      this.router.navigate(['/']);
    }
  }

  requestExitToMenu() {
    this.exitGame(); // Directly exit, no confirmation
  }

  // ============================================================================
  // DECORATIVE INDUSTRIAL ELEMENTS
  // ============================================================================

  private initializeIndustrialDecorations() {
    // Warning Signs - REMOVED to avoid overlap with game field
    // These were causing overlap issues, so we'll disable them completely
    this.warningSignsPositions = [];

    // Status LEDs - REMOVED to avoid overlapping with paths
    // These were causing overlap issues, so we'll disable them for now
    this.statusLEDPositions = [];
  }

  private drawIndustrialDecorations(ctx: CanvasRenderingContext2D) {
    // Draw Warning Signs
    this.drawWarningSigns(ctx);

    // Draw Status LEDs (blinking dots)
    this.drawStatusLEDs(ctx);
  }

  private drawWarningSigns(ctx: CanvasRenderingContext2D) {
    this.warningSignsPositions.forEach(sign => {
      ctx.save();
      ctx.translate(sign.x, sign.y);

      // Triangle warning sign (ACHTUNG only)
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-10, 8);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exclamation mark
      ctx.fillStyle = '#000000';
      ctx.fillRect(-1.5, -6, 3, 8);
      ctx.beginPath();
      ctx.arc(0, 6, 2, 0, Math.PI * 2);
      ctx.fill();

      // Text below
      ctx.font = 'bold 5px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('ACHTUNG', 0, 16);

      ctx.restore();
    });
  }

  private drawStatusLEDs(ctx: CanvasRenderingContext2D) {
    const time = Date.now();
    this.statusLEDPositions.forEach(led => {
      ctx.save();
      ctx.translate(led.x, led.y);

      // Blink effect
      const blinkPhase = (time % led.blinkSpeed) / led.blinkSpeed;
      const isOn = blinkPhase < 0.5;
      const intensity = isOn ? 1 : 0.3;

      // LED housing - dark gray
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // LED light
      let ledColor = '';
      if (led.color === 'green') {
        ledColor = `rgba(0, 255, 0, ${intensity})`;
      } else if (led.color === 'red') {
        ledColor = `rgba(255, 0, 0, ${intensity})`;
      } else if (led.color === 'orange') {
        ledColor = `rgba(255, 165, 0, ${intensity})`;
      }

      ctx.fillStyle = ledColor;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect when on
      if (isOn) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = ledColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    });
  }


  toggleSpielanleitung() {
    this.showSpielanleitung = !this.showSpielanleitung;
    if (this.showSpielanleitung) {
      this.spielanleitungSlide = 0;
      this.gameState = 'paused';
      this.stopGameLoop();
    } else {
      if (!this.gameOver) {
        this.gameState = 'playing';
        this.startGameLoop();
      }
    }
  }

  nextSpielanleitungSlide() {
    if (this.spielanleitungSlide < 4) {
      this.spielanleitungSlide++;
    }
  }

  prevSpielanleitungSlide() {
    if (this.spielanleitungSlide > 0) {
      this.spielanleitungSlide--;
    }
  }

  closeSpielanleitung() {
    this.showSpielanleitung = false;
    if (!this.gameOver) {
      this.gameState = 'playing';
      this.startGameLoop();
    }
  }

  // Gamepad control for SPIELANLEITUNG
  private handleSpielanleitungGamepad() {
    const now = Date.now();
    if (now - this.lastGamepadSpielanleitungAction < 300) {
      return; // Debounce
    }

    // Left shoulder (L1/LB) - Previous slide
    if (this.inputService.isLeftShoulderPressed()) {
      this.prevSpielanleitungSlide();
      this.lastGamepadSpielanleitungAction = now;
      return;
    }

    // Right shoulder (R1/RB) - Next slide
    if (this.inputService.isRightShoulderPressed()) {
      this.nextSpielanleitungSlide();
      this.lastGamepadSpielanleitungAction = now;
      return;
    }

    // D-Pad Left - Previous slide
    const dir = this.inputService.getDirection();
    if (dir === 'L') {
      this.prevSpielanleitungSlide();
      this.lastGamepadSpielanleitungAction = now;
      return;
    }

    // D-Pad Right - Next slide
    if (dir === 'R') {
      this.nextSpielanleitungSlide();
      this.lastGamepadSpielanleitungAction = now;
      return;
    }

    // Back button (View/Select) - Close SPIELANLEITUNG
    if (this.inputService.isBackButtonPressed()) {
      this.closeSpielanleitung();
      this.lastGamepadSpielanleitungAction = now;
      return;
    }

    // B button (button 1) - Close SPIELANLEITUNG
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.buttons[1]?.pressed) {
        this.closeSpielanleitung();
        this.lastGamepadSpielanleitungAction = now;
        return;
      }
    }
  }
}
