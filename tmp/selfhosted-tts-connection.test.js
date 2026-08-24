import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getProviderConnectionById = vi.fn();
const updateProviderConnection = vi.fn();
const resolveConnectionProxyConfig = vi.fn();
const originalFetch = global.fetch;

vi.mock("@/lib/localDb", () => ({ getProviderConnectionById, updateProviderConnection }));
vi.mock("@/lib/network/connectionProxy", () => ({ resolveConnectionProxyConfig }));
vi.mock("@/lib/network/proxyTest", () => ({ testProxyUrl: vi.fn() }));

const { testSingleConnection } = await import("../src/app/api/providers/[id]/test/testUtils.js");

const connection = {
  id: "selfhosted-tts-test",
  provider: "selfhosted-tts",
  authType: "apikey",
  apiKey: "correct-key",
  providerSpecificData: { baseUrl: "http://localhost:8880/v1/audio/speech/" },
};

beforeEach(() => {
  vi.clearAllMocks();
  getProviderConnectionById.mockResolvedValue(connection);
  updateProviderConnection.mockResolvedValue();
  resolveConnectionProxyConfig.mockResolvedValue({ connectionProxyEnabled: false });
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("selfhosted-tts connection check", () => {
  it("accepts a 200 response from normalized /v1/models", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await testSingleConnection(connection.id);

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8880/v1/models", {
      method: "GET",
      headers: { Authorization: "Bearer correct-key" },
    });
  });

  it("reports an invalid key for 401", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const result = await testSingleConnection(connection.id);

    expect(result).toMatchObject({ valid: false, error: "Invalid API key" });
  });

  it("reports an unavailable endpoint for non-auth HTTP errors", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));

    const result = await testSingleConnection(connection.id);

    expect(result).toMatchObject({ valid: false, error: "VieNeu TTS endpoint unavailable" });
  });

  it("preserves the network error message", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8880"));

    const result = await testSingleConnection(connection.id);

    expect(result).toMatchObject({ valid: false, error: "connect ECONNREFUSED 127.0.0.1:8880" });
  });
});