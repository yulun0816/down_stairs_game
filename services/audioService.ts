
// Simple Web Audio API wrapper for 8-bit style sounds without external assets

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmInterval: number | null = null;
  
  // Melody Sequence (Frequencies in Hz) - A upbeat retro loop
  private melodySequence = [
    523.25, 0, 392.00, 0, 329.63, 392.00, 523.25, 659.25, // C5, G4, E4, G4, C5, E5
    587.33, 0, 392.00, 0, 293.66, 392.00, 587.33, 783.99, // D5, G4, D4, G4, D5, G5
    440.00, 0, 261.63, 0, 220.00, 261.63, 440.00, 523.25, // A4, C4, A3, C4, A4, C5
    392.00, 349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 392.00 // G4 scale run down
  ];
  
  private bassSequence = [
    130.81, 130.81, 130.81, 130.81, // C3
    146.83, 146.83, 146.83, 146.83, // D3
    110.00, 110.00, 110.00, 110.00, // A2
    98.00,  98.00,  196.00, 98.00   // G2, G2, G3, G2
  ];

  private noteIndex = 0;

  constructor() {
    // Initialize on user interaction usually
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      // Set initial volume
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.2, this.ctx.currentTime);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const currentTime = this.ctx.currentTime;
      // Smooth fade to prevent clicking
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.2, currentTime + 0.1);
    }
  }

  // Helper for single tones
  private playTone(type: OscillatorType, startFreq: number, endFreq: number, duration: number, vol: number) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // SFX: Jump (Small pop)
  playJump() {
    this.playTone('square', 150, 300, 0.1, 0.15);
  }

  // SFX: Land (Thud)
  playLand() {
    this.playTone('sine', 100, 50, 0.1, 0.2);
  }

  // SFX: Hurt (Buzz/Saw)
  playHurt() {
    this.playTone('sawtooth', 150, 50, 0.2, 0.2);
  }

  // SFX: Trampoline (Springy slide)
  playTrampoline() {
    this.playTone('triangle', 200, 800, 0.3, 0.2);
  }

  // SFX: Coin (High ping)
  playCoin() {
    this.playTone('sine', 1000, 2000, 0.1, 0.1);
    // Double tone for "chi-ching" feel
    setTimeout(() => this.playTone('square', 2000, 4000, 0.1, 0.05), 100);
  }

  // SFX: Heal (Rising pleasant sound)
  playHeal() {
    this.playTone('sine', 400, 800, 0.3, 0.15);
    setTimeout(() => this.playTone('sine', 800, 1200, 0.3, 0.15), 100);
  }

  // SFX: Freeze (Sci-fi warp down)
  playFreeze() {
    this.playTone('sawtooth', 800, 100, 0.5, 0.15);
  }

  // SFX: Skill Activated (Power up sound)
  playSkillActivate() {
    this.playTone('square', 400, 800, 0.2, 0.2);
    setTimeout(() => this.playTone('square', 800, 1600, 0.3, 0.1), 100);
  }

  // SFX: Skill Ready (Ding)
  playSkillReady() {
    this.playTone('sine', 1200, 1200, 0.1, 0.1);
    setTimeout(() => this.playTone('sine', 1800, 1800, 0.2, 0.1), 100);
  }

  // SFX: Dash
  playDash() {
    this.playTone('sawtooth', 300, 100, 0.15, 0.2);
  }

  // SFX: Magnet
  playMagnet() {
    this.playTone('triangle', 800, 600, 0.3, 0.1);
  }

  // SFX: Game Over (Sad sequence)
  playGameOver() {
    this.stopBgm();
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const t = this.ctx.currentTime;
    const notes = [392.00, 349.23, 329.63, 261.63]; // G F E C
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.2);
      
      gain.gain.setValueAtTime(0.2, t + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.4);
      
      osc.start(t + i * 0.2);
      osc.stop(t + i * 0.2 + 0.4);
    });
  }

  startBgm() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;
    this.noteIndex = 0;

    // 130 BPM approx (115ms per 16th note)
    const tempo = 115;

    this.bgmInterval = window.setInterval(() => {
      if (!this.isBgmPlaying || !this.ctx || !this.masterGain) return;
      
      // 1. Lead Melody (High, Square wave)
      const noteFreq = this.melodySequence[this.noteIndex % this.melodySequence.length];
      if (noteFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'square';
        osc.frequency.value = noteFreq;
        
        // Short, staccato notes
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }

      // 2. Bass Line (Low, Triangle/Saw mix, slower change)
      // Bass changes every 2 steps in this simple map
      const bassIndex = Math.floor(this.noteIndex / 2) % this.bassSequence.length;
      const bassFreq = this.bassSequence[bassIndex];
      
      // Only play bass on off-beats or specific rhythm to reduce mud
      if (this.noteIndex % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);

        bassOsc.type = 'triangle';
        bassOsc.frequency.value = bassFreq;
        
        bassGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        
        bassOsc.start();
        bassOsc.stop(this.ctx.currentTime + 0.2);
      }

      this.noteIndex++;
    }, tempo);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const audio = new AudioController();
