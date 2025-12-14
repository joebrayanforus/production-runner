// Industrial Sound Generator for ifm Production Runner
// This file contains Web Audio API code to generate original industrial sounds

class IndustrialSoundGenerator {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Generate sensor data collection beep (replaces waka.mp3)
  generateSensorBeep(): Blob {
    const sampleRate = 22050;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Short electronic beep with ifm frequency signature
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Quick rising beep from 800Hz to 1200Hz
      const freq = 800 + (400 * t / duration);
      const envelope = Math.exp(-t * 15); // Quick decay
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    return this.bufferToBlob(buffer);
  }

  // Generate maintenance activation sound (replaces powerpill.mp3)
  generateMaintenanceActivation(): Blob {
    const sampleRate = 22050;
    const duration = 1.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Rising tone sequence: 440Hz -> 660Hz -> 880Hz
      let freq = 440;
      if (t > 0.4) freq = 660;
      if (t > 0.8) freq = 880;

      const envelope = Math.sin(Math.PI * (t % 0.4) / 0.4) * 0.5;
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
    }

    return this.bufferToBlob(buffer);
  }

  // Generate repair success sound (replaces eatghost.mp3)
  generateRepairSuccess(): Blob {
    const sampleRate = 22050;
    const duration = 0.8;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Positive confirmation chime: C-E-G chord progression
      const freq1 = 523; // C5
      const freq2 = 659; // E5
      const freq3 = 784; // G5

      let signal = 0;
      if (t < 0.3) signal = Math.sin(2 * Math.PI * freq1 * t);
      else if (t < 0.6) signal = Math.sin(2 * Math.PI * freq2 * t);
      else signal = Math.sin(2 * Math.PI * freq3 * t);

      const envelope = Math.exp(-t * 2.5);
      data[i] = signal * envelope * 0.4;
    }

    return this.bufferToBlob(buffer);
  }

  // Generate system error sound (replaces die.mp3)
  generateSystemError(): Blob {
    const sampleRate = 22050;
    const duration = 1.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Alarm-like descending tone with harmonics
      const baseFreq = 800 - (300 * t / duration);
      const harmonics = Math.sin(2 * Math.PI * baseFreq * t) * 0.6 +
                       Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.3 +
                       Math.sin(2 * Math.PI * baseFreq * 0.5 * t) * 0.1;

      const envelope = Math.sin(Math.PI * t / duration);
      data[i] = harmonics * envelope * 0.3;
    }

    return this.bufferToBlob(buffer);
  }

  // Generate industrial background music (replaces theme.mp3)
  generateBackgroundAmbient(): Blob {
    const sampleRate = 22050;
    const duration = 30; // 30 second loop
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Subtle industrial ambient with machinery hum
      const lowHum = Math.sin(2 * Math.PI * 60 * t) * 0.1; // 60Hz base hum
      const midTone = Math.sin(2 * Math.PI * 120 * t) * 0.05; // Harmonic
      const subtleBeeps = Math.sin(2 * Math.PI * 1000 * t) *
                         Math.sin(2 * Math.PI * 0.5 * t) * 0.02; // Occasional beeps

      data[i] = lowHum + midTone + subtleBeeps;
    }

    return this.bufferToBlob(buffer);
  }

  private bufferToBlob(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const data = buffer.getChannelData(0);

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
    view.setUint32(24, 22050, true);
    view.setUint32(28, 22050 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float data to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

// Export for use in service
export { IndustrialSoundGenerator };
