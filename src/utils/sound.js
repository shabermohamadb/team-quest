class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  playTone(freq = 440, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playCountdownTick() {
    this.playTone(600, 'triangle', 0.08, 0.08);
  }

  playCountdownGo() {
    this.playTone(880, 'sine', 0.35, 0.15);
  }

  playCorrect() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.12, 0.1);
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.1), 90);
    setTimeout(() => this.playTone(783.99, 'sine', 0.28, 0.12), 190);
  }

  playWrong() {
    if (!this.enabled) return;
    this.playTone(220, 'sawtooth', 0.18, 0.1);
    setTimeout(() => this.playTone(174.61, 'sawtooth', 0.25, 0.1), 120);
  }

  playTargetHit() {
    this.playTone(720, 'sine', 0.1, 0.12);
  }

  playWinner() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.25, 0.15), idx * 110);
    });
  }

  // Aliases for admin and gameplay sounds
  clashBuzzer() {
    this.playCountdownGo();
  }

  clueReveal() {
    this.playTone(587.33, 'triangle', 0.2, 0.12);
  }

  correctAnswer() {
    this.playCorrect();
  }

  wrongAnswer() {
    this.playWrong();
  }

  winnerCeremony() {
    this.playWinner();
  }
}

export const sounds = new SoundEffects();
export const soundEffects = sounds;
