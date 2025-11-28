
// Simple synth for retro sounds
class RetroAudio {
  ctx: AudioContext | null = null;
  bossInterval: number | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    this.playTone(300, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(450, 'square', 0.2, 0.1), 50);
  }

  playStomp() {
    this.playTone(150, 'sawtooth', 0.1, 0.2);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.1, 0.2), 50);
  }

  playDie() {
    this.playTone(300, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.2), 150);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.4), 300);
  }

  playPowerUp() {
    this.playTone(400, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(800, 'sine', 0.2, 0.1), 200);
  }

  playCoin() {
    // Classic B5 -> E6 coin sound
    this.playTone(987, 'square', 0.08, 0.1); 
    setTimeout(() => this.playTone(1318, 'square', 0.12, 0.1), 80);
  }

  playPowerUpSpawn() {
      this.playTone(1000, 'square', 0.1, 0.05);
  }

  playCrash() {
    this.playTone(100, 'sawtooth', 0.3, 0.3);
    this.playTone(80, 'square', 0.3, 0.3);
  }

  startBossMusic() {
      if (this.bossInterval) return;
      if (!this.ctx) this.init();

      let step = 0;
      this.bossInterval = window.setInterval(() => {
          if (!this.ctx) return;
          // Menacing bass line
          const note = step % 4 === 0 ? 110 : (step % 4 === 2 ? 100 : 0);
          if (note > 0) {
              this.playTone(note, 'sawtooth', 0.2, 0.15);
              this.playTone(note / 2, 'square', 0.2, 0.2);
          }
          // High hat
          if (step % 2 !== 0) {
              this.playTone(800 + Math.random() * 200, 'square', 0.05, 0.05);
          }
          step++;
      }, 250);
  }

  stopBossMusic() {
      if (this.bossInterval) {
          clearInterval(this.bossInterval);
          this.bossInterval = null;
      }
  }
}

export const audio = new RetroAudio();
