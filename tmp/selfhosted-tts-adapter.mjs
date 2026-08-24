import assert from "node:assert/strict";
import selfhostedTts from "../open-sse/handlers/ttsProviders/selfhostedTts.js";

const originalFetch = global.fetch;
let captured;
global.fetch = async (url, options) => {
  captured = { url, options };
  return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
};

try {
  const result = await selfhostedTts.synthesize("hello", "kokoro", {
    apiKey: "tts-key",
    providerSpecificData: { baseUrl: "http://localhost:8880/v1/audio/speech/" },
  });

  assert.equal(captured.url, "http://localhost:8880/v1/audio/speech");
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers.Authorization, "Bearer tts-key");
  assert.deepEqual(JSON.parse(captured.options.body), {
    model: "kokoro",
    voice: "af_heart",
    input: "hello",
    response_format: "mp3",
  });
  assert.equal(result.format, "mp3");
  console.log("selfhosted TTS adapter payload valid");
} finally {
  global.fetch = originalFetch;
}