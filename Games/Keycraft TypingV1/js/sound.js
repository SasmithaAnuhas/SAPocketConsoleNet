/**
 * Sound Synthesizer for TypeWriter
 * Uses Web Audio API to procedurally generate mechanical keyboard clicks,
 * typewriter clacks, tactile thocks, and bell rings with zero external dependencies.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.5;
    this.soundProfile = 'cherry-blue'; // 'cherry-blue', 'thock', 'typewriter', 'bubble', 'off'
    this.initAudioContext();
  }

  initAudioContext() {
    // AudioContext must be resumed/created after user interaction
    const init = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('keydown', init);
      window.removeEventListener('click', init);
    };
    window.addEventListener('keydown', init, { once: false });
    window.addEventListener('click', init, { once: false });
  }

  setProfile(profile) {
    this.soundProfile = profile;
    if (profile === 'off') {
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playKeySound(isSpace = false, isEnter = false, isError = false) {
    if (!this.enabled || !this.ctx || this.soundProfile === 'off') return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;

    if (isError) {
      this.playErrorSound(t);
      return;
    }

    switch (this.soundProfile) {
      case 'cherry-blue':
        this.playCherryBlue(t, isSpace, isEnter);
        break;
      case 'thock':
        this.playThock(t, isSpace, isEnter);
        break;
      case 'typewriter':
        this.playTypewriter(t, isSpace, isEnter);
        break;
      case 'bubble':
        this.playBubble(t, isSpace, isEnter);
        break;
      default:
        this.playCherryBlue(t, isSpace, isEnter);
    }
  }

  // Cherry Blue: Crisp high click + bottom out thud
  playCherryBlue(t, isSpace, isEnter) {
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, t);
    masterGain.connect(this.ctx.destination);

    // 1. High frequency mechanical switch click (burst noise)
    const bufferSize = this.ctx.sampleRate * 0.015; // 15ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isSpace ? 3200 : isEnter ? 2800 : 4200, t);
    noiseFilter.Q.setValueAtTime(4.0, t);

    noise.connect(noiseFilter);
    noiseFilter.connect(masterGain);
    noise.start(t);

    // 2. Body thud (stem hitting bottom)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const baseFreq = isSpace ? 95 : isEnter ? 80 : 120 + Math.random() * 20;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.03);

    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  // Deep acoustic tactile thock
  playThock(t, isSpace, isEnter) {
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.6, t);
    masterGain.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const startFreq = isSpace ? 150 : isEnter ? 130 : 210 + Math.random() * 25;
    const endFreq = isSpace ? 55 : isEnter ? 45 : 70;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.045);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    // Subtle low-pass filtered click on key contact
    const bufferSize = this.ctx.sampleRate * 0.01;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);

    noise.connect(filter);
    filter.connect(masterGain);
    noise.start(t);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  // Vintage Typewriter: Mechanical clank with distinctive metal timbre
  playTypewriter(t, isSpace, isEnter) {
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, t);
    masterGain.connect(this.ctx.destination);

    // 1. Metal strike
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(750 + Math.random() * 150, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.025);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.04);

    // 2. High metallic ping
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(2400 + Math.random() * 300, t);
    pingGain.gain.setValueAtTime(0.2, t);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    ping.connect(pingGain);
    pingGain.connect(masterGain);
    ping.start(t);
    ping.stop(t + 0.03);

    // If Enter/Return key was struck, play small carriage return clunk
    if (isEnter) {
      this.playCarriageReturn(t + 0.04);
    }
  }

  // Soft modern bubble pop
  playBubble(t, isSpace, isEnter) {
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, t);
    masterGain.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const startFreq = isSpace ? 280 : isEnter ? 240 : 380 + Math.random() * 60;
    const endFreq = startFreq * 2.2;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.035);

    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  // Error feedback: subtle wooden thud
  playErrorSound(t) {
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, t);
    masterGain.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Carriage return slide & bell chime for vintage typewriter
  playCarriageReturn(t) {
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1975.5, t); // B6 chime

    bellGain.gain.setValueAtTime(this.volume * 0.35, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    bell.connect(bellGain);
    bellGain.connect(this.ctx.destination);

    bell.start(t);
    bell.stop(t + 0.45);
  }

  // Victory / test completion chime
  playCompleteChime() {
    if (!this.enabled || !this.ctx || this.soundProfile === 'off') return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }
}

window.soundEffects = new SoundEffects();
