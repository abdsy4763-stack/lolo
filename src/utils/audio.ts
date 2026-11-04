/**
 * مدير الصوت المطور (AudioManager)
 * يدعم الأصوات المسجلة البشرية، تسجيلات الأهل بالميكروفون،
 * نظام الصوت السحابي بالذكاء الاصطناعي (Cloud AI TTS) مع تخزين مؤقت (Cache Storage API)،
 * ونظام Web Speech API كخطة بديلة تلقائية (Fallback)
 */

import { ParentVoiceClipKey } from '../types';
import { Storage } from './storage';
import { recordedVoices } from './recordedVoices';

export const TTS_CACHE_NAME = 'kids-tts-audio-v3';
export const DEFAULT_ELEVEN_VOICE_ID = 'ar-EG-salma';
export const DEFAULT_HETAF_VOICE_ID = 'ar-EG-salma';

/**
 * مفتاح التخزين المؤقت في Cache Storage API
 */
export function getTtsCacheKey(text: string, voiceId: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return `https://kids-tts.local/v1/${encodeURIComponent(voiceId)}/${encodeURIComponent(normalized)}`;
}

/**
 * استرجاع ملف صوتي مخزن مؤقتاً في متصفح المستخدم
 */
export async function getCachedAudioBlob(cacheKey: string): Promise<Blob | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const matched = await cache.match(cacheKey);
    if (matched) {
      return await matched.blob();
    }
  } catch {
    // fallback if cache access fails
  }
  return null;
}

/**
 * حفظ ملف صوتي في Cache Storage API للمتصفح لإعادة استخدامه بدون استهلاك الإنترنت أو الرصيد
 */
export async function saveCachedAudioBlob(cacheKey: string, blob: Blob, provider = 'unknown'): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const headers = new Headers();
    headers.set('Content-Type', blob.type || 'audio/mpeg');
    headers.set('Content-Length', blob.size.toString());
    headers.set('X-TTS-Provider', provider);
    const response = new Response(blob, { headers });
    await cache.put(cacheKey, response);
  } catch {
    // ignore cache write errors
  }
}

/** Read the provider stored with a cached audio response. */
export async function getCachedAudioProvider(cacheKey: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const response = await cache.match(cacheKey);
    return response?.headers.get('X-TTS-Provider') || null;
  } catch {
    return null;
  }
}

/**
 * حذف ذاكرة التخزين المؤقت للصوتيات عند الرغبة في تحرير المساحة
 */
export async function clearAudioCache(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    return await caches.delete(TTS_CACHE_NAME);
  } catch {
    return false;
  }
}

/**
 * الحصول على عدد المقاطع الصوتية المخزنة محلياً
 */
