/**
 * نظام الأصوات العربية المسجلة واستوديو تسجيل صوت الأهل
 * يدعم:
 * 1. تسجيل صوت الأهل بالميكروفون (MediaRecorder) وتخزينه وتشغيله
 * 2. مكتبة أصوات عربية ونغمات بشرية صوتية ونغمات إشادة وتشجيع (Web Audio Formant & Acoustic Synthesis)
 * 3. تشغيل مقاطع الصوت المسجلة حسب الموقف التربوي
 */

import { ParentVoiceClipKey, ParentVoiceRecording } from '../types';
import { Storage } from './storage';

export interface RecordedVoiceDefinition {
  key: ParentVoiceClipKey;
  title: string;
  category: 'mom' | 'companion' | 'praise' | 'calm';
  icon: string;
  suggestedScript: string;
  description: string;
}

export const PARENT_VOICE_TEMPLATES: RecordedVoiceDefinition[] = [
  {
    key: 'welcome',
    title: 'صوت الترحيب الصباحي',
    category: 'companion',
    icon: '👋',
    suggestedScript: 'أهلاً يا بطلي العزيز! أنا سعيد برؤيتك، كيف تشعر اليوم؟',
    description: 'يُسمع عند فتح اللعبة أو اختيار شخصية الرفيق',
  },
  {
    key: 'mom_denial',
    title: 'صوت الرفض الهادئ (الأم/الأب)',
    category: 'mom',
    icon: '👩‍👧',
    suggestedScript: 'لا يا حبيبي، ليس الآن، فالوقت غير مناسب. فكر معي بحجة ذكية!',
    description: 'يُسمع في بداية مواقف التفاوض والكلمات السحرية',
  },
  {
    key: 'magic_please',
    title: 'صوت الكلمات السحرية والطلب المهذب',
    category: 'companion',
    icon: '🪄',
    suggestedScript: 'ماما الحبيبة.. من فضلك، لو سمحتِ هل يمكن أن نتفاهم بلطف؟',
    description: 'يُسمع عند استخدام بطاقة «من فضلك» أو «سأساعدك أولاً»',
  },
  {
    key: 'praise_hero',
    title: 'صوت الفخر والتشجيع العظيم',
    category: 'praise',
    icon: '⭐',
    suggestedScript: 'ما شاء الله عليك يا بطل! أنا فخور جداً بأسلوبك الراقي وشجاعتك!',
    description: 'يُسمع عند الفوز بنجمة الشجاعة واكتمال قوس الأمل',
  },
  {
    key: 'warm_hug',
    title: 'صوت الاحتواء والحضن الدافئ',
    category: 'calm',
    icon: '🫂',
    suggestedScript: 'تعال لحضني الدافئ يا حبيبي.. البكاء يخرج الزعل، وأنا بجانبك دائماً.',
    description: 'يُسمع عند اختيار التعبير عن الحزن أو طلب الحضن',
  },
  {
    key: 'waiting_patient',
    title: 'صوت الصبر والانتظار الجميل',
    category: 'calm',
    icon: '⏳',
    suggestedScript: 'أنت بطل صبور ورائع! حبات الرمل تنزل و«لا الآن» ليست «لا أبداً»!',
    description: 'يُسمع في مرحلة الساعة الرملية وفقاعات الصبر',
  },
  {
    key: 'sharing_turn',
    title: 'صوت المشاركة وتبادل الأدوار',
    category: 'companion',
    icon: '🤝',
    suggestedScript: 'المشاركة تصنع أجمل صداقة! دور لك ودور لي، ونلعب معاً بفرح!',
    description: 'يُسمع في مرحلة تبادل الألعاب والمشاركة الأخوية',
  },
];

class RecordedVoicesManager {
  private activeAudio: HTMLAudioElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * تشغيل مقطع صوت مسجل من الأهل إذا وُجد
   */
  public playParentClip(key: ParentVoiceClipKey, onEnd?: () => void): boolean {
    const recording = Storage.getParentVoiceRecording(key);
    if (!recording || !recording.audioDataUrl) {
      return false;
    }

    try {
      this.stopCurrentAudio();
      const audio = new Audio(recording.audioDataUrl);
      this.activeAudio = audio;
      audio.onended = () => {
        this.activeAudio = null;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        this.activeAudio = null;
        if (onEnd) onEnd();
      };
      audio.play().catch(() => {
        this.activeAudio = null;
        if (onEnd) onEnd();
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * إيقاف أي صوت مشغّل حالياً
   */
  public stopCurrentAudio(): void {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }
  }

  /**
   * التحقق مما إذا كان هناك تسجيل للأهل لهذا المفتاح
   */
  public hasParentClip(key: ParentVoiceClipKey): boolean {
    return Storage.hasParentVoiceRecording(key);
  }

  /**
   * بدء تسجيل صوت جديد من ميكروفون المستخدم
   */
  public async startRecording(
    onProgressMs?: (durationMs: number) => void
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('المتصفح لا يدعم الوصول إلى الميكروفون');
    }

    try {
      this.stopCurrentAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      // تحديد نوع الصوت المدعوم
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', ''];
      const supportedType = mimeTypes.find(t => !t || MediaRecorder.isTypeSupported(t)) || '';

      const options = supportedType ? { mimeType: supportedType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      this.mediaRecorder = recorder;

      const startTime = Date.now();
      if (onProgressMs) {
        this.recordingTimer = setInterval(() => {
          onProgressMs(Date.now() - startTime);
        }, 100);
      }

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      recorder.start(100);
      return true;
    } catch (err) {
      this.cleanUpRecordingState();
      throw err;
    }
  }

  /**
   * إيقاف التسجيل وحفظه في الذاكرة
   */
  public async stopRecording(key: ParentVoiceClipKey): Promise<ParentVoiceRecording> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder || recorder.state === 'inactive') {
        this.cleanUpRecordingState();
        reject(new Error('لا يوجد تسجيل نشط حالياً'));
        return;
      }

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const base64DataUrl = await this.blobToDataUrl(blob);

          const template = PARENT_VOICE_TEMPLATES.find(t => t.key === key);
          const recording: ParentVoiceRecording = {
            key,
            title: template ? template.title : key,
            audioDataUrl: base64DataUrl,
            durationMs: Math.max(1000, this.audioChunks.length * 100),
            recordedAt: Date.now(),
          };

          Storage.saveParentVoiceRecording(recording);
          this.cleanUpRecordingState();

          // إغلاق مسارات المايك
          recorder.stream.getTracks().forEach(track => track.stop());
          resolve(recording);
        } catch (err) {
          this.cleanUpRecordingState();
          reject(err);
        }
      };

      recorder.stop();
    });
  }

  /**
   * إلغاء التسجيل الجاري
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      } catch {}
    }
    this.cleanUpRecordingState();
  }

  private cleanUpRecordingState(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('فشل تحويل الصوت إلى صيغة بيانات'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}

export const recordedVoices = new RecordedVoicesManager();
