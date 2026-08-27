// Self-hosted OpenAI-compatible TTS — POST {baseUrl}/v1/audio/speech.
//
// A SPECIAL_ADAPTER rather than a genericFormats handler on purpose: the generic
// dispatcher resolves baseUrl from the static registry entry
// (`synthesizeViaConfig` reads `cfg.baseUrl`) and never looks at the connection,
// which is exactly the limitation this provider exists to lift.
import { Buffer } from "node:buffer";

const DEFAULT_BASE_URL = "http://localhost:8880";
const DEFAULT_MODEL = "kokoro";
const DEFAULT_VOICE = "Minh Đức";
const VOICE_ALIASES = {
  "vi-VN-NamMinhNeural": "Minh Đức",
};

function resolveVoice(model, requestedVoice) {
  if (requestedVoice) return VOICE_ALIASES[requestedVoice] || requestedVoice;
  const value = String(model || "");
  if (value === DEFAULT_MODEL) return DEFAULT_VOICE;
  const voice = value.startsWith(`${DEFAULT_MODEL}/`) ? value.slice(DEFAULT_MODEL.length + 1) : value;
  return VOICE_ALIASES[voice] || voice || DEFAULT_VOICE;
}

export default {
  async synthesize(text, model, credentials, _responseFormat = "mp3", { audioFormat, speed, voice: requestedVoice } = {}) {
    // Accept either providerSpecificData.baseUrl (how the custom embedding and
    // STT providers carry it) or a bare credentials.baseUrl (how the OpenAI TTS
    // adapter does), so a connection configured either way works.
    const raw = credentials?.providerSpecificData?.baseUrl || credentials?.baseUrl || DEFAULT_BASE_URL;
    // Tolerate a baseUrl given as the full endpoint or with a trailing /v1 —
    // both are natural things to paste, and silently double-appending the path
    // would 404 with nothing pointing at the cause.
    const base = String(raw)
      .replace(/\/+$/, "")
      .replace(/\/v1\/audio\/speech$/, "")
      .replace(/\/v1$/, "");

    const responseFormat = ["mp3", "wav"].includes(audioFormat) ? audioFormat : "mp3";
    const parsedSpeed = Number(speed);
    const ttsSpeed = Number.isFinite(parsedSpeed) && parsedSpeed >= 0.25 && parsedSpeed <= 4 ? parsedSpeed : 1;

    const res = await fetch(`${base}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(credentials?.apiKey ? { Authorization: `Bearer ${credentials.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: text,
        voice: resolveVoice(model, requestedVoice),
        response_format: responseFormat,
        speed: ttsSpeed,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Self-hosted TTS failed: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return { base64: Buffer.from(buf).toString("base64"), format: responseFormat };
  },
};
