import fs from "node:fs";

const path = "src/app/api/providers/[id]/test/testUtils.js";
let source = fs.readFileSync(path, "utf8");
const anchor = '  if (isAnthropicCompatibleProvider(connection.provider)) {';
const block = [
  '  if (connection.provider === "selfhosted-tts") {',
  '    const configuredBaseUrl = connection.providerSpecificData?.baseUrl',
  '      || PROVIDERS["selfhosted-tts"]?.ttsConfig?.baseUrl',
  '      || "http://localhost:8880";',
  '    const baseUrl = String(configuredBaseUrl)',
  '      .replace(/\\/+$/, "")',
  '      .replace(/\\/v1\\/audio\\/speech$/, "")',
  '      .replace(/\\/v1$/, "");',
  '',
  '    try {',
  '      const res = await fetchWithConnectionProxy(`${baseUrl}/v1/models`, {',
  '        method: "GET",',
  '        headers: { Authorization: `Bearer ${connection.apiKey}` },',
  '      }, effectiveProxy);',
  '      if (res.status >= 200 && res.status < 300) return { valid: true, error: null };',
  '      if (res.status === 401 || res.status === 403) return { valid: false, error: "Invalid API key" };',
  '      return { valid: false, error: "VieNeu TTS endpoint unavailable" };',
  '    } catch (err) {',
  '      return { valid: false, error: err.message };',
  '    }',
  '  }',
  '',
].join("\n");
if (!source.includes(anchor)) throw new Error("anchor not found");
if (source.includes('connection.provider === "selfhosted-tts"')) throw new Error("case already exists");
source = source.replace(anchor, block + anchor);
fs.writeFileSync(path, source, "utf8");
console.log("updated", path);