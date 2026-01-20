import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { GameManager } from '../models/game-manager';
import { Block } from '../models/Block';
import { AudioService } from '../services/audio.service';
import { InputService } from '../services/input.service';
import { GameStats } from '../models/game-stats';
import { AchievementService, AchievementDef } from '../services/achievement.service';





export type GameMode = 'classic' | 'practice';

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
  private readonly FPS = 30;
  private onKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);
  // ===== BOOST / ENERGY =====
  boostEnergy: number = 100;
  readonly MAX_BOOST_ENERGY = 100;
  readonly BOOST_DRAIN_RATE = 35;
  readonly BOOST_RECHARGE_RATE = 20;

  isBoostKeyPressed = false;
  turboSpeed = false;

  // ===== ANNOUNCEMENTS =====
  lastAnnouncement: string = '';
  announcementCooldown: number = 0;

  // ===== LIGHTING / FLASHLIGHT =====
  ambientDarkness: number = 0.65;
  flashlightRadius: number = 140;

  // ===== UI / DECOR =====
  private warningSignsPositions: Array<{ x: number; y: number; type: 'achtung' }> = [];
  private statusLEDPositions: Array<{ x: number; y: number; color: 'green' | 'orange' | 'red'; blinkSpeed: number }> = [];
  private lightingEnabled: boolean = false;




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
  robot2: Block | null = null; // Second robot for 2-player mode
  cherry: Block | null = null;
  isTwoPlayerMode = false; // Flag for 2-player mode

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
  private bufferedDirection2: string | null = null; // For robot2 (WASD)

  // Basic system state
  systemHealth = 3;
  efficiency = 0;
  gameOver = false;
  playerName = ''; // Player name for leaderboard
  playerName2 = ''; // Second player name for 2-player mode
  gameMode: GameMode = 'classic'; // Make gameMode accessible in template

// ===== Achievements / Stats =====
public stats: GameStats = {
  sensorDataCollected: 0,
  repairsSuccessful: 0,
  errorsFixed: 0,
  systemPerformance: 0,
  achievementsUnlocked: {
    ifm_meister: false,
    wartungsexperte: false,
    stoerungsjaeger: false,
    effizienz_champion: false,
  },
};

public achievementToast: { title: string; description: string } | null = null;
private achievementToastTimeoutId: any = null;

// For level-based performance calc
private sensorDataAtLevelStart = 0;
private levelTotalSensors = 0;

