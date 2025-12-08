import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private isMuted = false;

  constructor() {
    this.loadSounds();
  }

  private loadSounds() {
    // Load all sound effects
    const soundFiles = {
      'waka': 'assets/mp3/waka.mp3',           // Pellet eating
      'powerpill': 'assets/mp3/powerpill.mp3', // Power pellet
      'eatghost': 'assets/mp3/eatghost.mp3',   // Ghost eaten
      'die': 'assets/mp3/die.mp3',             // Life lost
      'theme': 'assets/mp3/theme.mp3'          // Background music
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    }

    // Setup background music (looping)
    this.backgroundMusic = this.sounds.get('theme') || null;
    if (this.backgroundMusic) {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3; // Lower volume for background
    }
  }

  play(soundName: string) {
    if (this.isMuted) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      // Clone and play (allows multiple simultaneous plays)
      const soundClone = sound.cloneNode(true) as HTMLAudioElement;
      soundClone.volume = sound.volume;
      soundClone.play().catch(err => console.warn(`Failed to play ${soundName}:`, err));
    }
  }

  playBackgroundMusic() {
    if (this.isMuted || !this.backgroundMusic) return;
    this.backgroundMusic.play().catch(err => console.warn('Failed to play background music:', err));
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  resumeBackgroundMusic() {
    if (!this.isMuted && this.backgroundMusic) {
      this.backgroundMusic.play().catch(err => console.warn('Failed to resume background music:', err));
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundMusic();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }
}
