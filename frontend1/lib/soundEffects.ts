'use client';

/**
 * A lightweight sound utility using the browser's Web Audio API.
 * This avoids needing external audio files.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSuccess() {
    this.playTone(880, 'sine', 0.1, 0.1); // Short high A5
    setTimeout(() => this.playTone(1108.73, 'sine', 0.15, 0.1), 50); // Short C#6
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.25, 0.1); // Low buzz
  }

  playTick() {
    this.playTone(2000, 'square', 0.01, 0.05); // Tiny high tick
  }

  playPop() {
    this.playTone(400, 'sine', 0.05, 0.2); // Balloon pop
  }
}

export const sounds = new SoundEngine();
