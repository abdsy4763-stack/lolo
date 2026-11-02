export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const text = (url.searchParams.get("text") || "").trim();
    
    if (!text) {
      return new Response(JSON.stringify({ error: "Text parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const elevenKey = context.env.VITE_TTS_API_KEY || context.env.ELEVENLABS_API_KEY;
    const voiceId = url.searchParams.get("voice") || context.env.VITE_TTS_VOICE_ID || "I3u6waC588j43py1kDN2";

    // 1. محاولة ElevenLabs
    if (elevenKey && elevenKey.trim()) {
      try {
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": elevenKey.trim(),
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (elevenRes.ok) {
          const buffer = await elevenRes.arrayBuffer();
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=604800",
              "X-TTS-Provider": "elevenlabs",
            },
          });
        }
      } catch (e) {
        console.warn("ElevenLabs failed");
      }
    }

    // 2. البديل: Google TTS
    const googleTtsUrl = `https://translate.google.com/translate_tts?client=tw-ob&tl=ar&q=${encodeURIComponent(text)}`;
    const googleRes = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (googleRes.ok) {
      const buffer = await googleRes.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=604800",
          "X-TTS-Provider": "google-cloud",
        },
      });
    }

    return new Response(JSON.stringify({ error: "TTS unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}