private showAchievementToast(def: AchievementDef): void {
  this.achievementToast = { title: def.title, description: def.description };

  if (this.achievementToastTimeoutId) {
    clearTimeout(this.achievementToastTimeoutId);
  }

  this.achievementToastTimeoutId = setTimeout(() => {
    this.achievementToast = null;
  }, 4000);
}



  // 2-Player mode enhanced stats
  player1Score = 0;
  player2Score = 0;
  player1Lives = 3;
  player2Lives = 3;
  player1PowerUp: 'none' | 'shield' | 'speed' | 'magnet' = 'none';
  player2PowerUp: 'none' | 'shield' | 'speed' | 'magnet' = 'none';
  player1PowerUpTimer = 0;
  player2PowerUpTimer = 0;
  teamComboMultiplier = 1;
  teamComboTimer = 0;
  lastPelletCollector: 1 | 2 | null = null;
  winner: 1 | 2 | null = null; // Track winner in 2-player mode
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
  private readonly BONUS_ROTATION_INTERVAL = 15000; // Change bonus type every 15s
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

  // 2-Player mode visual effects
  private player1Trail: Array<{x: number, y: number, alpha: number}> = [];
  private player2Trail: Array<{x: number, y: number, alpha: number}> = [];
  private connectionBeam: {active: boolean, pulse: number} = {active: false, pulse: 0};
  private teamBonusParticles: Array<{x: number, y: number, vx: number, vy: number, alpha: number, color: string}> = [];
  private player1Aura = 0;
  private player2Aura = 0;
  private victoryDance = 0;

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
    // Transparent background - no fill
    // ctx.fillStyle = '#1E2A3A';
    // ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(245, 245, 245, 0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.CANVAS_WIDTH; x += this.CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < this.CANVAS_HEIGHT; y += this.CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Thicker grid every 5 cells
    ctx.strokeStyle = 'rgba(245, 245, 245, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.CANVAS_WIDTH; x += this.CELL_SIZE * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < this.CANVAS_HEIGHT; y += this.CELL_SIZE * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.CANVAS_WIDTH, y);
      ctx.stroke();
    }

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
    }    // 2-Player Mode: Draw trails behind robots
    if (this.isTwoPlayerMode) {
      this.drawPlayer1Trail(ctx);
      this.drawPlayer2Trail(ctx);
    }

    // Robot mit Animation zeichnen
    if (this.robot && this.gameState !== 'dying') {
      this.drawRobot(ctx);
    } else if (this.robot && this.gameState === 'dying') {
      this.drawDyingRobot(ctx);
    }

    // Draw robot2 in 2-player mode
    if (this.isTwoPlayerMode && this.robot2 && this.gameState !== 'dying') {
      this.drawRobot2(ctx);
    }

    // 2-Player Mode: Draw auras and connection beam
    if (this.isTwoPlayerMode) {
      this.drawPlayerAuras(ctx);
      this.drawConnectionBeam(ctx);
      this.drawTeamBonusParticles(ctx);
    }

    // Störungen zeichnen
    this.malfunctions.forEach(malfunction => {
      this.drawMalfunction(ctx, malfunction);
    });

    // Ghost-Ziele (Learn/Practice Mode)
    this.drawGhostTargets(ctx);

    // UI Overlay
    this.drawUI(ctx);

    // 2-Player Mode HUD
    if (this.isTwoPlayerMode) {
      this.drawTwoPlayerHUD(ctx);
    }

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

  private drawRobot2(ctx: CanvasRenderingContext2D) {
    if (!this.robot2) return;

    const centerX = this.robot2.x + this.robot2.width / 2;
    const centerY = this.robot2.y + this.robot2.height / 2;
    const size = this.robot2.width - 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Smooth rotation based on direction
    const targetRotation = this.getTargetRotation(this.robot2.direction);
    let robot2Rotation = 0;
    // Use a separate rotation variable for robot2 (we'll need to store this)
    // For now, use immediate rotation
    ctx.rotate(targetRotation);

    // Draw ifm robot - Industrial AGV style (slightly different color to distinguish)
    // Main body with metallic gradient (slightly different shade)
    const bodyGradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    bodyGradient.addColorStop(0, '#FFA500'); // Slightly lighter orange
    bodyGradient.addColorStop(0.5, '#FF8C00');
    bodyGradient.addColorStop(1, '#ED6B00');
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

    if (this.robot2.direction === 'U') { headX = 0; headY = -size * 0.35; }
    else if (this.robot2.direction === 'D') { headX = 0; headY = size * 0.35; }
    else if (this.robot2.direction === 'L') { headX = -size * 0.35; headY = 0; }
    else if (this.robot2.direction === 'R') { headX = size * 0.35; headY = 0; }

    // Front sensor housing
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(headX - headSize/2, headY - headSize/2, headSize, headSize);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 1;
    ctx.strokeRect(headX - headSize/2, headY - headSize/2, headSize, headSize);

    // Active sensor LEDs
    const ledPulse = 0.5 + Math.sin(Date.now() / 100) * 0.5;
    ctx.fillStyle = `rgba(0, 255, 136, ${ledPulse})`;
    if (this.robot2.direction === 'U' || this.robot2.direction === 'D') {
      ctx.fillRect(headX - 3, headY - 1, 2, 2);
      ctx.fillRect(headX + 1, headY - 1, 2, 2);
    } else {
      ctx.fillRect(headX - 1, headY - 3, 2, 2);
      ctx.fillRect(headX - 1, headY + 1, 2, 2);
    }

    ctx.restore();
  }

  // ==================== 2-PLAYER MODE VISUAL EFFECTS ====================

  private drawPlayer1Trail(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode || this.player1Trail.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.player1Trail.length; i++) {
      const trail = this.player1Trail[i];
      const size = 8 * trail.alpha;

      // Orange energy trail with glow
      const gradient = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, size);
      gradient.addColorStop(0, `rgba(237, 107, 0, ${trail.alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 165, 0, ${trail.alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(237, 107, 0, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer2Trail(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode || this.player2Trail.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.player2Trail.length; i++) {
      const trail = this.player2Trail[i];
      const size = 8 * trail.alpha;

      // Lighter orange/gold energy trail
      const gradient = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, size);
      gradient.addColorStop(0, `rgba(255, 180, 50, ${trail.alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 100, ${trail.alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(255, 180, 50, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawConnectionBeam(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode || !this.connectionBeam.active || !this.robot || !this.robot2) return;

    const x1 = this.robot.x + this.robot.width / 2;
    const y1 = this.robot.y + this.robot.height / 2;
    const x2 = this.robot2.x + this.robot2.width / 2;
    const y2 = this.robot2.y + this.robot2.height / 2;

    ctx.save();

    // Pulsating energy beam
    const pulseIntensity = 0.5 + Math.sin(this.connectionBeam.pulse) * 0.3;

    // Outer glow
    ctx.strokeStyle = `rgba(0, 200, 255, ${pulseIntensity * 0.3})`;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Middle beam
    ctx.strokeStyle = `rgba(100, 220, 255, ${pulseIntensity * 0.6})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Inner core
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Connection nodes at each robot
    [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(pos => {
      const nodeGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
      nodeGradient.addColorStop(0, `rgba(255, 255, 255, ${pulseIntensity})`);
      nodeGradient.addColorStop(0.5, `rgba(100, 220, 255, ${pulseIntensity * 0.6})`);
      nodeGradient.addColorStop(1, 'rgba(0, 200, 255, 0)');

      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
    });

    // Team bonus text in the middle
    if (this.teamComboMultiplier > 1) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(`×${this.teamComboMultiplier}`, midX + 2, midY + 2);

      // Main text
      ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
      ctx.fillText(`×${this.teamComboMultiplier}`, midX, midY);
    }

    ctx.restore();
  }

  private drawTeamBonusParticles(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode || this.teamBonusParticles.length === 0) return;

    ctx.save();
    for (const particle of this.teamBonusParticles) {
      const size = 4 * particle.alpha;

      // Colorful celebration particles
      const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size);
      gradient.addColorStop(0, particle.color.replace('rgb', 'rgba').replace(')', `, ${particle.alpha})`));
      gradient.addColorStop(1, particle.color.replace('rgb', 'rgba').replace(')', ', 0)'));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle effect
      if (particle.alpha > 0.7) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${particle.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x - size * 1.5, particle.y);
        ctx.lineTo(particle.x + size * 1.5, particle.y);
        ctx.moveTo(particle.x, particle.y - size * 1.5);
        ctx.lineTo(particle.x, particle.y + size * 1.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawPlayerAuras(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode || !this.robot || !this.robot2) return;

    const drawAura = (robot: Block, powerUp: string, baseColor: string) => {
      if (powerUp === 'none') return;

      const x = robot.x + robot.width / 2;
      const y = robot.y + robot.height / 2;
      const time = Date.now() * 0.003;

      let auraColor = baseColor;
      let auraSize = 30;

      switch (powerUp) {
        case 'shield':
          auraColor = '65, 105, 225'; // Royal blue
          auraSize = 35;
          break;
        case 'speed':
          auraColor = '255, 215, 0'; // Gold
          auraSize = 32;
          break;
        case 'magnet':
          auraColor = '138, 43, 226'; // Purple
          auraSize = 34;
          break;
      }

      ctx.save();

      // Rotating aura rings
      for (let i = 0; i < 3; i++) {
        const radius = auraSize + i * 8 + Math.sin(time + i) * 3;
        const alpha = (0.4 - i * 0.1) * Math.abs(Math.sin(time * 0.5));

        const gradient = ctx.createRadialGradient(x, y, radius - 5, x, y, radius + 5);
        gradient.addColorStop(0, `rgba(${auraColor}, 0)`);
        gradient.addColorStop(0.5, `rgba(${auraColor}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${auraColor}, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, time + i, time + i + Math.PI * 1.5);
        ctx.stroke();
      }

      // Power-up icon above robot
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const iconY = robot.y - 8 + Math.sin(time * 2) * 2;
      let icon = '';

      switch (powerUp) {
        case 'shield': icon = '🛡️'; break;
        case 'speed': icon = '⚡'; break;
        case 'magnet': icon = '🧲'; break;
      }

      // Icon shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(icon, x + 1, iconY + 1);

      // Icon
      ctx.fillStyle = 'white';
      ctx.fillText(icon, x, iconY);

      ctx.restore();
    };

    // Draw auras for both players
    drawAura(this.robot, this.player1PowerUp, '237, 107, 0');
    drawAura(this.robot2, this.player2PowerUp, '255, 180, 50');
  }

  private updatePlayerTrails() {
    if (!this.isTwoPlayerMode || !this.robot || !this.robot2) return;

    const maxTrailLength = 20;

    // Add new trail positions
    if (this.robot.velocityX !== 0 || this.robot.velocityY !== 0) {
      this.player1Trail.push({
        x: this.robot.x + this.robot.width / 2,
        y: this.robot.y + this.robot.height / 2,
        alpha: 1.0
      });
    }

    if (this.robot2.velocityX !== 0 || this.robot2.velocityY !== 0) {
      this.player2Trail.push({
        x: this.robot2.x + this.robot2.width / 2,
        y: this.robot2.y + this.robot2.height / 2,
        alpha: 1.0
      });
    }    // Fade and remove old trail particles
    this.player1Trail = this.player1Trail.filter(trail => {
      trail.alpha -= 0.05;
      return trail.alpha > 0;
    }).slice(-maxTrailLength);

    this.player2Trail = this.player2Trail.filter(trail => {
      trail.alpha -= 0.05;
      return trail.alpha > 0;
    }).slice(-maxTrailLength);
  }

  private updateConnectionBeam() {
    if (!this.isTwoPlayerMode || !this.robot || !this.robot2) return;

    const dx = this.robot.x - this.robot2.x;
    const dy = this.robot.y - this.robot2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Activate beam when players are within 100 pixels
    const beamDistance = 100;
    this.connectionBeam.active = distance < beamDistance;

    if (this.connectionBeam.active) {
      this.connectionBeam.pulse += 0.1;

      // Team combo bonus when connected
      if (this.teamComboMultiplier < 3) {
        this.teamComboMultiplier = Math.min(3, this.teamComboMultiplier + 0.01);
      }
    } else {
      // Slowly decay multiplier when disconnected
      if (this.teamComboMultiplier > 1) {
        this.teamComboMultiplier = Math.max(1, this.teamComboMultiplier - 0.02);
      }
    }
  }

  private createTeamBonusParticles(x: number, y: number) {
    const colors = [
      'rgb(237, 107, 0)',   // IFM Orange
      'rgb(255, 215, 0)',   // Gold
      'rgb(0, 200, 255)',   // Cyan
      'rgb(255, 100, 255)', // Magenta
      'rgb(100, 255, 100)'  // Green
    ];

    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 3;

      this.teamBonusParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private updateTeamBonusParticles() {
    this.teamBonusParticles = this.teamBonusParticles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.alpha -= 0.02;
      return particle.alpha > 0;
    });
  }

  private drawTwoPlayerHUD(ctx: CanvasRenderingContext2D) {
    if (!this.isTwoPlayerMode) return;

    ctx.save();
    ctx.font = 'bold 14px "Press Start 2P", monospace';

    // Player 1 HUD (Top Left)
    const p1X = 20;
    const p1Y = 30;

    // Player 1 name and score
    ctx.fillStyle = '#ED6B00';
    ctx.textAlign = 'left';
    ctx.fillText(`P1: ${this.playerName}`, p1X, p1Y);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${this.player1Score}`, p1X, p1Y + 20);

    // Player 1 lives
    for (let i = 0; i < this.player1Lives; i++) {
      ctx.fillStyle = '#ED6B00';
      ctx.fillRect(p1X + i * 15, p1Y + 28, 12, 12);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(p1X + i * 15, p1Y + 28, 12, 12);
    }

    // Player 2 HUD (Top Right)
    const p2X = this.CANVAS_WIDTH - 20;
    const p2Y = 30;

    // Player 2 name and score
    ctx.fillStyle = '#FFB432';
    ctx.textAlign = 'right';
    ctx.fillText(`P2: ${this.playerName2}`, p2X, p2Y);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${this.player2Score}`, p2X, p2Y + 20);

    // Player 2 lives
    for (let i = 0; i < this.player2Lives; i++) {
      ctx.fillStyle = '#FFB432';
      ctx.fillRect(p2X - (i + 1) * 15, p2Y + 28, 12, 12);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(p2X - (i + 1) * 15, p2Y + 28, 12, 12);
    }

    // Team Combo Multiplier (Center Top)
    if (this.teamComboMultiplier > 1) {
      const centerX = this.CANVAS_WIDTH / 2;
      const centerY = 25;

      const glowIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;

      // Glow background
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
      glowGradient.addColorStop(0, `rgba(0, 200, 255, ${glowIntensity * 0.4})`);
      glowGradient.addColorStop(1, 'rgba(0, 200, 255, 0)');

      ctx.fillStyle = glowGradient;
      ctx.fillRect(centerX - 60, centerY - 20, 120, 40);

      // Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(`TEAM ×${this.teamComboMultiplier.toFixed(1)}`, centerX + 2, centerY + 2);

      // Main text with gradient
      const textGradient = ctx.createLinearGradient(centerX - 50, centerY, centerX + 50, centerY);
      textGradient.addColorStop(0, '#00C8FF');
      textGradient.addColorStop(0.5, '#FFFFFF');
      textGradient.addColorStop(1, '#00C8FF');

      ctx.fillStyle = textGradient;
      ctx.fillText(`TEAM ×${this.teamComboMultiplier.toFixed(1)}`, centerX, centerY);
    }

    // Connection status indicator
    if (this.connectionBeam.active) {
      const indicatorX = this.CANVAS_WIDTH / 2;
      const indicatorY = 50;

      ctx.textAlign = 'center';
      ctx.font = '10px "Press Start 2P", monospace';

      const pulseAlpha = 0.6 + Math.sin(this.connectionBeam.pulse) * 0.4;
      ctx.fillStyle = `rgba(0, 200, 255, ${pulseAlpha})`;
      ctx.fillText('⚡ CONNECTED ⚡', indicatorX, indicatorY);
    }

    ctx.restore();
  }

  // ==================== END 2-PLAYER VISUAL EFFECTS ====================

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


    // IFM Logo on the score bar - very visible
    ctx.save();

    // Logo background plate - WHITE for maximum visibility
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, 32, 60, 20);

    // Border - thick orange border
    ctx.strokeStyle = '#ED6B00';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 32, 60, 20);

    // IFM letters - BIG with strong glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ED6B00';
    ctx.fillStyle = '#ED6B00';

    // Letter I
    ctx.fillRect(11, 36, 5, 12);

    // Letter F
    ctx.fillRect(21, 36, 5, 12);
    ctx.fillRect(21, 36, 12, 4);
    ctx.fillRect(21, 42, 9, 3);

    // Letter M
    ctx.fillRect(38, 36, 5, 12);
    ctx.fillRect(38, 36, 4, 4);
    ctx.fillRect(44, 38, 3, 3);
    ctx.fillRect(49, 36, 4, 4);
    ctx.fillRect(53, 36, 5, 12);

    ctx.shadowBlur = 0;
    ctx.restore();

    // Score as industrial KPIs - Start at y=45 to be below logo
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'left';

    // Production Efficiency KPI
    const efficiencyPercent = Math.min(100, Math.floor((this.efficiency / 1000) * 100));
    ctx.fillText(`EFFICIENCY: ${efficiencyPercent}%`, 70, 45);

    // Production Level
    ctx.fillText(`LEVEL: ${this.productionLevel}`, this.CANVAS_WIDTH / 2 - 60, 45);

    // High Score as "Best Performance"
    ctx.textAlign = 'right';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#ED6B00';
    const hiScorePercent = Math.min(100, Math.floor((this.getHighScore() / 1000) * 100));
    ctx.fillText(`BEST: ${hiScorePercent}%`, this.CANVAS_WIDTH - 10, 45);

    // Practice Mode Status-Anzeige
    if (this.gameMode === 'practice') {
      ctx.font = '8px monospace';
      let statusY = 30;
      if (this.isInvincible) {
        ctx.fillStyle = '#00FF88';
        ctx.fillText('SAFETY MODE', this.CANVAS_WIDTH - 10, statusY);
        statusY += 12;
      }
      if (this.turboSpeed && this.boostEnergy > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('⚡ TURBO', this.CANVAS_WIDTH - 10, statusY);
        statusY += 12;
      }
      if (this.slowMotion < 1.0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(`SLOW ${this.slowMotion}x`, this.CANVAS_WIDTH - 10, statusY);
      }
    }
    ctx.textAlign = 'left';

    // Combo counter display - adjusted position
    if (this.pelletStreak >= 10 && this.comboDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const comboAlpha = this.comboDisplayTimer / 1000;
      ctx.fillStyle = `rgba(237, 107, 0, ${comboAlpha})`; // IFM Orange
      ctx.fillText(`${this.pelletStreak}x COMBO!`, this.CANVAS_WIDTH / 2, 60);
      ctx.restore();
    }

    // Draw particles
    this.drawParticles(ctx);

    // Apply dynamic lighting effect
    if (this.lightingEnabled && this.gameState === 'playing') {
      this.drawDynamicLighting(ctx);
    }

    // Draw Energy Gauge for Boost
    this.drawEnergyGauge(ctx);

    // System Health - bottom left
    for (let i = 0; i < this.systemHealth; i++) {
      this.drawRobotIcon(ctx, 20 + i * 25, this.CANVAS_HEIGHT - 20);
    }

    // Active bonus effects display with circular progress
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    let effectY = this.CANVAS_HEIGHT - 30;

    if (this.shieldActive) {
      // Shield text
      ctx.fillStyle = '#4169E1';
      ctx.fillText('🛡️ SHIELD', this.CANVAS_WIDTH - 50, effectY);

      // Circular progress bar
      const progress = this.bonusEffectTimer / 10000; // 10 seconds max
      const centerX = this.CANVAS_WIDTH - 20;
      const centerY = effectY - 5;
      const radius = 8;

      // Background circle
      ctx.strokeStyle = 'rgba(65, 105, 225, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Progress arc
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
      ctx.stroke();

      effectY -= 25;
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

      // 2-Player Mode: Show winner instead of GAME OVER
      const mainText = this.isTwoPlayerMode && this.winner
        ? `PLAYER ${this.winner} WINS!`
        : 'GAME OVER';

      // Multiple chromatic aberration layers
      const aberrationLayers = [
        {color: 'rgba(255, 0, 0, 0.7)', x: -6, y: -6},
        {color: 'rgba(0, 255, 0, 0.5)', x: 0, y: 6},
        {color: 'rgba(0, 255, 255, 0.7)', x: 6, y: -3},
        {color: 'rgba(255, 0, 255, 0.5)', x: -3, y: 3}
      ];

      for (const layer of aberrationLayers) {
        ctx.fillStyle = layer.color;
        ctx.fillText(mainText, centerX + layer.x + Math.sin(time * 10) * 2, centerY - 30 + layer.y);
      }

      // Main text with massive glow
      ctx.shadowColor = this.isTwoPlayerMode && this.winner ? '#00FF00' : '#FF0000';
      ctx.shadowBlur = 60 + Math.sin(time * 8) * 20;
      ctx.fillStyle = `rgba(255, 255, 255, ${explosionProgress})`;
      ctx.fillText(mainText, centerX, centerY - 30);

      // Super intense flickering
      if (Math.floor(time * 20) % 2 === 0) {
        ctx.shadowBlur = 80;
        ctx.shadowColor = this.isTwoPlayerMode && this.winner ? '#FFD700' : '#FFFF00';
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(mainText, centerX, centerY - 30);
      }

      // Distortion effect on text
      if (explosionProgress < 0.5 && Math.random() > 0.7) {
        ctx.save();
        ctx.translate(centerX, centerY - 30);
        ctx.scale(1 + (Math.random() - 0.5) * 0.1, 1 + (Math.random() - 0.5) * 0.1);
        ctx.fillStyle = 'rgba(255, 122, 1, 0.5)';
        ctx.fillText(mainText, 0, 0);
        ctx.restore();
      }

      // Animated subtitle with intense glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FF7A01';
      ctx.font = 'bold 20px "Press Start 2P", monospace';

      // 2-Player Mode: Show loser's name
      let subtitle = 'PRODUCTION HALTED';
      if (this.isTwoPlayerMode && this.winner) {
        const winnerName = this.winner === 1 ? this.playerName : this.playerName2;
        const loserName = this.winner === 1 ? this.playerName2 : this.playerName;
        subtitle = `${winnerName} DEFEATS ${loserName}!`;
      }
      const subtitleAlpha = Math.max(0, explosionProgress - 0.15) / 0.85;
      ctx.fillStyle = `rgba(255, 122, 1, ${subtitleAlpha})`;
      const subtitleY = centerY + 25 + Math.sin(time * 4) * 3;

      // Display custom subtitle
      ctx.fillText(this.isTwoPlayerMode && this.winner ? subtitle : '>>> CRITICAL SYSTEM FAILURE <<<', centerX, subtitleY);

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
  pauseMenuIndex = 0; // 0 = Resume, 1 = Restart, 2 = Main Menu
  gameOverMenuIndex = 0; // 0 = Restart, 1 = Main Menu
  showSpielanleitung = false;
  spielanleitungSlide = 0;
  private gamepadPollInterval: any;
  private lastGamepadSpielanleitungAction = 0;

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
  private router: Router,
  private achievements: AchievementService
) {
  this.initAssets();
}
  

