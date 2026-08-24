import fs from "node:fs";

const path = "src/app/api/providers/[id]/test/testUtils.js";
let source = fs.readFileSync(path, "utf8");
const blockStart = '  if (connection.provider === "selfhosted-tts") {';
const blockEnd = '  if (isAnthropicCompatibleProvider(connection.provider)) {';
const start = source.indexOf(blockStart);
const end = source.indexOf(blockEnd, start);
if (start < 0 || end < 0) throw new Error("selfhosted block not found");
source = source.slice(0, start) + source.slice(end);
const switchAnchor = '    switch (connection.provider) {';
const caseBlock = [
  '      case "selfhosted-tts": {',
  '        const configuredBaseUrl = connection.providerSpecificData?.baseUrl',
  '          || PROVIDERS["selfhosted-tts"]?.ttsConfig?.baseUrl',
  '          || "http://localhost:8880";',
  '        const baseUrl = String(configuredBaseUrl)',
  '          .replace(/\\/+$/, "")',
  '          .replace(/\\/v1\\/audio\\/speech$/, "")',
  '          .replace(/\\/v1$/, "");',
  '',
  '        const res = await fetchWithConnectionProxy(`${baseUrl}/v1/models`, {',
  '          method: "GET",',
  '          headers: { Authorization: `Bearer ${connection.apiKey}` },',
  '        }, effectiveProxy);',
  '        if (res.status >= 200 && res.status < 300) return { valid: true, error: null };',
  '        if (res.status === 401 || res.status === 403) return { valid: false, error: "Invalid API key" };',
  '        return { valid: false, error: "VieNeu TTS endpoint unavailable" };',
  '      }',
].join("\n") + "\n";
const switchIndex = source.indexOf(switchAnchor);
if (switchIndex < 0) throw new Error("switch anchor not found");
source = source.slice(0, switchIndex + switchAnchor.length + 1) + caseBlock + source.slice(switchIndex + switchAnchor.length + 1);
fs.writeFileSync(path, source, "utf8");