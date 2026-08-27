// Self-hosted VieNeu text-to-speech — the TTS counterpart of selfhosted-stt.
//
// Every other self-hostable TTS provider here (coqui, tortoise) carries a FIXED
// localhost baseUrl in its registry entry and `authType: "none"`, and the generic
// dispatcher reads `ttsConfig.baseUrl` from that entry rather than from the
// connection. So there was no way to point TTS at a server on another host.
//
// `authType: "apikey"` is what makes the override possible at all: it gives the
// connection a credentials record, which is where providerSpecificData.baseUrl
// lives. Local servers ignore the key; any non-empty value works.
export default {
  id: "selfhosted-tts",
  priority: 50,
  hasFree: true,
  alias: "selfhosted-tts",
  display: {
    name: "VieNeu TTS",
    icon: "cloud",
    color: "#ffffffff",
    textIcon: "TT",
    website: "https://github.com/pnnbao97/VieNeu-TTS",
  },
  category: "apikey",
  auth: {
    apiKey: {
      text: "VieNeu API key sent as a Bearer token to /v1/models and /v1/audio/speech.",
    },
  },
  models: [
    { id: "vieneu", name: "VieNeu TTS", params: ["voice", "response_format", "speed"], kind: "tts" },
  ],
  serviceKinds: ["tts"],
  ttsConfig: {
    // Overridden per connection by providerSpecificData.baseUrl; this default
    // only makes the provider usable on a same-host deployment.
    baseUrl: "http://localhost:8880",
    defaultModel: "vieneu",
    authType: "apikey",
    format: "openai-speech",
  },
};
