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
import { AchievementService } from '../services/achievement.service';



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
    // === Performance tracking per level ===
  private levelTotalSensors = 0;      // total number of pellets in the current level
  private sensorDataAtLevelStart = 0; // sensor count at the beginning of the level

  
  // =========================
  // ACHIEVEMENT SYSTEM - STATS
  // =========================

  // Stores all achievement-related statistics for the current game session
  stats: GameStats = {
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




  // Holds data for the achievement popup (toast)
  achievementToast: { title: string; description: string } | null = null;

  // Displays an achievement popup for a short time
  private showAchievementToast(a: { title: string; description: string }) {
    this.achievementToast = {
      title: a.title,
      description: a.description,
    };

    // Automatically hide the popup after 3.5 seconds
    setTimeout(() => {
      this.achievementToast = null;
    }, 3500);
  }

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

  // Death animation - maze destruction
  private mazeDestruction: Map<Block, {offsetY: number, rotation: number, speed: number}> = new Map();
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

  // Ready/Game Over Screen
  gameState: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete' | 'paused' | 'finalexplosion' = 'ready';
  private stateTimer = 0;
  private readonly READY_DURATION = 2000; // 2 Sekunden "READY!"
  private readonly DEATH_DURATION = 1500; // 1.5 Sekunden Todesanimation
  private readonly FINAL_EXPLOSION_DURATION = 3000; // 3 seconds final explosion
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
    // Industrial grid background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
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

    // Wände zeichnen (optimiert sans shadow)
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
          // Fallback: pinke Linie
          ctx.fillStyle = '#FFB8FF';
          ctx.fillRect(0, wall.height / 2 - 2, wall.width, 4);
        }
      } else if (wall.image && wall.image.complete) {
        // Walls drawing
        if ((this.gameState === 'dying' || this.gameState === 'finalexplosion') && this.mazeRedIntensity > 0) {
          // Red tint overlay
          ctx.globalCompositeOperation = 'source-over';
          if (this.mazeDestruction.has(wall)) {
            ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
          } else {
            ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
          }
          ctx.fillStyle = `rgba(255, 0, 0, ${this.mazeRedIntensity * 0.5})`;
          ctx.fillRect(0, 0, wall.width, wall.height);
        } else {
          if (this.mazeDestruction.has(wall)) {
            ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
          } else {
            ctx.drawImage(wall.image, 0, 0, wall.width, wall.height);
          }
        }
      } else {
        // Fallback: Blaue Wände mit 3D-Effekt
        ctx.fillStyle = '#2121DE';
        ctx.fillRect(0, 0, wall.width, wall.height);
        // Inner highlight für 3D-Effekt
        ctx.fillStyle = '#4A4AFF';
        ctx.fillRect(2, 2, wall.width - 4, wall.height - 4);
      }

      ctx.restore();
    });

    // Sensordaten zeichnen (kleine ifm-Symbole)
    this.sensorData.forEach(food => {
      // Draw sensor data pellet (small green dot)
      if (this.sensorDataImage.complete) {
        ctx.drawImage(this.sensorDataImage, food.x, food.y, 8, 8);
      } else {
        // Fallback
        ctx.fillStyle = '#00FF88';
        ctx.fillRect(food.x + 1, food.y + 1, 3, 3);
      }
    });

    // Wartungsstationen zeichnen (blinkend)
    if (this.powerPelletVisible) {
      this.maintenanceStations.forEach(pellet => {
        if (this.maintenanceStationImage.complete) {
          // Pulse animation
          const scale = 1 + Math.sin(this.maintenancePulse) * 0.15;
          const offset = (pellet.width * (1 - scale)) / 2;

          // Orange glow
          ctx.shadowColor = '#ED6B00';
          ctx.shadowBlur = 12;
          ctx.drawImage(this.maintenanceStationImage,
            pellet.x + offset, pellet.y + offset,
            pellet.width * scale, pellet.height * scale);
          ctx.shadowBlur = 0;
        } else {
          // Fallback: orange square
          ctx.fillStyle = '#ED6B00';
          ctx.fillRect(pellet.x + 2, pellet.y + 2, pellet.width - 4, pellet.height - 4);
        }
      });
    }

    // Control Panels zeichnen (decorative)
    this.controlPanels.forEach(panel => {
      if (this.controlPanelImage.complete) {
        ctx.drawImage(this.controlPanelImage, panel.x, panel.y, this.CELL_SIZE, this.CELL_SIZE);

        // LED indicator (blinking) - simplified
        if (Math.floor(this.ledBlinkTimer / 500) % 2 === 0) {
          ctx.fillStyle = '#00FF88';
          ctx.beginPath();
          ctx.arc(panel.x + this.CELL_SIZE - 5, panel.y + 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });    // Quality Checkpoints zeichnen (blinkend)
    const checkpointVisible = Math.floor(Date.now() / 300) % 2 === 0;
    if (checkpointVisible) {
      this.qualityCheckpoints.forEach(checkpoint => {
        if (this.qualityCheckpointImage.complete) {
          ctx.drawImage(this.qualityCheckpointImage, checkpoint.x + 8, checkpoint.y + 8, 16, 16);
          // Glow effect
          ctx.strokeStyle = '#4169E1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(checkpoint.x + 16, checkpoint.y + 16, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // Cherry/Bonus zeichnen mit aktuellem Bonus-Typ
    if (this.cherry) {
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
      if (bonusImage.complete) {
        // Bounce animation
        const bounceOffset = Math.sin(this.bonusBounce) * 3;

        ctx.drawImage(bonusImage, this.cherry.x + 4, this.cherry.y + 4 + bounceOffset, 24, 24);
      }
    }    // Robot mit Animation zeichnen
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

    // Smooth rotation based on direction
    const targetRotation = this.getTargetRotation(this.robot.direction);
    this.robotRotation += (targetRotation - this.robotRotation) * 0.2;
    ctx.rotate(this.robotRotation);

    // Draw ifm robot instead of pacman
    // Robot body (orange square)
    ctx.fillStyle = '#ED6B00';
    ctx.fillRect(-size/2, -size/2, size, size);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size/2, -size/2, size, size);

    // Robot head (smaller square, positioned based on direction)
    const headSize = size * 0.6;
    let headX = 0, headY = 0;

    if (this.robot.direction === 'U') { headX = 0; headY = -size * 0.3; }
    else if (this.robot.direction === 'D') { headX = 0; headY = size * 0.3; }
    else if (this.robot.direction === 'L') { headX = -size * 0.3; headY = 0; }
    else if (this.robot.direction === 'R') { headX = size * 0.3; headY = 0; }

    ctx.fillStyle = '#ED6B00';
    ctx.fillRect(headX - headSize/2, headY - headSize/2, headSize, headSize);
    ctx.strokeRect(headX - headSize/2, headY - headSize/2, headSize, headSize);

    // Robot eyes (sensors)
    ctx.fillStyle = '#1a1a1a';
    if (this.robot.direction === 'U' || this.robot.direction === 'D') {
      ctx.beginPath();
      ctx.arc(headX - 2, headY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headX + 2, headY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(headX, headY - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headX, headY + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central ifm indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();

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

    // Combo counter display
    if (this.pelletStreak >= 10 && this.comboDisplayTimer > 0) {
      ctx.save();
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      const comboAlpha = this.comboDisplayTimer / 1000;
      ctx.fillStyle = `rgba(255, 215, 0, ${comboAlpha})`;
      ctx.fillText(`${this.pelletStreak}x COMBO!`, this.CANVAS_WIDTH / 2, 100);
      ctx.restore();
    }

    // Draw particles
    this.drawParticles(ctx);

    // System Health unten links
    for (let i = 0; i < this.systemHealth; i++) {
      this.drawRobotIcon(ctx, 20 + i * 25, this.CANVAS_HEIGHT - 15);
    }

    // Active bonus effects display with circular progress
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    let effectY = this.CANVAS_HEIGHT - 40;

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

    // Final explosion screen
    if (this.gameState === 'finalexplosion') {
      ctx.save();
      const explosionProgress = this.stateTimer / this.FINAL_EXPLOSION_DURATION;
      ctx.font = 'bold 32px "Press Start 2P", monospace';
      ctx.fillStyle = `rgba(255, 0, 0, ${explosionProgress})`;
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);

      // Flickering effect
      if (Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${explosionProgress * 0.5})`;
        ctx.fillText('GAME OVER', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
      }
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
          this.systemHealth -= 1;
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
          this.score += Math.floor(10 * this.streakMultiplier);
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
      }
    }
    if (powerEaten) {
      this.powerPellets.delete(powerEaten);
    }

    // Quality Checkpoint collision
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
    }    // Cherry/Bonus collision with effects
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