export async function getAudioCacheCount(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

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
  cloudTtsUsed?: boolean;
  cloudTtsProvider?: string | null;
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
  isCloudTtsConfigured: boolean;
  cloudVoiceId: string;
}

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private speechSessionId: number = 0;
  private lastTtsProvider: string | null = null;
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
      this.playTap();
      
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const testUtterance = new SpeechSynthesisUtterance(' ');
        testUtterance.lang = 'ar-SA';
        testUtterance.rate = 0.9;
        testUtterance.volume = 0.05; 
        if (this.selectedArabicVoice) {
          testUtterance.voice = this.selectedArabicVoice;
        }
        window.speechSynthesis.speak(testUtterance);
      }
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
   * توليد الصوت السحابي عالي الجودة بالذكاء الاصطناعي مع تخزين ذكي في Cache Storage
   * - يفحص الكاش أولاً للتشغيل الفوري بدون إنترنت
   * - يطلب الصوت من نقطة نهاية التطبيق السحابية /api/tts (التي تدعم ElevenLabs أو المحرك الصوتي الطبيعي)
   * - يدعم البث الصوتي المباشر كخطة بديلة ثانية
   * - إدارة التزامن وإلغاء أي أصوات سابقة لمنع التداخل
   * - تنظيف الذاكرة عبر revokeObjectURL
   */
  public async generateAndPlayCloudAudio(
    text: string, 
    voiceId?: string, 
    onEnd?: () => void,
    requireHetaf = false
  ): Promise<boolean> {
    const cleanText = text.trim();
    if (!cleanText || typeof window === 'undefined') {
      return false;
    }

    const effectiveVoiceId = voiceId || DEFAULT_HETAF_VOICE_ID;
    const cacheKey = getTtsCacheKey(cleanText, effectiveVoiceId);

    // 1. التحقق مما إذا كان النص موجوداً مسبقاً كملف صوتي في الـ Cache Storage
    let audioBlob: Blob | null = null;
    this.lastTtsProvider = null;
    try {
      audioBlob = await getCachedAudioBlob(cacheKey);
      if (audioBlob) this.lastTtsProvider = await getCachedAudioProvider(cacheKey) || 'cached/unknown';
    } catch {
      audioBlob = null;
    }

    let audioSourceUrl: string | null = null;

    // 2. إذا لم يكن في الكاش: طلب المقطع الصوتي من نقطة النهاية /api/tts
    if (!audioBlob) {
      try {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(cleanText)}`);
        if (response.ok) {
          this.lastTtsProvider = response.headers.get('X-TTS-Provider') || 'unknown';
          if (requireHetaf && this.lastTtsProvider !== 'hetaf') {
            throw new Error('The TTS endpoint did not return Hetaf audio.');
          }
          audioBlob = await response.blob();
          saveCachedAudioBlob(cacheKey, audioBlob, this.lastTtsProvider).catch(() => {});
        } else if (requireHetaf) {
          const failure = await response.json().catch(() => ({}));
          throw new Error(failure.details?.message || failure.error || 'Hetaf TTS request failed.');
        }
      } catch (error) {
        if (requireHetaf) {
          this.lastTtsProvider = 'hetaf-error';
          throw error;
        }
        this.lastTtsProvider = 'browser-google-fallback';
      }
    }

    if (requireHetaf && !audioBlob) return false;

    // 3. تحديد مصدر الصوت: إما Object URL من Blob أو البث المباشر المتاح دائماً
    if (audioBlob) {
      audioSourceUrl = URL.createObjectURL(audioBlob);
    } else {
      audioSourceUrl = `https://translate.google.com/translate_tts?client=tw-ob&tl=ar&q=${encodeURIComponent(cleanText)}`;
      this.lastTtsProvider = 'browser-google-fallback';
    }

    // 4. إدارة التزامن: إيقاف أي أصوات سابقة حالية وإلغاء الـ speechSynthesis
    this.stopSpeech();
    const currentSession = ++this.speechSessionId;

    try {
      this.currentAudioUrl = audioBlob ? audioSourceUrl : null;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.src = audioSourceUrl;
      this.currentAudio = audio;

      return await new Promise<boolean>((resolve) => {
        let isDone = false;
        const finish = (success: boolean) => {
          if (isDone) return;
          isDone = true;
          this.cleanupCurrentAudio();
          this.notifySpeaking(false);
          if (success && onEnd) onEnd();
          resolve(success);
        };

        audio.onplay = () => {
          // إذا حدث تشغيل صوت جديد أثناء التحميل، نلغي هذا الصوت
          if (this.speechSessionId !== currentSession) {
            finish(false);
            return;
          }
          this.notifySpeaking(true);
        };

        audio.onended = () => {
          finish(true);
        };

        audio.onerror = () => {
          finish(false);
        };

        // تشغيل الصوت
        audio.play().catch(() => {
          finish(false);
        });
      });
    } catch {
      this.cleanupCurrentAudio();
      this.notifySpeaking(false);
      return false;
    }
  }

  /**
   * تشغيل الصوت بالدعم الكامل:
   * - أولوية 1: تسجيل صوت الوالدين المخصص
   * - أولوية 2: الصوت السحابي عالي الدقة (Cloud TTS) المخزن محلياً أو المتولد
   * - خطة بديلة (Fallback): نطق Web Speech API تلقائياً في حال انقطاع الشبكة أو نفاد الرصيد
   */
  public speak(text: string, onEnd?: () => void, voiceClipKey?: ParentVoiceClipKey): void {
    const settings = Storage.getSettings();
    if (!settings.soundEnabled) {
      if (onEnd) onEnd();
      return;
    }

    // أولوية 1: إذا كان هناك مقطع صوت مسجل من الأهل لهذا الموقف
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

    if (typeof window === 'undefined' || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // إذا اختار المستخدم صراحة صوت الـ Web Speech الآلي من الإعدادات
    if (settings.voiceMode === 'tts') {
      this.speakWebSpeech(text, onEnd);
      return;
    }

    // أولوية 2: تجربة الصوت السحابي (Cloud TTS + Cache Storage)
    this.generateAndPlayCloudAudio(text, undefined, onEnd).then(success => {
      if (!success) {
        // Fallback فوري: استخدام Web Speech API
        this.speakWebSpeech(text, onEnd);
      }
    }).catch(() => {
      this.speakWebSpeech(text, onEnd);
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

  // --- دوال Web Audio API ونغمات التشجيع المسجلة ---
  public playBubblePop(): void {
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
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(320, now + 0.12); gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.13); } catch {}
  }
  public playBalloonFlyAway(): void {
    if (!this.isUnlocked) return; const ctx = this.getContext(); if (!ctx || ctx.state !== 'running') return; try { const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.8); gain.gain.setValueAtTime(0.01, now); gain.gain.linearRampToValueAtTime(0.18, now + 0.2); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.95); setTimeout(() => { this.playSuccessChime(); }, 500); } catch {}
  }
  public playTap(): void {
    const ctx = this.getContext(); if (!ctx) return; try { if (ctx.state === 'suspended' && this.isUnlocked) { ctx.resume().catch(() => {}); } const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(420, now); osc.frequency.exponentialRampToValueAtTime(210, now + 0.05); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.06); } catch {}
  }

  public getDiagnostics(): AudioDiagnostics {
    const ctx = this.getContext();
    const arabicVoices = this.availableVoices.filter(
      v => v.lang.toLowerCase().startsWith('ar') || v.name.toLowerCase().includes('arabic')
    );
    const parentRecordings = Storage.getAllParentVoiceRecordings();
    const settings = Storage.getSettings();
    // The API key is server-side only; the browser can call /api/tts without seeing it.
    const isCloudTtsConfigured = false; // Confirmed asynchronously by the server-side Hetaf diagnostics endpoint.
    const cloudVoiceId = DEFAULT_HETAF_VOICE_ID;

    return {
      isUnlocked: this.isUnlocked,
      audioContextState: ctx ? ctx.state : 'uninitialized',
      totalVoicesCount: this.availableVoices.length,
      selectedVoiceName: this.selectedArabicVoice ? `${this.selectedArabicVoice.name} (${this.selectedArabicVoice.lang})` : null,
      hasArabicVoice: !!this.selectedArabicVoice,
      arabicVoiceList: arabicVoices.map(v => `${v.name} (${v.lang})`),
      parentRecordingsCount: Object.keys(parentRecordings).length,
      activeVoiceMode: settings.voiceMode,
      isCloudTtsConfigured,
      cloudVoiceId,
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
      cloudTtsUsed: false,
      cloudTtsProvider: null,
    };
    onUpdate({ ...currentState });

    const ctx = this.getContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }
      currentState.audioContextState = ctx.state;
    } else {
      currentState.audioContextState = 'غير مدعوم (not supported)';
    }

    this.isUnlocked = true;
    this.playSuccessChime();
    this.loadVoices();
    
    currentState.totalVoices = this.availableVoices.length;
    currentState.hasArabicVoice = !!this.selectedArabicVoice;
    currentState.selectedVoiceName = this.selectedArabicVoice
      ? `${this.selectedArabicVoice.name} (${this.selectedArabicVoice.lang})`
      : null;
    onUpdate({ ...currentState });

    // اختبار اتصال Hetaf أولاً؛ لا نعلن نجاح الاختبار اعتماداً على Web Speech أو مزود آخر.
    try {
      const diagnosticResponse = await fetch('/api/tts?diagnostics=1', { cache: 'no-store' });
      const diagnostic = await diagnosticResponse.json();
      if (!diagnosticResponse.ok || !diagnostic.connected || !diagnostic.voiceAvailable) {
        throw new Error(diagnostic.error?.message || 'تعذر الاتصال بـ Hetaf أو العثور على صوت Salma.');
      }

      currentState.spokenText = 'أهلاً بك يا بطل! أنا سلمى';
      currentState.speechStatus = 'speaking';
      onUpdate({ ...currentState });

      const playedCloud = await this.generateAndPlayCloudAudio(
        currentState.spokenText,
        DEFAULT_HETAF_VOICE_ID,
        undefined,
        true
      );

      if (!playedCloud || this.lastTtsProvider !== 'hetaf') {
        throw new Error('لم يتم تشغيل صوت Hetaf Salma؛ لم يتم اعتماد الاختبار.');
      }

      currentState.speechStatus = 'success';
      currentState.cloudTtsUsed = true;
      currentState.cloudTtsProvider = 'hetaf';
      onUpdate({ ...currentState });
      return;
    } catch (error) {
      currentState.speechStatus = 'error';
      currentState.cloudTtsUsed = false;
      currentState.cloudTtsProvider = null;
      currentState.errorMessage = error instanceof Error ? error.message : 'فشل اختبار Hetaf Salma.';
      onUpdate({ ...currentState });
      return;
    }

  }
}

export const audioManager = new AudioManager();
export const sound = audioManager;
