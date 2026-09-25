// Futuristic sound effects synthesized with Web Audio API

let sharedAudioContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export function getAudioAnalyser(): AnalyserNode {
  const ctx = getAudioContext();
  if (!sharedAnalyser) {
    sharedAnalyser = ctx.createAnalyser();
    sharedAnalyser.fftSize = 128;
    sharedAnalyser.smoothingTimeConstant = 0.8;
  }
  return sharedAnalyser;
}

// Play UI sound effects
export function playSoundFx(type: 'activate' | 'listening' | 'sent' | 'reply' | 'click' | 'error', enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'activate') {
      // Iron Man Arc Reactor boot sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      osc2.frequency.setValueAtTime(360, now);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else if (type === 'listening') {
      // High-tech Jarvis listening chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'sent') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'reply') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }
  } catch (e) {
    // Ignore audio errors on un-interacted documents
  }
}

// Play WAV audio data URI and connect it to analyser
export function playWavAudio(
  dataUri: string,
  onStart?: () => void,
  onEnded?: () => void,
  playbackRate = 1.0
): () => void {
  stopCurrentAudio();

  const audio = new Audio(dataUri);
  currentHtmlAudio = audio;
  audio.playbackRate = playbackRate;

  try {
    const ctx = getAudioContext();
    const analyser = getAudioAnalyser();
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
  } catch (err) {
    // MediaElementSource might have already been connected or fallback
  }

  audio.onplay = () => {
    onStart?.();
  };

  audio.onended = () => {
    currentHtmlAudio = null;
    onEnded?.();
  };

  audio.onerror = () => {
    currentHtmlAudio = null;
    onEnded?.();
  };

  audio.play().catch((err) => {
    console.warn('Playback error:', err);
    onEnded?.();
  });

  return () => {
    stopCurrentAudio();
    onEnded?.();
  };
}

export function stopCurrentAudio() {
  if (currentHtmlAudio) {
    currentHtmlAudio.pause();
    currentHtmlAudio.currentTime = 0;
    currentHtmlAudio = null;
  }
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
    } catch (e) {}
    currentSourceNode = null;
  }
}

// Kurdish speech synthesis fallback using browser Web Speech API
export function speakWithBrowserKurdish(
  text: string,
  onStart?: () => void,
  onEnded?: () => void,
  rate = 1.0
): boolean {
  if (!('speechSynthesis' in window)) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;

  // Try to find Kurdish or related voice
  const voices = window.speechSynthesis.getVoices();
  const ckbVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().includes('ckb') ||
      v.lang.toLowerCase().includes('ku') ||
      v.lang.toLowerCase().includes('ar')
  );

  if (ckbVoice) {
    utterance.voice = ckbVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnded?.();
  utterance.onerror = () => onEnded?.();

  window.speechSynthesis.speak(utterance);
  return true;
}
