import { describe, it, expect, beforeEach, vi } from "vitest";

describe("api client wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("configures axios with the expected baseURL, headers and timeout", async () => {
    const { default: api } = await import("../client");
    expect(api.defaults.baseURL).toBe("http://localhost:8000");
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
    expect(api.defaults.timeout).toBe(10000);
  });

  it("getAuthToken returns null when nothing stored", async () => {
    const { getAuthToken } = await import("../client");
    expect(getAuthToken()).toBeNull();
  });

  it("setAuthToken persists the token and getAuthToken reads it back", async () => {
    const { setAuthToken, getAuthToken } = await import("../client");
    setAuthToken("tok-123");
    expect(getAuthToken()).toBe("tok-123");
    expect(window.localStorage.getItem("mbt_auth_token")).toBe("tok-123");
  });

  it("clearAuthToken removes the stored token", async () => {
    const { setAuthToken, clearAuthToken, getAuthToken } = await import("../client");
    setAuthToken("tok-456");
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it("request interceptor injects Authorization header when a token is present", async () => {
    const { default: api, setAuthToken } = await import("../client");
    setAuthToken("my-secret-token");

    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: {},
    });
    expect(config.headers.Authorization).toBe("Bearer my-secret-token");
  });

  it("request interceptor does not set Authorization header when no token is present", async () => {
    const { default: api } = await import("../client");

    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: {},
    });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("response interceptor re-rejects errors instead of swallowing them", async () => {
    const { default: api } = await import("../client");
    const error = { response: { status: 500, data: { detail: "boom" } } };
    await expect(
      api.interceptors.response.handlers[0].rejected(error)
    ).rejects.toBe(error);
  });
});
