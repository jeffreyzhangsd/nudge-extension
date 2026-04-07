// Shared AudioContext — created once, reused for all pings.
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playPing(volume = 1): void {
  try {
    const ctx = getAudioContext();

    const play = () => {
      // Square the linear value so perceived loudness tracks slider position.
      const clamped = Math.max(0, Math.min(1, volume));
      const peak = clamped * clamped * 0.8;
      if (peak < 0.0001) return; // muted

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime); // C6

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.2);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch {
    // Audio not available
  }
}
