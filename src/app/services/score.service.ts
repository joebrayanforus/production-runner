import { Injectable } from '@angular/core';

export interface ScoreEntry {
  score: number;
  playerName: string;
}

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private readonly MAX_SCORES = 5;
  private readonly STORAGE_KEY = 'lastScores';

  saveScore(score: number, playerName: string) {
    // Get existing scores
    const scores = this.getLastScores();
    
    // Add new score entry
    scores.push({ score, playerName: playerName.trim() || 'Anonymous' });
    
    // Sort scores in descending order (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only the top MAX_SCORES (highest 5)
    const trimmedScores = scores.slice(0, this.MAX_SCORES);
    
    // Save back to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedScores));
    
    // Also keep the last score for backward compatibility
    localStorage.setItem('lastScore', score.toString());
  }

  getLastScore(): number | null {
    const scores = this.getLastScores();
    // Return the highest score value (first in sorted array)
    return scores.length > 0 ? scores[0].score : null;
  }

  getLastScores(): ScoreEntry[] {
    const value = localStorage.getItem(this.STORAGE_KEY);
    if (value) {
      try {
        const scores = JSON.parse(value);
        // Handle both old format (numbers) and new format (objects)
        const normalizedScores = scores.map((entry: any) => {
          if (typeof entry === 'number') {
            // Old format: just a number
            return { score: entry, playerName: 'Unknown' };
          }
          // New format: object with score and playerName
          return entry;
        });
        // Ensure scores are sorted in descending order (highest first)
        return normalizedScores.sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score);
      } catch (e) {
        console.error('Error parsing scores from localStorage', e);
        return [];
      }
    }
    
    // Backward compatibility: check for old single score
    const oldScore = localStorage.getItem('lastScore');
    if (oldScore !== null) {
      const score = Number(oldScore);
      if (!isNaN(score)) {
        return [{ score, playerName: 'Unknown' }];
      }
    }
    
    return [];
  }
}

