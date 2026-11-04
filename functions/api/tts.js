const DEFAULT_VOICE_ID = "I3u6waC588j43py1kDN2";
const MAX_TEXT_LENGTH = 1000;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function getErrorInfo(payload, status) {
  const detail = payload?.detail || payload?.error || payload;
  const code = typeof detail?.status === "string"
    ? detail.status
    : typeof detail?.code === "string"
      ? detail.code
      : `http_${status}`;
  const message = typeof detail?.message === "string"
    ? detail.message
    : typeof detail === "string"
      ? detail
      : `ElevenLabs returned HTTP ${status}`;
  return { code, message: message.slice(0, 400) };
}

async function readElevenLabsError(response) {
  try {
    return getErrorInfo(await response.clone().json(), response.status);
  } catch {
    return { code: `http_${response.status}`, message: `ElevenLabs returned HTTP ${response.status}` };
  }
}

function resolveConfig(context, url) {
  const env = context.env || {};
  const apiKey = (env.ELEVENLABS_API_KEY || env.VITE_TTS_API_KEY || "").trim();
  const voiceId = (url.searchParams.get("voice") || env.VITE_TTS_VOICE_ID || DEFAULT_VOICE_ID).trim();
  return { apiKey, voiceId };
}

async function checkElevenLabs(apiKey, voiceId) {
  if (!apiKey) {
    return {
      configured: false,
      connected: false,
      provider: "google-fallback",
      voiceId,
      error: { code: "missing_api_key", message: "ELEVENLABS_API_KEY is not configured for this Pages environment." },
    };
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const voice = await response.json().catch(() => ({}));
      return {
        configured: true,
        connected: true,
        provider: "elevenlabs",
        voiceId,
        voiceName: typeof voice.name === "string" ? voice.name : null,
      };
    }

    return {
      configured: true,
      connected: false,
      provider: "google-fallback",
      voiceId,
      error: await readElevenLabsError(response),
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      provider: "google-fallback",
      voiceId,
      error: { code: "network_error", message: error instanceof Error ? error.message : "Could not reach ElevenLabs." },
    };
  }
}

async function createElevenLabsAudio(apiKey, voiceId, text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    return { ok: false, error: await readElevenLabsError(response) };
  }

  const audio = await response.arrayBuffer();
  if (!audio.byteLength) {
    return { ok: false, error: { code: "empty_audio", message: "ElevenLabs returned an empty audio response." } };
  }
  return { ok: true, audio };
}

async function createGoogleFallback(text, reason) {
  const googleUrl = `https://translate.google.com/translate_tts?client=tw-ob&tl=ar&q=${encodeURIComponent(text)}`;
  const response = await fetch(googleUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    return jsonResponse({
      error: "TTS unavailable",
      provider: "unavailable",
      elevenLabsError: reason || null,
    }, 502);
  }

  return new Response(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-TTS-Provider": "google-fallback",
      "X-TTS-Fallback": "true",
      "X-TTS-Error-Code": reason?.code || "elevenlabs_unavailable",
    },
  });
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const { apiKey, voiceId } = resolveConfig(context, url);

    // Diagnostic mode validates the real API key and the configured voice without generating audio.
    if (url.searchParams.get("diagnostics") === "1") {
      return jsonResponse(await checkElevenLabs(apiKey, voiceId));
    }

    const text = (url.searchParams.get("text") || "").trim();
    if (!text) {
      return jsonResponse({ error: "Text parameter is required" }, 400);
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return jsonResponse({ error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer` }, 413);
    }

    let elevenLabsError = null;
    if (apiKey) {
      try {
        const result = await createElevenLabsAudio(apiKey, voiceId, text);
        if (result.ok) {
          return new Response(result.audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=604800",
              "X-TTS-Provider": "elevenlabs",
              "X-TTS-Voice": voiceId,
            },
          });
        }
        elevenLabsError = result.error;
        console.warn("ElevenLabs TTS request rejected:", result.error.code, result.error.message);
      } catch (error) {
        elevenLabsError = {
          code: "network_error",
          message: error instanceof Error ? error.message : "ElevenLabs request failed.",
        };
        console.error("ElevenLabs TTS request failed:", elevenLabsError.code);
      }
    } else {
      elevenLabsError = {
        code: "missing_api_key",
        message: "ELEVENLABS_API_KEY is not configured for this Pages environment.",
      };
      console.warn("ElevenLabs TTS skipped: API key is not configured.");
    }

    // Keep the existing audio fallback for availability, but label it explicitly.
    return await createGoogleFallback(text, elevenLabsError);
  } catch (error) {
    console.error("TTS endpoint error:", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "TTS service temporarily unavailable" }, 500);
  }
}
