import fs from "node:fs";

const path = "tmp/selfhosted-tts-connection.test.js";
let source = fs.readFileSync(path, "utf8");
source = source.replace('    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8880/v1/models", {\n      headers: { Authorization: "Bearer correct-key" },\n    });', '    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8880/v1/models", {\n      method: "GET",\n      headers: { Authorization: "Bearer correct-key" },\n    });');
const marker = '  it("preserves the network error message", async () => {';
const test = `  it("reports an unavailable endpoint for non-auth HTTP errors", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));

    const result = await testSingleConnection(connection.id);

    expect(result).toMatchObject({ valid: false, error: "VieNeu TTS endpoint unavailable" });
  });

`;
if (!source.includes(marker)) throw new Error("network test marker missing");
if (!source.includes('reports an unavailable endpoint')) source = source.replace(marker, test + marker);
fs.writeFileSync(path, source, "utf8");