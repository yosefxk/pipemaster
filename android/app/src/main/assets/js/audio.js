/**
 * Procedural Web Audio Sound Engine & Haptics
 * High-performance, 100% offline synthesis for clicks, liquid flow, hints, and victory.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.soundEnabled = true;
        this.hapticsEnabled = true;
        this.masterVolume = 0.6;
    }

    _initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Trigger haptic vibration via Web Vibration API or AndroidNative bridge
    vibrate(pattern = 15) {
        if (!this.hapticsEnabled) return;
        try {
            if (window.AndroidNative && typeof window.AndroidNative.vibrate === 'function') {
                const duration = Array.isArray(pattern) ? pattern[0] : pattern;
                window.AndroidNative.vibrate(duration);
            } else if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Silently fail if not supported
        }
    }

    // Crisp mechanical ratchet click on pipe rotation
    playRotateSound() {
        if (!this.soundEnabled) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

        gain.gain.setValueAtTime(0.35 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.045);

        this.vibrate(10);
    }

    // Liquid connection / water bubble surge
    playFlowSound() {
        if (!this.soundEnabled) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(560, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.14);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);

        this.vibrate([12, 30, 15]);
    }

    // Sparkle chime when a hint is used
    playHintSound() {
        if (!this.soundEnabled) return;
        this._initContext();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const t = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.05);

            gain.gain.setValueAtTime(0.2 * this.masterVolume, t + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t + idx * 0.05);
            osc.stop(t + idx * 0.05 + 0.26);
        });

        this.vibrate([20, 40, 20, 40, 30]);
    }

    // Triumphant victory arpeggio on puzzle completion
    playWinSound() {
        if (!this.soundEnabled) return;
        this._initContext();
        if (!this.ctx) return;

        const chords = [
            { freq: 440.00, time: 0.00, dur: 0.12 }, // A4
            { freq: 554.37, time: 0.10, dur: 0.12 }, // C#5
            { freq: 659.25, time: 0.20, dur: 0.15 }, // E5
            { freq: 880.00, time: 0.32, dur: 0.45 }  // A5
        ];

        const t = this.ctx.currentTime;

        chords.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, t + note.time);

            gain.gain.setValueAtTime(0.35 * this.masterVolume, t + note.time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.time + note.dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t + note.time);
            osc.stop(t + note.time + note.dur + 0.05);
        });

        this.vibrate([40, 60, 40, 60, 80]);
    }

    // UI button tap
    playTapSound() {
        if (!this.soundEnabled) return;
        this._initContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.03);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.035);

        this.vibrate(8);
    }
}

const soundManager = new SoundEngine();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { soundManager };
}