// Updates system performance for the current level and checks achievements
private updatePerformanceAndCheckAchievements() {
  // Sensors collected in this level only
  const collectedThisLevel =
    this.stats.sensorDataCollected - this.sensorDataAtLevelStart;

  // Avoid division by zero
  if (this.levelTotalSensors <= 0) {
    this.stats.systemPerformance = 0;
    return;
  }

  // Performance = percentage of collected sensors in this level
  const percent = Math.round(
    (collectedThisLevel / this.levelTotalSensors) * 100
  );

  // Clamp value between 0 and 100
  this.stats.systemPerformance = Math.max(0, Math.min(100, percent));

  // Check whether a new achievement has been unlocked
  const newlyUnlocked = this.achievements.checkAndUnlock(this.stats);
  if (newlyUnlocked.length > 0) {
    this.showAchievementToast(newlyUnlocked[0]);
  }
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

    // Speichere Gesamtanzahl der Pellets für Cherry-Spawn
    this.totalPellets = this.foods.size + this.powerPellets.size;


    // === Level performance baseline (for % calculation) ===
    this.levelTotalSensors = this.foods.size;
    this.sensorDataAtLevelStart = this.stats.sensorDataCollected;


  
    // Create additional ghosts to reach 8 total
    this.createAdditionalGhosts();

    // Create second robot for 2-player mode
    if (this.isTwoPlayerMode && this.robot) {
      // Position robot2 slightly offset from robot1 (to the left)
      const robot2X = this.robot.startX - this.CELL_SIZE;
      const robot2Y = this.robot.startY;
      this.robot2 = new Block(robot2X, robot2Y, this.CELL_SIZE, this.CELL_SIZE, this.robotRightImage);
      this.robot2.direction = 'R';
      this.robot2.updateVelocity(this.CELL_SIZE);
      console.log('🤖 Robot2 created for 2-player mode');
    }

    // Assign ghost targets in 2-player mode
    if (this.isTwoPlayerMode) {
      this.assignGhostTargets();
    }
  }

  private createAdditionalGhosts() {
    const currentGhostCount = this.ghosts.size;
    const targetGhostCount = 8;
    const ghostsToAdd = targetGhostCount - currentGhostCount;

    if (ghostsToAdd <= 0) return;

    // Ghost spawn positions (around the ghost house)
    const spawnPositions = [
      { x: 12 * this.CELL_SIZE, y: 14 * this.CELL_SIZE },
      { x: 15 * this.CELL_SIZE, y: 14 * this.CELL_SIZE },
      { x: 13 * this.CELL_SIZE, y: 15 * this.CELL_SIZE },
      { x: 14 * this.CELL_SIZE, y: 15 * this.CELL_SIZE }
    ];

    const ghostTypes: Array<'aggressive' | 'ambush' | 'patrol' | 'random'> = ['aggressive', 'ambush', 'patrol', 'random'];
    const ghostImages = [this.redGhostImage, this.pinkGhostImage, this.blueGhostImage, this.orangeGhostImage];

    for (let i = 0; i < ghostsToAdd; i++) {
      const pos = spawnPositions[i % spawnPositions.length];
      const typeIndex = i % ghostTypes.length;
      const ghost = new Block(pos.x, pos.y, this.CELL_SIZE, this.CELL_SIZE, ghostImages[typeIndex]);
      ghost.type = ghostTypes[typeIndex];
      this.ghosts.add(ghost);
    }

    console.log(`👻 Created ${ghostsToAdd} additional ghosts. Total: ${this.ghosts.size}`);
  }

  private assignGhostTargets() {
    const ghostArray = Array.from(this.ghosts);

    // First 4 ghosts target Player 1, next 4 target Player 2
    ghostArray.forEach((ghost, index) => {
      if (index < 4) {
        ghost.targetPlayer = 1;
      } else {
        ghost.targetPlayer = 2;
      }
    });

    console.log('🎯 Assigned ghost targets: 4 → Player 1, 4 → Player 2');
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

      // Check for 2-player mode
      const players = params['players'] as string;
      if (players === '2') {
        this.isTwoPlayerMode = true;
        console.log('🎮 2-Player mode activated');

        // Initialize 2-player variables
        this.player1Lives = 3;
        this.player2Lives = 3;
        this.player1Score = 0;
        this.player2Score = 0;
        this.teamComboMultiplier = 1;
        this.lastPelletCollector = null;
        this.player1Trail = [];
        this.player2Trail = [];
        this.teamBonusParticles = [];
        this.connectionBeam = { active: false, pulse: 0 };
        this.winner = null;
      }      // Lese Spielername(n)
      const playerName = params['playerName'] as string;
      if (playerName) {
        this.playerName = playerName;
        console.log(`👤 Player 1: ${this.playerName}`);
      }

      const playerName2 = params['playerName2'] as string;
      if (playerName2 && this.isTwoPlayerMode) {
        this.playerName2 = playerName2;
        console.log(`👤 Player 2: ${this.playerName2}`);
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

    if (this.isBoostKeyPressed && this.boostEnergy > 0 && this.gameState === 'playing') {
      // Drain energy when boosting
      this.boostEnergy -= this.BOOST_DRAIN_RATE * deltaSeconds;

      // Warn when energy is low
      if (this.boostEnergy <= 20 && this.boostEnergy > 15) {
        this.announce('LOW ENERGY');
      }
      if (this.boostEnergy < 0) {
        this.boostEnergy = 0;
      }
    } else if (!this.isBoostKeyPressed && this.boostEnergy < this.MAX_BOOST_ENERGY) {
      // Recharge energy when not boosting
      this.boostEnergy += this.BOOST_RECHARGE_RATE * deltaSeconds;
      if (this.boostEnergy > this.MAX_BOOST_ENERGY) {
        this.boostEnergy = this.MAX_BOOST_ENERGY;
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

  // Draw Energy Gauge
  private drawEnergyGauge(ctx: CanvasRenderingContext2D) {
    const barWidth = 150;
    const barHeight = 20;
    const barX = this.CANVAS_WIDTH - barWidth - 15;
    const barY = 15;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);

    // Border
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
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const text = `BOOST: ${Math.floor(this.boostEnergy)}%`;
    ctx.strokeText(text, barX + barWidth / 2, barY + 14);
    ctx.fillText(text, barX + barWidth / 2, barY + 14);
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
    // Background music disabled
    // this.audioService.playBackgroundMusic();
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

    // Update Boost Mode based on key state and energy
    if (this.gameMode !== 'practice') {
      if (this.isBoostKeyPressed && this.boostEnergy > 0) {
        this.turboSpeed = true;
      } else {
        this.turboSpeed = false;
      }
    }

    // Gamepad Input for SPIELANLEITUNG
    if (this.showSpielanleitung) {
      this.handleSpielanleitungGamepad();
    }

    // Arcade Input - Try arcade joystick first, fallback to standard gamepad
    let gpDir: string | null = null;
    gpDir = this.inputService.getArcadeDirection(1); // Player 1 joystick
    if (!gpDir) {
      gpDir = this.inputService.getDirection(); // Fallback to standard gamepad
    }

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

    // Pause Menu Navigation / Game Over Menu Navigation
    let currentDirection: string | null = null;
    if (this.showPauseOverlay) {
      // Try arcade joystick first, fallback to standard gamepad
      currentDirection = this.inputService.getArcadeDirection(1);
      if (!currentDirection) {
        currentDirection = this.inputService.getDirection();
      }
    }

    // Try to apply buffered direction for robot2 (WASD)
    if (this.isTwoPlayerMode && this.bufferedDirection2 && this.robot2 && this.gameState === 'playing') {
      const canTurn = this.canChangeTo2(this.bufferedDirection2);
      if (canTurn) {
        this.robot2.updateDirection(this.bufferedDirection2, this.CELL_SIZE, this.walls);
        // Update image
        if (this.bufferedDirection2 === 'U') this.robot2.image = this.robotUpImage;
        else if (this.bufferedDirection2 === 'D') this.robot2.image = this.robotDownImage;
        else if (this.bufferedDirection2 === 'L') this.robot2.image = this.robotLeftImage;
        else if (this.bufferedDirection2 === 'R') this.robot2.image = this.robotRightImage;
        this.bufferedDirection2 = null; // Clear buffer after successful turn
      }
    }

    // Gamepad Restart / Exit in Game Over
    if ((this.gameState as string) === 'gameover') {
      if (this.inputService.isActionButtonPressed()) {
        this.restartGame();
      }

      if (currentDirection === 'L' || currentDirection === 'R') {
        this.navigatePauseMenu(currentDirection);
      }

      // Select button (Button 10) or standard A Button (0) - Select
      if (this.inputService.isArcadeSelectPressed() || this.inputService.isActionButtonPressed()) {
        this.selectPauseMenuItem();
      }

      // Pause button (Button 8) - Resume if on Resume option
      if (this.inputService.isArcadePausePressed() || this.inputService.isPauseButtonPressed()) {
        if (this.pauseMenuIndex === 0) {
          this.resumeFromPause();
        } else {
          this.selectPauseMenuItem();
        }
      }
    } else {
      // Arcade Button Handling
      // Pause button (Button 8)
      if (this.inputService.isArcadePausePressed() || this.inputService.isPauseButtonPressed()) {
        if (this.gameState === 'paused') {
          this.resumeFromPause();
        } else if (this.gameState === 'playing') {
          this.openPause();
        } else if ((this.gameState as string) === 'gameover') {
          this.openPause();
        }
      }
    }

    // Boost button (Button 12) - only in playing state
    if (this.gameState === 'playing' && this.gameMode !== 'practice') {
      const boostPressed: boolean = this.inputService.isArcadeBoostPressed();
      if (boostPressed && !this.isBoostKeyPressed) {
        this.isBoostKeyPressed = true;
        console.log('🚀 Boost aktiviert (Arcade Button)');
      } else if (!boostPressed && this.isBoostKeyPressed) {
        this.isBoostKeyPressed = false;
        this.turboSpeed = false;
        console.log('🛑 Boost deaktiviert (Arcade Button)');
      }
    }

    // Help/Spielanleitung button (Button 13)
    if (this.gameState === 'playing') {
      const now = Date.now();
      if (this.inputService.isArcadeHelpPressed() && now - this.lastGamepadSpielanleitungAction > 300) {
        this.toggleSpielanleitung();
        this.lastGamepadSpielanleitungAction = now;
      }
    }

    // Game Over Menu Navigation
    if ((this.gameState as string) === 'gameover') {
      // Try arcade joystick first, fallback to standard gamepad
      let currentDirection = this.inputService.getArcadeDirection(1);
      if (!currentDirection) {
        currentDirection = this.inputService.getDirection();
      }

      if (currentDirection === 'L' || currentDirection === 'R') {
        this.navigateGameOverMenu(currentDirection);
      }

      // Select button (Button 10) or standard A Button (0) - Select
      if (this.inputService.isArcadeSelectPressed() || this.inputService.isActionButtonPressed()) {
        this.selectGameOverMenuItem();
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
          if (this.lives <= 0) {
            // Trigger final explosion before game over
            this.gameState = 'finalexplosion';
            this.stateTimer = 0;
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
          }
        }
        return;

      case 'finalexplosion':
        this.stateTimer += deltaTime;
        if (this.stateTimer >= this.FINAL_EXPLOSION_DURATION) {
          this.gameState = 'gameover';
          this.gameOver = true;
          this.gameOverMenuIndex = 0; // Reset to Restart
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

      case 'gameover':
        return; // Warte auf Tastendruck
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

    // 2-Player Mode Updates
    if (this.isTwoPlayerMode) {
      this.updatePlayerTrails();
      this.updateConnectionBeam();
      this.updateTeamBonusParticles();
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

    // 2-Player: Update power-up timers
    if (this.isTwoPlayerMode) {
      if (this.player1PowerUpTimer > 0) {
        this.player1PowerUpTimer -= deltaTime;
        if (this.player1PowerUpTimer <= 0) {
          this.player1PowerUp = 'none';
          this.player1PowerUpTimer = 0;
        }
      }

      if (this.player2PowerUpTimer > 0) {
        this.player2PowerUpTimer -= deltaTime;
        if (this.player2PowerUpTimer <= 0) {
          this.player2PowerUp = 'none';
          this.player2PowerUpTimer = 0;
        }
      }
    }

    // Bonus effect timers
    if (this.bonusEffectTimer > 0) {
      this.bonusEffectTimer -= deltaTime;
      if (this.bonusEffectTimer <= 0) {
        this.shieldActive = false;
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

  // Check if robot2 can turn to a new direction (for buffered input)
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

    // 2-Player Mode: Select target based on ghost's assigned player
    let targetRobot = this.pacman;
    if (this.isTwoPlayerMode && ghost.targetPlayer === 2 && this.robot2) {
      targetRobot = this.robot2;
    }

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

    let targetX = targetRobot.x;
    let targetY = targetRobot.y;

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
            targetX = targetRobot.x;
            targetY = targetRobot.y;
            break;

          case 'ambush': // ROSA - Lauert voraus (4 Tiles vor Pac-Man)
            if (targetRobot.direction === 'U') {
              targetX = targetRobot.x;
              targetY = targetRobot.y - 4 * this.CELL_SIZE;
            } else if (targetRobot.direction === 'D') {
              targetX = targetRobot.x;
              targetY = targetRobot.y + 4 * this.CELL_SIZE;
            } else if (targetRobot.direction === 'L') {
              targetX = targetRobot.x - 4 * this.CELL_SIZE;
              targetY = targetRobot.y;
            } else {
              targetX = targetRobot.x + 4 * this.CELL_SIZE;
              targetY = targetRobot.y;
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

    // Move robot2 in 2-player mode
    if (this.isTwoPlayerMode && this.robot2) {
      let boostMultiplier2 = this.turboSpeed ? 2 : 1;

      // Apply speed power-up for player 2
      if (this.player2PowerUp === 'speed') {
        boostMultiplier2 = Math.max(boostMultiplier2, 1.5);
      }

      const steps = Math.ceil(boostMultiplier2);
      for (let i = 0; i < steps; i++) {
        const oldX = this.robot2.x;
        const oldY = this.robot2.y;

        // Move one step
        this.robot2.x += this.robot2.velocityX;
        this.robot2.y += this.robot2.velocityY;

        // Tunnel-Wraparound für robot2
        this.handleTunnelWraparound(this.robot2);

        // Check wall collision
        let collided = false;
        for (const wall of this.walls) {
          if (wall.type === 'ghost-door') continue;

          if (this.collision(this.robot2, wall)) {
            // Revert movement
            this.robot2.x = oldX;
            this.robot2.y = oldY;
            collided = true;
            break;
          }
        }

        // Stop moving if we hit a wall
        if (collided) break;
      }
    }

    // Check ghost collisions with robot1
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
          // Successful repair: increment repair counter
          this.stats.repairsSuccessful += 1;
          // Fixed error (counts as resolved malfunction)
          this.stats.errorsFixed += 1;

          // Check whether a new achievement has been unlocked
          const newlyUnlocked = this.achievements.checkAndUnlock(this.stats);

          // Show achievement popup if one was unlocked
          if (newlyUnlocked.length > 0) {
            this.showAchievementToast(newlyUnlocked[0]);
          }

          // Respawn ghost at starting position
          ghost.reset();
          ghost.scared = false;
          ghost.updateVelocity(this.CELL_SIZE); // Reset to normal speed
          continue;
        } else {
          // Systemfehler: Health verlieren
          this.audioService.play('die');

          // 2-Player Mode: Separate lives
          if (this.isTwoPlayerMode) {
            this.player1Lives -= 1;

            // Check if Player 1 lost all lives
            if (this.player1Lives <= 0) {
              this.winner = 2; // Player 2 wins
              this.systemHealth = 0; // Trigger game over
              this.announce(`PLAYER 2 ${this.playerName2} WINS!`);
            }
          } else {
            this.systemHealth -= 1;
          }

          this.damageFlash = 0.5; // Trigger damage flash
          this.gameState = 'dying';
          this.stateTimer = 0;
          return; // Stoppe weitere Bewegung
        }
      }

      // Check ghost collisions with robot2 in 2-player mode
      if (this.isTwoPlayerMode && this.robot2 && this.collision(ghost, this.robot2)) {
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

          // 2-Player Mode: Separate lives
          if (this.isTwoPlayerMode) {
            this.player2Lives -= 1;

            // Check if Player 2 lost all lives
            if (this.player2Lives <= 0) {
              this.winner = 1; // Player 1 wins
              this.systemHealth = 0; // Trigger game over
              this.announce(`PLAYER 1 ${this.playerName} WINS!`);
            }
          } else {
            this.systemHealth -= 1;
          }

          this.damageFlash = 0.5; // Trigger damage flash
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

    // Check food collision (Produktionsauftrag) with robot1
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

          // Show combo display for high streaks
          if (this.pelletStreak >= 10) {
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

          // 2-Player Mode: Separate scoring with team bonus
          if (this.isTwoPlayerMode) {
            const basePoints = Math.floor(10 * this.streakMultiplier);
            const teamPoints = Math.floor(basePoints * this.teamComboMultiplier);
            this.player1Score += teamPoints;

            // Track last collector for team combo
            if (this.lastPelletCollector === 2) {
              // Consecutive collection by different players = team combo!
              this.createTeamBonusParticles(food.x + 2, food.y + 2);
            }
            this.lastPelletCollector = 1;
          } else {
            this.score += Math.floor(10 * this.streakMultiplier);
          }
        }
      }
    }
    if (foodEaten) {
  // Remove collected sensor data from the map
  this.foods.delete(foodEaten);

  // Increase the collected sensor data counter
  this.stats.sensorDataCollected += 1;
  // Update system performance based on collected pellets
const collected =
  this.totalPellets - (this.foods.size + this.powerPellets.size);

this.stats.systemPerformance = Math.round(
  (collected / this.totalPellets) * 100
);
  // Check whether a new achievement has been unlocked
  const newlyUnlocked = this.achievements.checkAndUnlock(this.stats);

  // Show achievement popup if one was unlocked
  if (newlyUnlocked.length > 0) {
    this.showAchievementToast(newlyUnlocked[0]);
  }
}

    // Check food collision with robot2 in 2-player mode
    if (this.isTwoPlayerMode && this.robot2) {
      let foodEaten2: Block | null = null;
      for (const food of this.foods) {
        if (this.collision(this.robot2, food)) {
          this.audioService.play('waka');
          foodEaten2 = food;
          // Create green particles for sensor data
          this.createParticles(food.x + 2, food.y + 2, '#00FF88', 6);

          // Only count pellets after touching a checkpoint
          if (this.pelletCountingEnabled) {
            this.pelletStreak++;
            this.comboResetTimer = this.COMBO_RESET_DELAY;

            // Show combo display for high streaks
            if (this.pelletStreak >= 10) {
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

            const basePoints = Math.floor(10 * this.streakMultiplier);
            const teamPoints = Math.floor(basePoints * this.teamComboMultiplier);
            this.player2Score += teamPoints;

            // Track last collector for team combo
            if (this.lastPelletCollector === 1) {
              // Consecutive collection by different players = team combo!
              this.createTeamBonusParticles(food.x + 2, food.y + 2);
            }
            this.lastPelletCollector = 2;
          }
        }
      }
      if (foodEaten2) {
        this.foods.delete(foodEaten2);
      }
    }

    // Check power pellet collision (KI-Optimierung) with robot1
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
      }
    }
    if (powerEaten) {
      this.powerPellets.delete(powerEaten);
    }

    // Check power pellet collision with robot2 in 2-player mode
    if (this.isTwoPlayerMode && this.robot2) {
      let powerEaten2: Block | null = null;
      for (const pellet of this.powerPellets) {
        if (this.collision(this.robot2, pellet)) {
          this.audioService.play('powerpill');
          powerEaten2 = pellet;
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
      if (powerEaten2) {
        this.powerPellets.delete(powerEaten2);
      }
    }

    // Quality Checkpoint collision with robot1
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
          }
        }
      });
    }

    // Quality Checkpoint collision with robot2 in 2-player mode
    if (this.isTwoPlayerMode && this.robot2) {
      this.qualityCheckpoints.forEach(checkpoint => {
        if (this.collision(this.robot2!, checkpoint)) {
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
          }
        }
      });
    }

    // Cherry/Bonus collision with effects - robot1
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

          // 2-Player: Assign magnet power-up
          if (this.isTwoPlayerMode) {
            this.player1PowerUp = 'magnet';
            this.player1PowerUpTimer = 10000;
          }
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

          // 2-Player: Assign speed power-up
          if (this.isTwoPlayerMode) {
            this.player1PowerUp = 'speed';
            this.player1PowerUpTimer = 10000;
          }
          break;
      }

      // Create colored particles based on bonus type
      this.createParticles(this.cherry.x + 16, this.cherry.y + 16, particleColor, 20);

      // 2-Player: Add to individual score
      if (this.isTwoPlayerMode) {
        this.player1Score += bonusScore;
      } else {
        this.efficiency += bonusScore;
      }

      // System Health bonus (capped at 3)
      if (this.systemHealth < 3) {
        this.systemHealth += 1;
      }

      // 2-Player: Extra life for player 1
      if (this.isTwoPlayerMode && this.player1Lives < 3) {
        this.player1Lives += 1;
      }

      this.cherry = null;
      this.cherrySpawnCooldown = 300;
    }

    // Cherry/Bonus collision with effects - robot2
    if (this.isTwoPlayerMode && this.robot2 && this.cherry && this.collision(this.robot2, this.cherry)) {
      let bonusScore = 500;
      let particleColor = '#FFD700';

      // Apply bonus effect based on type
      switch (this.currentBonusType) {
        case 'iot-sensor':
          bonusScore = 700;
          particleColor = '#00FFFF';
          this.dataStreak += 10;
          this.audioService.play('eatghost');
          this.player2PowerUp = 'magnet';
          this.player2PowerUpTimer = 10000;
          break;
        case 'shield':
          bonusScore = 500;
          particleColor = '#4169E1';
          this.shieldActive = true;
          this.bonusEffectTimer = 10000;
          this.audioService.play('eatghost');
          this.announce('DEFENSE SHIELD ACTIVATED');
          this.player2PowerUp = 'shield';
          this.player2PowerUpTimer = 10000;
          break;
        case 'diagnostic':
          bonusScore = 500;
          particleColor = '#FF69B4';
          this.audioService.play('eatghost');
          this.player2PowerUp = 'speed';
          this.player2PowerUpTimer = 10000;
          break;
      }

      // Create colored particles
      this.createParticles(this.cherry.x + 16, this.cherry.y + 16, particleColor, 20);
      this.player2Score += bonusScore;

      // System Health bonus
      if (this.systemHealth < 3) {
        this.systemHealth += 1;
      }

      // Extra life for player 2
      if (this.player2Lives < 3) {
        this.player2Lives += 1;
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
    // Reset performance at level start
    this.stats.systemPerformance = 0;

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
    if (this.isTwoPlayerMode && this.robot2) {
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

      // 2-Player Mode: Use combined score
      const finalScore = this.isTwoPlayerMode
        ? (this.player1Score + this.player2Score)
        : this.score;

      // 2-Player Mode: Combined lives remaining
      const livesRemaining = this.isTwoPlayerMode
        ? (this.player1Lives + this.player2Lives)
        : this.lives;

      const dto: any = {
        Username: this.playerName?.trim() || 'Anonymous',
        Points: finalScore,
        Level: this.currentLevel,
        LivesRemaining: livesRemaining,
        ProductionOrdersCollected: collected,
        SensorsRepaired: 0,
        PlaytimeSeconds: 0,
        IsTwoPlayerMode: this.isTwoPlayerMode
      };

      // Add second player if in 2-player mode
      if (this.isTwoPlayerMode && this.playerName2?.trim()) {
        dto.Player2Username = this.playerName2.trim();
      }

      console.log(`🏆 Submitting ${this.isTwoPlayerMode ? '2-player combined' : 'single player'} score:`, finalScore);

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

    // Initialize 2-player mode variables
    if (this.isTwoPlayerMode) {
      this.player1Lives = 3;
      this.player2Lives = 3;
      this.player1Score = 0;
      this.player2Score = 0;
      this.teamComboMultiplier = 1;
      this.lastPelletCollector = null;
      this.player1Trail = [];
      this.player2Trail = [];
      this.teamBonusParticles = [];
      this.connectionBeam = { active: false, pulse: 0 };
      this.winner = null; // Reset winner
    }    this.pelletStreak = 0;
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
      } else if ((this.gameState as string) === 'gameover') {
        // allow exit confirm from gameover via pause overlay
        this.openPause();
      }
      return;
    }

    // Game Over Menu Navigation
    if ((this.gameState as string) === 'gameover') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateGameOverMenu('L');
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateGameOverMenu('R');
        return;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectGameOverMenuItem();
        return;
      }
      return; // Don't process other keys when game over menu is active
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

    // Shift for boost in all modes
    if (e.key === 'Shift' && this.gameMode !== 'practice') {
      this.isBoostKeyPressed = true;
      return;
    }

    // Keine Steuerung während Ready, Dying oder Level Complete
    if (this.gameState !== 'playing') return;

    if (!this.pacman) return;

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

