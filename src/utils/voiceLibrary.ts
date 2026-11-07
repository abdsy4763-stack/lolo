/**
 * مكتبة المقاطع الصوتية الجاهزة (ملفات ثابتة، بلا API ولا اتصال خارجي).
 * ملف manifest.json يسرد مفاتيح المقاطع المتوفرة فعلاً، فلا نحاول
 * تحميل ملف غير موجود.
 */

import { voiceKey } from './voiceKey';

const BASE = '/audio/voices';

interface ManifestShape {
  clips: string[];
}

class VoiceLibrary {
  private available = new Set<string>();
  private readyPromise: Promise<void> | null = null;

  /** يحمّل القائمة مرة واحدة، ولا يعطّل اللعبة إن فشل التحميل */
  public whenReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
      this.readyPromise = Promise.resolve();
      return this.readyPromise;
    }
    const load = fetch(`${BASE}/manifest.json`, { cache: 'no-cache' })
      .then(r => (r.ok ? (r.json() as Promise<ManifestShape>) : { clips: [] }))
      .then(m => {
        this.available = new Set(m.clips || []);
      })
      .catch(() => {});
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 2500));
    this.readyPromise = Promise.race([load, timeout]);
    return this.readyPromise;
  }

  public getClipUrl(text: string): string | null {
    const key = voiceKey(text);
    return this.available.has(key) ? `${BASE}/${key}.mp3` : null;
  }

  /**
   * في وضع التطوير فقط: يسجّل الجمل التي لا مقطع لها، لتجمعها من الكونسول:
   *   copy(JSON.stringify(window.__voiceMissing, null, 2))
   * ثم تحفظها في scripts/voices/extra-lines.json (مصفوفة نصوص) وتشغّل voices:sync
   */
  public reportMissing(text: string): void {
    try {
      if (!import.meta.env?.DEV) return;
      const w = window as unknown as { __voiceMissing?: Record<string, string> };
      w.__voiceMissing = w.__voiceMissing || {};
      const key = voiceKey(text);
      if (!w.__voiceMissing[key]) {
        w.__voiceMissing[key] = text;
        console.warn('[voice-missing]', key, text);
      }
    } catch {
      // ignore
    }
  }
}

export const voiceLibrary = new VoiceLibrary();
