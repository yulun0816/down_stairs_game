// Simple Web Audio API wrapper for 8-bit style sounds without external assets

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;

  constructor() {
    // Initialize on user interaction usually
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Master volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx!.currentTime);
    }
  }

  playJump() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playLand() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHurt() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playTrampoline() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [400, 350, 300, 200];
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.15);
      gain.gain.setValueAtTime(0.2, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.3);
      
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.3);
    });
    this.stopBgm();
  }

  startBgm() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;
    
    // Simple looping bassline
    const playNote = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      // Cyberpunk-ish bass
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime); // A2
      
      // Filter for muffled sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      osc.disconnect();
      osc.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    };

    // Play a note every 250ms (approx 120bpm)
    // Note: setInterval isn't precise for audio, but good enough for this simple game
    const intervalId = window.setInterval(playNote, 250);
    (this as any).bgmInterval = intervalId;
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if ((this as any).bgmInterval) {
      clearInterval((this as any).bgmInterval);
    }
  }
}

export const audio = new AudioController();