// Handle robot2 (WASD keys) in 2-player mode
if (this.isTwoPlayerMode && this.robot2) {
  const key = e.key.toLowerCase();
  if (key === 'w') {
    this.bufferedDirection2 = 'U';
  } else if (key === 's') {
    this.bufferedDirection2 = 'D';
  } else if (key === 'a') {
    this.bufferedDirection2 = 'L';
  } else if (key === 'd') {
    this.bufferedDirection2 = 'R';
  }

  // Try to apply immediately if possible
  if (this.bufferedDirection2) {
    const canTurn = this.canChangeTo2(this.bufferedDirection2);
    if (canTurn) {
      this.robot2.updateDirection(this.bufferedDirection2, this.CELL_SIZE, this.walls);

      // Update robot2 image
      if (this.bufferedDirection2 === 'U') {
        this.robot2.image = this.robotUpImage;
      } else if (this.bufferedDirection2 === 'D') {
        this.robot2.image = this.robotDownImage;
      } else if (this.bufferedDirection2 === 'L') {
        this.robot2.image = this.robotLeftImage;
      } else if (this.bufferedDirection2 === 'R') {
        this.robot2.image = this.robotRightImage;
      }

      this.bufferedDirection2 = null; // Clear buffer on successful turn
    }
    // Otherwise keep buffered for next frame
  }
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
    if (e.key === 'Shift') {
      this.isBoostKeyPressed = false;
      this.turboSpeed = false;
    }
  }
}

  requestExitToMenu() {
  this.showExitConfirm = true;
  this.gameState = 'paused';
  this.stopGameLoop();
}

