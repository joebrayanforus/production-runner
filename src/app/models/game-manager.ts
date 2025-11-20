export class GameManager {
  maze: { countRemainingDots: () => number };
  constructor(public gridWidth: number, public gridHeight: number) {
    this.maze = { countRemainingDots: () => 0 };
  }
}
