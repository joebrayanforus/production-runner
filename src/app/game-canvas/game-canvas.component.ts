import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { GameManager } from '../models/game-manager';
import { Block } from '../models/Block';
@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [],
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

  // Basic game state
  lives = 3;
  score = 0;
  gameOver = false;
  scaredTimer = 0;
  scaredDuration = 10000; // 10 seconds in ms
  pelletStreak = 0;
  streakMultiplier = 1.0;
  currentLevel = 1;
  private draw(ctx: CanvasRenderingContext2D) {
  // Pac-Man zeichnen
  if (this.pacman && this.pacman.image && this.pacman.image.complete) {
    ctx.drawImage(this.pacman.image, this.pacman.x, this.pacman.y, this.pacman.width, this.pacman.height);
  }

  // Geister zeichnen (scared oder normal)
  this.ghosts.forEach(ghost => {
    const img = ghost.scared ? this.scaredGhostImage : ghost.image;
    if (img && img.complete) {
      ctx.drawImage(img, ghost.x, ghost.y, ghost.width, ghost.height);
    }
  });

  // Wände zeichnen
  this.walls.forEach(wall => {
    if (wall.image && wall.image.complete) {
      ctx.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
    }
  });

  // Foods zeichnen (weiße Rechtecke - Produktionsaufträge)
  ctx.fillStyle = 'white';
  this.foods.forEach(food => {
    ctx.fillRect(food.x, food.y, food.width, food.height);
  });

  // Power Pellets zeichnen (größere gelbe Kreise - KI-Optimierung)
  ctx.fillStyle = '#FFD700';
  this.powerPellets.forEach(pellet => {
    ctx.beginPath();
    ctx.arc(pellet.x + pellet.width / 2, pellet.y + pellet.height / 2, pellet.width / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Cherry zeichnen
  if (this.cherry && this.cherry.image && this.cherry.image.complete) {
    ctx.drawImage(this.cherry.image, this.cherry.x, this.cherry.y, this.cherry.width, this.cherry.height);
  }

  // Score und UI
  ctx.font = '18px Arial';
  ctx.fillStyle = 'white';
  const infoX = this.CELL_SIZE / 2;
  const infoY = this.CELL_SIZE / 2;
  if (this.gameOver) {
    ctx.fillText(`Game Over: ${this.score}`, infoX, infoY);
  } else {
    ctx.fillText(`x${this.lives} | Score: ${this.score} | Streak: x${this.streakMultiplier.toFixed(1)} | Level: ${this.currentLevel}`, infoX, infoY);
  }
}  //Grid-System(wie klassiches Pac-Man: 28x31 Felder)
  readonly GRID_WIDTH = 28;
  readonly GRID_HEIGHT = 31;
  readonly CELL_SIZE = 20; // Pixel pro Feld
  // Canvas-Dimensionen
  readonly CANVAS_WIDTH = this.GRID_WIDTH * this.CELL_SIZE;  // 560px
  readonly CANVAS_HEIGHT = this.GRID_HEIGHT * this.CELL_SIZE; // 620px
  // Game Manager
  private game: GameManager | null = null;

  // Debug-Modus
  debugMode = false;
  constructor() {
    this.initAssets();
  }

  private initAssets() {
    this.blueGhostImage.src = 'assets/blueGhost.png';
    this.orangeGhostImage.src = 'assets/orangeGhost.png';
    this.pinkGhostImage.src = 'assets/pinkGhost.png';
    this.redGhostImage.src = 'assets/redGhost.png';
    this.pacmanUpImage.src = 'assets/pacmanUp.png';
    this.pacmanDownImage.src = 'assets/pacmanDown.png';
    this.pacmanLeftImage.src = 'assets/pacmanLeft.png';
    this.pacmanRightImage.src = 'assets/pacmanRight.png';
    this.wallImage.src = 'assets/wall.png';
    this.powerFoodImage.src = 'assets/powerPellet.png';
    this.scaredGhostImage.src = 'assets/scaredGhost.png';
    this.cherryImage.src = 'assets/cherry.png';
  }
  private readonly tileMap: string[] = [
  "XXXXXXXXXXXXXXXXXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X                 X",
  "X XX X XXXXX X XX X",
  "X    X       X    X",
  "XXXX XXXX XXXX XXXX",
  "OOOX X       X XOOO",
  "XXXX X XXrXX X XXXX",
  "X       bpo       X",
  "XXXX X XXXXX X XXXX",
  "OOOX X       X XOOO",
  "XXXX X XXXXX X XXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X  X     P     X  X",
  "XX X X XXXXX X X XX",
  "X    X   X   X    X",
  "X XXXXXX X XXXXXX X",
  "X                 X",
  "XXXXXXXXXXXXXXXXXXX"
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
        } else if (tileMapChar === 'b') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.blueGhostImage);
          ghost.type = 'patrol'; // Cyan/Blue - patrol
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'o') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.orangeGhostImage);
          ghost.type = 'random'; // Orange - random
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'p') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.pinkGhostImage);
          ghost.type = 'ambush'; // Pink - ambush
          this.ghosts.add(ghost);
        } else if (tileMapChar === 'r') {
          const ghost = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.redGhostImage);
          ghost.type = 'aggressive'; // Red - aggressive chaser
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
        }
      }
    }
  }
  ngOnInit(): void{
    console.log('🎮 GameCanvasComponent initialized');
    this.game = new GameManager(this.GRID_WIDTH, this.GRID_HEIGHT);
    if (this.game.maze) {
      console.log('🏭 Game created:', this.game.maze.countRemainingDots(), 'dots');
    }
    this.loadMap();

    // Initialize ghost directions
    const directions = ['U', 'D', 'L', 'R'];
    for (const ghost of this.ghosts) {
      const randomDir = directions[Math.floor(Math.random() * 4)];
      ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
    }
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

    this.startGameLoop();
  }
  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.onKeyDownBound);
  }

  private startGameLoop() {
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
    this.move();
    // Update scared timer
    if (this.scaredTimer > 0) {
      this.scaredTimer -= 1000 / this.FPS;
      if (this.scaredTimer <= 0) {
        this.ghosts.forEach(g => {
          g.scared = false;
          g.updateVelocity(this.CELL_SIZE); // Reset to normal speed
        });
      }
    }
    if (this.gameOver) {
      this.stopGameLoop();
    }
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
  }

  private collision(a: Block, b: Block): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  private move() {
    if (!this.pacman) return;

    // Move pacman
    this.pacman.x += this.pacman.velocityX;
    this.pacman.y += this.pacman.velocityY;

    // Check wall collisions
    for (const wall of this.walls) {
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
          this.score += 200;
          // Respawn ghost at starting position
          ghost.reset();
          ghost.scared = false;
          ghost.updateVelocity(this.CELL_SIZE); // Reset to normal speed
          const directions = ['U', 'D', 'L', 'R'];
          const randomDir = directions[Math.floor(Math.random() * 4)];
          ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
          continue;
        } else {
          // Normaler Ghost-Kontakt: Leben verlieren
          this.lives -= 1;
          if (this.lives === 0) {
            this.gameOver = true;
            return;
          }
          this.resetPositions();
        }
      }

      // Ghost AI: change direction at certain y
      if (ghost.y === this.CELL_SIZE * 9 && ghost.direction !== 'U' && ghost.direction !== 'D') {
        ghost.updateDirection('U', this.CELL_SIZE, this.walls);
      }

      ghost.x += ghost.velocityX;
      ghost.y += ghost.velocityY;

      // Ghost wall collision
      for (const wall of this.walls) {
        if (this.collision(ghost, wall) || ghost.x <= 0 || ghost.x + ghost.width >= this.CANVAS_WIDTH) {
          ghost.x -= ghost.velocityX;
          ghost.y -= ghost.velocityY;
          const directions = ['U', 'D', 'L', 'R'];
          const newDirection = directions[Math.floor(Math.random() * 4)];
          ghost.updateDirection(newDirection, this.CELL_SIZE, this.walls);
        }
      }
    }

    // Check food collision (Produktionsauftrag)
    let foodEaten: Block | null = null;
    for (const food of this.foods) {
      if (this.collision(this.pacman, food)) {
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

    // Check cherry collision (Bonus)
    if (this.cherry && this.collision(this.pacman, this.cherry)) {
      this.score += 50;
      this.cherry = null;
    }

    // Spawn cherry randomly (10% chance wenn noch kein cherry)
    if (!this.cherry && Math.random() < 0.001) {
      const x = Math.floor(Math.random() * (this.GRID_WIDTH - 2) + 1) * this.CELL_SIZE;
      const y = Math.floor(Math.random() * (this.GRID_HEIGHT - 2) + 1) * this.CELL_SIZE;
      this.cherry = new Block(x, y, this.CELL_SIZE, this.CELL_SIZE, this.cherryImage);
    }

    // Level complete
    if (this.foods.size === 0 && this.powerPellets.size === 0) {
      this.score += 1000; // Level Complete Bonus
      this.currentLevel++;
      this.pelletStreak = 0;
      this.streakMultiplier = 1.0;
      this.walls.clear();
      this.foods.clear();
      this.powerPellets.clear();
      this.ghosts.clear();
      this.loadMap();
      this.resetPositions();
      // Initialize ghost directions
      const directions = ['U', 'D', 'L', 'R'];
      for (const ghost of this.ghosts) {
        const randomDir = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
      }
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
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.gameOver) {
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
      this.gameOver = false;
      // Initialize ghost directions
      const directions = ['U', 'D', 'L', 'R'];
      for (const ghost of this.ghosts) {
        const randomDir = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(randomDir, this.CELL_SIZE, this.walls);
      }
      this.startGameLoop();
      return;
    }

    if (!this.pacman) return;

    if (e.key === 'ArrowUp') {
      this.pacman.updateDirection('U', this.CELL_SIZE, this.walls);
    } else if (e.key === 'ArrowDown') {
      this.pacman.updateDirection('D', this.CELL_SIZE, this.walls);
    } else if (e.key === 'ArrowLeft') {
      this.pacman.updateDirection('L', this.CELL_SIZE, this.walls);
    } else if (e.key === 'ArrowRight') {
      this.pacman.updateDirection('R', this.CELL_SIZE, this.walls);
    }

    // Update pacman image
    if (this.pacman.direction === 'U') {
      this.pacman.image = this.pacmanUpImage;
    } else if (this.pacman.direction === 'D') {
      this.pacman.image = this.pacmanDownImage;
    } else if (this.pacman.direction === 'L') {
      this.pacman.image = this.pacmanLeftImage;
    } else if (this.pacman.direction === 'R') {
      this.pacman.image = this.pacmanRightImage;
    }
  }
}
