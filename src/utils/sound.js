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

  // Cinematic Intro Sounds (Web Audio API synthesized)
  playIntroSwell() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    } catch (_) {}
  }

  playHeroImpact() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Sub-bass impact
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(150, this.ctx.currentTime);
      sub.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.6);
      subGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start();
      sub.stop(this.ctx.currentTime + 0.6);

      // Metallic top chime
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(587.33, this.ctx.currentTime);
      chimeGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start();
      chime.stop(this.ctx.currentTime + 0.4);
    } catch (_) {}
  }

  playSubtitleReveal() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (_) {}
  }

  playTransitionWhoosh() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (_) {}
  }
}

export const sounds = new SoundEffects();
export const soundEffects = sounds;
