import { Injectable } from "@angular/core";
import { AchievementId, GameStats } from "../models/game-stats";

// Definition of a single achievement
export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;

  // Function that checks whether the achievement condition is fulfilled
  isUnlocked: (stats: GameStats) => boolean;
}

@Injectable({ providedIn: "root" })
export class AchievementService {

  // List of all achievement definitions
  private defs: AchievementDef[] = [
  {
    id: "ifm_meister",
    title: "IFM Meister",
    description: "350 sensor data collected",
    // Unlock when at least 350 sensor data items were collected
    isUnlocked: (stats) => stats.sensorDataCollected >= 350,
  },
  {
    id: "wartungsexperte",
    title: "Wartungsexperte",
    description: "5 successful repairs",
    // Unlock when at least 5 malfunctions were repaired successfully
    isUnlocked: (stats) => stats.repairsSuccessful >= 5,

  },
  {
  id: "stoerungsjaeger",
  title: "Störungsjäger",
  description: "6 errors fixed",
  isUnlocked: (stats) => stats.errorsFixed >= 6,
},
{
  id: "effizienz_champion",
  title: "Effizienz-Champion",
  description: "50%+ system performance",
  // Unlock when the system performance is at least 50%
  isUnlocked: (stats) => stats.systemPerformance >= 50,
},

];


  /**
   * Checks all achievements and unlocks newly fulfilled ones.
   * Returns a list of achievements that were unlocked during this call.
   */
  checkAndUnlock(stats: GameStats): AchievementDef[] {
    const unlockedNow: AchievementDef[] = [];

    for (const def of this.defs) {
      const alreadyUnlocked = !!stats.achievementsUnlocked?.[def.id];
      const conditionMet = def.isUnlocked(stats);

      // Unlock achievement only once
      if (!alreadyUnlocked && conditionMet) {
        stats.achievementsUnlocked[def.id] = true;
        unlockedNow.push(def);
      }
    }

    return unlockedNow;
  }
}
