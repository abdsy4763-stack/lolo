const DEFAULT_VOICE_ID = "ar-EG-salma";
const MAX_TEXT_LENGTH = 1000;
const HETAF_BASE_URL = "https://api.hetaf.ai";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getApiKey(context) {
  return String(context.env?.HETAF_API_KEY || "").trim();
}

function safeError(payload, status) {
  const detail = payload?.detail || payload?.error || payload?.message;
  const message = typeof detail === "string"
    ? detail
    : Array.isArray(detail)
      ? detail.map(item => item?.msg || item?.message || "").filter(Boolean).join("; ")
      : `Hetaf returned HTTP ${status}`;
  return { code: payload?.error || `http_${status}`, message: message.slice(0, 400) };
}

async function readError(response) {
  try {
    return safeError(await response.clone().json(), response.status);
  } catch {
    return { code: `http_${response.status}`, message: `Hetaf returned HTTP ${response.status}` };
  }
}

async function getArabicVoices(apiKey) {
  const response = await fetch(`${HETAF_BASE_URL}/api/v1/voices?language=ar`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return { ok: false, status: response.status, error: await readError(response) };
  const payload = await response.json();
  const voices = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.voices) ? payload.voices : [];
  const salma = voices.find(voice => voice.id === DEFAULT_VOICE_ID);
  return { ok: true, salma };
}

async function diagnostics(context) {
  const apiKey = getApiKey(context);
  if (!apiKey) {
    return jsonResponse({
      configured: false, connected: false, provider: "hetaf",
      voiceId: DEFAULT_VOICE_ID, voiceName: "Salma",
      error: { code: "missing_api_key", message: "HETAF_API_KEY is not configured for this Pages environment." },
    }, 503);
  }

  try {
    const result = await getArabicVoices(apiKey);
    if (!result.ok) {
      return jsonResponse({
        configured: true, connected: false, provider: "hetaf",
        voiceId: DEFAULT_VOICE_ID, voiceName: "Salma", error: result.error,
      }, result.status);
    }
    if (!result.salma) {
      return jsonResponse({
        configured: true, connected: true, provider: "hetaf",
        voiceId: DEFAULT_VOICE_ID, voiceAvailable: false,
        error: { code: "voice_not_found", message: "Hetaf is reachable, but ar-EG-salma was not found in the Arabic voice catalogue." },
      }, 404);
    }
    return jsonResponse({
      configured: true, connected: true, provider: "hetaf",
      voiceId: result.salma.id, voiceName: result.salma.name,
      voiceAvailable: true, language: "ar", accent: result.salma.accent || "egyptian",
    });
  } catch (error) {
    return jsonResponse({
      configured: true, connected: false, provider: "hetaf",
      voiceId: DEFAULT_VOICE_ID, voiceName: "Salma",
      error: { code: "network_error", message: error instanceof Error ? error.message : "Could not reach Hetaf." },
    }, 502);
  }
}

async function synthesize(apiKey, text) {
  const response = await fetch(`${HETAF_BASE_URL}/api/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/wav",
    },
    body: JSON.stringify({
      text,
      voice: DEFAULT_VOICE_ID,
      language: "ar",
      model: "hetaf-tts",
      format: "wav",
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) return { ok: false, status: response.status, error: await readError(response) };
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) {
    return { ok: false, status: 502, error: { code: "empty_audio", message: "Hetaf returned an empty audio response." } };
  }
  return { ok: true, audio, requestId: response.headers.get("X-Request-Id"), credits: response.headers.get("X-Hetaf-Credits-Charged") };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.searchParams.get("diagnostics") === "1") return diagnostics(context);

  const text = (url.searchParams.get("text") || "").trim();
  if (!text) return jsonResponse({ error: "Text parameter is required" }, 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer` }, 413);
  }

  const apiKey = getApiKey(context);
  if (!apiKey) {
    return jsonResponse({
      error: "TTS is not configured",
      provider: "hetaf",
      details: { code: "missing_api_key", message: "HETAF_API_KEY is not configured for this Pages environment." },
    }, 503);
  }

  try {
    const result = await synthesize(apiKey, text);
    if (!result.ok) return jsonResponse({ error: "Hetaf TTS request failed", provider: "hetaf", details: result.error }, result.status);
    const headers = {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "X-TTS-Provider": "hetaf",
      "X-TTS-Voice": DEFAULT_VOICE_ID,
    };
    if (result.requestId) headers["X-Hetaf-Request-Id"] = result.requestId;
    if (result.credits) headers["X-Hetaf-Credits-Charged"] = result.credits;
    return new Response(result.audio, { status: 200, headers });
  } catch (error) {
    console.error("Hetaf TTS request failed:", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "Hetaf TTS service temporarily unavailable", provider: "hetaf" }, 502);
  }
}
