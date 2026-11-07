/**
 * مدير الصوت المطور (AudioManager)
 * يدعم الأصوات المسجلة البشرية، تسجيلات الأهل بالميكروفون،
 * ملفات صوتية بشرية مرفوعة، وتسجيلات الأهل،
 * ونظام Web Speech API كخطة بديلة للجمل غير المسجلة
 */

import { ParentVoiceClipKey } from '../types';
import { Storage } from './storage';
import { recordedVoices } from './recordedVoices';
import { voiceLibrary } from './voiceLibrary';
import {
  COMPANION_DEFAULT_NAMES,
  fillPlaceholders,
  neutralizeSpoken,
  splitSegments,
} from './voiceKey';

/** مؤثرات حقيقية مفتوحة الترخيص (Kenney UI Audio - CC0). غيّر الأسماء هنا لتجرب غيرها. */
const SAMPLE_FILES: Record<string, string> = {
  tap: '/audio/sfx/tap.mp3',
  pop: '/audio/sfx/pop.mp3',
  tick: '/audio/sfx/tick.mp3',
};

export interface DialogueAudioEntry {
  text?: string;
  voice?: string;
  audioUrl?: string; 
}

export interface VoiceTestState {
  audioContextState: string;
  totalVoices: number;
  hasArabicVoice: boolean;
  selectedVoiceName: string | null;
  speechStatus: 'idle' | 'starting' | 'speaking' | 'success' | 'error';
  errorMessage: string | null;
  spokenText: string;
}

