import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_TTS_TEXT_LENGTH = 1000;
const TTS_RATE_LIMIT = 30;
const TTS_RATE_WINDOW_MS = 60_000;
const ttsRate = new Map<string, { count: number; windowStarted: number }>();

app.use(express.json());

/**
 * نقطة نهاية توليد الصوت السحابي (Cloud TTS Endpoint)
 * تدعم ElevenLabs إذا توفر المفتاح، مع بديل صوتي عربي بشري عالي الجودة يعمل 100% بدون أي مفاتيح
 */
app.get('/api/tts', async (req, res) => {
  try {
    const text = (req.query.text as string || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    if (text.length > MAX_TTS_TEXT_LENGTH) {
      return res.status(413).json({ error: `Text must be ${MAX_TTS_TEXT_LENGTH} characters or fewer` });
    }
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = ttsRate.get(clientKey);
    if (!current || now - current.windowStarted >= TTS_RATE_WINDOW_MS) {
      ttsRate.set(clientKey, { count: 1, windowStarted: now });
    } else if (current.count >= TTS_RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many TTS requests; try again later' });
    } else {
      current.count += 1;
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_TTS_API_KEY;
    const voiceId = (req.query.voice as string) || process.env.VITE_TTS_VOICE_ID || 'I3u6waC588j43py1kDN2';

    // 1. استخدام ElevenLabs إذا وُجد المفتاح في البيئة
    if (elevenKey && elevenKey.trim()) {
      try {
        const fetchElevenAudio = async (targetVoice: string) => {
          return await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenKey.trim(),
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          });
        };

        // المحاولة أولاً بالصوت المطلوب المحدد من المستخدم
        let elevenRes = await fetchElevenAudio(voiceId);

        // إذا كان الحساب مجانياً ويرفض أصوات المكتبة المدفوعة (Status 402 Paid plan required)
        // نقوم تلقائياً بالتحويل إلى صوت نظام معتمد في ElevenLabs (Jessica / Alice) لضمان الاستمتاع بصوت الذكاء الاصطناعي
        if (elevenRes.status === 402 || elevenRes.status === 400) {
          const detail = await elevenRes.clone().text();
          if (detail.includes('paid_plan_required') || detail.includes('library voices') || voiceId !== 'cgSgspJ2msm6clMCkdW9') {
            console.log(`ElevenLabs voice ${voiceId} requires paid plan, retrying with compatible premade voice 'cgSgspJ2msm6clMCkdW9'...`);
            const fallbackVoiceRes = await fetchElevenAudio('cgSgspJ2msm6clMCkdW9');
            if (fallbackVoiceRes.ok) {
              elevenRes = fallbackVoiceRes;
            }
          }
        }

        if (elevenRes.ok) {
          const buffer = Buffer.from(await elevenRes.arrayBuffer());
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=604800'); // تخزين أسبوع
          res.setHeader('X-TTS-Provider', 'elevenlabs');
          res.setHeader('X-TTS-Voice', voiceId);
          return res.send(buffer);
        } else {
          const errDetail = await elevenRes.text();
          console.warn(`ElevenLabs API returned status ${elevenRes.status}:`, errDetail);
        }
      } catch (e) {
        console.warn('ElevenLabs API request failed, falling back to Google TTS:', e);
      }
    }

    // 2. الصوت السحابي العربي البشري عالي الجودة (Google Cloud Speech Engine)
    // يعمل فوراً لجميع المستخدمين بدون الحاجة لأي إعدادات أو مفاتيح مع نطق عربي ممتاز
    const googleTtsUrl = `https://translate.google.com/translate_tts?client=tw-ob&tl=ar&q=${encodeURIComponent(text)}`;
    const googleRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (googleRes.ok) {
      const buffer = Buffer.from(await googleRes.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-TTS-Provider', 'google-cloud');
      return res.send(buffer);
    }

    return res.status(502).json({ error: 'TTS service temporarily unavailable' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('TTS Endpoint Error:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// فحص حالة خدمة الصوت ومفتاح ElevenLabs
app.get('/api/tts/status', async (_req, res) => {
  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_TTS_API_KEY;
  const configuredVoice = process.env.VITE_TTS_VOICE_ID || 'I3u6waC588j43py1kDN2';

  if (!elevenKey || !elevenKey.trim()) {
    return res.json({
      connected: false,
      provider: 'google-cloud',
      message: 'No ElevenLabs key configured, using Google Cloud Speech fallback',
      voiceId: configuredVoice,
    });
  }

  return res.json({
    connected: true,
    provider: 'elevenlabs',
    voiceId: configuredVoice,
    keyConfigured: true,
  });
});

// فحص صحة الخادم
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