cancelExitToMenu() {
  this.showExitConfirm = false;
  if (!this.gameOver) {
    this.gameState = 'playing';
    this.startGameLoop();
  }
}

confirmExitToMenu() {
  this.exitGame();
}


  private openPause() {
    this.showPauseOverlay = true;
    this.gameState = 'paused';
    this.pauseMenuIndex = 0; // Reset to Resume
    this.stopGameLoop();
  }

  resumeFromPause() {
    this.showPauseOverlay = false;
    this.showExitConfirm = false;
    this.pauseMenuIndex = 0;
    if (!this.gameOver) {
      this.gameState = 'playing';
      this.startGameLoop();
    }
  }

  navigatePauseMenu(direction: string): void {
    if (!this.showPauseOverlay) return;

    switch (direction) {
      case 'L':
        this.pauseMenuIndex = Math.max(0, this.pauseMenuIndex - 1);
        break;
      case 'R':
        this.pauseMenuIndex = Math.min(2, this.pauseMenuIndex + 1);
        break;
    }
  }

  selectPauseMenuItem(): void {
    if (!this.showPauseOverlay) return;

    switch (this.pauseMenuIndex) {
      case 0:
        this.resumeFromPause();
        break;
      case 1:
        this.restartGame();
        break;
      case 2:
        this.exitGame();
        break;
    }
  }

  navigateGameOverMenu(direction: string): void {
    if (this.gameState !== 'gameover') return;

    switch (direction) {
      case 'L':
        this.gameOverMenuIndex = Math.max(0, this.gameOverMenuIndex - 1);
        break;
      case 'R':
        this.gameOverMenuIndex = Math.min(1, this.gameOverMenuIndex + 1);
        break;
    }
  }

  selectGameOverMenuItem(): void {
    if (this.gameState !== 'gameover') return;

    switch (this.gameOverMenuIndex) {
      case 0:
        this.restartGame();
        break;
      case 1:
        this.exitGame();
        break;
    }
  }

  // ============================================================================
  // DECORATIVE INDUSTRIAL ELEMENTS
  // ============================================================================

  private initializeIndustrialDecorations() {
    // Warning Signs - Positioned near corners and danger zones (keep only ACHTUNG)
    this.warningSignsPositions = [
      { x: 2 * this.CELL_SIZE, y: 3 * this.CELL_SIZE, type: 'achtung' },
      { x: 25 * this.CELL_SIZE, y: 3 * this.CELL_SIZE, type: 'achtung' },
      { x: 2 * this.CELL_SIZE, y: 24 * this.CELL_SIZE, type: 'achtung' },
      { x: 25 * this.CELL_SIZE, y: 24 * this.CELL_SIZE, type: 'achtung' }
    ];

    // Status LEDs - Blinking indicators (keep blinking dots)
    this.statusLEDPositions = [
      { x: 3 * this.CELL_SIZE, y: 6 * this.CELL_SIZE, color: 'green', blinkSpeed: 1000 },
      { x: 24 * this.CELL_SIZE, y: 6 * this.CELL_SIZE, color: 'green', blinkSpeed: 1200 },
      { x: 3 * this.CELL_SIZE, y: 21 * this.CELL_SIZE, color: 'orange', blinkSpeed: 800 },
      { x: 24 * this.CELL_SIZE, y: 21 * this.CELL_SIZE, color: 'red', blinkSpeed: 600 },
      { x: 10 * this.CELL_SIZE, y: 14 * this.CELL_SIZE, color: 'green', blinkSpeed: 1500 },
      { x: 17 * this.CELL_SIZE, y: 14 * this.CELL_SIZE, color: 'green', blinkSpeed: 1300 }
    ];
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


