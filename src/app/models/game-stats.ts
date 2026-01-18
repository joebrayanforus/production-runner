export type AchievementId =
  | "ifm_meister"
  | "wartungsexperte"
  | "stoerungsjaeger"
  | "effizienz_champion";

export interface GameStats {
  sensorDataCollected: number;
  repairsSuccessful: number;
  errorsFixed: number;

  // Current system performance in percent (0..100)
  systemPerformance: number;

  achievementsUnlocked: Record<AchievementId, boolean>;
}
