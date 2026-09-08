// Feedback háptico y sonoro sutil optimizado para iPhone (iOS Safari) y Android/Chromebook

class HapticFeedback {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Toque suave para botones y chips
  light(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }

  // Confirmación de guardado exitoso (Chirp agradable de 40ms)
  success(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 30, 40]);
    }

    // Tono suave sutil en iOS para confirmar acción sin mirar
    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {
      // Audio no permitido o silenciado
    }
  }
}

export const haptics = new HapticFeedback();
