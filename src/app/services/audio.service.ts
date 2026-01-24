import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private isMuted = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
    this.loadIndustrialSounds();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported, using fallback sounds');
      this.audioContext = null;
    }
  }

  private loadIndustrialSounds() {
    if (!this.audioContext) {
      this.loadOriginalSounds();
      return;
    }

    try {
      // Create simple industrial beeps using Web Audio API
      this.createSensorBeep();
      this.createMaintenanceSound();
      this.createRepairSound();
      this.createErrorSound();
      this.createIndustrialBackgroundMusic();
      this.loadOriginalSounds(); // Keep original theme for now
    } catch (error) {
      console.warn('Failed to create industrial sounds, using originals:', error);
      this.loadOriginalSounds();
    }
  }

  private createSensorBeep() {
    // Create a simple data collection beep
    const audio = new Audio();
    audio.src = this.generateBeepDataURL(800, 0.1); // 800Hz, 0.1s
    this.sounds.set('waka', audio);
  }

  private createMaintenanceSound() {
    // Create maintenance activation sound
    const audio = new Audio();
    audio.src = this.generateBeepDataURL(1000, 0.5); // 1000Hz, 0.5s
    this.sounds.set('powerpill', audio);
  }

  private createRepairSound() {
    // Create repair success sound
    const audio = new Audio();
    audio.src = this.generateBeepDataURL(1200, 0.3); // 1200Hz, 0.3s
    this.sounds.set('eatghost', audio);
  }

  private createErrorSound() {
    // Create system error sound
    const audio = new Audio();
    audio.src = this.generateBeepDataURL(400, 0.8); // 400Hz, 0.8s
    this.sounds.set('die', audio);
  }

  private createIndustrialBackgroundMusic() {
    // Create ifm industrial ambient background music
    const audio = new Audio();
    audio.src = this.generateIndustrialAmbientDataURL();
    audio.loop = true;
    audio.volume = 0.25; // Keep it subtle
    this.sounds.set('backgroundMusic', audio);
  }

  private generateIndustrialAmbientDataURL(): string {
    // Generate 8-second industrial ambient loop
    const sampleRate = 8000;
    const duration = 8; // 8 seconds loop
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let signal = 0;

      // Base industrial hum (50Hz + harmonics) - typical factory ambience
      signal += Math.sin(2 * Math.PI * 50 * t) * 0.08;
      signal += Math.sin(2 * Math.PI * 100 * t) * 0.04;
      signal += Math.sin(2 * Math.PI * 150 * t) * 0.02;

      // ifm sensor automation pulses (every 2 seconds)
      const pulseTime = t % 2;
      if (pulseTime < 0.08) {
        signal += Math.sin(2 * Math.PI * 800 * t) * Math.exp(-pulseTime * 15) * 0.15;
      }

      // Pneumatic air sounds (every 4 seconds) - typical in ifm applications
      const airTime = t % 4;
      if (airTime > 3.6 && airTime < 3.9) {
        const noisePhase = (airTime - 3.6) * 12;
        signal += (Math.random() - 0.5) * Math.exp(-noisePhase * 4) * 0.12;
      }

      // Conveyor belt subtle rhythm - ifm position sensors
      signal += Math.sin(2 * Math.PI * 2.2 * t) * 0.015;

      // ifm IO-Link communication beeps (every 6 seconds)
      const ioTime = t % 6;
      if (ioTime > 5.85 && ioTime < 5.95) {
        signal += Math.sin(2 * Math.PI * 1000 * t) * 0.2;
      }

      // Subtle motor hum variation - ifm vibration monitoring
      signal += Math.sin(2 * Math.PI * 25 * t + Math.sin(t * 0.5) * 0.1) * 0.03;

      // Apply soft limiting
      signal = Math.tanh(signal);
      buffer[i] = signal * 6000; // Scale for 16-bit
    }

    // Create WAV data URL
    const wavData = this.createWAV(buffer, sampleRate);
    return `data:audio/wav;base64,${btoa(String.fromCharCode(...wavData))}`;
  }

  private generateBeepDataURL(frequency: number, duration: number): string {
    // Generate a simple sine wave beep as data URL
    const sampleRate = 8000;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3); // Exponential decay
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 16383;
    }

    // Create WAV data URL
    const wavData = this.createWAV(buffer, sampleRate);
    return `data:audio/wav;base64,${btoa(String.fromCharCode(...wavData))}`;
  }

  private createWAV(buffer: Int16Array, sampleRate: number): Uint8Array {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Copy audio data
    for (let i = 0; i < length; i++) {
      view.setInt16(44 + i * 2, buffer[i], true);
    }

    return new Uint8Array(arrayBuffer);
  }

  private loadOriginalSounds() {
    // Load original sound files as fallback
    const soundFiles = {
      'theme': 'assets/mp3/soundtrack.mp3'  // Load new soundtrack
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    }

    // Setup background music
    this.backgroundMusic = this.sounds.get('theme') || null;
    if (this.backgroundMusic) {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3;
    }
  }  play(soundName: string) {
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
    // Try to play our custom ifm industrial music first
    const industrialMusic = this.sounds.get('backgroundMusic');
    if (industrialMusic && !this.isMuted) {
      industrialMusic.volume = 0.2; // Subtle industrial ambience
      industrialMusic.play().catch(() => {
        // Fallback to original background music if industrial fails
        this.playOriginalBackgroundMusic();
      });
      return;
    }

    this.playOriginalBackgroundMusic();
  }

  private playOriginalBackgroundMusic() {
    if (this.isMuted || !this.backgroundMusic) return;
    this.backgroundMusic.play().catch(err => console.warn('Failed to play background music:', err));
  }

  stopBackgroundMusic() {
    // Stop industrial background music
    const industrialMusic = this.sounds.get('backgroundMusic');
    if (industrialMusic) {
      industrialMusic.pause();
      industrialMusic.currentTime = 0;
    }

    // Stop original background music
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