export interface AudioDiagnostics {
  isUnlocked: boolean;
  audioContextState: string;
  totalVoicesCount: number;
  selectedVoiceName: string | null;
  hasArabicVoice: boolean;
  arabicVoiceList: string[];
  parentRecordingsCount: number;
  activeVoiceMode: string;
}

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private speechSessionId: number = 0;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedArabicVoice: SpeechSynthesisVoice | null = null;
  private isSpeakingListeners: Array<(speaking: boolean) => void> = [];
  private stateChangeListeners: Array<() => void> = [];
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private startCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadVoices();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
      // فتح سياق الصوت تلقائياً عند أول لمسة أو نقرة من المستخدم
      const autoUnlock = () => {
        if (!this.isUnlocked) {
          this.unlockAudio().catch(() => {});
        }
      };
      window.addEventListener('click', autoUnlock, { passive: true });
      window.addEventListener('touchstart', autoUnlock, { passive: true });
      window.addEventListener('keydown', autoUnlock, { passive: true });
    }
  }

  public loadVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.availableVoices = voices;
        const settings = Storage.getSettings();
        
        let customPreferred: SpeechSynthesisVoice | null = null;
        if (settings.preferredVoiceName) {
          customPreferred = voices.find(v => v.name === settings.preferredVoiceName) || null;
        }

        const saudiVoice = voices.find(v => v.lang.toLowerCase() === 'ar-sa' || v.lang.toLowerCase().startsWith('ar-sa'));
        const anyArabicVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar') || v.name.toLowerCase().includes('arabic'));
        this.selectedArabicVoice = customPreferred || saudiVoice || anyArabicVoice || null;
        this.notifyStateChanged();
      }
    } catch {
      // ignore
    }
  }

  public subscribeSpeakingState(listener: (speaking: boolean) => void) {
    this.isSpeakingListeners.push(listener);
    return () => {
      this.isSpeakingListeners = this.isSpeakingListeners.filter(l => l !== listener);
    };
  }

  public subscribeStateChange(listener: () => void) {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.isSpeakingListeners.forEach(listener => {
      try { listener(speaking); } catch {}
    });
  }

  private notifyStateChanged() {
    this.stateChangeListeners.forEach(listener => {
      try { listener(); } catch {}
    });
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  public async unlockAudio(onReady?: () => void): Promise<boolean> {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.loadVoices();
      this.isUnlocked = true;
      this.preloadSamples();
      this.playTap();
      voiceLibrary.whenReady().catch(() => {});
      this.notifyStateChanged();
      if (onReady) onReady();
      return true;
    } catch {
      this.isUnlocked = true;
      if (onReady) onReady();
      return false;
    }
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * تنظيف وإلغاء أي ملف صوتي يعمل حالياً وتحرير ذاكرة Object URL لمنع تسرب الذاكرة
   */
  private cleanupCurrentAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onplay = null;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch {}
      this.currentAudio = null;
    }
    if (this.currentAudioUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioUrl);
      } catch {}
      this.currentAudioUrl = null;
    }
  }

  /**
   * تشغيل عدة مقاطع بالتتابع من ملفات التطبيق (دون API أو اتصال خارجي).
   * المقطع الناقص (null) يُتخطى بفاصل قصير. ينادي onEnd مرة واحدة في النهاية.
   */
  private playClipSequence(urls: Array<string | null>, session: number, onEnd?: () => void): void {
    let index = 0;
    let started = false;

    const finishAll = () => {
      if (this.speechSessionId !== session) return;
      this.cleanupCurrentAudio();
      this.notifySpeaking(false);
      if (onEnd) onEnd();
    };

    const next = () => {
      if (this.speechSessionId !== session) return;
      if (index >= urls.length) {
        finishAll();
        return;
      }
      const url = urls[index++];
      if (!url) {
        setTimeout(next, 300);
        return;
      }
      this.cleanupCurrentAudio();
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.currentAudio = audio;
      audio.onplay = () => {
        if (this.speechSessionId !== session) return;
        if (!started) {
          started = true;
          this.notifySpeaking(true);
        }
      };
      audio.onended = () => next();
      audio.onerror = () => next();
      audio.play().catch(() => next());
    };

    next();
  }

  /**
   * تشغيل الجملة بمقاطع بشرية/جاهزة فقط:
   * 1. تسجيل الأهل الخاص بالموقف عند توفره (ميزة اختيارية).
   * 2. مقاطع التطبيق الجاهزة، ويُبحث عنها بمفتاح ثابت من النص بعد حذف اسم الرفيق.
   * لا يوجد أي صوت آلي احتياطي: الجملة التي لا مقطع لها تبقى مكتوبة على الشاشة
   * ويكمل التدفق بعد مدة قراءة قصيرة، وتُسجَّل في وضع التطوير لنولّد مقطعها لاحقاً.
   */
  public speak(text: string, onEnd?: () => void, voiceClipKey?: ParentVoiceClipKey): void {
    const settings = Storage.getSettings();
    if (!settings.soundEnabled) {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // الأولوية الأولى: تسجيل الأهل المخصص لهذا الموقف.
    if (voiceClipKey && (settings.voiceMode === 'parent_custom' || recordedVoices.hasParentClip(voiceClipKey))) {
      const played = recordedVoices.playParentClip(voiceClipKey, () => {
        this.notifySpeaking(false);
        if (onEnd) onEnd();
      });
      if (played) {
        this.notifySpeaking(true);
        return;
      }
    }

    // الأولوية الثانية: مقاطع التطبيق الجاهزة (بلا اسم الرفيق، ومفصولة عند " .. ").
    this.stopSpeech();
    const session = ++this.speechSessionId;

    let companionName = '';
    try {
      companionName = Storage.getCompanionProfile().name || '';
    } catch {
      // ignore
    }
    const spoken = neutralizeSpoken(
      fillPlaceholders(text, settings.childGender),
      [...COMPANION_DEFAULT_NAMES, companionName],
      settings.childGender
    );
    const segments = splitSegments(spoken);

    voiceLibrary.whenReady().then(() => {
      if (this.speechSessionId !== session) return;

      const urls = segments.map(seg => {
        const url = voiceLibrary.getClipUrl(seg);
        if (!url) voiceLibrary.reportMissing(seg);
        return url;
      });

      if (urls.every(u => !u)) {
        // لا مقطع لهذه الجملة: لا صوت آلي. نترك وقتاً للقراءة ثم نكمل التدفق.
        const readingMs = Math.min(5000, 800 + spoken.length * 45);
        this.safetyTimer = setTimeout(() => {
          this.safetyTimer = null;
          if (this.speechSessionId !== session) return;
          if (onEnd) onEnd();
        }, readingMs);
        return;
      }

      this.playClipSequence(urls, session, onEnd);
    });
  }

  /**
   * الخطة البديلة (Web Speech API) لضمان عدم توقف الصوت عند الطفل أبداً
   */
  public speakWebSpeech(text: string, onEnd?: () => void): void {
    const settings = Storage.getSettings();
    if (!settings.soundEnabled) {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    if (!this.isUnlocked) {
      this.unlockAudio().catch(() => {});
    }

    try {
      this.stopSpeech(); 
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (!this.selectedArabicVoice) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = settings.voiceRate || 0.8; 
      utterance.pitch = settings.speechPitch || 1.15; 
      if (this.selectedArabicVoice) {
        utterance.voice = this.selectedArabicVoice;
      }

      let isFinished = false;
      let hasStarted = false;

      const finishCall = () => {
        if (isFinished) return;
        isFinished = true;
        this.stopSpeechTimers();
        this.notifySpeaking(false);
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onstart = () => {
        hasStarted = true;
        if (this.startCheckTimer) clearTimeout(this.startCheckTimer);
        this.notifySpeaking(true);
      };

      utterance.onend = finishCall;
      utterance.onerror = finishCall;

      // أمان مزدوج: التحقق من بدء التحدث (لحالات الصمت في آيفون)
      this.startCheckTimer = setTimeout(() => {
        if (!hasStarted) {
          finishCall();
        }
      }, 1500);

      // أمان أساسي: إنهاء قسري بناءً على طول النص
      const expectedDurationMs = Math.max(3000, text.length * 160);
      this.safetyTimer = setTimeout(() => {
        finishCall();
      }, expectedDurationMs + 3000);

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      this.notifySpeaking(false);
      if (onEnd) onEnd();
    }
  }

  public stopSpeech(): void {
    this.speechSessionId++;
    this.cleanupCurrentAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      this.notifySpeaking(false);
    }
    recordedVoices.stopCurrentAudio();
    this.stopSpeechTimers();
  }

  private stopSpeechTimers(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.startCheckTimer) {
      clearTimeout(this.startCheckTimer);
      this.startCheckTimer = null;
    }
  }

  // --- مؤثرات من تسجيلات حقيقية (CC0) مع الرجوع للنغمة المولّدة عند غيابها ---
  private sampleBuffers = new Map<string, AudioBuffer>();
  private samplesRequested = false;

  /** يحمّل ويفك ترميز المؤثرات مرة واحدة بعد أول لمسة */
  public preloadSamples(): void {
    if (this.samplesRequested || typeof window === 'undefined' || typeof fetch === 'undefined') return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.samplesRequested = true;
    Object.entries(SAMPLE_FILES).forEach(([name, url]) => {
      fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
        .then(buf => new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(buf, resolve, reject)))
        .then(decoded => {
          this.sampleBuffers.set(name, decoded);
        })
        .catch(() => {});
    });
  }

  private playSample(name: string, rate = 1, volume = 0.6): boolean {
    const ctx = this.getContext();
    const buffer = this.sampleBuffers.get(name);
    if (!ctx || !buffer || ctx.state !== 'running') return false;
    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  // --- دوال Web Audio API ونغمات التشجيع المسجلة ---
  public playBubblePop(): void {
    if (this.isUnlocked && this.playSample('pop', 0.85 + Math.random() * 0.5, 0.7)) return;
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const osc = ctx.createOscillator(); const gain = ctx.createGain(); const now = ctx.currentTime; const startFreq = 440 + Math.random() * 80; osc.type = 'sine'; osc.frequency.setValueAtTime(startFreq, now); osc.frequency.exponentialRampToValueAtTime(140, now + 0.12); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.13); } catch {}
  }
  public playSuccessChime(): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const freqs = [523.25, 659.25, 783.99, 1046.5]; const now = ctx.currentTime; freqs.forEach((freq, idx) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); const noteTime = now + idx * 0.1; osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, noteTime); gain.gain.setValueAtTime(0, noteTime); gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45); osc.connect(gain); gain.connect(ctx.destination); osc.start(noteTime); osc.stop(noteTime + 0.5); }); } catch {}
  }
  public playTada(): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const chord = [392.0, 493.88, 587.33, 783.99, 987.77]; const now = ctx.currentTime; chord.forEach(freq => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now); gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.85); }); } catch {}
  }
  public playPraiseChant(): void {
    if (!this.isUnlocked) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const melody = [523.25, 659.25, 783.99, 880.0, 1046.5];
      const now = ctx.currentTime;
      melody.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    } catch {}
  }
  public playSharingChime(): void {
    if (!this.isUnlocked) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const notes = [440.0, 554.37, 659.25, 880.0];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.14;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    } catch {}
  }
  public playEmpathyHeartbeat(): void {
    if (!this.isUnlocked) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      [0, 0.28].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + offset;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    } catch {}
  }
  public playBreatheTone(type: 'inhale' | 'exhale'): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; if (type === 'inhale') { osc.frequency.setValueAtTime(260, now); osc.frequency.linearRampToValueAtTime(390, now + 4.5); gain.gain.setValueAtTime(0.02, now); gain.gain.linearRampToValueAtTime(0.16, now + 4.5); } else { osc.frequency.setValueAtTime(390, now); osc.frequency.linearRampToValueAtTime(240, now + 4.5); gain.gain.setValueAtTime(0.16, now); gain.gain.linearRampToValueAtTime(0.01, now + 4.5); } osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 4.6); } catch {}
  }
  public playWarmHug(): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const freqs = [329.63, 440.0, 523.25]; freqs.forEach(freq => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.15, now + 0.3); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 1.9); }); } catch {}
  }
  public playBalloonInflateTick(): void {
    if (this.isUnlocked && this.playSample('tick', 0.9 + Math.random() * 0.3, 0.35)) return;
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(320, now + 0.12); gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.13); } catch {}
  }
  public playBalloonFlyAway(): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.8); gain.gain.setValueAtTime(0.01, now); gain.gain.linearRampToValueAtTime(0.18, now + 0.2); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.95); setTimeout(() => { this.playSuccessChime(); }, 500); } catch {}
  }
  public playTap(): void {
    if (this.isUnlocked && this.playSample('tap', 1, 0.5)) return;
    const ctx = this.getContext(); if (!ctx) return; try { if (ctx.state === 'suspended' && this.isUnlocked) { ctx.resume().catch(() => {}); } const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(420, now); osc.frequency.exponentialRampToValueAtTime(210, now + 0.05); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.06); } catch {}
  }

  public getDiagnostics(): AudioDiagnostics {
    const ctx = this.getContext();
    const arabicVoices = this.availableVoices.filter(
      v => v.lang.toLowerCase().startsWith('ar') || v.name.toLowerCase().includes('arabic')
    );
    const parentRecordings = Storage.getAllParentVoiceRecordings();
    const settings = Storage.getSettings();
    return {
      isUnlocked: this.isUnlocked,
      audioContextState: ctx ? ctx.state : 'uninitialized',
      totalVoicesCount: this.availableVoices.length,
      selectedVoiceName: this.selectedArabicVoice ? `${this.selectedArabicVoice.name} (${this.selectedArabicVoice.lang})` : null,
      hasArabicVoice: !!this.selectedArabicVoice,
      arabicVoiceList: arabicVoices.map(v => `${v.name} (${v.lang})`),
      parentRecordingsCount: Object.keys(parentRecordings).length,
      activeVoiceMode: settings.voiceMode,
    };
  }

  public testAudio(onEnd?: () => void): void {
    this.playSuccessChime();
    setTimeout(() => {
      this.speak("مرحباً، تم تفعيل الصوت بنجاح!", onEnd);
    }, 400);
  }

  public async runLiveVoiceTest(onUpdate: (state: VoiceTestState) => void): Promise<void> {
    const currentState: VoiceTestState = {
      audioContextState: 'جاري الفحص...',
      totalVoices: this.availableVoices.length,
      hasArabicVoice: !!this.selectedArabicVoice,
      selectedVoiceName: this.selectedArabicVoice
        ? `${this.selectedArabicVoice.name} (${this.selectedArabicVoice.lang})`
        : null,
      speechStatus: 'starting',
      errorMessage: null,
      spokenText: 'أهلاً بك يا بطل! أنا الأسد لؤلؤ',
    };
    onUpdate({ ...currentState });

    const ctx = this.getContext();
    if (ctx?.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    currentState.audioContextState = ctx ? ctx.state : 'غير مدعوم (not supported)';
    this.isUnlocked = true;
    this.loadVoices();
    currentState.totalVoices = this.availableVoices.length;
    currentState.hasArabicVoice = !!this.selectedArabicVoice;
    currentState.selectedVoiceName = this.selectedArabicVoice
      ? `${this.selectedArabicVoice.name} (${this.selectedArabicVoice.lang})`
      : null;

    currentState.speechStatus = 'speaking';
    onUpdate({ ...currentState });

    this.speak(currentState.spokenText, () => {
      currentState.speechStatus = 'success';
      onUpdate({ ...currentState });
    });
  }

}

export const audioManager = new AudioManager();
export const sound = audioManager;
