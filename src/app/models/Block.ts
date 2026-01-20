export class Block {
  x: number;
  y: number;
  width: number;
  height: number;
  image: HTMLImageElement | null;
  startX: number;
  startY: number;
  direction: string = 'U'; // U D L R
  velocityX: number = 0;
  velocityY: number = 0;
  scared: boolean = false;
  type: string = ''; // 'aggressive', 'ambush', 'patrol', 'random'
  targetPlayer: 1 | 2 = 1; // Which player this ghost targets in 2-player mode

  constructor(x: number, y: number, width: number, height: number, image: HTMLImageElement | null) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = image;
    this.startX = x;
    this.startY = y;
  }

  updateDirection(newDirection: string, tileSize: number, walls: Set<Block>) {
    // Don't update if already moving in the same direction
    if (this.direction === newDirection) {
      return;
    }
    
    const prevDirection = this.direction;
    this.direction = newDirection;
    this.updateVelocity(tileSize);
    
    // Test if the new direction would cause a collision
    const testX = this.x + this.velocityX;
    const testY = this.y + this.velocityY;
    const originalX = this.x;
    const originalY = this.y;
    
    // Temporarily move to test collision
    this.x = testX;
    this.y = testY;

    // Check collision with walls
    let hasCollision = false;
    for (const wall of walls) {
      if (this.collidesWith(wall)) {
        hasCollision = true;
        break;
      }
    }
    
    // Restore original position
    this.x = originalX;
    this.y = originalY;
    
    // If collision detected, revert to previous direction
    if (hasCollision) {
      this.direction = prevDirection;
      this.updateVelocity(tileSize);
    }
    // Otherwise, direction is updated and velocity is set - movement will happen in update loop
  }

  updateVelocity(tileSize: number) {
    const baseSpeed = tileSize / 4;
    const speed = this.scared ? baseSpeed * 0.8 : baseSpeed;
    if (this.direction === 'U') {
      this.velocityX = 0;
      this.velocityY = -speed;
    } else if (this.direction === 'D') {
      this.velocityX = 0;
      this.velocityY = speed;
    } else if (this.direction === 'L') {
      this.velocityX = -speed;
      this.velocityY = 0;
    } else if (this.direction === 'R') {
      this.velocityX = speed;
      this.velocityY = 0;
    }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
  }

  private collidesWith(other: Block): boolean {
    return this.x < other.x + other.width &&
           this.x + this.width > other.x &&
           this.y < other.y + other.height &&
           this.y + this.height > other.y;
  }
}
